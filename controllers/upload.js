/*global require*/
/**
 * node.js版本上传SDK
 * @version 2.0.0
 * @since 2.0.0
 * @author Fuyun
 */
const fs = require('fs');
const request = require('request');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const {uploadLog: logger, formatOpLog} = require('../helper/logger');
let uploader;
let db;
let fd;
let filepath;
const codeSuccess = 200;
const progressPrecision = 2;
const maxTrunkSize = 4;// MB

// 配置对象
let config = {
    nonce: Math.round(Math.random() * Math.pow(10, 16)).toString(),
    curTime: Math.round(Date.now() / 1000).toString(),
    trunkSize: maxTrunkSize * 1024 * 1024
};

/**
 * 创建DB
 * @return {Undefined} null
 */
function createDb() {
    db = new sqlite3.Database('ifuyun', createTable);
}

/**
 * 创建表
 * @return {Undefined} null
 */
function createTable() {
    const columns = [
        'filepath TEXT',
        'mtime INTEGER',
        'filesize INTEGER',
        'nosContext VARCHAR(256)',
        'nosBucket VARCHAR(64)',
        'nosObject VARCHAR(256)',
        'nosToken TEXT',
        'created INTEGER'];
    uploader = uploads();
    db.run('CREATE TABLE IF NOT EXISTS files (' + columns.join(',') + ')', () => uploader.next());
}

/**
 * 获取校验信息
 * @param {String} appSecret App Secret
 * @param {String} nonce 随机值
 * @param {String} curTime 当前时间（秒数）
 * @return {Buffer|String} 加密结果
 */
function getCheckSum(appSecret, nonce, curTime) {
    return crypto.createHash('sha1').update(appSecret).update(nonce).update(curTime).digest('hex');
}

/**
 * 获取校验信息
 * @param {String} filename 文件名
 * @return {Object} token信息
 */
function getNosToken(filename) {
    const str = JSON.stringify({
        Bucket: config.bucket,
        Object: filename,
        Expires: 4102329600
    });
    const str1 = new Buffer(str).toString('base64');
    const shastr = crypto.createHmac('sha256', config.appSecretKey);
    shastr.update(str1);
    const str2 = shastr.digest('base64');
    const str3 = 'UPLOAD ' + config.appAccessKey + ':' + str2 + ':' + str1;

    return {
        ret: {
            'bucket': config.bucket,
            'object': filename,
            'xNosToken': str3
        }
    };
}

/**
 * 获取bucket、token等信息
 * @param {String} filename 文件名
 * @return {Undefined} null
 */
function getInitData(filename) {
    if (config.bucket) {
        new Promise((resolve) => {
            resolve(getNosToken(filename));
        }).then((nosToken) => {
            uploader.next(nosToken);
        });
    } else {
        request({
            method: 'post',
            uri: 'http://vcloud.163.com/app/vod/upload/init',
            headers: {
                AppKey: config.appKey,
                Nonce: config.nonce,
                CurTime: config.curTime,
                CheckSum: getCheckSum(config.appSecret, config.nonce, config.curTime)
            },
            json: true,
            body: {
                originFileName: filename
            }
        }, (err, res, body) => {
            if (err || body.code !== codeSuccess) {
                uploader.throw((err && err.message) || body.msg);
                return false;
            }
            uploader.next(body);
        });
    }
}

/**
 * 获取上传地址
 * @param {String} bucketName 桶名
 * @return {Undefined} null
 */
function getIPData(bucketName) {
    request({
        method: 'get',
        uri: 'http://wanproxy.127.net/lbs?version=1.0&bucketname=' + bucketName
    }, (err, res, body) => {
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        if (err || body.upload.length < 1) {
            uploader.throw((err && err.message) || '上传地址获取失败');
            return false;
        }
        uploader.next(body);
    });
}

/**
 * 获取上传断点位置
 * @param {String} uploadIP 上传地址
 * @param {Object} nosData nos信息
 * @return {Undefined} null
 */
function getUploadOffset(uploadIP, nosData) {
    request({
        method: 'get',
        uri: uploadIP + '/' + nosData.nosBucket + '/' + nosData.nosObject + '?uploadContext&version=1.0&context=' + (nosData.nosContext || ''),
        headers: {
            'x-nos-token': nosData.nosToken
        }
    }, (err, res, body) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        uploader.next(body);
    });
}

/**
 * 读取文件信息
 * @param {String} filepath 文件路径
 * @return {Undefined} null
 */
function getFileData(filepath) {
    fs.stat(filepath, (err, stats) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        uploader.next(stats);
    });
}

/**
 * 上传分片
 * @param {String} uploadIP 上传地址
 * @param {Object} initData 初始数据
 * @return {Undefined} null
 */
function uploadTrunk(uploadIP, initData) {
    const trunkLength = Math.min(config.trunkSize, initData.filesize - initData.offset);
    const param = '?version=1.0&offset=' + initData.offset + '&complete=' + initData.finish + '&context=' + initData.nosContext;
    const fileBuffer = Buffer.alloc(trunkLength);
    fs.readSync(fd, fileBuffer, 0, trunkLength, initData.offset);

    request({
        method: 'post',
        uri: uploadIP + '/' + initData.nosBucket + '/' + initData.nosObject + param,
        headers: {
            'x-nos-token': initData.nosToken
        },
        body: fileBuffer
    }, (err, res, body) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        try {
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            if (body.errCode && body.errMsg) {
                uploader.throw(body.errMsg);
            } else {
                uploader.next(body);
            }
        } catch (e) {
            uploader.throw(e.message);
        }
    });
}

/**
 * 查询文件信息
 * @param {Object} fileInfo 文件信息
 * @return {Undefined} null
 */
function getFile(fileInfo) {
    const where = 'WHERE filepath = "' + fileInfo.filepath + '" and mtime = ' + +fileInfo.mtime + ' and filesize = ' + fileInfo.size;
    db.all('SELECT * FROM files ' + where, (err, rows) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        uploader.next(rows[0]);
    });
}

/**
 * 判断文件是否已存在（是否需要续传）
 * @param {Object} fileInfo 文件信息
 * @return {Undefined} null
 */
function checkExist(fileInfo) {
    const where = 'WHERE filepath = "' + fileInfo.filepath + '" and mtime = ' + +fileInfo.mtime + ' and filesize = ' + fileInfo.size;
    const sql = 'SELECT COUNT(1) count FROM files ' + where;
    logger.trace(formatOpLog({
        fn: 'checkExist',
        data: `sql: ${sql}`
    }));
    db.all(sql, (err, rows) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        if (rows[0].count > 0) {
            uploader.next(true);
        } else {
            uploader.next(false);
        }
    });
}

/**
 * 保存文件信息
 * @param {Object} fileInfo 文件信息
 * @return {Undefined} null
 */
function saveFile(fileInfo) {
    const sql = 'INSERT INTO files (filepath, mtime, filesize, created, nosToken, nosObject, nosBucket, nosContext) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [fileInfo.filepath, fileInfo.mtime, fileInfo.filesize, fileInfo.created, fileInfo.nosToken, fileInfo.nosObject, fileInfo.nosBucket, ''];
    logger.trace(formatOpLog({
        fn: 'saveFile',
        data: `sql: ${sql}, values: ${values}`
    }));
    db.run(sql, values, (err) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        uploader.next();
    });
}

/**
 * 上传成功后删除文件信息
 * @param {Object} fileInfo 文件信息
 * @return {Undefined} null
 */
function removeFile(fileInfo) {
    const where = 'WHERE filepath = "' + fileInfo.filepath + '" and mtime = ' + +fileInfo.mtime + ' and filesize = ' + fileInfo.size;
    const sql = 'DELETE FROM files ' + where;
    logger.trace(formatOpLog({
        fn: 'removeFile',
        data: `sql: ${sql}`
    }));
    db.run(sql, (err) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        uploader.next();
    });
}

/**
 * 保存context信息
 * @param {Object} fileInfo 文件信息
 * @return {Undefined} null
 */
function saveContext(fileInfo) {
    const where = 'WHERE filepath = "' + fileInfo.filepath + '" and mtime = ' + +fileInfo.mtime + ' and filesize = ' + fileInfo.filesize;
    const sql = 'UPDATE files SET nosContext = ?' + where;
    logger.trace(formatOpLog({
        fn: 'saveContext',
        data: `sql: ${sql}`
    }));
    db.run(sql, [fileInfo.nosContext], (err) => {
        if (err) {
            uploader.throw(err.message);
            return false;
        }
        uploader.next();
    });
}

/**
 * 文件上传入口
 * @return {Undefined} null
 */
function * uploads() {
    try {
        let fileData = yield getFileData(filepath);
        fileData.filepath = fs.realpathSync(filepath);
        fileData.filename = filepath.split(/[\\/]/i).pop();
        const fileExist = yield checkExist(fileData);
        let initData = {};

        if (fileExist) {
            initData = yield getFile(fileData);
        } else {
            initData = yield getInitData(fileData.filename);
            initData = {
                filepath: fileData.filepath,
                mtime: fileData.mtime,
                filesize: fileData.size,
                created: +new Date(),
                nosToken: initData.ret.xNosToken,
                nosObject: initData.ret.object,
                nosBucket: initData.ret.bucket,
                nosContext: ''
            };
            yield saveFile(initData);
        }
        const nosData = yield getIPData(initData.nosBucket);
        let uploadOffset = 0;
        if (fileExist && initData.nosContext) {
            uploadOffset = yield getUploadOffset(nosData.upload[0], initData);
            if (typeof uploadOffset === 'string') {
                uploadOffset = JSON.parse(uploadOffset);
            }
            uploadOffset = uploadOffset.offset || 0;
            logger.info(formatOpLog({
                fn: 'uploads',
                msg: `last offset: ${uploadOffset}`
            }));
        }
        logger.debug(formatOpLog({
            fn: 'uploads',
            msg: '[file info]',
            data: initData
        }));
        logger.trace(formatOpLog({
            fn: 'uploads',
            msg: '[nos data]',
            data: nosData
        }));
        logger.info(formatOpLog({
            fn: 'uploads',
            msg: 'upload start...'
        }));
        logger.info(formatOpLog({
            fn: 'uploads',
            msg: 'upload initial progress: ' + (uploadOffset / fileData.size * 100).toFixed(progressPrecision) + '%'
        }));

        while (uploadOffset < fileData.size) {
            initData.offset = uploadOffset;
            initData.finish = uploadOffset + config.trunkSize >= fileData.size;
            logger.debug(formatOpLog({
                fn: 'uploads',
                msg: `trunk offset: ${uploadOffset} B, file size: ${fileData.size} B`
            }));
            let trunkResult = yield uploadTrunk(nosData.upload[0], initData);
            logger.debug(formatOpLog({
                fn: 'uploads',
                msg: 'trunk uploaded.',
                data: trunkResult
            }));
            initData.nosContext = trunkResult.context;
            if (initData.nosContext && initData.nosContext.toLowerCase() !== 'null') {
                yield saveContext(initData);
            }
            uploadOffset = initData.finish ? fileData.size : (uploadOffset + config.trunkSize);
            logger.info(formatOpLog({
                fn: 'uploads',
                msg: 'upload progress: ' + (uploadOffset / fileData.size * 100).toFixed(progressPrecision) + '%'
            }));
        }
        yield removeFile(fileData);
        logger.info(formatOpLog({
            fn: 'uploads',
            msg: `upload success. File path: /${initData.nosBucket}/${initData.nosObject}`
        }));
        if (typeof config.onSuccess === 'function') {
            config.onSuccess(`/${initData.nosBucket}/${initData.nosObject}`);
        }
    } catch (e) {
        logger.error(formatOpLog({
            fn: 'uploads',
            msg: e
        }));
        if (typeof config.onError === 'function') {
            config.onError(e);
        }
    }
}

/**
 * 初始化
 * @param {Object} conf 配置对象
 *     {String}[appKey] App Key,
 *     {String}[appSecret] App Secret,
 *     {Number}[trunkSize=4*1024*1024] 分片大小（单位：Byte），最大值：4MB,
 * @return {*} null
 */
function init(conf) {
    if (!conf.appKey || !conf.appSecret) {
        logger.error(formatOpLog({
            fn: 'init',
            msg: '请传入appKey和appSecret。'
        }));
        return false;
    }
    if (conf.trunkSize > config.trunkSize) {
        logger.warn(formatOpLog({
            fn: 'init',
            msg: '分片大小超过最大限制（4MB），将设为上限值。'
        }));
    }
    Object.assign(config, conf);
    config.trunkSize = Math.min(config.trunkSize, conf.trunkSize || config.trunkSize);
}

/**
 * 上传API
 * @param {String} filePath 上传文件路径（相对路径或绝对路径）
 * @return {*} null
 */
function upload(filePath) {
    if (!config.appKey || !config.appSecret) {
        logger.error(formatOpLog({
            fn: 'upload',
            msg: 'appKey或appSecret无效。'
        }));
        return false;
    }
    filepath = filePath;
    fs.open(filePath, 'r', (err, result) => {
        if (err) {
            logger.error(formatOpLog({
                fn: 'upload',
                msg: err.message
            }));
            return false;
        }
        fd = result;
        createDb();
    });
}
module.exports = {
    init, upload
};
