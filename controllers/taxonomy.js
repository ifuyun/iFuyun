/**
 * 分类管理
 * @author fuyun
 * @version 3.0.0(2017/06/08)
 * @since 1.0.0
 */
/** @namespace req.session */
const xss = require('sanitizer');
const appConfig = require('../config/core');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const util = require('../helper/util');
const ERR_CODES = require('../services/error-codes');
const constants = require('../services/constants');
const taxonomyService = require('../services/taxonomy');
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    listTaxonomies(req, res, next) {
        const type = (req.query.type || 'post').toLowerCase();

        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'listTaxonomies',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: ERR_CODES.FORBIDDEN,
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

        taxonomyService.listTaxonomies({
            page: req.params.page,
            type,
            query: req.query
        }, (err, result, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listTaxonomies',
                    msg: err,
                    data: {
                        where: data.where,
                        page: data.page
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
            resData.paginator = util.paginator(data.page, Math.ceil(result.count / 10), constants.PAGINATION_SIZE);
            resData.paginator.linkUrl = '/admin/taxonomy/page-';
            resData.paginator.linkParam = data.paramArr.length > 0 ? '?' + data.paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.count;

            if (data.page > 1) {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat(['第' + data.page + '页', menu.title + '列表', '管理后台', result.options.site_name.optionValue])
                );
            } else {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat([menu.title + '列表', '管理后台', result.options.site_name.optionValue])
                );
            }
            res.render(`${appConfig.pathViews}/admin/pages/taxonomyList`, resData);
        });
    },
    editTaxonomy(req, res, next) {
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
                code: ERR_CODES.FORBIDDEN,
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
                code: ERR_CODES.FORBIDDEN,
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
                code: ERR_CODES.PAGE_NOT_FOUND,
                message: 'Taxonomy Not Found'
            }, next);
        }
        taxonomyService.editTaxonomy({
            action,
            taxonomyId,
            type
        }, (err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'editTaxonomy',
                    msg: err.messageDetail || err.message,
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
            req.session.taxonomyReferer = util.getReferrer(req);
            res.render(`${appConfig.pathViews}/admin/pages/taxonomyForm`, resData);
        });
    },
    saveTaxonomy(req, res, next) {
        const type = (req.query.type || 'post').toLowerCase();
        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'saveTaxonomy',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: ERR_CODES.FORBIDDEN,
                message: '不支持该操作'
            }, next);
        }
        const param = req.body;
        let taxonomyId = util.trim(xss.sanitize(param.taxonomyId));
        let data = {};
        data.name = util.trim(xss.sanitize(param.name));
        data.slug = util.trim(xss.sanitize(param.slug));
        data.description = util.trim(xss.sanitize(param.description));
        data.parent = (type === 'post' || type === 'link') ? util.trim(xss.sanitize(param.parent)) : '';
        data.termOrder = xss.sanitize(param.termOrder);
        data.taxonomy = type;
        data.visible = param.visible ? 1 : 0;

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
                    code: ERR_CODES.FORM_INPUT_ERROR,
                    message: rules[i].message
                }, next);
            }
        }
        taxonomyService.saveTaxonomy({
            taxonomyId,
            data
        }, (err) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'saveTaxonomy',
                    msg: err.messageDetail || err.message,
                    data,
                    req
                }));
                return next(err);
            }
            const referer = req.session.taxonomyReferer;
            delete req.session.taxonomyReferer;

            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: referer || ('/admin/taxonomy?type=' + type)
                }
            });
        });
    },
    removeTaxonomies(req, res, next) {
        let taxonomyIds = req.body.taxonomyIds;
        const type = (req.query.type || 'post').toLowerCase();

        if (!['post', 'tag', 'link'].includes(type)) {
            logger.error(formatOpLog({
                fn: 'removeTaxonomies',
                msg: `Taxonomy type: ${type} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: ERR_CODES.FORBIDDEN,
                message: '不支持该操作'
            }, next);
        }
        if (typeof taxonomyIds === 'string') {
            taxonomyIds = xss.sanitize(taxonomyIds).split(',');
        } else if (!util.isArray(taxonomyIds)) {
            logger.error(formatOpLog({
                fn: 'removeTaxonomies',
                msg: 'invalid parameters',
                data: {
                    taxonomyIds
                },
                req
            }));
            return util.catchError({
                status: 200,
                code: ERR_CODES.BAD_REQUEST,
                message: '不支持的参数格式'
            }, next);
        }
        for (let i = 0; i < taxonomyIds.length; i += 1) {
            if (!idReg.test(taxonomyIds[i])) {
                return util.catchError({
                    status: 200,
                    code: ERR_CODES.BAD_REQUEST,
                    message: '参数错误'
                }, next);
            }
        }
        taxonomyService.removeTaxonomies({
            type,
            taxonomyIds
        }, () => {
            logger.info(formatOpLog({
                fn: 'removeTaxonomies',
                msg: `Taxonomies: ${taxonomyIds} are removed.`,
                req
            }));

            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: util.getReferrer(req) || '/admin/taxonomy?type=' + type
                }
            });
        }, (err) => {
            logger.error(formatOpLog({
                fn: 'removeTaxonomies',
                msg: err.messageDetail || err.message,
                data: err.data,
                req
            }));
            next({
                code: 500,
                message: err.message || err
            });
        });
    }
};
