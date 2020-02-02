/**
 * 评论
 * @author fuyun
 * @since 2017/05/19.
 */
const async = require('async');
const moment = require('moment');
const xss = require('sanitizer');
const models = require('../models/index');
const commonService = require('../services/common');
const appConfig = require('../config/core');
const util = require('../helper/util');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const commentService = require('../services/comment');
const idReg = /^[0-9a-fA-F]{16}$/i;
const pagesOut = 9;
const {Comment, Vote} = models;
const Op = models.Sequelize.Op;

module.exports = {
    saveComment(req, res, next) {
        const param = req.body;
        let user = req.session.user || {};
        let data = {};
        const isAdmin = util.isAdminUser(req.session.user);
        let commentId = util.trim(xss.sanitize(param.commentId));
        const shouldCheckCaptcha = !isAdmin || !commentId;

        const checkCaptcha = commentService.validateCaptcha({
            param,
            shouldCheckCaptcha,
            req
        });
        if (checkCaptcha !== true) {
            return next(checkCaptcha);
        }
        if (!commentId || !idReg.test(commentId)) {
            commentId = '';
        }

        data = commentService.wrapCommentData({
            param,
            user,
            isAdmin,
            req
        });
        const checkComment = commentService.validateComment({
            data
        });
        if (checkComment !== true) {
            return next(checkComment);
        }
        commentService.saveComment({
            data,
            isAdmin,
            commentId
        }, (err, result, logData) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'saveComment',
                    msg: err.messageDetail || err.message,
                    data: err.data || logData,
                    req
                }));
                return next(err);
            }
            const referer = req.session.commentReferer;
            delete req.session.commentReferer;
            let postGuid;
            let commentFlag;
            if (result.post.postGuid) {
                postGuid = result.post.postGuid;
                commentFlag = result.post.commentFlag;
            }
            const postUrl = postGuid || ('/post/' + result.post.postId);

            logger.info(formatOpLog({
                fn: 'saveComment',
                msg: `Comment: ${logData.commentId}:${result.post.postTitle} is saved.`,
                data,
                req
            }));
            res.type('application/json');
            res.send({
                status: 200,
                code: 0,
                message: null,
                data: {
                    commentFlag,
                    url: isAdmin ? referer || postUrl : postUrl
                }
            });
        });
    },
    saveVote(req, res, next) {
        const param = req.body;
        let user = {};
        let data = {};
        let commentVote;

        if (req.session.user) {
            user = req.session.user;
        }

        data.userIp = util.getRemoteIp(req);
        data.userAgent = req.headers['user-agent'];
        data.userId = user.userId || '';

        data.objectId = xss.sanitize(param.commentId.trim());

        if (!idReg.test(data.objectId)) {
            logger.warn(formatOpLog({
                fn: 'saveVote',
                msg: `comment id: ${data.objectId} is invalid.`,
                req
            }));
            return util.catchError({
                status: 500,
                code: 500,
                message: '参数错误'
            }, next);
        }
        if (param.type !== 'up' && param.type !== 'down') {
            logger.error(formatOpLog({
                fn: 'saveVote',
                msg: `Operate: ${param.type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 500,
                code: 500,
                message: '参数错误'
            }, next);
        }
        if (param.type === 'up') {
            commentVote = models.sequelize.literal('comment_vote + 1');
            data.voteCount = 1;
        } else {
            commentVote = models.sequelize.literal('comment_vote - 1');
            data.voteCount = -1;
        }
        async.auto({// TODO: transaction
            comment: (cb) => {
                Comment.update({
                    commentVote
                }, {
                    where: {
                        commentId: {
                            [Op.eq]: data.objectId
                        }
                    },
                    silent: true
                }).then((comment) => {
                    cb(null, comment);
                });
            },
            vote: (cb) => {
                data.voteId = util.getUuid();
                Vote.create(data).then((vote) => {
                    cb(null, vote);
                });
            },
            commentVote: ['comment', function (result, cb) {
                Comment.findByPk(data.objectId, {
                    attributes: ['commentId', 'commentVote']
                }).then(function (comment) {
                    cb(null, comment);
                });
            }]
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'saveVote',
                    msg: err,
                    data,
                    req
                }));
                return next(err);
            }
            res.type('application/json');
            res.send({
                status: 200,
                code: 0,
                message: null,
                token: req.csrfToken(),
                data: {
                    commentVote: result.commentVote.commentVote
                }
            });
        });
    },
    listComments(req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        let where = {};
        let titleArr = [];
        let paramArr = [];

        if (req.query.status) {
            where.commentStatus = {
                [Op.eq]: req.query.status
            };
            paramArr.push(`status=${req.query.status}`);
            titleArr.push(req.query.status, '状态');
        } else {
            where.commentStatus = {
                [Op.in]: ['normal', 'pending', 'spam', 'trash', 'reject']
            };
        }
        if (req.query.keyword) {
            where.commentContent = {
                [Op.like]: `%${req.query.keyword}%`
            };
            paramArr.push(`keyword=${req.query.keyword}`);
            titleArr.push(req.query.keyword, '搜索');
        }
        async.auto({
            options: commonService.getInitOptions,
            commentsCount: (cb) => {
                Comment.count({
                    where
                }).then((data) => cb(null, data));
            },
            comments: ['commentsCount', (result, cb) => {
                page = (page > result.commentsCount / 10 ? Math.ceil(result.commentsCount / 10) : page) || 1;
                Comment.findAll({
                    where,
                    attributes: ['commentId', 'postId', 'commentContent', 'commentStatus', 'commentAuthor', 'commentAuthorEmail', 'commentIp', 'commentCreated', 'commentModified', 'commentVote'],
                    include: [{
                        model: models.Post,
                        attributes: ['postId', 'postGuid', 'postTitle']
                    }],
                    order: [['commentCreated', 'desc']],
                    limit: 10,
                    offset: 10 * (page - 1),
                    subQuery: false
                }).then((comments) => cb(null, comments));
            }],
            typeCount: (cb) => {
                Comment.findAll({
                    attributes: [
                        'commentStatus',
                        [models.sequelize.fn('count', 1), 'count']
                    ],
                    group: ['commentStatus']
                }).then((data) => cb(null, data));
            }
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listComments',
                    msg: err,
                    where,
                    req
                }));
                return next(err);
            }
            let resData = {
                meta: {},
                page: 'comment',
                token: req.csrfToken(),
                options: result.options,
                comments: result.comments,
                typeCount: {
                    all: 0
                },
                curStatus: req.query.status,
                curKeyword: req.query.keyword,
                util,
                formatter,
                moment
            };
            resData.paginator = util.paginator(page, Math.ceil(result.commentsCount / 10), pagesOut);
            resData.paginator.linkUrl = '/admin/comment/page-';
            resData.paginator.linkParam = paramArr.length > 0 ? '?' + paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.commentsCount;

            if (page > 1) {
                resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', '评论列表', '管理后台', result.options.site_name.optionValue]));
            } else {
                resData.meta.title = util.getTitle(titleArr.concat(['评论列表', '管理后台', result.options.site_name.optionValue]));
            }

            result.typeCount.forEach((item) => {
                resData.typeCount[item.commentStatus] = item.get('count');
                resData.typeCount.all += item.get('count');
            });
            res.render(`${appConfig.pathViews}/admin/pages/commentList`, resData);
        });
    },
    editComment(req, res, next) {
        let action = req.query.action;
        if (action !== 'edit' && action !== 'reply') {
            action = 'show';
        }
        const commentId = req.params.commentId || '';
        if (!idReg.test(commentId)) {
            logger.warn(formatOpLog({
                fn: 'editComment',
                msg: `comment id: ${commentId} is invalid.`,
                req
            }));
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Comment Not Found'
            }, next);
        }
        async.parallel({
            options: commonService.getInitOptions,
            comment(cb) {
                Comment.findByPk(commentId, {
                    attributes: ['commentId', 'postId', 'commentContent', 'commentStatus', 'commentAuthor', 'commentAuthorEmail', 'commentIp', 'commentCreated', 'commentModified'],
                    include: [{
                        model: models.Post,
                        attributes: ['postId', 'postGuid', 'postTitle']
                    }]
                }).then((comment) => cb(null, comment));
            }
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'editComment',
                    msg: err,
                    req
                }));
                return next(err);
            }
            if (!result.comment) {
                return util.catchError({
                    status: 404,
                    code: 404,
                    message: 'Comment Not Found'
                }, next);
            }
            const title = action === 'edit' ? '编辑评论' : action === 'reply' ? '回复评论' : '查看评论';
            let resData = {
                meta: {},
                page: 'comment',
                token: req.csrfToken(),
                options: result.options,
                comment: result.comment,
                title,
                action
            };
            resData.meta.title = util.getTitle([result.comment.commentContent, title, '管理后台', result.options.site_name.optionValue]);
            req.session.commentReferer = util.getReferrer(req);
            res.render(`${appConfig.pathViews}/admin/pages/commentForm`, resData);
        });
    },
    updateStatus(req, res, next) {
        let param = req.body;
        let data = {};
        const commentId = xss.sanitize(param.commentId.trim()) || '';

        param.action = (param.action || '').toLowerCase();
        if (!['approve', 'reject', 'spam', 'delete'].includes(param.action)) {
            logger.error(formatOpLog({
                fn: 'updateStatus',
                msg: `Operate: ${param.action} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        if (!idReg.test(commentId)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '参数错误'
            }, next);
        }
        const statusMap = {
            approve: 'normal',
            reject: 'reject',
            spam: 'spam',
            delete: 'trash'
        };
        data.commentStatus = statusMap[param.action];

        Comment.update(data, {
            where: {
                commentId: {
                    [Op.eq]: commentId
                }
            }
        }).then((comment) => {
            res.type('application/json');
            res.send({
                status: 200,
                code: 0,
                message: null,
                data: {
                    url: util.getReferrer(req) || '/admin/comment'
                }
            });
        });
    },
    removeComments(req, res, next) {
        res.send();
    }
};
