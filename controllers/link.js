/**
 * 链接
 * @author fuyun
 * @since 2017/06/10
 */
const async = require('async');
const xss = require('sanitizer');
const moment = require('moment');
const models = require('../models/index');
const common = require('./common');
const appConfig = require('../config/core');
const util = require('../helper/util');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const idReg = /^[0-9a-fA-F]{16}$/i;
const {Link, TermTaxonomy, TermRelationship} = models;

module.exports = {
    listLink: function (req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        async.auto({
            options: common.getInitOptions,
            count: (cb) => {
                Link.count().then((data) => cb(null, data));
            },
            links: ['count', function (result, cb) {
                page = (page > result.count / 10 ? Math.ceil(result.count / 10) : page) || 1;
                Link.findAll({
                    attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkRating', 'linkRss', 'linkCreated'],
                    order: [['linkRating', 'desc']],
                    limit: 10,
                    offset: 10 * (page - 1)
                }).then((links) => cb(null, links));
            }]
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listLink',
                    msg: err,
                    data: {
                        page
                    },
                    req
                }));
                return next(err);
            }
            let resData = {
                meta: {},
                page: 'link',
                token: req.csrfToken(),
                options: result.options,
                categories: result.categories,
                util,
                moment,
                formatter
            };
            resData.paginator = util.paginator(page, Math.ceil(result.count / 10), 9);
            resData.paginator.linkUrl = '/admin/link/page-';
            resData.paginator.linkParam = '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.count;

            resData.links = result.links;

            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', '链接列表', '管理后台', result.options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle(['链接列表', '管理后台', result.options.site_name.optionValue]);
            }
            res.render(`${appConfig.pathViews}/admin/pages/linkList`, resData);
        });
    },
    editLink: function (req, res, next) {
        const action = (req.query.action || 'create').toLowerCase();
        if (!['create', 'edit'].includes(action)) {
            logger.error(formatOpLog({
                fn: 'editLink',
                msg: `Operate: ${action} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        const linkId = req.query.linkId;
        if (action === 'edit' && !idReg.test(linkId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Link Not Found'
            }, next);
        }
        req.session.referer = req.headers.referer;
        let tasks = {
            options: common.getInitOptions,
            categories: (cb) => {
                common.getCategoryTree(cb, 'link');
            }
        };
        if (action === 'edit') {
            tasks.link = (cb) => {
                Link.findById(linkId, {
                    attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkRating'],
                    include: [{
                        model: TermTaxonomy,
                        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'count'],
                        where: {
                            taxonomy: ['link']
                        }
                    }]
                }).then((link) => cb(null, link));
            };
        }
        async.auto(tasks, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'editLink',
                    msg: err,
                    data: {
                        action,
                        linkId
                    },
                    req
                }));
                return next(err);
            }
            let title = '';
            let titleArr = ['管理后台', result.options.site_name.optionValue];
            if (action === 'create') {
                title = '新增链接';
                titleArr.unshift(title);
            } else {
                title = '编辑链接';
                titleArr.unshift(result.link.linkName, title);
            }
            let resData = {
                meta: {},
                page: 'link',
                token: req.csrfToken(),
                title,
                action,
                link: {
                    TermTaxonomies: [{}]
                }
            };
            Object.assign(resData, result);
            resData.meta.title = util.getTitle(titleArr);
            res.render(`${appConfig.pathViews}/admin/pages/linkForm`, resData);
        });
    },
    saveLink: function (req, res, next) {
        const param = req.body;
        let linkId = util.trim(xss.sanitize(param.linkId));
        const taxonomyId = util.trim(xss.sanitize(param.linkTaxonomy));
        let data = {};
        data.linkName = util.trim(xss.sanitize(param.linkName));
        data.linkUrl = util.trim(xss.sanitize(param.linkUrl));
        data.linkDescription = util.trim(xss.sanitize(param.linkDescription));
        data.linkVisible = util.trim(xss.sanitize(param.linkVisible));
        data.linkTarget = util.trim(xss.sanitize(param.linkTarget));
        data.linkRating = util.trim(xss.sanitize(param.linkRating));

        if (!idReg.test(linkId)) {
            linkId = '';
        }
        let rules = [{
            rule: !data.linkName,
            message: '名称不能为空'
        }, {
            rule: !data.linkUrl,
            message: 'URL不能为空'
        }, {
            rule: !data.linkDescription,
            message: '描述不能为空'
        }, {
            rule: !taxonomyId,
            message: '请选择分类'
        }, {
            rule: !/^\d+$/i.test(data.linkRating),
            message: '排序只能为数字'
        }];
        for (let i = 0; i < rules.length; i += 1) {
            if (rules[i].rule) {
                return util.catchError({
                    status: 200,
                    code: 400,
                    message: rules[i].message
                }, next);
            }
        }
        models.sequelize.transaction(function (t) {
            const newLinkId = util.getUuid();
            let tasks = {
                link: function (cb) {
                    if (!linkId) {
                        data.linkId = newLinkId;
                        Link.create(data, {
                            transaction: t
                        }).then((link) => {
                            cb(null, link);
                        });
                    } else {
                        Link.update(data, {
                            where: {
                                linkId
                            },
                            transaction: t
                        }).then((link) => {
                            cb(null, link);
                        });
                    }
                },
                taxonomy: function (cb) {
                    if (!linkId) {
                        TermRelationship.create({
                            objectId: newLinkId,
                            termTaxonomyId: taxonomyId
                        }, {
                            transaction: t
                        }).then((termRel) => cb(null, termRel));
                    } else {
                        TermRelationship.update({
                            termTaxonomyId: taxonomyId
                        }, {
                            where: {
                                objectId: linkId
                            },
                            transaction: t
                        }).then((termRel) => cb(null, termRel));
                    }
                }
            };
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, function (err, result) {
                    if (err) {
                        logger.error(formatOpLog({
                            fn: 'saveLink',
                            msg: err,
                            data,
                            req
                        }));
                        reject(new Error(err));
                    } else {
                        logger.info(formatOpLog({
                            fn: 'saveLink',
                            msg: `Link: ${linkId || newLinkId}:${data.linkName} is saved.`,
                            data,
                            req
                        }));
                        resolve(result);
                    }
                });
            });
        }).then(() => {
            const referer = req.session.referer;
            delete req.session.referer;
            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: referer || ('/admin/link')
                }
            });
        }, (err) => {
            next({
                code: 500,
                message: err.message || err
            });
        });
    },
    removeLink: function (req, res, next) {
        let linkIds = req.body.linkIds;
        if (typeof linkIds === 'string') {
            linkIds = xss.sanitize(linkIds).split(',');
        } else if (!util.isArray(linkIds)) {
            logger.error(formatOpLog({
                fn: 'removeLink',
                msg: 'invalid parameters',
                data: {
                    linkIds
                },
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持的参数格式'
            }, next);
        }
        for (let i = 0; i < linkIds.length; i += 1) {
            if (!idReg.test(linkIds[i])) {
                return util.catchError({
                    status: 200,
                    code: 400,
                    message: '参数错误'
                }, next);
            }
        }
        models.sequelize.transaction(function (t) {
            let tasks = {
                links: function (cb) {
                    Link.destroy({
                        where: {
                            linkId: linkIds
                        },
                        transaction: t
                    }).then((link) => cb(null, link));
                },
                termRels: function (cb) {
                    TermRelationship.destroy({
                        where: {
                            objectId: linkIds
                        },
                        transaction: t
                    }).then((termRel) => cb(null, termRel));
                }
            };
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, function (err, result) {
                    if (err) {
                        logger.error(formatOpLog({
                            fn: 'removeLink',
                            msg: err,
                            data: {
                                linkIds
                            },
                            req
                        }));
                        reject(new Error(err));
                    } else {
                        logger.info(formatOpLog({
                            fn: 'removeLink',
                            msg: `Links: ${linkIds} is removed.`,
                            req
                        }));
                        resolve(result);
                    }
                });
            });
        }).then(() => {
            const referer = req.session.referer;
            delete req.session.referer;
            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: referer || '/admin/link'
                }
            });
        }, (err) => {
            next({
                code: 500,
                message: err.message || err
            });
        });
    }
};