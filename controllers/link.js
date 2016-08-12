/**
 * 控制器：链接管理
 * @module c_link
 * @class C_Link
 * @static
 * @requires async, sanitizer, moment, c_base, m_base, util, m_link, m_term_taxonomy
 * @author Fuyun
 * @version 1.2.0
 * @since 1.2.0
 */
var async = require('async'),
    xss = require('sanitizer'),
    moment = require('moment'),

    base = require('./base'),
    pool = require('../model/base').pool,
    util = require('../helper/util'),

    LinkModel = require('../model/link'),
    TaxonomyModel = require('../model/termTaxonomy'),

    link = new LinkModel(pool),
    taxonomy = new TaxonomyModel(pool),

    pagesOut = 9,
    idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    /**
     * 链接列表，管理链接
     * @method listLink
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    listLink: function (req, res, next) {
        'use strict';
        var page = parseInt(req.params.page, 10) || 1,
            resData;

        resData = {
            meta: {
                title: ''
            },
            page: 'link',
            token: req.csrfToken(),
            catData: false
        };
        async.parallel({
            links: function (cb) {
                link.getAllLinks({
                    page: page
                }, cb);
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options;
            if (results.links) {
                resData.paginator = util.paginator(page, results.links.pages, pagesOut);
                resData.paginator.pageLimit = results.links.pageLimit;
                resData.paginator.total = results.links.total;
                resData.paginator.linkUrl = '/admin/link/page-';
                resData.paginator.linkParam = '';
            }
            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', '链接列表', '管理后台', options.site_name.option_value]);
            } else {
                resData.meta.title = util.getTitle(['链接列表', '管理后台', options.site_name.option_value]);
            }

            resData.linkData = results.links;
            resData.options = options;
            resData.util = util;
            resData.moment = moment;

            res.render('admin/pages/p_link', resData);
        });
    },
    /**
     * 新增链接
     * @method newLink
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    newLink: function (req, res, next) {
        'use strict';
        var resData;

        resData = {
            meta: {
                title: ''
            },
            page: 'link',
            categories: false,
            token: req.csrfToken(),
            link: {},
            linkType: {}
        };

        req.session.referer = req.headers.referer;

        async.parallel({
            categories: function (cb) {
                taxonomy.getCategoryArray('link', cb);
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options;

            resData.options = options;

            resData.meta.title = util.getTitle(['新增链接', '管理后台', options.site_name.option_value]);
            resData.categories = results.categories;

            res.render('admin/pages/p_link_form', resData);
        });
    },
    /**
     * 修改链接
     * @method editLink
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    editLink: function (req, res, next) {
        'use strict';
        var resData,
            linkId = req.params.linkId || '';

        if (!linkId || !idReg.test(linkId)) {
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
            page: 'link',
            categories: false,
            token: req.csrfToken()
        };

        async.parallel({
            linkData: function (cb) {
                link.getLinkById(linkId, function (err, data) {
                    if (err) {
                        return cb(err, data);
                    }
                    cb(null, data);
                });
            },
            categories: function (cb) {
                taxonomy.getCategoryArray('link', cb);
            },
            options: base.initOption
        }, function (err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options;

            resData.link = results.linkData.link[0];
            resData.linkType = results.linkData.linkType[0];
            resData.options = options;

            resData.meta.title = util.getTitle([resData.link.link_name, '编辑链接', '管理后台', options.site_name.option_value]);
            resData.categories = results.categories;

            res.render('admin/pages/p_link_form', resData);
        });
    },
    /**
     * 保存链接
     * @method saveLink
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    saveLink: function (req, res, next) {
        'use strict';
        var params = req.body,
            referer = req.session.referer;

        params.linkName = xss.sanitize(params.linkName);
        params.linkUrl = xss.sanitize(params.linkUrl);
        params.linkDesc = xss.sanitize(params.linkDesc);
        params.linkVisible = xss.sanitize(params.linkVisible);
        params.linkTarget = xss.sanitize(params.linkTarget);
        params.linkRating = xss.sanitize(params.linkRating);
        params.linkType = xss.sanitize(params.linkType);
        params.user = req.session.user;

        if (!params.linkId || !idReg.test(params.linkId)) {//空或者不符合ID规则
            params.linkId = '';
        }
        //trim shouldn't be null or undefined
        // params.linkId = params.linkId.trim();
        if (!params.linkName.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '名称不能为空'
            }, next);
        }
        if (!params.linkUrl.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: 'URL不能为空'
            }, next);
        }
        if (!params.linkDesc.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '描述不能为空'
            }, next);
        }
        if (!params.linkType.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '请选择分类'
            }, next);
        }

        async.auto({
            link: function (cb) {
                link.saveLink(params, cb);
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
                        url: referer || ('/admin/link')
                    }
                });
            }
        });
    },
    /**
     * 删除链接
     * @method removeLink
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    removeLink: function (req, res, next) {
        'use strict';
        var params = req.body,
            referer = req.session.referer;

        params.linkId = xss.sanitize(params.linkId.trim());

        if (!idReg.test(params.linkId)) {//不符合ID规则
            params.linkId = '';
        }
        if (!params.linkId) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '参数错误'
            }, next);
        }
        async.auto({
            link: function (cb) {
                link.removeLink(params, cb);
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
                        url: referer || ('/admin/link')
                    }
                });
            }
        });
    }
};
