const async = require('async');
const moment = require('moment');
const xss = require('sanitizer');
const appConfig = require('../config/core');
const models = require('../models/index');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const util = require('../helper/util');
const commonService = require('../services/common');
const ERR_CODES = require('../services/error-codes');
const idReg = /^[0-9a-fA-F]{16}$/i;
const pagesOut = 9;
const {Comment, Vote} = models;
const Op = models.Sequelize.Op;

module.exports = {
    wrapCommentData({param, user, isAdmin, req}) {
        // 避免undefined问题
        return {
            commentContent: util.trim(xss.sanitize(param.commentContent)),
            parentId: util.trim(xss.sanitize(param.parentId)),
            postId: util.trim(xss.sanitize(param.postId)),
            commentAuthor: util.trim(xss.sanitize(param.commentUser)) || user.userDisplayName || '',
            commentAuthorEmail: util.trim(xss.sanitize(param.commentEmail)) || user.userEmail || '',
            // commentAuthorLink: util.trim(xss.sanitize(param.commentLink)),
            commentStatus: isAdmin ? 'normal' : 'pending',
            commentIp: util.getRemoteIp(req),
            commentAgent: req.headers['user-agent'],
            userId: user.userId || ''
        };
    },
    validateCaptcha({param, req, shouldCheckCaptcha}) {
        if (shouldCheckCaptcha && (!param.captchaCode || !req.session.captcha)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '请输入验证码'
            });
        }
        if (shouldCheckCaptcha && (req.session.captcha.toLowerCase() !== param.captchaCode.toLowerCase())) {
            return util.catchError({
                status: 200,
                code: 480,
                message: '验证码输入有误，请重新输入'
            });
        }
        return true;
    },
    validateComment({data}) {
        let rules = [{
            rule: !data.postId || !idReg.test(data.postId),
            message: '评论文章不存在',
            messageDetail: `comment's post: ${data.postId} is not exist.`
        }, {
            rule: !data.commentAuthor,
            message: '昵称不能为空'
        }, {
            rule: !/^[\da-zA-Z]+[\da-zA-Z_.\-]*@[\da-zA-Z_\-]+\.[\da-zA-Z_\-]+$/i.test(data.commentAuthorEmail),
            message: 'Email输入不正确'
        }, {
            rule: !data.commentContent.trim(),
            message: '评论内容不能为空'
        }];
        for (let i = 0; i < rules.length; i += 1) {
            if (rules[i].rule) {
                return util.catchError({
                    status: 200,
                    code: 400,
                    message: rules[i].message,
                    messageDetail: rules[i].messageDetail || rules[i].message
                });
            }
        }
        return true;
    },
    saveComment(param, cb) {
        async.auto({
            post: (cb) => {
                // 权限校验
                models.Post.findByPk(param.data.postId, {
                    attributes: ['postId', 'postTitle', 'postGuid', 'postStatus', 'commentFlag']
                }).then((post) => {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.data.postId} Not Exist.`
                        }));
                    }
                    if (post.commentFlag === 'closed' && !param.isAdmin) {
                        return cb(util.catchError({
                            status: 403,
                            code: ERR_CODES.POST_CLOSE_COMMENT,
                            message: '该文章禁止评论',
                            messageDetail: `[Forbidden]${post.postId}:${post.postTitle} is not allowed comment.`
                        }));
                    }
                    if (post.commentFlag === 'open' || param.isAdmin) {
                        param.data.commentStatus = 'normal';
                    }
                    cb(null, post);
                });
            },
            comment: ['post', (result, cb) => {
                if (!param.commentId) {
                    param.data.commentId = param.commentId = util.getUuid();
                    param.data.commentCreatedGmt = param.data.commentModifiedGmt = new Date();
                    Comment.create(param.data).then((comment) => cb(null, comment));
                } else {
                    Comment.update(param.data, {
                        where: {
                            commentId: {
                                [Op.eq]: param.commentId
                            }
                        }
                    }).then((comment) => cb(null, comment));
                }
            }]
        }, (err, result) => {
            cb(err, result, {
                commentId: param.commentId
            });
        });
    }
};
