/**
 * 用户管理
 * @author fuyun
 * @since 2017/05/23
 */
const util = require('../helper/util');
const xss = require('sanitizer');
const models = require('../models/index');
const common = require('./common');
const appConfig = require('../config/core');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const {User, Usermeta} = models;

module.exports = {
    showLogin: function (req, res, next) {
        req.session.loginReferer = req.headers.referer;

        if (req.session.user) {
            return res.redirect('/');
        }
        common.getInitOptions((err, result) => {
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
    login: function (req, res, next) {
        const params = req.body;
        const username = xss.sanitize(params.username);

        res.cookie('username', username, {
            path: '/',
            maxAge: appConfig.cookieExpires
        });
        User.findOne({
            attributes: ['userId', 'userLogin', 'userNicename', 'userEmail', 'userLink', 'userRegistered', 'userStatus', 'userDisplayName'],
            include: [{
                model: Usermeta,
                attributes: ['metaId', 'userId', 'metaKey', 'metaValue']
            }],
            where: {
                userLogin: username,
                userPass: models.sequelize.fn('md5', models.sequelize.fn('concat', models.sequelize.col('user_pass_salt'), params.password))
            }
        }).then(function (result) {
            if (!result) {
                return next(util.catchError({
                    status: 200,
                    code: 400,
                    message: '用户名或密码错误'
                }));
            }
            let metaObj = {};
            let user = {};
            if (result && result.Usermeta) {
                result.Usermeta.forEach((item) => {
                    metaObj[item.metaKey] = item.metaValue;
                });
            }
            Object.assign(user, result.get({
                plain: true
            }));
            delete user.Usermeta;
            user.usermeta = metaObj;

            const referer = req.session.referrer;
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
                res.set('Content-type', 'application/json');
                if (params.rememberMe && params.rememberMe === '1') {
                    res.cookie('rememberMe', 1, {
                        path: '/',
                        maxAge: appConfig.cookieExpires
                    });
                    req.session.cookie.expires = new Date(Date.now() + appConfig.cookieExpires);
                    req.session.cookie.maxAge = appConfig.cookieExpires;
                } else {
                    res.cookie('rememberMe', 0, {
                        path: '/',
                        maxAge: appConfig.cookieExpires
                    });
                    req.session.cookie.expires = false;
                }
                req.session.user = user;
                req.session.save();
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
    logout: function (req, res, next) {
        req.session.destroy(function (err) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'logout',
                    msg: err,
                    req
                }));
                return next(err);
            }
            res.redirect('/');
        });
    }
};
