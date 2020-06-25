/**
 * comment services
 * @author fuyun
 * @version 3.3.5
 * @since 3.0.0
 */
const async = require('async');
const xss = require('sanitizer');
const models = require('../models/index');
const util = require('../helper/util');
const optionService = require('../services/option');
const STATUS_CODES = require('./status-codes');
const idReg = /^[0-9a-fA-F]{16}$/i;
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
    validateCaptcha({param, shouldCheckCaptcha, req}) {
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
                    code: STATUS_CODES.BAD_REQUEST,
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
                            code: STATUS_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.data.postId} Not Exist.`
                        }));
                    }
                    if (post.commentFlag === 'closed' && !param.isAdmin) {
                        return cb(util.catchError({
                            status: 403,
                            code: STATUS_CODES.POST_COMMENT_CLOSED,
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
    },
    saveVote(param, cb) {
        let commentVote;
        if (param.type === 'up') {
            commentVote = models.sequelize.literal('comment_vote + 1');
            param.data.voteCount = 1;
        } else {
            commentVote = models.sequelize.literal('comment_vote - 1');
            param.data.voteCount = -1;
        }
        async.auto({
            // TODO: transaction
            comment: (cb) => {
                Comment.update({
                    commentVote
                }, {
                    where: {
                        commentId: {
                            [Op.eq]: param.data.objectId
                        }
                    },
                    silent: true
                }).then((comment) => {
                    cb(null, comment);
                });
            },
            vote: (cb) => {
                param.data.voteId = util.getUuid();
                Vote.create(param.data).then((vote) => {
                    cb(null, vote);
                });
            },
            commentVote: ['comment', (result, cb) => {
                Comment.findByPk(param.data.objectId, {
                    attributes: ['commentId', 'commentVote']
                }).then((comment) => {
                    cb(null, comment);
                });
            }]
        }, cb);
    },
    listComments(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        let where = {};
        let titleArr = [];
        let paramArr = [];

        if (param.query.status) {
            where.commentStatus = {
                [Op.eq]: param.query.status
            };
            paramArr.push(`status=${param.query.status}`);
            titleArr.push(param.query.status, '状态');
        } else {
            where.commentStatus = {
                [Op.in]: ['normal', 'pending', 'spam', 'trash', 'reject']
            };
        }
        if (param.query.keyword) {
            where.commentContent = {
                [Op.like]: `%${param.query.keyword}%`
            };
            paramArr.push(`keyword=${param.query.keyword}`);
            titleArr.push(param.query.keyword, '搜索');
        }
        async.auto({
            options: optionService.getInitOptions,
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
        }, (err, result) => {
            cb(err, result, {
                where,
                page,
                titleArr,
                paramArr
            });
        });
    },
    editComment(param, cb) {
        async.parallel({
            options: optionService.getInitOptions,
            comment(cb) {
                Comment.findByPk(param.commentId, {
                    attributes: ['commentId', 'postId', 'commentContent', 'commentStatus', 'commentAuthor', 'commentAuthorEmail', 'commentIp', 'commentCreated', 'commentModified'],
                    include: [{
                        model: models.Post,
                        attributes: ['postId', 'postGuid', 'postTitle']
                    }]
                }).then((comment) => cb(null, comment));
            }
        }, cb);
    },
    updateStatus(param, cb) {
        Comment.update(param.data, {
            where: {
                commentId: {
                    [Op.eq]: param.commentId
                }
            }
        }).then(cb);
    }
};
