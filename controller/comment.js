/**
 * Created by fuyun on 2017/05/19.
 */
// const common = require('./common');
const async = require('async');
const util = require('../helper/util');
// const moment = require('moment');
const xss = require('sanitizer');
const models = require('../models/index');
const logger = require('../helper/logger').sysLog;
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    saveComment: function (req, res, next) {
        let params = req.body;
        let user = {};
        let data = {};
        const referer = req.session.referer;
        const isAdmin = util.isAdminUser(req);
        let commentId = xss.sanitize(params.commentId || '').trim();

        if (req.session.user) {
            user = req.session.user.user;
        }

        // 避免undefined问题
        data.commentContent = xss.sanitize(params.commentContent || '').trim();
        data.parentId = xss.sanitize(params.parentId || '').trim();
        data.postId = xss.sanitize(params.postId || '').trim();
        // params.type = 'reply';
        data.commentIp = req.ip || req._remoteAddress;
        data.commentAgent = req.headers['user-agent'];
        data.commentAuthor = xss.sanitize(params.commentUser || '').trim() || user.userDisplayName || '';
        data.commentAuthorEmail = xss.sanitize(params.commentEmail || '').trim() || user.userEmail || '';
        data.userId = user.userId || '';
        data.commentAuthorLink = xss.sanitize(params.commentSite || '').trim() || '';
        data.commentStatus = 'pending';

        if (!commentId || !idReg.test(commentId)) {
            commentId = '';
        }
        if (!data.postId || !idReg.test(data.postId)) {
            data.postId = '';
        }
        if (!data.commentAuthor) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '昵称不能为空'
            }, next);
        }
        if (!/^[\da-zA-Z]+[\da-zA-Z_\.\-]*@[\da-zA-Z_\-]+\.[\da-zA-Z_\-]+$/i.test(data.commentAuthorEmail)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: 'Email输入不正确'
            }, next);
        }
        if (!data.commentContent.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '评论内容不能为空'
            }, next);
        }
        if (!data.postId) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '评论文章不存在'
            }, next);
        }
        async.auto({
            post: (cb) => {
                models.Post.findById(data.postId, {
                    attributes: ['postId', 'postTitle', 'postGuid', 'postStatus', 'commentFlag']
                }).then(function (post) {
                    if (!post || !post.postId) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'saveComment',
                            funcParam: {
                                postId: post.postId
                            },
                            msg: 'Post Not Exist.'
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found.'
                        }));
                    }
                    if (post.commentFlag === 'closed' && !isAdmin) {
                        return cb(util.catchError({
                            status: 403,
                            code: 403,
                            message: '该文章禁止评论'
                        }));
                    }
                    if (post.commentFlag === 'open' || isAdmin) {
                        data.commentStatus = 'normal';
                    }
                    cb(null, post);
                });
            },
            comment: ['post', function (result, cb) {
                if (!commentId) {
                    data.commentId = util.getUuid();
                    data.commentCreatedGmt = data.commentModifiedGmt = new Date();
                    models.Comment.create(data).then((comment) => {
                        cb(null, comment);
                    });
                } else {
                    models.Comment.update(data, {
                        where: {
                            commentId
                        }
                    }).then((comment) => {
                        cb(null, comment);
                    });
                }
            }]
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            delete req.session.referrer;
            let postGuid;
            let commentFlag;
            if(result.post.postGuid) {
                postGuid = result.post.postGuid;
                commentFlag = result.post.commentFlag;
            }
            const postUrl = postGuid || ('/post/' + result.post.postId);
            res.set('Content-type', 'application/json');
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
    }
};