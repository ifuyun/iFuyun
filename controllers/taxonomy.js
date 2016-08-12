/**
 * 控制器：分类管理，目录、标签
 * @module c_taxonomy
 * @class C_Taxonomy
 * @static
 * @requires async, sanitizer, c_base, m_base, util, m_term_taxonomy
 * @author Fuyun
 * @version 1.1.0(2015-11-11)
 * @since 1.1.0(2015-02-26)
 */
var async = require('async'),
    xss = require('sanitizer'),

    base = require('./base'),
    pool = require('../model/base').pool,
    util = require('../helper/util'),

    TaxonomyModel = require('../model/termTaxonomy'),

    taxonomy = new TaxonomyModel(pool),

    pagesOut = 9,
    idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    /**
     * 分类目录、标签列表，管理分类目录、标签
     * @method listCategory
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    listCategory: function (req, res, next) {
        'use strict';
        var page = parseInt(req.params.page, 10) || 1,
            resData,
            type = req.query.type || 'post',
            curMenu = '';

        type = type.toLowerCase();
        if (type !== 'post' && type !== 'tag' && type !== 'link') {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }
        switch (type) {
            case 'post':
                curMenu = 'category';
                break;
            case 'tag':
                curMenu = 'tag';
                break;
            case 'link':
                curMenu = 'linkCat';
                break;
        }

        resData = {
            meta: {
                title: ''
            },
            page: curMenu,
            token: req.csrfToken(),
            catData: false
        };
        async.parallel({
            categories: function (cb) {
                taxonomy.getCategories({
                    page: page,
                    type: type
                }, cb);
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options;
            if (results.categories) {
                resData.paginator = util.paginator(page, results.categories.pages, pagesOut);
                resData.paginator.pageLimit = results.categories.pageLimit;
                resData.paginator.total = results.categories.total;
                resData.paginator.linkUrl = '/admin/category/page-';
                resData.paginator.linkParam = '?type=' + type;
            }
            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', type === 'post' || type === 'link' ? '分类目录列表' : '标签列表', '管理后台', options.site_name.option_value]);
            } else {
                resData.meta.title = util.getTitle([type === 'post' || type === 'link' ? '分类目录列表' : '标签列表', '管理后台', options.site_name.option_value]);
            }

            resData.catData = results.categories;
            resData.options = options;
            resData.util = util;
            resData.type = type;

            if (type === 'post' || type === 'link') {
                res.render('admin/pages/p_category', resData);
            } else {
                res.render('admin/pages/p_tag', resData);
            }
        });
    },
    /**
     * 新增分类
     * @method newCategory
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    newCategory: function (req, res, next) {
        'use strict';
        var resData,
            type = req.query.type || 'post';

        type = type.toLowerCase();
        if (type !== 'post' && type !== 'tag' && type !== 'link') {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }

        resData = {
            meta: {
                title: ''
            },
            page: type,
            categories: false,
            token: req.csrfToken(),
            taxonomy: {//TODO:新增、修改合并
                parent: req.query.parent || ''
                // taxonomy_id: '',
                // description: '',
                // term_id: '',
                // name: '',
                // slug: ''
            }
        };

        req.session.referer = req.headers.referer;

        async.parallel({
            categories: function (cb) {
                if (type === 'post' || type === 'link') {
                    taxonomy.getCategoryArray(type, cb);
                } else {
                    cb(null);
                }
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options;

            resData.options = options;

            if (type === 'post' || type === 'link') {
                resData.meta.title = util.getTitle(['新增分类', '管理后台', options.site_name.option_value]);
                resData.categories = results.categories;
                resData.type = type;

                res.render('admin/pages/p_category_form', resData);
            } else {
                resData.meta.title = util.getTitle(['新增标签', '管理后台', options.site_name.option_value]);

                res.render('admin/pages/p_tag_form', resData);
            }
        });
    },
    /**
     * 修改分类
     * @method editCategory
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    editCategory: function (req, res, next) {
        'use strict';
        var resData,
            taxonomyId = req.params.taxonomyId || '';

        if (!taxonomyId || !idReg.test(taxonomyId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }

        req.session.referer = req.headers.referer;

        resData = {
            meta: {
                title: ''
            },
            page: '',
            categories: false,
            token: req.csrfToken()
        };

        async.auto({
            category: function (cb) {
                taxonomy.getTermByTaxonomyId(taxonomyId, function (err, data) {
                    if (err) {
                        return cb(err, data);
                    }
                    cb(null, data);
                });
            },
            categories: ['category',
                function (cb, results) {
                    var category = results.category;
                    if (!category.taxonomy_id) {
                        return cb('参数错误');
                    }
                    if (category.taxonomy === 'post' || category.taxonomy === 'link') {
                        taxonomy.getCategoryArray(category.taxonomy, cb);
                    } else {
                        cb(null);
                    }
                }],
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options,
                type = results.category.taxonomy;

            resData.taxonomy = results.category;
            resData.options = options;
            resData.type = type;
            resData.page = type;

            if (type === 'post' || type === 'link') {
                resData.meta.title = util.getTitle([results.category.name, '编辑分类', '管理后台', options.site_name.option_value]);
                resData.categories = results.categories;

                res.render('admin/pages/p_category_form', resData);
            } else {
                resData.meta.title = util.getTitle([results.category.name, '编辑标签', '管理后台', options.site_name.option_value]);

                res.render('admin/pages/p_tag_form', resData);
            }
        });
    },
    /**
     * 保存分类
     * @method saveCategory
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    saveCategory: function (req, res, next) {
        'use strict';
        var params = req.body,
            type = req.query.type || 'post',
            referer = req.session.referer;

        type = type.toLowerCase();
        if (type !== 'post' && type !== 'tag' && type !== 'link') {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }

        params.catName = xss.sanitize(params.catName);
        params.catSlug = xss.sanitize(params.catSlug);
        params.catDescription = xss.sanitize(params.catDescription);
        params.catParent = (type === 'post' || type === 'link') ? xss.sanitize(params.catParent) : '';
        params.catOrder = xss.sanitize(params.catOrder);//TODO:数字合法性校验
        params.catTaxonomyId = xss.sanitize(params.catTaxonomyId);
        params.user = req.session.user;
        params.type = type;

        if (!params.catTaxonomyId || !idReg.test(params.catTaxonomyId)) {//空或者不符合ID规则
            params.catTaxonomyId = '';
        }
        // trim shouldn't be null or undefined
        // params.catTaxonomyId = params.catTaxonomyId.trim();
        if (!params.catName.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '名称不能为空'
            }, next);
        }
        if (!params.catSlug.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '别名不能为空'
            }, next);
        }
        if (!params.catDescription.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '描述不能为空'
            }, next);
        }

        async.auto({
            taxonomy: function (cb) {
                taxonomy.saveCategory(params, cb);
            }
        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                delete (req.session.referer);

                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        url: referer || ('/admin/category?type=' + type)
                    }
                });
            }
        });
    },
    /**
     * 删除分类
     * @method removeCategory
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    removeCategory: function (req, res, next) {
        'use strict';
        var params = req.body,
            referer = req.session.referer;

        params.taxonomyId = xss.sanitize(params.taxonomyId.trim());

        if (!idReg.test(params.taxonomyId)) {//不符合ID规则
            params.taxonomyId = '';
        }
        if (!params.taxonomyId) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '参数错误'
            }, next);
        }
        async.auto({
            taxonomyInfo: function (cb) {
                taxonomy.getTermByTaxonomyId(params.taxonomyId, function (err, data) {
                    if (err) {
                        return cb(err, data);
                    }
                    cb(null, data);
                });
            },
            taxonomy: ['taxonomyInfo',
                function (cb, results) {
                    params.type = results.taxonomyInfo.taxonomy;
                    taxonomy.removeCategory(params, cb);
                }]

        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                delete (req.session.referer);

                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        url: referer || ('/admin/category?type=' + params.type)
                    }
                });
            }
        });
    }
};
