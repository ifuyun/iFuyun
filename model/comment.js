/**
 * 评论(Comment)模型
 * @module m_comment
 * @requires moment, util, async
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const moment = require('moment');
const util = require('../helper/util');
const async = require('async');

/**
 * 评论(Comment)模型：封装评论查询操作
 * @class M_Comment
 * @constructor
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
var Comment = function Comment(pool) {
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

var common = {
    /**
     * 根据状态名获取对应含义
     * @method getDisplayStatus
     * @static
     * @param {String} status 状态名
     * @return {String} 状态描述
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getDisplayStatus: function(status) {
        var statusArr = {
            'normal': '获准',
            'pending': '待审',
            'spam': '垃圾评论',
            'trash': '已删除'
        };
        return statusArr[status] || '未知';
    }
};

Comment.prototype = {
    /**
     * 查询所有评论
     * @method getAllComments
     * @param {Object} param 查询参数
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllComments: function(param, callback) {
        var that = this,
            sqlParam = [],
            sqlWhere = 'where ';

        if (param.status !== 'all') {
            sqlWhere += 'comment_status = ? ';
            sqlParam.push(param.status);
        } else {
            sqlWhere += 'comment_status in (?) ';
            sqlParam.push(['normal', 'pending', 'spam', 'trash']);
        }
        if (param.keyword) {
            sqlWhere += 'and comment_content like ? ';
            sqlParam.push('%' + param.keyword + '%');
        }

        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                count: function(cb) {
                    conn.query('select count(1) total from comments ' + sqlWhere, sqlParam, function(err, result) {
                        if (err) {
                            return cb(err);
                        }
                        var data = {};
                        data.total = result[0].total;
                        data.pages = Math.ceil(data.total / that.pageLimit);
                        cb(null, data);
                    });
                },
                countGroup: function(cb) {
                    conn.query('select comment_status, count(1) total from comments group by comment_status', [], function(err, result) {
                        if (err) {
                            return cb(err);
                        }
                        var data = {
                            all: 0
                        },
                            countIdx = 0;

                        for ( countIdx = 0; countIdx < result.length; countIdx += 1) {
                            data[result[countIdx].comment_status] = result[countIdx].total;
                            data.all += result[countIdx].total;
                        }
                        cb(null, data);
                    });
                },
                //@formatter:off
                comment: ['count',
                    function (cb, results) {
                        var querySql = {
                            sql: 'select * from comments, posts ' + sqlWhere + 'and comments.post_id = posts.post_id order by comment_created desc limit ? offset ?',
                            nestTables: true
                        }, page;
    
                        page = param.page > results.count.pages ? results.count.pages : param.page;
                        page = page || 1;
                        conn.query(querySql, sqlParam.concat(that.pageLimit, that.pageLimit * (page - 1)), function (err, comments) {
                            cb(err, comments);
                        });
                    }]
                //@formatter:on
            }, function(err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                var resultData,
                    commentIdx,
                    curComment;
                    
                resultData = {
                    data: results.comment,
                    total: results.count.total,
                    pages: results.count.pages,
                    pageLimit: that.pageLimit,
                    count: results.countGroup
                };

                for ( commentIdx = 0; commentIdx < resultData.data.length; commentIdx += 1) {
                    curComment = resultData.data[commentIdx].comments;
                    curComment.display_created = moment(curComment.comment_created).format('YYYY-MM-DD');
                    curComment.display_status = common.getDisplayStatus(curComment.comment_status);
                }

                callback(null, resultData);
            });
        });
    },
    /**
     * 根据ID查询单条评论
     * @method getCommentById
     * @param {String} commentId 评论ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCommentById: function(commentId, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            var selectSql = {
                sql: 'select * from comments, posts where comments.comment_id = ? and comments.post_id = posts.post_id',
                nestTables: true
            };
            conn.query(selectSql, [commentId], function(err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    },
    /**
     * 查询指定文章的所有评论
     * @method getCommentsByPostId
     * @param {String} postId 文章ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCommentsByPostId: function(postId, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            conn.query('select * from comments where post_id = ? and comment_status = ? order by comment_created desc', [postId, 'normal'], function(err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                var commentIdx;
                for ( commentIdx = 0; commentIdx < results.length; commentIdx += 1) {
                    results[commentIdx].display_created = moment(results[commentIdx].comment_created).format('YYYY-MM-DD HH:mm');
                }
                callback(null, results);
            });
        });
    },
    /**
     * 查询指定文章的所有评论数
     * @method getCommentsByPostId
     * @param {String} postId 文章ID
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCommentCountByPostId: function(postId, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            conn.query('select count(1) total from comments where post_id = ? and comment_status = ?', [postId, 'normal'], function(err, results) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results[0].total);
            });
        });
    },
    /**
     * 保存评论
     * @method saveComment
     * @param {Object} data 评论数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    saveComment: function(data, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                post: function(cb){
                    var sql = '', paramArr = [data.postId];
                    
                    sql = 'select comment_flag, post_guid from posts where post_id = ?';
                    conn.query(sql, paramArr, function(err, result){
                        cb(err, result);
                    });
                },
                comment: ['post', function(cb, results) {
                    var updateSql = '',
                        paramArr = [],
                        commentFlag = 'verify';

                    if(results.post && results.post[0]){
                        commentFlag = results.post[0].comment_flag;
                    }
                    if (data.type === 'edit') {
                        updateSql = 'update comments set comment_content = ?, comment_modified = ? ';
                        updateSql += 'where comment_id = ?';
                        paramArr = [data.commentContent, new Date(), data.commentId];
                    } else {
                        updateSql = 'insert into comments(comment_id, post_id, comment_content, comment_status, comment_author, comment_author_email, ';
                        updateSql += 'comment_author_url, comment_author_ip, comment_created, comment_agent, parent_id, user_id) ';
                        updateSql += 'values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ';
                        paramArr = [util.getUuid(), data.postId, data.commentContent, data.isAdmin || commentFlag === 'open' ? 'normal' : 'pending', data.userName, data.userEmail, data.userSite, data.userIp, new Date(), data.userAgent, data.commentId, data.userId];
                    }

                    conn.query(updateSql, paramArr, function(err, result) {
                        cb(err, result);
                    });
                }]
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
     * 更新评论状态
     * @method updateStatus
     * @param {Object} data 评论数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    updateStatus: function(data, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                comment: function(cb) {
                    var updateSql = '',
                        paramArr = [];

                    updateSql = 'update comments set comment_status = ? ';
                    updateSql += 'where comment_id = ?';
                    paramArr = [data.status, data.commentId];
                    conn.query(updateSql, paramArr, function(err, result) {
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
     * 更新评论投票
     * @method updateCommentVote
     * @param {Object} data 评论数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    updateCommentVote: function(data, callback) {
        this.pool.getConnection(function(err, conn) {
            if (err) {
                return callback(err);
            }
            async.auto({
                comment: function(cb) {
                    var updateSql = '',
                        paramArr = [];

                    updateSql = 'update comments set comment_vote = (comment_vote + ?) ';
                    updateSql += 'where comment_id = ?';
                    paramArr = [data.voteCount, data.commentId];
                    conn.query(updateSql, paramArr, function(err, result) {
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
    }
};

module.exports = Comment;
