/**
 * 链接
 * @author fuyun
 * @since 1.0.0
 */
const xss = require('sanitizer');
const moment = require('moment');
const appConfig = require('../config/core');
const util = require('../helper/util');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const constants = require('../services/constants');
const linkService = require('../services/link');
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    listLinks(req, res, next) {
        linkService.listLinks({page: req.params.page}, (err, result, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listLinks',
                    msg: err.messageDetail || err.message,
                    data: {
                        page: data.page
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
            resData.paginator = util.paginator(data.page, Math.ceil(result.count / 10), constants.PAGINATION_SIZE);
            resData.paginator.linkUrl = '/admin/link/page-';
            resData.paginator.linkParam = '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.count;

            resData.links = result.links;

            if (data.page > 1) {
                resData.meta.title = util.getTitle(['第' + data.page + '页', '链接列表', '管理后台', result.options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle(['链接列表', '管理后台', result.options.site_name.optionValue]);
            }
            res.render(`${appConfig.pathViews}/admin/pages/linkList`, resData);
        });
    },
    editLink(req, res, next) {
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
        linkService.editLink({
            action,
            linkId
        }, (err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'editLink',
                    msg: err.messageDetail || err.message,
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
            req.session.linkReferer = util.getReferrer(req);
            res.render(`${appConfig.pathViews}/admin/pages/linkForm`, resData);
        });
    },
    saveLink(req, res, next) {
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
        const newLinkId = linkId || util.getUuid();
        linkService.saveLink({
            linkId,
            newLinkId,
            taxonomyId,
            data
        }, () => {
            logger.info(formatOpLog({
                fn: 'saveLink',
                msg: `Link: ${newLinkId}:${data.linkName} is saved.`,
                data,
                req
            }));

            const referer = req.session.linkReferer;
            delete req.session.linkReferer;
            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: referer || '/admin/link'
                }
            });
        }, (err) => {
            logger.error(formatOpLog({
                fn: 'saveLink',
                msg: err.messageDetail || err.message,
                data: err.data,
                req
            }));
            next({
                code: 500,
                message: err.message
            });
        });
    },
    removeLinks(req, res, next) {
        let linkIds = req.body.linkIds;
        if (typeof linkIds === 'string') {
            linkIds = xss.sanitize(linkIds).split(',');
        } else if (!util.isArray(linkIds)) {
            logger.error(formatOpLog({
                fn: 'removeLinks',
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
        linkService.removeLinks({
            linkIds
        }, () => {
            logger.info(formatOpLog({
                fn: 'removeLinks',
                msg: `Link(s): ${linkIds} is removed.`,
                req
            }));

            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: util.getReferrer(req) || '/admin/link'
                }
            });
        }, (err) => {
            logger.error(formatOpLog({
                fn: 'removeLinks',
                msg: err.messageDetail || err.message,
                data: err.data,
                req
            }));
            next({
                code: 500,
                message: err.message
            });
        });
    }
};
