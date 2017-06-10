/*global console*/
/**
 * 全局控制器
 * @module c_base
 * @class C_Base
 * @static
 * @requires cfg_core, m_base, util, m_option
 * @author Fuyun
 * @version 3.0.0
 * @since 1.0.0
 */
const appConfig = require('./core');
const util = require('../helper/util');
// const logger = require('../helper/logger');
module.exports = {
    /**
     * 起始路由
     * @method init
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.0.0
     */
    init: function (req, res, next) {
        const rememberMe = req.cookies.rememberMe;
        const curUser = req.session.user;
        res.locals.isLogin = curUser ? !!curUser : false;
        // res.locals.staticEnv = process.env.ENV && process.env.ENV.trim() === 'production' ? 'dist' : 'dev';
        if (res.locals.isLogin && rememberMe && rememberMe === '1') {// 2015-07-28：不能regenerate，否则将导致后续请求无法设置session
            req.session.cookie.expires = new Date(Date.now() + appConfig.cookieExpires);
            req.session.cookie.maxAge = appConfig.cookieExpires;
            req.session.save();
            next();
        } else {
            next();
        }
    },
    /**
     * 结束路由
     * @method last
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    last: function (req, res, next) {
        return util.catchError({
            status: 404,
            code: 404,
            message: 'Page Not Found'
        }, next);
    },
    /**
     * 错误路由
     * @method error
     * @static
     * @param {Error} err 错误对象
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    error: function (err, req, res, next) {// TODO: IE can not custom page
        // app.get('env') === 'development'
        if (req.xhr) {
            res.status(err.status || 200).type('application/json');
            res.send({
                // status: err.status || 200,
                code: err.code || 500,
                message: err.message || err || '未知错误',
                token: req.csrfToken ? req.csrfToken() : ''
            });
        } else {
            res.status(err.status || 404).type('text/html');
            res.render(`${appConfig.pathViews}/error/${err.status || 404}`, {
                status: err.status || 404,
                code: err.code || 404,
                message: err.message || err || 'Page Not Found'
            });
        }
    }
};
