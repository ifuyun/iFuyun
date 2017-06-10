/**
 *
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
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    listLink: function (req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        async.auto({
            options: common.getInitOptions,
            count: (cb) => {
                models.Link.count().then((data) => cb(null, data));
            },
            links: ['count', function (result, cb) {
                page = (page > result.count / 10 ? Math.ceil(result.count / 10) : page) || 1;
                models.Link.findAll({
                    attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkRating', 'linkRss', 'linkCreated'],
                    order: [['linkRating', 'desc']],
                    limit: 10,
                    offset: 10 * (page - 1)
                }).then((links) => cb(null, links));
            }]
        }, function (err, result) {
            if (err) {
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
                models.Link.findById(linkId, {
                    attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkRating'],
                    include: [{
                        model: models.TermTaxonomy,
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
        res.send();
    },
    removeLink: function (req, res, next) {
        res.send();
    }
};