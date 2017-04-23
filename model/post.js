/**
 * 文章(Post)模型
 * @module m_post
 * @requires m_term_taxonomy, m_term_relationship, m_user, m_comment, moment, async, util, logger
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const TaxonomyModel = require('../model/termTaxonomy');
const TermRelModel = require('../model/termRelationship');
const UserModel = require('../model/user');
const CommentModel = require('../model/comment');
const moment = require('moment');
const async = require('async');
const util = require('../helper/util');
const Logger = require('../helper/logger');
const logger = Logger.sysLog;

/**
 * 文章(Post)模型：封装文章查询操作
 * @class M_Post
 * @constructor
 * @uses Taxonomy, TermRel, Term, User
 * @param {Object} pool 连接池对象
 * @return {void}
 * @author Fuyun
 * @version 1.0.0
 * @since 1.0.0
 */
var Post = function Post(pool) {
    /**
     * 分类模型实例
     * @attribute taxonomy
     * @writeOnce
     * @type {Object}
     */
    this.taxonomy = new TaxonomyModel(pool);
    /**
     * 分类关系模型实例
     * @attribute termRel
     * @writeOnce
     * @type {Object}
     */
    this.termRel = new TermRelModel(pool);
    /**
     * 用户模型实例
     * @attribute user
     * @writeOnce
     * @type {Object}
     */
    this.user = new UserModel(pool);
    /**
     * 评论模型实例
     * @attribute comment
     * @writeOnce
     * @type {Object}
     */
    this.comment = new CommentModel(pool);

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
    /**
     * 数据库默认日期
     * @attribute nullDate
     * @type {String}
     * @default '0000-00-00 00:00:00'
     */
    this.nullDate = '0000-00-00 00:00:00';
};

//共用方法
var common = {
    /**
     * 遍历分类关系获取分类名信息
     * @method getTerms
     * @static
     * @param {Function} cb 回调函数
     * @param {Object} that post实例
     * @param {Array} termRels 分类关系结果集(单篇文章)
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getTerms: function (cb, that, termRels) {
        async.map(termRels, function (termRel, fn) {
            that.taxonomy.getTermByTaxonomyId(termRel.term_taxonomy_id, fn);
        }, function (err, results) {
            cb(err, results);
        });
    },
    /**
     * 遍历文章获取作者信息
     * @method getAllUsers
     * @static
     * @param {Function} cb 回调函数
     * @param {Object} that post实例
     * @param {Array} posts 文章结果集
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllUsers: function (cb, that, posts) {
        async.map(posts, function (post, fn) {
            that.user.getUserById(post.posts.post_author, fn);
        }, function (err, data) {
            cb(err, data);
        });
    },
    /**
     * 遍历文章获取分类关系信息(分类目录、标签)
     * @method getAllTermRels
     * @static
     * @param {Function} cb 回调函数
     * @param {Object} that post实例
     * @param {Array} posts 文章结果集
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllTermRels: function (cb, that, posts) {
        async.map(posts, function (post, fn) {
            that.termRel.getTermRelsByObjId(post.posts.post_id, fn);
        }, function (err, data) {
            cb(err, data);
        });
    },
    /**
     * 遍历所有分类关系获取分类名信息
     * @method getAllTerms
     * @static
     * @param {Function} cb 回调函数
     * @param {Object} that post实例
     * @param {Array} termRels 分类关系结果集(多篇文章)
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllTerms: function (cb, that, termRels) {
        async.map(termRels, function (termRel, fn) {
            common.getTerms(fn, that, termRel);
        }, function (err, results) {
            cb(err, results);
        });
    },
    /**
     * 获取所有评论数
     * @method getAllCommentCount
     * @static
     * @param {Function} cb 回调函数
     * @param {Object} that post实例
     * @param {Array} posts 文章结果集
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllCommentCount: function (cb, that, posts) {
        async.map(posts, function (post, fn) {
            that.comment.getCommentCountByPostId(post.posts.post_id, fn);
        }, function (err, data) {
            cb(err, data);
        });
    },
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
    getDisplayStatus: function (status) {
        var statusArr = {
            'publish': '已发布',
            'private': '私密',
            'draft': '草稿',
            'auto-draft': '自动草稿',
            'trash': '回收站'
        };
        return statusArr[status] || '未知';
    }
};

Post.prototype = {
    /**
     * 查询post数量
     * @method p_getPostCount
     * @private
     * @param {String} sql 查询条件
     * @param {Array} params 查询参数
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    p_getPostCount: function (sql, params, callback) {
        var that = this;
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            conn.query(sql, params, function (err, result) {
                conn.release();
                if (err) {
                    return callback(err);
                }
                var data = {};
                data.total = result[0].total;
                data.pages = Math.ceil(data.total / that.pageLimit);
                callback(null, data);
            });
        });
    },
    /**
     * 查询post数量
     * @method getPostCount
     * @param {Array} param 查询参数
     * @param {String} type 文章类型
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getPostCount: function (param, type, callback) {
        var where;

        where = 'where post_type = ? and post_status = ?';

        if (util.isArray(param) && param.length > 1) {
            if (param.length > 1) {
                where = 'where post_status in (?)';
                param = [param];//转成二维数组，否则将只查询第一个参数
            } else {
                param = param[0];
            }
            // } else if ( typeof param !== 'string') {
            // param = param.toString();
        } else if (typeof param === 'string') {
            param = [param];
        }
        param.unshift(type);

        this.p_getPostCount('select count(1) total from posts ' + where, param, callback);
    },
    /**
     * 查询posts
     * @method p_getPosts
     * @private
     * @param {String} sql 查询条件
     * @param {Array} params 查询参数
     * @param {Number} [page=1] 请求页
     * @param {Function} countFn post数量查询函数
     * @param {Array} crumb 面包屑
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    p_getPosts: function (sql, params, page, countFn, crumb, callback) {
        var that = this;
        async.auto({
            count: countFn,
            //@formatter:off
            posts: ['count',
                function (cb, results) {
                    that.pool.getConnection(function (err, conn) {
                        if (err) {
                            return cb(err);
                        }
                        var postSql = {
                            sql: sql,
                            nestTables: true
                        }, postQuery;
    
                        page = page > results.count.pages ? results.count.pages : page;
                        page = page || 1;
                        postQuery = conn.query(postSql, params.concat(that.pageLimit, that.pageLimit * (page - 1)), function (err, posts) {
                            conn.release();
                            cb(err, posts);
                        });
                    });
                }],
            comments: ['posts', function(cb, results){
                common.getAllCommentCount(cb, that, results.posts);
            }],
            users: ['posts',
                function (cb, results) {
                    common.getAllUsers(cb, that, results.posts);
                }],
            termRels: ['posts',
                function (cb, results) {
                    common.getAllTermRels(cb, that, results.posts);
                }],
            terms: ['termRels',
                function (cb, results) {
                    common.getAllTerms(cb, that, results.termRels);
                }]
            //@formatter:on
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            var postData = {
                posts: [],
                total: results.count.total,
                pages: results.count.pages,
                pageLimit: that.pageLimit,
                crumb: crumb
            }, post, postIdx, term, termIdx, created, modified;

            for (postIdx = 0; postIdx < results.posts.length; postIdx += 1) {
                post = {};
                post.post = results.posts[postIdx].posts;
                created = moment(post.post.post_created === that.nullDate ? post.post.post_date : post.post.post_created);
                modified = moment(post.post.post_modified === that.nullDate ? post.post.post_date : post.post.post_modified);
                post.post.display_created = created.format('YYYY-MM-DD');
                post.post.display_created_time = created.format('YYYY-MM-DD HH:mm:ss');
                post.post.display_modified = modified.format('YYYY-MM-DD');
                post.post.display_modified_time = modified.format('YYYY-MM-DD HH:mm:ss');
                post.post.display_date = moment(post.post.post_date).format('YYYY-MM-DD');
                post.post.display_month = util.getMonthName(post.post.post_date.getMonth() + 1);
                post.post.post_excerpt = post.post.post_excerpt || util.cutStr(util.filterHtmlTag(post.post.post_content), 120);
                post.post.display_status = common.getDisplayStatus(post.post.post_status);
                post.category = [];
                post.tag = [];
                post.author = results.users[postIdx];//TODO: must mapped in post_id
                post.post.comments = results.comments[postIdx];//TODO: must mapped in post_id

                for (termIdx = 0; termIdx < results.terms[postIdx].length; termIdx += 1) {
                    term = results.terms[postIdx][termIdx];
                    if (term.taxonomy === 'post') {
                        post.category.push(term);
                    } else if (term.taxonomy === 'tag') {
                        post.tag.push(term);
                    }
                }

                postData.posts.push(post);
            }

            callback(null, postData);
        });
    },
    /**
     * 查询所有post
     * @method getAllPosts
     * @param {Number} param 请求参数对象:page,tag,category,author,postStatus
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getAllPosts: function (param, callback) {
        var select, where, order, sqlParam, that = this;

        select = 'select * from posts ';
        where = 'where post_type = ? ';
        sqlParam = [param.type || 'post'];

        order = 'order by post_created desc, post_date desc limit ? offset ?';//post_date

        if (param.postStatus === 'draft') {
            where += 'and (post_status = ? or post_status = ?) ';
            sqlParam.push('draft', 'auto-draft');
        } else if (param.postStatus !== 'all') {
            where += 'and post_status = ? ';
            sqlParam.push(param.postStatus);
        } else {
            where += 'and post_status in (?) ';
            sqlParam.push(['publish', 'private', 'draft', 'auto-draft', 'trash']);
        }
        if (param.author) {
            where += 'and post_author = ? ';
            sqlParam.push(param.author);
        }
        if (param.postDate) {
            where += 'and date_format(post_date,"%Y/%m") = ? ';
            sqlParam.push(param.postDate);
            // order = 'order by post_date desc limit ? offset ?';
        }
        if (param.keyword) {
            where += 'and (post_title like ? or post_content like ? or post_excerpt like ?) ';
            sqlParam.push('%' + param.keyword + '%', '%' + param.keyword + '%', '%' + param.keyword + '%');
        }
        if (param.fromAdmin) {//管理后台仍按发表时间排序
            order = 'order by post_created desc, post_date desc limit ? offset ?';
        }

        this.p_getPosts(select + where + order, sqlParam, param.page, function (cb) {
            that.p_getPostCount('select count(1) total from posts ' + where, sqlParam, cb);
        }, null, callback);
    },
    /**
     * 根据日期（年月）查询post
     * @method getPostsByDate
     * @param {Number|String} year 年
     * @param {String} month 月
     * @param {Number} page 请求页
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.0.0
     */
    getPostsByDate: function (param, callback) {
        var select, where, order, sqlParam, dateFilter = '', that = this;

        select = 'select * from posts ';
        where = 'where post_type = ? ';
        sqlParam = [param.type || 'post'];

        if (param.month) {
            dateFilter = '%Y%m';
        } else {
            dateFilter = '%Y';
        }
        if (param.postStatus === 'draft') {
            where += 'and (post_status = ? or post_status = ?) ';
            sqlParam.push('draft', 'auto-draft');
        } else if (param.postStatus !== 'all') {
            where += 'and post_status = ? ';
            sqlParam.push(param.postStatus);
        } else {
            where += 'and post_status in (?) ';
            sqlParam.push(['publish', 'private', 'draft', 'auto-draft', 'trash']);
        }
        if (param.author) {
            where += 'and post_author = ? ';
            sqlParam.push(param.author);
        }
        if (param.keyword) {
            where += 'and (post_title like ? or post_content like ? or post_excerpt like ?) ';
            sqlParam.push('%' + param.keyword + '%', '%' + param.keyword + '%', '%' + param.keyword + '%');
        }
        where += 'and date_format(post_date,"' + dateFilter + '") = ? ';
        sqlParam.push(param.month ? param.year.toString() + param.month : param.year);

        order = 'order by post_date desc, post_created desc limit ? offset ?';

        this.p_getPosts(select + where + order, sqlParam, param.page, function (cb) {
            that.p_getPostCount('select count(1) total from posts ' + where, sqlParam, cb);
        }, null, callback);
    },
    /**
     * 根据标签查询post
     * @method getPostsByTag
     * @param {String} tag 标签
     * @param {Number} page 请求页
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getPostsByTag: function (param, callback) {
        var that = this;
        async.parallel({
            taxonomy: function (cb) {
                that.taxonomy.getTaxonomyBySlug(param.tag, 'tag', cb);
            }
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            if (!results.taxonomy) {//TODO:无该标签
                return callback(null);
            }
            var taxonomy = results.taxonomy, select, where, order, sqlParam;

            select = 'select posts.* from posts, term_relationships ';
            where = 'where posts.post_id = term_relationships.object_id and post_type = ? and term_relationships.term_taxonomy_id = ? ';
            sqlParam = ['post', taxonomy.taxonomy_id];
            order = 'order by post_created desc, post_date desc limit ? offset ?';//post_date

            // if (param.postStatus && param.postStatus !== 'all') {
            // where += 'and posts.post_status = ?';
            // sqlParam.push(param.postStatus);
            // }
            if (param.postStatus === 'draft') {
                where += 'and (post_status = ? or post_status = ?) ';
                sqlParam.push('draft', 'auto-draft');
            } else if (param.postStatus !== 'all') {
                where += 'and post_status = ? ';
                sqlParam.push(param.postStatus);
            } else {
                where += 'and post_status in (?) ';
                sqlParam.push(['publish', 'private', 'draft', 'auto-draft', 'trash']);
            }
            if (param.author) {
                where += 'and posts.post_author = ?';
                sqlParam.push(param.author);
            }
            if (param.postDate) {
                where += 'and date_format(post_date,"%Y/%m") = ? ';
                sqlParam.push(param.postDate);
                order = 'order by post_date desc limit ? offset ?';
            }
            if (param.keyword) {
                where += 'and (post_title like ? or post_content like ? or post_excerpt like ?) ';
                sqlParam.push('%' + param.keyword + '%', '%' + param.keyword + '%', '%' + param.keyword + '%');
            }

            that.p_getPosts(select + where + order, sqlParam, param.page, function (cb) {
                that.p_getPostCount('select count(1) total from posts, term_relationships ' + where, sqlParam, cb);
            }, {
                tagName: results.taxonomy.name
            }, callback);
        });
    },
    /**
     * 根据分类查询post
     * @method getPostsByCategories
     * @param {String} category 分类
     * @param {Number} page 请求页
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getPostsByCategories: function (param, callback) {
        var that = this;
        async.auto({
            taxonomy: function (cb) {
                that.taxonomy.getTaxonomyBySlug(param.category, 'post', cb);
            },
            //@formatter:off
            categories: ['taxonomy',
                function (cb, results) {
                    if(!results.taxonomy || !results.taxonomy.taxonomy_id){
                        return cb(null);
                    }
                    that.taxonomy.getChildCategories(results.taxonomy.taxonomy_id, cb);
                }],
            crumb: ['taxonomy',
                function (cb, results) {
                    if(!results.taxonomy || !results.taxonomy.taxonomy_id){
                        return cb(null);
                    }
                    that.taxonomy.getParentCategories(results.taxonomy.taxonomy_id, cb);
                }]
            //@formatter:on
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            if (!results.taxonomy || !results.taxonomy.taxonomy_id) {//无该分类
                return callback(null);
            }
            var categories = results.categories, select, where, order, sqlParam, catArr = [], catIdx;

            for (catIdx = 0; catIdx < categories.length; catIdx += 1) {
                catArr.push('"' + categories[catIdx] + '"');
            }

            select = 'select distinct(posts.post_id), posts.* from posts, term_relationships ';//去重，但包含重复字段：post_id
            where = 'where posts.post_id = term_relationships.object_id and post_type = ? and term_relationships.term_taxonomy_id in (' + catArr.join(',') + ') ';
            sqlParam = ['post'];
            order = 'order by post_created desc, post_date desc limit ? offset ?';//post_date

            // if (param.postStatus && param.postStatus !== 'all') {
            // where += 'and posts.post_status = ?';
            // sqlParam.push(param.postStatus);
            // }
            if (param.postStatus === 'draft') {
                where += 'and (post_status = ? or post_status = ?) ';
                sqlParam.push('draft', 'auto-draft');
            } else if (param.postStatus !== 'all') {
                where += 'and post_status = ? ';
                sqlParam.push(param.postStatus);
            } else {
                where += 'and post_status in (?) ';
                sqlParam.push(['publish', 'private', 'draft', 'auto-draft', 'trash']);
            }
            if (param.author) {
                where += 'and posts.post_author = ?';
                sqlParam.push(param.author);
            }
            if (param.postDate) {
                where += 'and date_format(post_date,"%Y/%m") = ? ';
                sqlParam.push(param.postDate);
                order = 'order by post_date desc limit ? offset ?';
            }
            if (param.keyword) {
                where += 'and (post_title like ? or post_content like ? or post_excerpt like ?) ';
                sqlParam.push('%' + param.keyword + '%', '%' + param.keyword + '%', '%' + param.keyword + '%');
            }

            that.p_getPosts(select + where + order, sqlParam, param.page, function (cb) {
                that.p_getPostCount('select count(1) total from posts, term_relationships ' + where, sqlParam, cb);
            }, results.crumb, callback);
        });
    },
    /**
     * 根据ID查询post
     * @method getPostById
     * @param {String} postId postId
     * @param {String} type 'id', or 'guid'
     * @param {Boolean} isAdminUser 是否以管理员登录
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getPostById: function (postId, type, isAdminUser, callback) {
        var that = this;
        async.auto({
            post: function (cb) {
                that.pool.getConnection(function (err, conn) {
                    if (err) {
                        return cb(err);
                    }
                    var postSql, postQuery;
                    postSql = {
                        nestTables: false
                    };
                    if (type === 'guid') {
                        postSql.sql = 'select * from posts where post_guid = ?';
                    } else {
                        postSql.sql = 'select * from posts where post_id = ?';
                    }
                    postQuery = conn.query(postSql, [postId], function (err, posts) {
                        conn.release();
                        if (err) {
                            return cb(err);
                        }
                        if (posts.length < 1) {//无记录提前返回
                            return cb('post not exist');//TODO
                        }
                        cb(null, posts[0]);
                    });
                });
            },
            count: ['post', function (cb, results) {
                if (!isAdminUser && results.post.post_status !== 'publish') {//非管理员不执行后续查询
                    return cb(403, results);
                }
                that.pool.getConnection(function (err, conn) {
                    if (err) {
                        return cb(err);
                    }
                    var postSql, postQuery;
                    postSql = {
                        nestTables: false
                    };
                    if (type === 'guid') {
                        postSql.sql = 'update posts set post_view_count = post_view_count + 1 where post_guid = ?';
                    } else {
                        postSql.sql = 'update posts set post_view_count = post_view_count + 1 where post_id = ?';
                    }
                    postQuery = conn.query(postSql, [postId], function (err, count) {
                        conn.release();
                        if (err) {
                            return cb(err);
                        }
                        cb(null);
                    });
                });
            }],
            comments: ['post', function (cb, results) {
                that.comment.getCommentsByPostId(results.post.post_id, cb);
            }],
            //@formatter:off
            user: ['post',
                function (cb, results) {
                    that.user.getUserById(results.post.post_author, cb);
                }],
            termRels: ['post',
                function (cb, results) {
                    that.termRel.getTermRelsByObjId(results.post.post_id, cb);
                }],
            terms: ['termRels',
                function (cb, results) {
                    common.getTerms(cb, that, results.termRels);
                }]
            //@formatter:on
        }, function (err, results) {
            if (err === 403) {
                return callback(null, results);
            }
            if (err) {
                return callback(err);
            }
            var post, termIdx, curTerm;

            post = {};
            post.post = results.post;
            post.post.display_created = moment(post.post.post_created === that.nullDate ? post.post.post_date : post.post.post_created).format('YYYY-MM-DD');
            post.post.display_full_date = moment(post.post.post_modified || post.post.post_created).format('YYYY-MM-DD HH:mm');
            post.post.display_date = moment(post.post.post_date).format('YYYY-MM-DD');
            post.post.display_month = util.getMonthName(post.post.post_date.getMonth() + 1);
            post.category = [];
            post.tag = [];
            post.author = results.user;
            // post.crumb = results.crumb;
            post.comments = results.comments;

            for (termIdx = 0; termIdx < results.terms.length; termIdx += 1) {
                curTerm = results.terms[termIdx];
                if (curTerm.taxonomy === 'post') {
                    post.category.push(curTerm);
                } else if (curTerm.taxonomy === 'tag') {
                    post.tag.push(curTerm);
                }
            }
            callback(null, post);
        });
    },
    /**
     * 查询post归档日期
     * @method getArchiveDates
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getArchiveDates: function (type, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var dateSql, dateQuery;
            dateSql = 'select date_format(post_date, "%Y/%m") link_date, date_format(post_date,"%Y年%m月") display_date, count(1) count ';
            dateSql += 'from posts where post_status = ? and post_type = ? group by date_format(post_date,"%Y-%m") order by link_date desc';
            dateQuery = conn.query(dateSql, ['publish', type], function (err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 查询最近post
     * @method getRecentPosts
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getRecentPosts: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var recentSql, recentQuery;
            recentSql = 'select post_id, post_title, post_guid ';
            recentSql += 'from posts where post_status = ? and post_type = ? order by post_modified desc, post_date desc limit 10 offset 0';//post_date
            recentQuery = conn.query(recentSql, ['publish', 'post'], function (err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 查询随机post
     * @method getRandPosts
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getRandPosts: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var randSql, randQuery;
            randSql = 'select post_id, post_title, post_guid ';
            randSql += 'from posts where post_status = ? and post_type = ? order by rand() limit 10 offset 0';
            randQuery = conn.query(randSql, ['publish', 'post'], function (err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 查询热门post
     * @method getHotPosts
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getHotPosts: function (callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            var randSql, randQuery;
            randSql = 'select post_id, post_title, post_guid ';
            randSql += 'from posts where post_status = ? and post_type = ? order by post_view_count desc limit 10 offset 0';
            randQuery = conn.query(randSql, ['publish', 'post'], function (err, result) {
                conn.release();
                callback(err, result);
            });
        });
    },
    /**
     * 保存文章
     * @method savePost
     * @param {Object} data 文章数据
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    savePost: function (data, callback) {
        this.pool.getConnection(function (err, conn) {
            if (err) {
                return callback(err);
            }
            conn.beginTransaction(function (errTs) {
                if (errTs) {
                    return callback(errTs);
                }
                var newUuid = util.getUuid();
                async.auto({
                    deleted: function (cb) {
                        var deleteSql = '';
                        if (data.type === 'post' && data.postId) {
                            newUuid = data.postId;
                            deleteSql = 'delete from term_relationships where object_id = ?';
                            conn.query(deleteSql, [data.postId], function (errD, result) {
                                cb(errD, result);
                            });
                        } else {
                            cb(null);
                        }
                    },
                    checkUrl: function (cb) {
                        if (!data.postUrl) {
                            return cb(null);
                        }
                        var sql = 'select count(1) total from posts where post_guid = ?', paramArr = [data.postUrl];
                        if (data.postId) {
                            sql += ' and post_id <> ?';
                            paramArr.push(data.postId);
                        }
                        conn.query(sql, paramArr, function (err, result) {
                            cb(err, result);
                        });
                    },
                    post: ['checkUrl', function (cb, checkResult) {//插入文章
                        if (checkResult.checkUrl && checkResult.checkUrl[0].total) {
                            return cb('URL已存在');
                        }
                        var insertSql = '', paramArr = [], commentFlag, postStatus, postOriginal, nowTime = new Date(), postDate, postGuid;

                        switch (data.postComment) {
                            case '1':
                                commentFlag = 'open';
                                break;
                            case '0':
                                commentFlag = 'closed';
                                break;
                            default:
                                commentFlag = 'verify';
                        }
                        // commentFlag = data.postComment === '1' ? 'open' : 'closed';
                        postOriginal = data.postOriginal === '1';
                        postStatus = data.postStatus === 'password' ? 'publish' : data.postStatus;
                        postDate = data.postDate ? moment(data.postDate).toDate() : nowTime;
                        postGuid = data.postUrl || '/post/' + newUuid;

                        insertSql = 'insert into posts(post_id, post_author, post_date, post_content, post_title, post_excerpt, post_status, comment_flag, post_original, post_password, post_created, post_guid, post_type) ';
                        insertSql += 'values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        paramArr = [newUuid, data.user.user.user_id, postDate, data.postContent, data.postTitle, data.postExcerpt, postStatus, commentFlag, postOriginal, data.postPassword || '', nowTime, postGuid, data.type];//options.site_url.option_value + 'post/' + newUuid

                        if (data.postId) {
                            insertSql = 'update posts set post_author = ?, post_date = ?, post_date_gmt = ?, post_content = ?, post_title = ?, ';
                            insertSql += 'post_excerpt = ?, post_status = ?, comment_flag = ?, post_original = ?, post_password = ?, post_modified = ?, post_guid = ? ';
                            insertSql += 'where post_id = ?';
                            paramArr = [data.user.user.user_id, postDate, postDate, data.postContent, data.postTitle, data.postExcerpt, postStatus, commentFlag, postOriginal, data.postPassword || '', nowTime, postGuid, data.postId];
                        }
                        conn.query(insertSql, paramArr, function (errP, result) {
                            cb(errP, result);
                        });
                    }],
                    category: ['post', function (cb, postResult) {//插入分类目录
                        if (data.type === 'page' || data.type === 'attachment') {
                            return cb(null);
                        }
                        async.times(data.postCategory.length, function (i, next) {
                            var insertSql = '';
                            insertSql = 'insert into term_relationships(object_id, term_taxonomy_id) values(?, ?)';
                            conn.query(insertSql, [newUuid, data.postCategory[i]], function (errC, insertResult) {
                                next(errC, insertResult);
                            });
                        }, function (errC, cateResult) {
                            cb(errC, cateResult);
                        });
                    }],
                    tag: ['post', function (cb, postResult) {//插入标签，及标签关联记录
                        if (data.type === 'page' || data.type === 'attachment') {
                            return cb(null);
                        }
                        async.times(data.postTag.length, function (i, next) {//循环标签列表
                            async.auto({
                                term: function (cbQ) {//分类表操作
                                    var curTag = data.postTag[i].trim();
                                    conn.query('select * from term_taxonomy where slug = ?', [curTag], function (errQ, queryResult) {
                                        if (errQ) {
                                            return next(errQ);
                                        }
                                        var taxonomyId = util.getUuid();
                                        if (queryResult.length > 0) {//已存在标签
                                            cbQ(errQ, queryResult[0].taxonomy_id);//TODO:更新记录数
                                        } else {//新标签
                                            async.parallel({
                                                taxonomy: function (cbI) {//标签扩展属性
                                                    conn.query('insert into term_taxonomy(taxonomy_id, taxonomy, name, slug, description, count, created) values(?,?,?,?,?,?,?)', [taxonomyId, 'tag', curTag, curTag, curTag, 1, new Date()], function (errI, insertResult) {
                                                        cbI(errI, insertResult);
                                                    });
                                                }
                                            }, function (errI, insertResult) {
                                                cbQ(errI, taxonomyId);
                                            });
                                        }
                                    });
                                },
                                relationship: ['term', function (cbI, queryResult) {//关系表操作
                                    conn.query('insert into term_relationships(object_id, term_taxonomy_id) values(?,?)', [newUuid, queryResult.term], function (errI, insertResult) {
                                        cbI(errI, queryResult);
                                    });
                                }]

                            }, function (errT, insertResult) {
                                next(errT, insertResult);
                            });
                        }, function (errT, allResult) {
                            cb(errT, allResult);
                        });
                    }]
                }, function (err, results) {
                    if (err) {
                        return conn.rollback(function () {//回滚
                            return callback(err);
                        });
                    }
                    conn.commit(function (errC) {//提交
                        if (errC) {
                            return conn.rollback(function () {//回滚
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
     * 查询当前文章的上一篇
     * @method getPrevPost
     * @param {String} postId postId
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 2.2.0
     * @since 2.2.0
     */
    getPrevPost: function (postId, callback) {
        var that = this;
        this.pool.getConnection(function (err, conn) {
            if (err) {
                logger.error('"Function: getPrevPost, Param: ' + JSON.stringify({postId: postId}) + ', Error: ' + err + '"');
                return callback(err);
            }
            var prevSql = '', prevQuery;
            prevSql = 'select post_id, post_guid, post_title ';
            prevSql += 'from posts ';
            prevSql += 'where post_status = ? and post_type = ? and post_created > (select post_created from posts where post_id = ?) ';
            prevSql += 'order by post_created asc limit 1 offset 0';
            prevQuery = conn.query(prevSql, ['publish', 'post', postId], function (err, result) {
                conn.release();
                logger.info('"Function: getPrevPost, Param: ' + JSON.stringify({postId: postId}) + ', Data: ' + JSON.stringify(result) + '"');
                callback(err, result);
            });
        });
    },
    /**
     * 查询当前文章的下一篇
     * @method getNextPost
     * @param {String} postId postId
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 2.2.0
     * @since 2.2.0
     */
    getNextPost: function (postId, callback) {
        var that = this;
        this.pool.getConnection(function (err, conn) {
            if (err) {
                logger.error('"Function: getNextPost, Param: ' + JSON.stringify({postId: postId}) + ', Error: ' + err + '"');
                return callback(err);
            }
            var prevSql = '', prevQuery;
            prevSql = 'select post_id, post_guid, post_title ';
            prevSql += 'from posts ';
            prevSql += 'where post_status = ? and post_type = ? and post_created < (select post_created from posts where post_id = ?) ';
            prevSql += 'order by post_created desc limit 1 offset 0';
            prevQuery = conn.query(prevSql, ['publish', 'post', postId], function (err, result) {
                conn.release();
                logger.info('"Function: getNextPost, Param: ' + JSON.stringify({postId: postId}) + ', Data: ' + JSON.stringify(result) + '"');
                callback(err, result);
            });
        });
    }
};

module.exports = Post;
