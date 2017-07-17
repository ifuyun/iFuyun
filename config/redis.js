/**
 * Redis配置
 * @module cfg_redis
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const credential = require('./credentials');
module.exports = {
    host: '127.0.0.1',
    port: 6379,
    passwd: credential.redis[(process.env.ENV && process.env.ENV.trim()) || 'development'].password
};
