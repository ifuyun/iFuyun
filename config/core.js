/**
 * 基本配置信息
 * @module cfg_core
 * @author Fuyun
 * @version 2.0.0
 * @since 1.0.0
 */
const pkgCfg = require('../package.json');
const credentials = require('./credentials');
const isDev = process.env.ENV && process.env.ENV.trim() !== 'production';

module.exports = {
    name: '爱生活，爱抚云',
    version: pkgCfg.version,
    author: 'Fuyun',
    sessionSecret: credentials.sessionSecret,
    cookieSecret: credentials.cookieSecret,
    cookieExpires: 1000 * 60 * 60 * 24 * 7,
    host: '127.0.0.1',
    port: 2016,
    domain: isDev ? 'i.ifuyun.com' : 'www.ifuyun.com',
    pathViews: isDev ? 'src' : 'dist',
    logLevel: isDev ? 'TRACE' : 'INFO',
    isDev
};
