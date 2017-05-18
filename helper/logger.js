/*jslint nomen:true es5:true*/
/*global module*/
/**
 * 日志工具类
 * @module logger
 * @class Logger
 * @static
 * @requires log4js
 * @author Fuyun
 * @version 3.0.0
 * @since 2.1.0
 */
const log4js = require('log4js');

log4js.configure({
    appenders: [{
        type: 'dateFile',
        filename: 'logs/access',
        maxLogSize: 10485760, //10MB, 只在 type: 'file' 中才支持
        backups: 5, //默认5，指定pattern后backups参数无效，除非pattern是小于backups的数字，原理是不指定pattern时备份的文件是在文件名后加'.n'的数字，n从1开始自增
        pattern: '_yyyy-MM-dd.log', //指定pattern后无限备份
        alwaysIncludePattern: true, //不指定pattern时若为true会使用默认值'.yyyy-MM-dd'
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
    }]
});

module.exports = {
    /**
     * 访问日志
     * @property accessLog
     * @writeOnce
     * @type {Object}
     */
    accessLog: log4js.getLogger('access'),
    /**
     * 操作、系统日志
     * @property sysLog
     * @writeOnce
     * @type {Object}
     */
    sysLog: log4js.getLogger('system'),
    dbLog: log4js.getLogger('db')
};
