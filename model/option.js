/**
 * 配置(Option)模型
 * @module m_option
 * @requires async
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const async = require('async');

/**
 * 配置(Option)模型：站点配置查询等
 * @class M_Option
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
var Option = function Option (pool) {
    'use strict';
    /**
     * 连接池对象
     * @attribute pool
     * @writeOnce
     * @type {Object}
     */
    this.pool = pool;
};

Option.prototype = {
    /**
     * 查询自动加载的配置项
     * @method getAutoloadOptions
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAutoloadOptions: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var sql = 'select * from options where autoload = 1';
            conn.query(sql, function (err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 保存常规设置
     * @method saveGeneral
     * @param {Object} data 配置数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    saveGeneral: function(data, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            conn.beginTransaction(function(errTs) {
                if (errTs) {
                    return callback(errTs);
                }
                async.auto({
                    options: function(cb) {//需要关联user: 增加user_id字段
                        async.times(data.options.length, function (i, next) {
                            var updateSql = '';
                            updateSql = 'update options set option_value = ? where option_name = ?';
                            
                            conn.query(updateSql, [data.options[i].value, data.options[i].name], function (errT, insertResult) {
                                next(errT, insertResult);
                            });
                        }, function (errO, cateResult) {
                            cb(errO, cateResult);
                        });
                    }
                }, function(err, results) {
                    if (err) {
                        return conn.rollback(function() {//回滚
                            return callback(err);
                        });
                    }
                    conn.commit(function(errC) {//提交
                        if (errC) {
                            return conn.rollback(function() {//回滚
                                return callback(errC);
                            });
                        }
                        callback(null, results);
                    });
                });
            });
        });
    }
};

module.exports = Option;
