/* jslint nomen:true es5:true */
/*global module*/
/**
 * 日志工具类
 * @module logger
 * @class Logger
 * @static
 * @requires log4js
 * @author Fuyun
 * @version 2.0.0
 * @since 2.0.0
 */
const log4js = require('log4js');
const appConfig = require('../config/core');
const util = require('./util');

log4js.configure({
    appenders: [{
        type: 'dateFile',
        filename: 'logs/access',
        maxLogSize: 10485760, // 10MB, 只在 type: 'file' 中才支持
        backups: 5, // 默认5，指定pattern后backups参数无效，除非pattern是小于backups的数字，原理是不指定pattern时备份的文件是在文件名后加'.n'的数字，n从1开始自增
        pattern: '_yyyy-MM-dd.log', // 指定pattern后无限备份
        alwaysIncludePattern: true, // 不指定pattern时若为true会使用默认值'.yyyy-MM-dd'
        category: 'access'
    }, {
        type: 'dateFile',
        filename: 'logs/system',
        maxLogSize: 10485760,
        backups: 5,
        pattern: '_yyyy-MM-dd.log',
        alwaysIncludePattern: true,
        category: 'system'
    }, {
        type: 'dateFile',
        filename: 'logs/db',
        maxLogSize: 10485760,
        backups: 5,
        pattern: '_yyyy-MM-dd.log',
        alwaysIncludePattern: true,
        category: 'db'
    }, {
        type: 'dateFile',
        filename: 'logs/upload',
        maxLogSize: 10485760,
        backups: 5,
        pattern: '_yyyy-MM-dd.log',
        alwaysIncludePattern: true,
        category: 'upload'
    }]
});

// ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF']
module.exports = {
    /**
     * 访问日志
     * @method accessLog
     * @static
     * @return {Object} 日志对象
     */
    accessLog: function () {
        const logger = log4js.getLogger('access');
        logger.setLevel(appConfig.logLevel);
        return logger;
    },
    /**
     * 操作、系统日志
     * @method sysLog
     * @static
     * @return {Object} 日志对象
     */
    sysLog: function () {
        const logger = log4js.getLogger('system');
        logger.setLevel(appConfig.logLevel);
        return logger;
    },
    /**
     * 数据库日志
     * @method dbLog
     * @static
     * @return {Object} 日志对象
     */
    dbLog: function () {
        const logger = log4js.getLogger('db');
        logger.setLevel(appConfig.logLevel);
        return logger;
    },
    /**
     * 上传日志
     * @method uploadLog
     * @static
     * @return {Object} 日志对象
     */
    uploadLog: function () {
        const logger = log4js.getLogger('upload');
        logger.setLevel(appConfig.logLevel);
        return logger;
    },
    /**
     * 格式化日志消息
     * @method formatOpLog
     * @static
     * @param {Object} logObj 日志数据对象
     *      {String}[fn] 函数名
     *      {Object}[msg] 日志消息
     *      {Object}[data] 日志数据
     *      {Object}[req] 请求对象
     * @return {String} 日志内容:"Function: function; Msg: some error; Data: {"a":"b","c":"d"}" - IP - "UserAgent"
     * @author Fuyun
     * @version 2.0.0
     * @since 2.0.0
     */
    formatOpLog: function (logObj) {
        let logStr = '';

        logStr += '"Function: ' + (logObj.fn || '') + '; Msg: ' + (logObj.msg || '') + '; Data: ' + JSON.stringify(logObj.data || {}) + '"';
        if (logObj.req) {
            logStr += ' - ' + util.getAccessUser(logObj.req);
        }

        return logStr;
    }
};
