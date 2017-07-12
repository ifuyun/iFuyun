/**
 *
 * @author fuyun
 * @since 2017/06/08
 */
/** @namespace req.session */
const async = require('async');
const xss = require('sanitizer');
const models = require('../models/index');
const common = require('./common');
const appConfig = require('../config/core');
const util = require('../helper/util');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const idReg = /^[0-9a-fA-F]{16}$/i;
const pagesOut = 9;
const {TermTaxonomy, TermRelationship} = models;

module.exports = {
    listTaxonomy: function (req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        const type = (req.query.type || 'post').toLowerCase();

        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'listTaxonomy',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        const menu = {
            post: {
                name: 'category',
                title: '分类目录'
            },
            tag: {
                name: 'tag',
                title: '标签'
            },
            link: {
                name: 'link',
                title: '链接分类'
            }
        }[type];
        let titleArr = [];
        let paramArr = [`type=${type}`];
        let where = {
            taxonomy: type
        };
        if (req.query.keyword) {
            where.$or = [{
                name: {
                    $like: `%${req.query.keyword}%`
                }
            }, {
                slug: {
                    $like: `%${req.query.keyword}%`
                }
            }, {
                description: {
                    $like: `%${req.query.keyword}%`
                }
            }];
            paramArr.push(`keyword=${req.query.keyword}`);
            titleArr.push(req.query.keyword, '搜索');
        }
        async.auto({
            options: common.getInitOptions,
            count: (cb) => {
                TermTaxonomy.count({
                    where
                }).then((data) => cb(null, data));
            },
            categories: ['count', function (result, cb) {
                page = (page > result.count / 10 ? Math.ceil(result.count / 10) : page) || 1;
                TermTaxonomy.findAll({
                    where,
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'termOrder', 'count', 'created', 'modified'],
                    order: [['termOrder', 'asc'], ['created', 'desc']],
                    limit: 10,
                    offset: 10 * (page - 1)
                }).then((categories) => cb(null, categories));
            }]
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listTaxonomy',
                    msg: err,
                    data: {
                        where,
                        page
                    },
                    req
                }));
                return next(err);
            }

            /** @namespace result.options.site_name **/
            let resData = {
                meta: {},
                page: menu.name,
                title: menu.title,
                token: req.csrfToken(),
                options: result.options,
                categories: result.categories,
                util,
                type
            };
            resData.paginator = util.paginator(page, Math.ceil(result.count / 10), pagesOut);
            resData.paginator.linkUrl = '/admin/taxonomy/page-';
            resData.paginator.linkParam = paramArr.length > 0 ? '?' + paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.count;

            if (page > 1) {
                resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', menu.title + '列表', '管理后台', result.options.site_name.optionValue]));
            } else {
                resData.meta.title = util.getTitle(titleArr.concat([menu.title + '列表', '管理后台', result.options.site_name.optionValue]));
            }
            res.render(`${appConfig.pathViews}/admin/pages/taxonomyList`, resData);
        });
    },
    editTaxonomy: function (req, res, next) {
        const action = (req.query.action || 'create').toLowerCase();
        const type = (req.query.type || 'post').toLowerCase();

        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'editTaxonomy',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        if (!['create', 'edit'].includes(action)) {
            logger.error(formatOpLog({
                fn: 'editTaxonomy',
                msg: `Operate: ${action} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        const taxonomyId = req.query.taxonomyId;
        if (action === 'edit' && !idReg.test(taxonomyId)) {
            logger.error(formatOpLog({
                fn: 'editTaxonomy',
                msg: `Taxonomy: ${taxonomyId} is not exist.`,
                data: {
                    type
                },
                req
            }));
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Taxonomy Not Found'
            }, next);
        }
        req.session.referer = req.headers.referer;
        let tasks = {
            options: common.getInitOptions
        };
        if (action === 'edit') {
            tasks.taxonomy = (cb) => {
                TermTaxonomy.findById(taxonomyId, {
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'created']
                }).then((taxonomy) => cb(null, taxonomy));
            };
        }
        if (type !== 'tag') {
            tasks.categories = (cb) => {
                common.getCategoryTree(cb, type);
            };
        }
        async.auto(tasks, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'editTaxonomy',
                    msg: err,
                    data: {
                        action,
                        type,
                        taxonomyId
                    },
                    req
                }));
                return next(err);
            }
            let title = '';
            let titleArr = ['管理后台', result.options.site_name.optionValue];
            if (action === 'create') {
                title = type === 'tag' ? '新增标签' : '新增分类';
                titleArr.unshift(title);
            } else {
                title = type === 'tag' ? '编辑标签' : '编辑分类';
                titleArr.unshift(result.taxonomy.name, title);
            }
            const menu = {
                post: 'category',
                tag: 'tag',
                link: 'link'
            }[type];
            let resData = {
                meta: {},
                page: menu,
                token: req.csrfToken(),
                title,
                type,
                action,
                taxonomy: {
                    parent: req.query.parent || ''
                }
            };
            Object.assign(resData, result);
            resData.meta.title = util.getTitle(titleArr);
            res.render(`${appConfig.pathViews}/admin/pages/taxonomyForm`, resData);
        });
    },
    saveTaxonomy: function (req, res, next) {
        const type = (req.query.type || 'post').toLowerCase();
        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'saveTaxonomy',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        const param = req.body;
        let taxonomyId = xss.sanitize(param.taxonomyId) || '';
        let data = {};
        data.name = util.trim(xss.sanitize(param.name));
        data.slug = util.trim(xss.sanitize(param.slug));
        data.description = util.trim(xss.sanitize(param.description));
        data.parent = (type === 'post' || type === 'link') ? util.trim(xss.sanitize(param.parent)) : '';
        data.termOrder = xss.sanitize(param.termOrder);
        data.taxonomy = type;

        if (!idReg.test(taxonomyId)) {
            taxonomyId = '';
        }
        let rules = [{
            rule: !data.name,
            message: '名称不能为空'
        }, {
            rule: !data.slug,
            message: '别名不能为空'
        }, {
            rule: !data.description,
            message: '描述不能为空'
        }, {
            rule: type !== 'tag' && !/^\d+$/i.test(data.termOrder),
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
        async.auto({
            checkSlug: function (cb) {
                let where = {
                    slug: data.slug
                };
                if (taxonomyId) {
                    where.taxonomyId = {
                        $ne: taxonomyId
                    };
                }
                TermTaxonomy.count({
                    where
                }).then((count) => cb(null, count));
            },
            taxonomy: ['checkSlug', function (result, cb) {
                if (result.checkSlug > 0) {
                    return cb('slug已存在');
                }
                const nowTime = new Date();
                if (taxonomyId) {
                    data.modified = nowTime;
                    TermTaxonomy.update(data, {
                        where: {
                            taxonomyId
                        }
                    }).then((taxonomy) => cb(null, taxonomy));
                } else {
                    data.taxonomyId = util.getUuid();
                    data.created = nowTime;
                    data.modified = nowTime;
                    TermTaxonomy.create(data).then((taxonomy) => cb(null, taxonomy));
                }
            }]
        }, function (err) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'saveTaxonomy',
                    msg: err,
                    data,
                    req
                }));
                return next(err);
            }
            const referer = req.session.referer;
            delete req.session.referer;

            res.set('Content-type', 'application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: referer || ('/admin/taxonomy?type=' + type)
                }
            });
        });
    },
    removeTaxonomy: function (req, res, next) {
        let taxonomyIds = req.body.taxonomyIds;
        const type = (req.query.type || 'post').toLowerCase();

        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'removeTaxonomy',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        if (typeof taxonomyIds === 'string') {
            taxonomyIds = xss.sanitize(taxonomyIds).split(',');
        } else if (!util.isArray(taxonomyIds)) {
            logger.error(formatOpLog({
                fn: 'removeTaxonomy',
                msg: 'invalid parameters',
                data: {
                    taxonomyIds
                },
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持的参数格式'
            }, next);
        }
        for (let i = 0; i < taxonomyIds.length; i += 1) {
            if (!idReg.test(taxonomyIds[i])) {
                return util.catchError({
                    status: 200,
                    code: 400,
                    message: '参数错误'
                }, next);
            }
        }
        models.sequelize.transaction(function (t) {
            let tasks = {
                taxonomy: function (cb) {
                    TermTaxonomy.destroy({
                        where: {
                            taxonomyId: taxonomyIds
                        },
                        transaction: t
                    }).then((taxonomy) => cb(null, taxonomy));
                },
                posts: function (cb) {
                    if (type === 'tag') {
                        TermRelationship.destroy({
                            where: {
                                termTaxonomyId: taxonomyIds
                            },
                            transaction: t
                        }).then((termRel) => cb(null, termRel));
                    } else {
                        TermRelationship.update({
                            termTaxonomyId: type === 'post' ? '0000000000000000' : '0000000000000001'
                        }, {
                            where: {
                                termTaxonomyId: taxonomyIds
                            },
                            transaction: t
                        }).then((termRel) => cb(null, termRel)).catch((e) => cb(e));
                    }
                }
            };
            if (type !== 'tag') {// 标签没有父子关系
                tasks.children = function (cb) {
                    TermTaxonomy.update({
                        parent: type === 'post' ? '0000000000000000' : '0000000000000001'
                    }, {
                        where: {
                            parent: taxonomyIds
                        },
                        transaction: t
                    }).then((taxonomy) => cb(null, taxonomy));
                };
            }
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, function (err, result) {
                    if (err) {
                        logger.error(formatOpLog({
                            fn: 'removeTaxonomy',
                            msg: err,
                            data: {
                                taxonomyIds
                            },
                            req
                        }));
                        reject(new Error(err));
                    } else {
                        logger.info(formatOpLog({
                            fn: 'removeTaxonomy',
                            msg: `Taxonomies: ${taxonomyIds} is removed.`,
                            req
                        }));
                        resolve(result);
                    }
                });
            });
        }).then(() => {
            const referer = req.session.referer;
            delete req.session.referer;
            res.set('Content-type', 'application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: referer || '/admin/taxonomy?type=' + type
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
