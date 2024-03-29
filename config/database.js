/**
 * 数据库配置
 * @module cfg_database
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const credentials = require('./credentials');
const {dbLog: logger} = require('../helper/logger');
module.exports = {
    development: {
        username: credentials.db.development.username,
        password: credentials.db.development.password,
        database: 'ifuyun',
        host: 'localhost',
        dialect: 'mysql',
        timezone: '+08:00',
        pool: {
            max: 10,
            min: 0,
            idle: 30000
        },
        logging: (sql) => {
            logger.trace(sql);
        }
    },
    production: {
        username: credentials.db.production.username,
        password: credentials.db.production.password,
        database: 'ifuyun',
        host: 'localhost',
        dialect: 'mysql',
        timezone: '+08:00',
        pool: {
            max: 10,
            min: 0,
            idle: 30000
        },
        logging: (sql) => {
            logger.trace(sql);
        }
    }
};
