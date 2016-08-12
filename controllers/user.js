/**
 * 控制器：用户管理
 * @module c_user
 * @class C_User
 * @static
 * @requires async, sanitizer, cfg_core, c_base, m_base, util, m_user
 * @author Fuyun
 * @version 1.1.0(2015-02-26)
 * @since 1.0.0(2014-05-16)
 */
var async = require('async'),
    xss = require('sanitizer'),

    config = require('../config/core'),
    base = require('./base'),
    pool = require('../model/base').pool,
    util = require('../helper/util'),

    UserModel = require('../model/user'),

    user = new UserModel(pool);

module.exports = {
    /**
     * 判断是否已经登录，已登录跳转到首页，否则跳转到登录页
     * @method login
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.0.0
     */
    login: function (req, res, next) {
        'use strict';
        req.session.loginReferer = req.headers.referer;

        if (req.session.user) {
            res.redirect('/');
        } else {
            async.parallel({
                options: base.initOption
            }, function (err, results) {
                if (err) {
                    return next(err);
                }
                var options = results.options;

                res.render('v2/pages/login', {
                    token: req.csrfToken(),
                    options: options,
                    meta: {
                        title: util.getTitle(['用户登录']),
                        description: '用户登录',
                        keywords: options.site_keywords.option_value,
                        author: options.site_author.option_value
                    }
                });
            });
        }
    },
    /**
     * 登出
     * @method logout
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    logout: function (req, res, next) {
        'use strict';
        req.session.destroy(function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    },
    /**
     * 登录
     * @method doLogin
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.0.0
     */
    doLogin: function (req, res, next) {
        'use strict';
        var params = req.body, username = xss.sanitize(params.username);

        res.cookie('username', username, {
            path: '/',
            maxAge: config.cookieExpires
        });

        user.findUser(username, params.password, function (err, users) {
            var resData,
                referer = req.session.loginReferer;

            if (err) {//{ name: 'Error', message: 'some message...' }
                return next(err);
            }
            delete(req.session.loginReferer);

            resData = {
                status: 200,
                code: 0,
                message: null,
                data: {
                    url: referer || '/'
                }
            };
            res.set('Content-type', 'application/json');
            req.session.regenerate(function (err) {//异步操作，需要在回调执行send，否则将无法设置session
                if (err) {
                    return next(err);
                }
                if (params.rememberMe && params.rememberMe === '1') {
                    res.cookie('rememberMe', 1, {
                        path: '/',
                        maxAge: config.cookieExpires
                    });
                    req.session.cookie.expires = new Date(Date.now() + config.cookieExpires);
                    req.session.cookie.maxAge = config.cookieExpires;
                } else {
                    res.cookie('rememberMe', 0, {
                        path: '/',
                        maxAge: config.cookieExpires
                    });
                    req.session.cookie.expires = false;
                }
                req.session.user = users;
                req.session.save();
                res.send(resData);
            });
            //异步请求不能redirect，需在页面进行跳转
            // res.redirect(200, req.session.loginReferer || '/');
        });
    },
    home: function (req, res, next) {
        'use strict';
    },
    profile: function (req, res, next) {
        'use strict';
    }
};
