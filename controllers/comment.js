/**
 * 评论
 * @author fuyun
 * @version 3.0.0
 * @since 1.1.0(2017/05/19)
 */
const moment = require('moment');
const xss = require('sanitizer');
const appConfig = require('../config/core');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const util = require('../helper/util');
const commentService = require('../services/comment');
const constants = require('../services/constants');
const STATUS_CODES = require('../services/status-codes');
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    saveComment(req, res, next) {
        const param = req.body;
        let user = req.session.user || {};
        let data = {};
        const isAdmin = util.isAdminUser(req.session.user);
        let commentId = param.commentId = util.trim(xss.sanitize(param.commentId));
        let parentId = util.trim(xss.sanitize(param.parentId));
        const shouldCheckCaptcha = !isAdmin || !commentId && !parentId;

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
        let user = req.session.user || {};
        let data = {};

        data.userIp = util.getRemoteIp(req);
        data.userAgent = req.headers['user-agent'];
        data.userId = user.userId || '';
        data.objectId = param.objectId.trim();

        if (!idReg.test(data.objectId)) {
            logger.warn(formatOpLog({
                fn: 'saveVote',
                msg: `comment id: ${data.objectId} is invalid.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: STATUS_CODES.BAD_REQUEST,
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
                status: 200,
                code: STATUS_CODES.BAD_REQUEST,
                message: '参数错误'
            }, next);
        }
        commentService.saveVote({
            data,
            type: param.type
        }, (err, result) => {
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
                code: STATUS_CODES.SUCCESS,
                message: null,
                token: req.csrfToken(),
                data: {
                    commentVote: result.commentVote.commentVote
                }
            });
        });
    },
    listComments(req, res, next) {
        commentService.listComments({
            page: req.params.page,
            query: req.query
        }, (err, result, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listComments',
                    msg: err.messageDetail || err.message,
                    data: {
                        where: data.where,
                        page: data.page
                    },
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
            resData.paginator = util.paginator(data.page, Math.ceil(result.commentsCount / 10), constants.PAGINATION_SIZE);
            resData.paginator.linkUrl = '/admin/comment/page-';
            resData.paginator.linkParam = data.paramArr.length > 0 ? '?' + data.paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.commentsCount;

            if (data.page > 1) {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat(['第' + data.page + '页', '评论列表', '管理后台', result.options.site_name.optionValue])
                );
            } else {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat(['评论列表', '管理后台', result.options.site_name.optionValue])
                );
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
        commentService.editComment({commentId}, (err, result) => {
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
        const commentId = xss.sanitize(param.commentId.trim()) || '';

        param.action = (param.action || '').toLowerCase();
        if (!['normal', 'reject', 'spam', 'trash'].includes(param.action)) {
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
        let data = {
            commentStatus: param.action
        };

        commentService.updateStatus({
            data,
            commentId
        }, () => {
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
    }
};
