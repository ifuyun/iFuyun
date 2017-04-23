/**
 * 用户(User)模型
 * @module m_user
 * @requires async, util
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const async = require('async');
const util = require('../helper/util');

/**
 * 用户(User)模型：封装用户查询操作
 * @class M_User
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
var User = function User(pool) {
    /**
     * 连接池对象
     * @attribute pool
     * @writeOnce
     * @type {Object}
     */
    this.pool = pool;
};

User.prototype = {
    /**
     * 根据用户ID查询用户
     * @method getUserById
     * @param {String} userId 用户ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getUserById: function (userId, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                user: function (cb) {
                    conn.query('select * from users where users.user_id = ?', [userId], function (err, result) {
                        if (result.length > 0) {
                            cb(err, result[0]);
                        } else {
                            cb(util.catchError({
                                status: 500,
                                code: 500,
                                message: '用户不存在'
                            }));
                        }
                    });
                },
                usermeta: ['user', function (cb, userResult) {
                    conn.query('select * from usermeta where user_id = ? ', [userResult.user.user_id], function (err, result) {
                        var metaIdx = 0, metaObj = {};
                        for (metaIdx = 0; metaIdx < result.length; metaIdx += 1) {
                            metaObj[result[metaIdx].meta_key] = result[metaIdx].meta_value;
                        }
                        cb(err, metaObj);
                    });
                }]
            }, function (err, results) {
                if (err) {
                    return callback(err);
                }
                conn.release();
                callback(null, results);
            });
        });
    },
    /**
     * 根据用户名、密码查询用户是否存在
     * @method findUser
     * @param {String} username 用户名
     * @param {String} password 密码
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    findUser: function (username, password, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                user: function (cb) {
                    conn.query('select * from users where users.user_login = ? and users.user_pass = md5(concat(users.user_pass_salt, ?))', [username, password], function (err, result) {
                        if (result.length > 0) {
                            cb(err, result[0]);
                        } else {
                            cb(util.catchError({
                                status: 200,
                                code: 400,
                                message: '用户名或密码错误'
                            }));

                        }
                    });
                },
                usermeta: ['user', function (cb, userResult) {
                    conn.query('select * from usermeta where user_id = ? ', [userResult.user.user_id], function (err, result) {
                        var metaIdx = 0, metaObj = {};
                        for (metaIdx = 0; metaIdx < result.length; metaIdx += 1) {
                            metaObj[result[metaIdx].meta_key] = result[metaIdx].meta_value;
                        }
                        cb(err, metaObj);
                    });
                }]
            }, function (err, results) {
                if (err) {
                    return callback(err);
                }
                conn.release();
                callback(null, results);
            });
        });
    }
};

module.exports = User;
