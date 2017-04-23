/**
 * 模型公共部分：创建连接池
 * @module m_base
 * @requires mysql
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
module.exports.pool = require('mysql').createPool(require('../config/database').ifuyun);