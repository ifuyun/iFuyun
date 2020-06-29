/* jslint nomen:true es5:true */
/*global module*/
/**
 * 日志工具类
 * @module logger
 * @class Logger
 * @static
 * @requires log4js
 * @author Fuyun
 * @version 3.0.0
 * @since 2.0.0
 */
const log4js = require('log4js');
const appConfig = require('../config/core');
const util = require('./util');
const moment = require('moment');

log4js.configure({
    appenders: {
        system: {
            type: 'multiFile',
            base: 'logs/',
            extension: '.log',
            property: 'logDay',
            compress: false, // backup files will have .gz extension
            // pattern: '_yyyy-MM-dd.log',
            // alwaysIncludePattern: true,
            maxLogSize: 10485760, // 10MB
            backups: 5 // 默认5
        }
    },
    categories: {
        default: {
            appenders: ['system'],
            level: appConfig.logLevel
        }
    }
});

let loggers = {
    accessLog: 'access',
    sysLog: 'system',
    dbLog: 'db',
    uploadLog: 'upload',
    threadLog: 'thread'
};
let logDay = moment().format('YYYY-MM-DD');
Object.keys(loggers).forEach((key) => {
    loggers[key] = log4js.getLogger(loggers[key]);
    loggers[key].addContext('logDay', loggers[key].category + '/' + logDay);
});

// ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF']
module.exports = Object.assign({}, loggers, {
    updateContext: () => {
        const today = moment().format('YYYY-MM-DD');
        if (logDay !== today) {
            logDay = today;
            Object.keys(loggers).forEach((key) => {
                loggers[key].addContext('logDay', loggers[key].category + '/' + logDay);
            });
        }
    },
    /**
     * 格式化日志消息
     * @method formatOpLog
     * @static
     * @param {Object} logObj 日志数据对象
     *      {string}[fn] 函数名
     *      {Object}[msg] 日志消息
     *      {Object}[data] 日志数据
     *      {Object}[req] 请求对象
     * @return {String} 日志内容:"Function: fn; Msg: error msg; Msg Detail: error detail info; Data: {"a":"b","c":"d"}" - IP - "UserAgent"
     * @author Fuyun
     * @version 3.0.0
     * @since 2.0.0
     */
    formatOpLog: (logObj) => {
        let logStr = '';
        let logData = [];
        if (logObj.fn) {
            logData.push('Function: ' + logObj.fn);
        }
        if (logObj.msg) {
            logData.push('Msg: ' + (typeof logObj.msg === 'string' ? logObj.msg : (logObj.msg.message || '未知错误')));
        }
        if (logObj.msgDetail) {
            logData.push('Msg Detail: ' + logObj.msgDetail);
        }
        if (logObj.data) {
            logData.push('Data: ' + JSON.stringify(logObj.data));
        }

        logStr += '"' + logData.join('; ') + '"';
        if (logObj.req) {
            logStr += ' - ' + util.getAccessUser(logObj.req);
        }

        return logStr;
    }
});
