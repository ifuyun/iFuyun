/**
 * 用户管理
 * @author fuyun
 * @version 3.3.5
 * @since 1.0.0(2017/05/23)
 */
const xss = require('sanitizer');
const appConfig = require('../config/core');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const util = require('../helper/util');
const optionService = require('../services/option');
const STATUS_CODES = require('../services/status-codes');
const userService = require('../services/user');

module.exports = {
    showLogin(req, res, next) {
        if (req.session.user) {
            return res.redirect(util.getReferrer(req) || '/');
        }
        req.session.loginReferer = util.getReferrer(req);

        optionService.getInitOptions((err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'showLogin.getInitOptions',
                    msg: err,
                    req
                }));
                return next(err);
            }
            res.render(`${appConfig.pathViews}/front/pages/login`, {
                token: req.csrfToken(),
                options: result,
                meta: {
                    title: util.getTitle(['用户登录']),
                    description: '用户登录',
                    keywords: result.site_keywords.optionValue,
                    author: result.site_author.optionValue
                }
            });
        });
    },
    login(req, res, next) {
        const params = req.body;
        const username = xss.sanitize(params.username);

        userService.login({
            username,
            password: params.password
        }, (result) => {
            if (!result) {
                return next(util.catchError({
                    status: 200,
                    code: STATUS_CODES.LOGIN_ERROR,
                    message: '用户名或密码错误'
                }));
            }
            let metaObj = {};
            let user = {};
            if (result && result.UserMeta) {
                result.UserMeta.forEach((item) => {
                    metaObj[item.metaKey] = item.metaValue;
                });
            }
            Object.assign(user, result.get({
                plain: true
            }));
            delete user.UserMeta;
            user.usermeta = metaObj;

            const referer = req.session.loginReferer;
            delete req.session.loginReferer;
            req.session.regenerate((err) => {
                if (err) {
                    logger.error(formatOpLog({
                        fn: 'login',
                        msg: err,
                        req
                    }));
                    return next(err);
                }
                res.cookie('username', username, {
                    path: '/',
                    domain: 'ifuyun.com',
                    maxAge: appConfig.cookieExpires
                });
                if (params.rememberMe && params.rememberMe === '1') {
                    res.cookie('rememberMe', 1, {
                        path: '/',
                        domain: 'ifuyun.com',
                        maxAge: appConfig.cookieExpires
                    });
                    req.session.cookie.expires = new Date(Date.now() + appConfig.cookieExpires);
                    req.session.cookie.maxAge = appConfig.cookieExpires;
                } else {
                    res.cookie('rememberMe', 0, {
                        path: '/',
                        domain: 'ifuyun.com',
                        maxAge: appConfig.cookieExpires
                    });
                    req.session.cookie.expires = false;
                }
                req.session.user = user;
                req.session.save();
                res.type('application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        url: referer || '/'
                    }
                });
            });
        });
    },
    logout(req, res, next) {
        req.session.destroy((err) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'logout',
                    msg: err.message,
                    req
                }));
                return next(err);
            }
            res.redirect(util.getReferrer(req) || '/');
        });
    }
};
