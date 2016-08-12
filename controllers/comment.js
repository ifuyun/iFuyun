/**
 * 控制器：评论管理
 * @module c_comment
 * @class C_Comment
 * @static
 * @requires async, sanitizer, c_base, m_base, util, m_user, m_comment, m_vote
 * @author Fuyun
 * @version 1.1.0(2015-02-26)
 * @since 1.1.0(2015-02-26)
 */
var async = require('async'),
    xss = require('sanitizer'),

    base = require('./base'),
    pool = require('../model/base').pool,
    util = require('../helper/util'),

    UserModel = require('../model/user'),
    CommentModel = require('../model/comment'),
    VoteModel = require('../model/vote'),

    user = new UserModel(pool),
    comment = new CommentModel(pool),
    vote = new VoteModel(pool),

    pagesOut = 9,
    idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    /**
     * 评论列表，管理评论
     * @method listComments
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    listComments: function (req, res, next) {
        'use strict';
        var page = parseInt(req.params.page, 10) || 1,
            resData,
            param;

        resData = {
            meta: {
                title: ''
            },
            page: 'comment',
            token: req.csrfToken()
        };

        param = {
            page: page,
            status: req.query.status || 'all',
            keyword: req.query.keyword || ''
        };

        req.session.referer = req.headers.referer;

        async.parallel({
            comments: function (cb) {
                comment.getAllComments(param, cb);
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var paramArr = [],
                titleArr = [],
                options = results.options;

            if (param.keyword) {
                paramArr.push('keyword=' + param.keyword);
                titleArr.push(param.keyword, '搜索');
            }
            if (req.query.status) {//TODO:英文转中文
                paramArr.push('status=' + param.status);
                titleArr.push(param.status, '状态');
            }

            if (results.comments) {
                resData.paginator = util.paginator(page, results.comments.pages, pagesOut);
                resData.paginator.pageLimit = results.comments.pageLimit;
                resData.paginator.total = results.comments.total;
                resData.paginator.linkUrl = '/admin/comment/page-';
                resData.paginator.linkParam = '';
            }
            if (page > 1) {
                resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', '评论列表', '管理后台', options.site_name.option_value]));
            } else {
                resData.meta.title = util.getTitle(titleArr.concat(['评论列表', '管理后台', options.site_name.option_value]));
            }

            resData.commentData = results.comments.data;
            resData.count = results.comments.count;
            resData.curStatus = param.status;
            resData.curKeyword = param.keyword;

            resData.options = options;
            resData.util = util;

            res.render('admin/pages/p_comment_list', resData);
        });
    },
    /**
     * 修改评论
     * @method editComment
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    editComment: function (req, res, next) {
        'use strict';
        var resData,
            commentId = req.params.commentId || '';

        if (!commentId || !idReg.test(commentId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }

        req.session.referer = req.headers.referer;

        resData = {
            meta: {
                title: ''
            },
            page: 'comment',
            comment: false,
            token: req.csrfToken()
        };

        async.parallel({
            comment: function (cb) {
                comment.getCommentById(commentId, function (err, data) {
                    if (err) {
                        return cb(err, data);
                    }
                    cb(null, data);
                });
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            if (results.comment.length < 1) {
                return util.catchError({
                    status: 404,
                    code: 404,
                    message: 'Page Not Found'
                }, next);
            }
            var options = results.options;

            resData.comment = results.comment[0];
            resData.options = options;

            resData.meta.title = util.getTitle([resData.comment.comments.comment_content, '编辑评论', '管理后台', options.site_name.option_value]);

            res.render('admin/pages/p_comment_form', resData);
        });
    },
    /**
     * 评论回复
     * @method replyComment
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    replyComment: function (req, res, next) {
        'use strict';
        var resData,
            commentId = req.params.commentId || '';

        if (!commentId || !idReg.test(commentId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }

        req.session.referer = req.headers.referer;

        resData = {
            meta: {
                title: ''
            },
            page: 'comment',
            comment: false,
            token: req.csrfToken()
        };

        async.parallel({
            comment: function (cb) {
                comment.getCommentById(commentId, function (err, data) {
                    if (err) {
                        return cb(err, data);
                    }
                    cb(null, data);
                });
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            if (results.comment.length < 1) {
                return util.catchError({
                    status: 404,
                    code: 404,
                    message: 'Page Not Found'
                }, next);
            }
            var options = results.options;

            resData.comment = results.comment[0];
            resData.options = options;

            resData.meta.title = util.getTitle([resData.comment.comments.comment_content, '回复评论', '管理后台', options.site_name.option_value]);

            res.render('admin/pages/p_comment_reply', resData);
        });
    },
    /**
     * 保存评论
     * @method saveComment
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    saveComment: function (req, res, next) {
        'use strict';
        var params = req.body,
            referer = req.session.referer;

        params.commentContent = xss.sanitize(params.commentContent);
        params.commentId = xss.sanitize(params.commentId).trim();
        params.user = req.session.user;
        params.type = 'edit';

        if (!params.commentId || !idReg.test(params.commentId)) {//空或者不符合ID规则
            params.commentId = '';
        }
        if (!params.commentId) {
            return util.catchError({
                status: 500,
                code: 500,
                message: '评论不存在'
            }, next);
        }
        if (!params.commentContent.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '评论内容不能为空'
            }, next);
        }

        async.auto({
            comment: function (cb) {
                comment.saveComment(params, cb);
            }
        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                delete(req.session.referer);

                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        url: referer || '/admin/comment'
                    }
                });
            }
        });
    },
    /**
     * 保存回复
     * @method saveReply
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    saveReply: function (req, res, next) {//TODO:需要判断评论关闭的状态
        'use strict';
        var params = req.body,
            user = {},
            usermeta = {},
            referer = req.session.referer;
        if (req.session.user) {
            user = req.session.user.user;
            usermeta = req.session.user.usermeta;
        }

        //避免undefined问题
        params.commentContent = xss.sanitize(params.commentContent || '').trim();
        params.commentId = xss.sanitize(params.commentId || '').trim();
        params.postId = xss.sanitize(params.postId || '').trim();
        params.type = 'reply';
        params.userIp = req.ip || req._remoteAddress;
        params.userAgent = req.headers['user-agent'];
        params.userName = xss.sanitize(params.commentUser || '').trim() || user.user_display_name || '';
        params.userEmail = xss.sanitize(params.commentEmail || '').trim() || user.user_email || '';
        params.userId = user.user_id || '';
        params.userSite = xss.sanitize(params.commentSite || '').trim() || '';
        params.isAdmin = usermeta.role === 'admin';

        if (!params.commentId || !idReg.test(params.commentId)) {//空或者不符合ID规则
            params.commentId = '';
        }
        if (!params.postId || !idReg.test(params.postId)) {//空或者不符合ID规则
            params.postId = '';
        }
        if (!params.userName) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '昵称不能为空'
            }, next);
        }
        if (!params.userEmail) {//TODO: 合法性校验
            return util.catchError({
                status: 200,
                code: 400,
                message: 'Email不能为空'
            }, next);
        }
        // if (!params.commentId) {
        // return util.catchError({
        // status: 200,
        // code: 400,
        // message: '评论不存在'
        // }, next);
        // }
        if (!params.postId) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '评论文章不存在'
            }, next);
        }
        if (!params.commentContent.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '评论内容不能为空'
            }, next);
        }

        async.auto({
            comment: function (cb) {
                comment.saveComment(params, cb);
            }
        }, function (err, results) {
            var postGuid = '', postUrl = '', commentFlag = 'verify';
            if (err) {
                next(err);
            } else {
                delete(req.session.referer);

                if (results.comment.post[0]) {
                    postGuid = results.comment.post[0].post_guid;
                    commentFlag = results.comment.post[0].comment_flag;
                }
                postUrl = postGuid || ('/post/' + params.postId);

                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        commentFlag: commentFlag,
                        url: params.from === 'admin' ? referer || postUrl : postUrl
                    }
                });
            }
        });
    },
    /**
     * 更新评论状态：审核、删除、拒绝、垃圾评论
     * @method saveReply
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    updateStatus: function (req, res, next) {
        'use strict';
        var params = req.body,
            referer = req.session.referer;

        params.action = params.action.toLowerCase();
        if (params.action !== 'approve' && params.action !== 'reject' && params.action !== 'spam' && params.action !== 'delete') {
            return util.catchError({
                status: 500,
                code: 501,
                message: '不支持的操作'
            }, next);
        }

        params.commentId = xss.sanitize(params.commentId.trim());

        if (!idReg.test(params.commentId)) {//不符合ID规则
            params.commentId = '';
        }
        if (!params.commentId) {
            return util.catchError({
                status: 500,
                code: 500,
                message: '参数错误'
            }, next);
        }
        switch (params.action) {
            case 'approve':
                params.status = 'normal';
                break;
            case 'reject':
                params.status = 'reject';
                break;
            case 'spam':
                params.status = 'spam';
                break;
            case 'delete':
                params.status = 'trash';
                break;
        }
        async.auto({
            comment: function (cb) {
                comment.updateStatus(params, cb);
            }
        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                delete(req.session.referer);

                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        url: referer || '/admin/comment'
                    }
                });
            }
        });
    },
    /**
     * 评论投票
     * @method saveVote
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    saveVote: function (req, res, next) {
        'use strict';
        var params = req.body,
            user = {};

        if (req.session.user) {
            user = req.session.user.user;
        }

        params.userIp = req.ip || req._remoteAddress;
        params.userAgent = req.headers['user-agent'];
        params.userId = user.user_id || '';

        params.commentId = xss.sanitize(params.commentId.trim());

        if (!idReg.test(params.commentId)) {//不符合ID规则
            return util.catchError({
                status: 500,
                code: 500,
                message: '参数错误'
            }, next);
        }
        if (params.type !== 'up' && params.type !== 'down') {
            return util.catchError({
                status: 500,
                code: 500,
                message: '参数错误'
            }, next);
        }
        if (params.type === 'up') {
            params.voteCount = 1;
        } else {
            params.voteCount = -1;
        }

        async.auto({//TODO:is voted?
            comment: function (cb) {
                comment.updateCommentVote(params, cb);
            },
            vote: ['comment', function (cb, results) {
                if (results) {
                    return vote.saveVote(params, cb);
                }
                cb(results);
            }],
            getVote: ['comment', function (cb, results) {
                if (results) {
                    return comment.getCommentById(params.commentId, cb);
                }
                cb(results);
            }]
        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    token: req.csrfToken ? req.csrfToken() : '',
                    data: {
                        commentVote: results.getVote[0].comments.comment_vote
                    }
                });
            }
        });
    }
};
