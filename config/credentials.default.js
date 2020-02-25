/**
 * 安全信息配置
 * @module cfg_credential
 * @author Fuyun
 * @version 3.1.0
 * @since 1.0.0
 */
module.exports = {
    sessionSecret: '[session-secret]',
    cookieSecret: '[cookie-secret]',
    upload: {
        initUrl: '[url-init]',
        targetUrl: '[url-get-target]',
        bucket: '[bucket]',
        appKey: '[app-key]',
        appSecret: '[app-secret]',
        appAccessKey: '[app-access-key]',
        appSecretKey: '[app-secret-key]'
    },
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
