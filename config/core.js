/**
 * 全局配置文件
 * @author Fuyun
 * @version 1.0.0(2014-06-12)
 * @since 1.0.0(2014-05-16)
 */
var pkgCfg = require('../package.json');
module.exports = {
    debug: true,
    name: '爱生活，爱抚云',
    version: pkgCfg.version,
    author: 'Fuyun',
    sessionSecret: 'secret@session',
    authCookieName: 'secret@cookie',
    cookieExpires: 1000 * 60 * 60 * 24 * 7,
    host: '127.0.0.1',
    port: 2016,
    domain: 'ifuyun.com'
};
