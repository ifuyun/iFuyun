/*jslint node:true*/
'use strict';
/**
 * 链接(Link)模型
 * @module m_link
 * @requires util, async
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const util = require('../helper/util');
const async = require('async');
/**
 * 链接(Link)模型：封装链接查询操作
 * @class M_Link
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
var Link = function Link(pool) {
    /**
     * 连接池对象
     * @attribute pool
     * @writeOnce
     * @type {Object}
     */
    this.pool = pool;
    /**
     * 单页显示数量
     * @attribute pageLimit
     * @type {Number}
     * @default 10
     */
    this.pageLimit = 10;
};

Link.prototype = {
    /**
     * 查询首页链接
     * @method getHomeLinks
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getHomeLinks: function(callback) {
        var that = this;
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            // var sql = 'select * from links where link_visible = ? or link_visible = ? order by link_rating desc';
            var sql = 'select * from links where (link_visible = ? or link_visible = ?) and link_id in (' + 'select object_id from term_relationships where term_taxonomy_id in (' + 'select taxonomy_id from term_taxonomy where slug = ?' + ')) order by link_rating desc';
            conn.query(sql, ['homepage', 'site', 'friendlink'], function(err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 查询站点链接（除首页）
     * @method getSiteLinks
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getSiteLinks: function(callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            // var sql = 'select * from links where link_visible = ? order by link_rating desc';
            var sql = 'select * from links where link_visible = ? and link_id in (' + 'select object_id from term_relationships where term_taxonomy_id in (' + 'select taxonomy_id from term_taxonomy where slug = ?' + ')) order by link_rating desc';
            conn.query(sql, ['site', 'friendlink'], function(err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 查询顶部链接
     * @method getQuickLinks
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getQuickLinks: function(callback) {//可以和以上两个方法合并
        var that = this;
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            var sql = 'select * from links where (link_visible = ? or link_visible = ?) and link_id in (' + 'select object_id from term_relationships where term_taxonomy_id in (' + 'select taxonomy_id from term_taxonomy where slug = ?' + ')) order by link_rating desc';
            conn.query(sql, ['homepage', 'site', 'quicklink'], function(err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 查询所有链接
     * @method getAllLinks
     * @param {Object} param 查询参数
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllLinks: function(param, callback) {
        var that = this;

        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            // var sqlParam = ['invisible'],
                // sqlWhere = 'where link_visible <> ?';
            var sqlParam = [],
                sqlWhere = '';

            async.auto({
                count: function(cb) {
                    conn.query('select count(1) total from links ' + sqlWhere, sqlParam, function(err, result) {
                        if (err) {
                            return cb(err);
                        }
                        var data = {};
                        data.total = result[0].total;
                        data.pages = Math.ceil(data.total / that.pageLimit);
                        cb(null, data);
                    });
                },
                //@formatter:off
                links: ['count',
                    function (cb, results) {
                        var sql = {
                            sql: 'select * from links ' + sqlWhere + 'order by link_rating desc limit ? offset ?',
                            nestTables: false
                        }, query, page;
    
                        page = param.page > results.count.pages ? results.count.pages : param.page;
                        page = page || 1;
                        query = conn.query(sql, sqlParam.concat(that.pageLimit, that.pageLimit * (page - 1)), function (err, cats) {
                            cb(err, cats);
                        });
                    }]
                //@formatter:on
            }, function(err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                var catData = {
                    links: results.links,
                    total: results.count.total,
                    pages: results.count.pages,
                    pageLimit: that.pageLimit
                };

                callback(null, catData);
            });
        });
    },
    /**
     * 根据ID查询链接
     * @method getLinkById
     * @param {String} linkId 链接ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getLinkById: function(linkId, callback) {
        var that = this;

        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            var sqlParam = ['invisible'],
                sqlWhere = 'where link_visible <> ?';

            async.auto({
                link: function(cb) {
                    conn.query('select * from links where link_id = ?', [linkId], function(err, result) {
                        cb(err, result);
                    });
                },
                linkType: function(cb) {
                    var sql = {
                        sql: 'select a.* from term_taxonomy a, term_relationships b where a.taxonomy_id = b.term_taxonomy_id and b.object_id = ?',
                        nestTables: false
                    },
                        query;

                    query = conn.query(sql, [linkId], function(err, result) {
                        cb(err, result);
                    });
                }
            }, function(err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    },
    /**
     * 保存链接
     * @method saveLink
     * @param {Object} data 链接数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    saveLink: function(data, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            conn.beginTransaction(function(errTs) {
                if (errTs) {
                    return callback(errTs);
                }
                var linkId = util.getUuid(),
                    nowTime = new Date();
                async.auto({
                    link: function(cb) {
                        var sql = '',
                            paramArr = [];

                        sql = 'insert into links(link_id, link_url, link_name, link_target, link_description, link_visible, link_owner, link_rating,  link_created) ';
                        sql += 'values(?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        paramArr = [linkId, data.linkUrl, data.linkName, data.linkTarget, data.linkDesc, data.linkVisible, data.user.user.user_id, data.linkRating, nowTime];

                        if (data.linkId) {
                            sql = 'update links set link_url = ?, link_name = ?, link_target = ?, link_description = ?, link_visible = ?, link_rating = ?, link_modified = ?';
                            sql += 'where link_id = ?';
                            paramArr = [data.linkUrl, data.linkName, data.linkTarget, data.linkDesc, data.linkVisible, data.linkRating, nowTime, data.linkId];
                        }

                        conn.query(sql, paramArr, function(err, result) {
                            cb(err, result);
                        });
                    },
                    taxonomy: function(cb) {
                        var sql = '',
                            paramArr = [];

                        sql = 'insert into term_relationships(object_id, term_taxonomy_id) ';
                        sql += 'values(?, ?)';
                        paramArr = [linkId, data.linkType];

                        if (data.linkId) {//一个链接只有一个分类
                            sql = 'update term_relationships set term_taxonomy_id = ? ';
                            sql += 'where object_id = ?';
                            paramArr = [data.linkType, data.linkId];
                        }
                        conn.query(sql, paramArr, function(err, result) {
                            cb(err, result);
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
    },
    /**
     * 删除链接
     * @method removeLink
     * @param {Object} data 链接数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    removeLink: function(data, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            conn.beginTransaction(function(errTs) {
                if (errTs) {
                    return callback(errTs);
                }
                var linkId = data.linkId;
                async.auto({
                    taxonomy: function(cb) {
                        var sql = '',
                            paramArr = [];

                        sql = 'delete from links where link_id = ?';
                        paramArr = [linkId];

                        conn.query(sql, paramArr, function(errT, result) {
                            cb(errT, result);
                        });
                    },
                    post: function(cb) {
                        var sql = '',
                            paramArr = [];

                        sql = 'delete from term_relationships where object_id = ?';
                        paramArr = [linkId];

                        conn.query(sql, paramArr, function(errP, result) {
                            cb(errP, result);
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

module.exports = Link;
