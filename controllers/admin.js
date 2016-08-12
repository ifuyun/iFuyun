/*global console*/
/**
 * 控制器：后台管理
 * @module c_admin
 * @class C_Admin
 * @static
 * @requires async, sanitizer, m_user, m_base, util
 * @author Fuyun
 * @version 1.1.0(2015-11-26)
 * @since 1.1.0(2015-02-26)
 */
var async = require('async'),
    xss = require('sanitizer'),

    base = require('./base'),
    pool = require('../model/base').pool,
    util = require('../helper/util'),

    UserModel = require('../model/user'),
    OptionModel = require('../model/option'),

    user = new UserModel(pool),
    option = new OptionModel(pool);

module.exports = {
    /**
     * 后台管理首页
     * @method welcome
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    welcome: function(req, res, next) {
        'use strict';
        // var resData = {
        // meta: {
        // title: 'I, Fuyun管理后台'
        // },
        // page: 'welcome'
        // };
        // res.render('admin', resData);
        res.redirect('/admin/post');
    },
    /**
     * 权限校验
     * @method checkAuth
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    checkAuth: function(req, res, next) {
        'use strict';
        var curUser = req.session.user;

        res.locals.isLogin = util.isLogin(req);

        if (util.isAdminUser(req)) {
            next();
        } else {
            if (res.locals.isLogin) {//已登录但无权限
                util.catchError({
                    status: 403,
                    code: 403,
                    message: 'Page Forbidden'
                }, next);
            } else {//未登录则跳至登录页
                res.redirect('/user/login');
            }
        }
    },
    /**
     * 后台管理：设置-常规
     * @method setGeneral
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    setGeneral: function(req, res, next) {
        'use strict';
        var resData = {
            meta: {
                title: ''
            },
            page: 'settings',
            token: req.csrfToken()
        };

        async.parallel({
            options: base.initOption
        }, function(err, results) {
            if (err) {
                return next(err);
            }
            var options = results.options;

            resData.meta.title = util.getTitle(['常规选项', '站点设置', '管理后台', options.site_name.option_value]);

            resData.options = options;

            res.render('admin/pages/p_options_general', resData);
        });
    },
    /**
     * 后台管理：设置-常规
     * @method saveGeneral
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.1.0
     */
    saveGeneral: function(req, res, next) {
        'use strict';
        var params = req.body,
            paramIdx = 0;

        // req.session.referer = req.headers.referer;
        // req.session.save();

        params.options = [];

        params.siteTitle = xss.sanitize(params.siteTitle).trim();
        params.siteDesc = xss.sanitize(params.siteDesc).trim();
        params.siteSlogan = xss.sanitize(params.siteSlogan).trim();
        params.siteUrl = xss.sanitize(params.siteUrl).trim();
        params.siteKeywords = xss.sanitize(params.siteKeywords).trim();
        params.adminEmail = xss.sanitize(params.adminEmail).trim();
        params.icpNum = xss.sanitize(params.icpNum).trim();
        params.copyNotice = xss.sanitize(params.copyNotice).trim();
        params.user = req.session.user;

        params.options = [{
            name: 'site_name',
            value: params.siteTitle,
            required: true,
            desc: '站点标题'
        }, {
            name: 'site_description',
            value: params.siteDesc,
            required: true,
            desc: '站点描述'
        }, {
            name: 'site_slogan',
            value: params.siteSlogan,
            required: true,
            desc: '口号'
        }, {
            name: 'site_url',
            value: params.siteUrl,
            required: true,
            desc: '站点地址'
        }, {
            name: 'site_keywords',
            value: params.siteKeywords,
            required: true,
            desc: '关键词'
        }, {
            name: 'admin_email',
            value: params.adminEmail,
            required: true,
            desc: '电子邮件地址'
        }, {
            name: 'icp_num',
            value: params.icpNum,
            required: false,
            desc: 'ICP备案号'
        }, {
            name: 'copyright_notice',
            value: params.copyNotice,
            required: true,
            desc: '版权信息'
        }];

        for ( paramIdx = 0; paramIdx < params.options.length; paramIdx += 1) {
            if (params.options[paramIdx].required && !params.options[paramIdx].value) {
                return util.catchError({
                    status: 200,
                    code: 400,
                    message: params.options[paramIdx].desc + '不能为空'
                }, next);
            }
        }

        async.auto({
            taxonomy: function(cb) {
                option.saveGeneral(params, cb);
            }
        }, function(err, results) {
            if (err) {
                next(err);
            } else {
                // res.set('Content-type', 'application/json');
                // res.send({
                // status: 200,
                // code: 0,
                // message: null,
                // data: {
                // url: req.session.referer || '/admin/options/general'
                // }
                // });
                res.redirect('/admin/options/general');
            }
        });
    },
    /**
     * 后台管理：设置-撰写
     * @method setWriting
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @unimplemented
     */
    setWriting: function(req, res, next) {//TODO
        'use strict';
        var resData = {
            meta: {
                title: 'I, Fuyun管理后台'
            }
        };
        res.render('admin/pages/p_options_writing', resData);
    },
    /**
     * 后台管理：设置-阅读
     * @method setReading
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @unimplemented
     */
    setReading: function(req, res, next) {//TODO
        'use strict';
        var resData = {
            meta: {
                title: 'I, Fuyun管理后台'
            }
        };
        res.render('admin/pages/p_options_reading', resData);
    },
    /**
     * 后台管理：设置-讨论
     * @method setDiscussion
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @unimplemented
     */
    setDiscussion: function(req, res, next) {//TODO
        'use strict';
        var resData = {
            meta: {
                title: 'I, Fuyun管理后台'
            }
        };
        res.render('admin/pages/p_options_discussion', resData);
    }
};
