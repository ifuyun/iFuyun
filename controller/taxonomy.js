/**
 *
 * @author fuyun
 * @since 2017/06/08
 */
const async = require('async');
const models = require('../models/index');
const common = require('./common');
const appConfig = require('../config/core');
const util = require('../helper/util');
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    listTaxonomy: function (req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        const type = (req.query.type || 'post').toLowerCase();

        if (!['post', 'tag', 'link'].includes(type)) {
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
                models.TermTaxonomy.count({
                    where
                }).then((data) => cb(null, data));
            },
            categories: ['count', function (result, cb) {
                page = (page > result.count / 10 ? Math.ceil(result.count / 10) : page) || 1;
                models.TermTaxonomy.findAll({
                    where,
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'termOrder', 'count', 'created', 'modified'],
                    order: [['termOrder', 'asc']],
                    limit: 10,
                    offset: 10 * (page - 1),
                    subQuery: false
                }).then((categories) => cb(null, categories));
            }]
        }, function (err, result) {
            if (err) {
                return next(err);
            }
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
            resData.paginator = util.paginator(page, Math.ceil(result.count / 10), 9);
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
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        if (!['create', 'edit'].includes(action)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        const taxonomyId = req.query.taxonomyId;
        if (action === 'edit' && !idReg.test(taxonomyId)) {
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
                models.TermTaxonomy.findById(taxonomyId, {
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
                return next(err);
            }
            let title = '';
            let titleArr = ['管理后台', result.options.site_name.optionValue];
            if (action === 'create') {
                title = type === 'tag' ? '新增标签' : '新增分类';
                titleArr.unshift(title);
            } else {
                title = type === 'tag' ? '编辑标签' : '编辑分类';
                titleArr = [result.taxonomy.name, title].concat(titleArr);
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
                taxonomy: {}
            };
            Object.assign(resData, result);
            resData.meta.title = util.getTitle(titleArr);
            res.render(`${appConfig.pathViews}/admin/pages/taxonomyForm`, resData);
        });
    }
};
