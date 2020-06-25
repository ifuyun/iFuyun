/**
 * 安全信息配置
 * @module cfg_credential
 * @author Fuyun
 * @version 3.3.5
 * @since 1.0.0
 */
module.exports = {
    sessionSecret: '[session-secret]',
    cookieSecret: '[cookie-secret]',
    wxMpAppID: '[wechat-mp-app-id]',
    wxMpAppSecret: '[wechat-mp-app-secret]',
    redis: {
        development: {
            password: '[redis-dev-pwd]'
        },
        production: {
            password: '[redis-prd-pwd]'
        }
    },
    db: {
        development: {
            username: '[db-dev-user]',
            password: '[db-dev-pwd]'
        },
        production: {
            username: '[db-prd-user]',
            password: '[db-prd-pwd]'
        }
    },
    book: {
        excelPath: '[books-excel-file-path]'
    }
};
