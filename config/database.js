/**
 * 数据库配置
 * @module cfg_database
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const credential = require('./credentials');
module.exports = {
    use_env_variable: (process.env.ENV && process.env.ENV.trim()) || 'development',
    //TODO: to be removed.
    ifuyun: {
        host: 'localhost',
        port: '3306',
        user: credential.db.development.username,
        password: credential.db.development.password,
        database: 'ifuyun',
        charset: 'UTF8_GENERAL_CI'
    },
    development: {
        username: credential.db.development.username,
        password: credential.db.development.password,
        database: 'ifuyun',
        host: 'localhost',
        dialect: 'mysql'
    },
    production: {
        username: credential.db.production.username,
        password: credential.db.production.password,
        database: 'ifuyun',
        host: 'localhost',
        dialect: 'mysql'
    }
};