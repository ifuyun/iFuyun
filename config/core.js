/**
 * 基本配置信息
 * @module cfg_core
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const pkgCfg = require('../package.json');
const credential = require('./credentials');
module.exports = {
    // debug: true,
    name: '爱生活，爱抚云',
    version: pkgCfg.version,
    author: 'Fuyun',
    sessionSecret: credential.sessionSecret,
    cookieSecret: credential.cookieSecret,
    cookieExpires: 1000 * 60 * 60 * 24 * 7,
    host: '127.0.0.1',
    port: 2016,
    domain: 'ifuyun.com'
};
