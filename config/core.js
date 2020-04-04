/**
 * 基本配置信息
 * @module cfg_core
 * @author Fuyun
 * @version 3.1.1
 * @since 1.0.0
 */
const pkgCfg = require('../package.json');
const credentials = require('./credentials');
const env = (process.env.ENV && process.env.ENV.trim()) || 'development';
const isDev = env !== 'production';

module.exports = {
    siteName: '爱浮云',
    version: pkgCfg.version,
    author: 'Fuyun',
    sessionSecret: credentials.sessionSecret,
    cookieSecret: credentials.cookieSecret,
    cookieExpires: 1000 * 60 * 60 * 24 * 7,
    host: '127.0.0.1',
    port: 2016,
    domain: 'www.ifuyun.com',
    pathViews: isDev ? 'src' : 'dist',
    logLevel: isDev ? 'TRACE' : 'INFO',
    isDev
};
