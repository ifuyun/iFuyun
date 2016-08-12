/**
 * 模型公共部分：创建连接池
 * @module m_base
 * @requires mysql
 * @author Fuyun
 * @version 1.0.0(2014-03-08)
 * @since 1.0.0(2014-03-08)
 */
module.exports.pool = require('mysql').createPool(require('../config/database').ifuyun);