/* jslint nomen:true */
/**
 * 工具类
 * @module util
 * @class Util
 * @static
 * @requires crypto
 * @author Fuyun
 * @version 3.3.3
 * @since 1.0.0
 */
const crypto = require('crypto');
const unique = require('lodash/uniq');
const xss = require('sanitizer');
const appConfig = require('../config/core');
const constants = require('../services/constants');
const STATUS_CODES = require('../services/status-codes');

module.exports = {
    /**
     * 获取分页数据
     * @method formatPages
     * @static
     * @param {number} page 请求页
     * @param {number} pages 总页数
     * @param {number} pagesOut 每页显示页数
     * @return {Object} 分页数据对象
     * @author Fuyun
     * @version 2.0.0
     * @since 1.0.0
     */
    formatPages(page, pages, pagesOut) {
        let pageData = {
            start: 1,
            end: 1
        };
        // page = page || 1;
        // pages = pages || 1;
        // pagesOut = pagesOut || 9;
        // 中间页
        const floorPage = Math.floor((pagesOut + 1) / 2);
        // 中间页到两边的间距页数，偶数情况距离低页再减一，距离高页不变
        const ceilPage = Math.ceil((pagesOut - 1) / 2);

        if (pages <= pagesOut) {// 总页数小于一屏输出页数
            pageData.start = 1;
            pageData.end = pages;
        } else if (page <= floorPage) {// 第一屏
            pageData.start = 1;
            pageData.end = pagesOut;
        } else if (page > floorPage && (page + ceilPage) <= pages) {// 非第一屏，且非最后一屏
            pageData.start = page - ceilPage + (pagesOut + 1) % 2;
            pageData.end = page + ceilPage;
        } else {// 最后一屏
            pageData.start = pages - pagesOut + 1;
            pageData.end = pages;
        }

        return pageData;
    },
    /**
     * 生成分页对象
     * @method paginator
     * @static
     * @param {number|string} [page=1] 请求页
     * @param {number} [pages=1] 总页数
     * @param {number} [pagesOut=9] 每页显示页数
     * @return {Object} 分页对象
     * @author Fuyun
     * @version 3.2.3
     * @since 1.0.0
     */
    paginator(page, pages, pagesOut) {
        if (typeof page === 'string') {// page是字符串
            page = parseInt(page, 10);
        }
        page = page || 1;
        pages = pages || 1;
        pagesOut = pagesOut || constants.PAGINATION_SIZE;
        page = page > pages ? pages : page;

        const pageData = this.formatPages(page, pages, pagesOut);

        return {
            startPage: pageData.start,
            endPage: pageData.end,
            prevPage: page <= 1 ? 0 : (page - 1),
            nextPage: page >= pages ? 0 : (page + 1),
            curPage: page,
            totalPage: pages
        };
    },
    /**
     * 生成面包屑
     * @param {Array} crumbData 面包屑数据
     * @param {string} separator 分隔符
     * @return {string} 面包屑HTML
     */
    createCrumb(crumbData, separator) {
        let crumbArr = [];
        separator = separator || '&nbsp;→&nbsp;';
        crumbData.unshift({
            'title': '首页',
            'tooltip': appConfig.siteName,
            'url': '/',
            'headerFlag': false
        });
        crumbData.forEach((crumb) => {
            if (crumb.url !== '' && !crumb.headerFlag) {
                crumbArr.push('<a title="' + crumb.tooltip + '" href="' + crumb.url + '">' + crumb.title + '</a>');
            } else if (crumb.url !== '' && crumb.headerFlag) {
                crumbArr.push('<h3><a title="' + crumb.tooltip + '" href="' + crumb.url + '">' + crumb.title + '</a></h3>');
            } else {
                crumbArr.push('<span title="' + crumb.tooltip + '">' + crumb.title + '</span>');
            }
        });
        return crumbArr.join(separator);
    },
    /**
     * 根据月份返回月份名称
     * @method getMonthName
     * @static
     * @param {number} [month=1] 月份(1-12)，默认1
     * @return {string} 月份名称
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    // getMonthName(month) {
    //     const monthNames = {
    //         '1': '一月',
    //         '2': '二月',
    //         '3': '三月',
    //         '4': '四月',
    //         '5': '五月',
    //         '6': '六月',
    //         '7': '七月',
    //         '8': '八月',
    //         '9': '九月',
    //         '10': '十月',
    //         '11': '十一',
    //         '12': '十二'
    //     };
    //     month = parseInt(month, 10);
    //     if (!month || month > 12 || month < 1) {
    //         month = 1;
    //     }
    //
    //     return monthNames[month];
    // },
    /**
     * 截取字符串为指定长度，超过长度加'...'
     * @method cutStr
     * @static
     * @param {string} srcStr 源字符串
     * @param {number} cutLength 指定长度
     * @return {string} 截取结果字符串
     * @author Fuyun
     * @version 3.2.3
     * @since 1.0.0
     */
    cutStr(srcStr, cutLength) {
        let resultStr;
        let i = 0;
        let n = 0;
        let curChar;
        const half = 0.5;

        srcStr = srcStr || '';
        srcStr = typeof srcStr === 'string' ? srcStr : '';

        while (n < cutLength && i < srcStr.length) {
            curChar = srcStr.charCodeAt(i);
            if (curChar >= 192 || (curChar >= 65 && curChar <= 90)) {// 中文和大写字母计为1个
                n += 1;
                if (n <= cutLength) {
                    i += 1;
                }
            } else {// 其余字符计为半个
                n += half;
                i += 1;
            }
        }
        resultStr = srcStr.substr(0, i);
        if (srcStr.length > i) {
            resultStr += '...';
        }
        return resultStr;
    },
    /**
     * 过滤HTML标签
     * @method filterHtmlTag
     * @static
     * @param {string} srcStr 源字符串
     * @return {string} 过滤结果字符串
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    filterHtmlTag(srcStr) {
        return srcStr.replace(/<\/?[^>]*>/ig, '');
        // \w\s~!@#$%^&*\(\)\-=+\[\]\{\}\\\|;:'",\.\/<\?\u4E00-\uFA29
    },
    /**
     * 获取访问者IP
     * @method getRemoteIp
     * @static
     * @param {Object} req 请求对象
     * @return {string} 访问者IP
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getRemoteIp(req) {
        return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip ||
            req._remoteAddress || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    },
    /**
     * 获取请求类型
     * @method getHttpMethod
     * @static
     * @param {Object} req 请求对象
     * @return {string} 请求类型
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    // getHttpMethod(req) {
    //     return req.method;
    // },
    /**
     * 获取请求URL
     * @method getUrl
     * @static
     * @param {Object} req 请求对象
     * @return {string} 请求URL
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getUrl(req) {
        return req.originalUrl || req.url;
    },
    /**
     * 获取响应状态码
     * @method getHttpStatus
     * @static
     * @param {Object} res 响应对象
     * @return {number} 响应状态码
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    // getHttpStatus(res) {
    //     return res.statusCode || '';
    // },
    /**
     * 获取访客信息
     * @method getUserAgent
     * @static
     * @param {Object} req 请求对象
     * @return {string} UserAgent
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getUserAgent(req) {
        return req.headers['user-agent'];
    },
    /**
     * 获取HTTP协议版本
     * @method getHttpVersion
     * @static
     * @param {Object} req 请求对象
     * @return {string} HTTP协议版本
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    // getHttpVersion(req) {
    //     return req.httpVersionMajor + '.' + req.httpVersionMinor;
    // },
    /**
     * 获取来源页地址
     * @method getReferrer
     * @static
     * @param {Object} req 请求对象
     * @return {string} 来源页地址
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getReferrer(req) {
        return req.headers.referer || req.headers.referrer;
    },
    /**
     * 获取指定的响应头字段值
     * @method getResponseHeader
     * @static
     * @param {Object} res 响应对象
     * @param {string} field 响应头字段名
     * @return {*} 指定的响应头字段值
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getResponseHeader(res, field) {
        if (!res._header) {
            return;
        }
        const header = res.getHeader(field);
        return Array.isArray(header) ? header.join(', ') : header;
    },
    /**
     * 获取响应内容长度
     * @method getContentLength
     * @static
     * @param {Object} res 响应对象
     * @return {number} 响应内容长度
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    // getContentLength(res) {
    //     return this.getResponseHeader(res, 'content-length');
    // },
    /**
     * 获取访问日志
     * @method getAccessLog
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @return {string} 访问日志
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    // getAccessLog(req, res) {
    //     return this.getRemoteIp(req) + ' - ' + this.getHttpMethod(req) + ' ' + this.getHttpStatus(res) + ' ' + this.getUrl(req);
    // },
    /**
     * 获取访客信息
     * @method getAccessUser
     * @static
     * @param {Object} req 请求对象
     * @return {string} 访客信息
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAccessUser(req) {
        return this.getRemoteIp(req) + ' - "' + this.getUserAgent(req) + '"';
    },
    /**
     * 生成Error对象，返回错误页或错误对象
     * @method catchError
     * @static
     * @param {Object} msgObj 消息对象
     *      {number}[status=404] HTTP状态码
     *      {number}[code=404] 错误码
     *      {string}[message='Page Not Found'] 错误消息
     *      {string}[messageDetail=null] 错误详细消息
     *      {string}[data=null] 数据
     * @param {Function} next 路由对象
     * @return {Object} 错误对象
     * @author Fuyun
     * @version 3.0.0
     * @since 1.0.0
     */
    catchError(msgObj, next = null) {
        msgObj.status = msgObj.status || STATUS_CODES.PAGE_NOT_FOUND;
        msgObj.code = msgObj.code || STATUS_CODES.PAGE_NOT_FOUND;
        msgObj.message = msgObj.message || 'Page Not Found';
        msgObj.messageDetail = msgObj.messageDetail || null;
        // todo
        // msgObj.stack = msgObj.stack || null;
        msgObj.data = msgObj.data || null;
        if (next) {
            return next(msgObj);
        }
        return msgObj;
    },
    /**
     * md5加密字符串
     * @method md5
     * @static
     * @param {string} str 源字符串
     * @return {string} 加密结果
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    md5(str) {
        let md5sum = crypto.createHash('md5');
        md5sum.update(str);
        return md5sum.digest('hex');
    },
    /**
     * 拼接标题
     * @method getTitle
     * @static
     * @param {string|Array} titleArr 标题数组
     * @param {string} [delimiter=' - '] 分隔符
     * @return {string} 拼接后的字符串
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getTitle(titleArr, delimiter) {
        delimiter = delimiter || ' - ';
        if (!titleArr) {
            titleArr = [];
        }
        if (typeof titleArr === 'string') {
            titleArr = [titleArr];
        }

        return titleArr.join(delimiter);
    },
    /**
     * 生成随机ID字符串：10/11位十六进制时间戳+6/5位十六进制随机数
     * @method getUuid
     * @static
     * @return {string} ID
     * @author Fuyun
     * @version 2.0.0(2014-06-18)
     * @since 1.0.0(2014-06-17)
     */
    getUuid() {
        // 1e12 + 0x4ba0000000
        const idLen = 16;
        const hex = 16;
        const timeBased = 1324806901760;// 2011-12-25 17:55:01
        const timeStamp = new Date().getTime() - timeBased;
        const uuid = timeStamp.toString(hex);
        let tmpStr = '';

        for (let idx = 0; idx < idLen - uuid.length; idx += 1) {
            tmpStr += Math.floor(Math.random() * hex).toString(hex);
        }

        return uuid + tmpStr;
    },
    /**
     * 判断是否空对象
     * @method isEmptyObject
     * @static
     * @param {Object} obj 源对象
     * @return {boolean} 判断结果：为空返回true，否则返回false
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    isEmptyObject(obj) {
        for (let name in obj) {
            if (obj.hasOwnProperty(name)) {
                return false;
            }
        }
        return true;
    },
    /**
     * 判断数组是否含有指定元素
     * @method inArray
     * @static
     * @param {*} elem 元素
     * @param {Array} arr 数组
     * @param {number} i 判断起始位置
     * @return {number} 判断结果：找到返回所在位置，否则返回-1
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    inArray(elem, arr, i) {
        if (arr) {
            const len = arr.length;
            i = i ? i < 0 ? Math.max(0, len + i) : i : 0;

            while (i < len) {
                // Skip accessing in sparse arrays
                if (arr.hasOwnProperty(i) && arr[i] === elem) {
                    return i;
                }
                i += 1;
            }
        }

        return -1;
    },
    /**
     * 判断是否数组
     * @method isArray
     * @static
     * @param {*} obj 任意对象
     * @return {boolean} 判断结果：数组返回true，非数组返回false
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },
    /**
     * 去除头尾空白字符
     * @method trim
     * @static
     * @param {string|Undefined} str 源字符串
     * @return {string} 处理后的字符串
     * @version 2.0.0
     * @since 2.0.0
     */
    trim(str) {
        return str ? str.trim() : '';
    },
    /**
     * 判断是否已登录
     * @method isLogin
     * @static
     * @param {Object} user user对象
     * @return {boolean} 判断结果：已登录返回true，否则返回false
     * @author Fuyun
     * @version 3.0.0
     * @since 1.0.0
     */
    isLogin(user) {
        // const curUser = req.session.user;
        return user ? !!user : false;
    },
    /**
     * 判断登录用户是否管理员
     * @method isAdminUser
     * @static
     * @param {Object} user user对象
     * @return {boolean} 判断结果：是管理员返回true，否则返回false
     * @author Fuyun
     * @version 3.0.0
     * @since 1.0.0
     */
    isAdminUser(user) {
        // const curUser = req.session.user;
        return this.isLogin(user) && user.usermeta && user.usermeta.role === 'admin';
    },
    /**
     * URL添加来源参数
     * @method setUrlRef
     * @static
     * @param {string} url URL
     * @param {string} from 来源
     * @return {string} 新的URL
     * @author Fuyun
     * @version 2.0.0
     * @since 2.0.0
     */
    setUrlRef(url, from) {
        const split = url.indexOf('?') >= 0 ? '&' : '?';
        return url + split + 'ref=' + from;
    },
    /**
     * 生成验证码随机字符串
     * @return {string} 验证码
     */
    getRandomText() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const charsLength = chars.length;
        const captchaLength = 4;
        let captchaStr = '';
        for (let i = 0; i < captchaLength; i += 1) {
            captchaStr += chars[Math.floor(Math.random() * charsLength)];
        }

        return captchaStr;
    },
    /**
     * 标签去重
     * @method uniqueTags
     * @static
     * @param {string} tagStr tag string
     * @return {string} tag string
     * @author Fuyun
     * @version 3.3.3
     * @since 3.3.3
     */
    uniqueTags(tagStr) {
        const tags = tagStr.split(',');
        return unique(tags).join(',');
    },
    /**
     * 表单数据预处理
     * @method sanitizeField
     * @static
     * @param {string} str source string
     * @param {boolean} trimFlag should trim
     * @param {*} defaultValue default value
     * @return {string} formatted string
     * @author Fuyun
     * @version 3.3.3
     * @since 3.3.3
     */
    sanitizeField(str, trimFlag = true, defaultValue) {
        str = xss.sanitize(str);
        if (trimFlag) {
            str = this.trim(str);
        }
        if (defaultValue !== undefined) {
            str = str || defaultValue;
        }
        return str;
    }
};
