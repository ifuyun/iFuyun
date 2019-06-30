/*global console*/
/**
 * 全局控制器
 * @module c_base
 * @static
 * @author Fuyun
 * @version 2.0.0
 * @since 1.0.0
 */
const domain = require('domain');
const cluster = require('cluster');
const appConfig = require('./core');
const util = require('../helper/util');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const codeSuccess = 200;
const codeError = 500;
const codeNotFound = 404;

module.exports = {
    /**
     * 起始路由
     * @method init
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Function} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.1.0
     * @since 1.0.0
     */
    init: function (req, res, next) {
        const rememberMe = req.cookies.rememberMe;
        const curUser = req.session.user;
        res.locals.isLogin = curUser ? !!curUser : false;
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
     * @param {Function} next 路由对象
     * @return {*} null
     * @author Fuyun
     * @version 2.0.0
     * @since 1.0.0
     */
    last: function (req, res, next) {
        return util.catchError({
            status: codeNotFound,
            code: codeNotFound,
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
     * @param {Function} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 2.0.0
     * @since 1.0.0
     */
    error: function (err, req, res, next) {// TODO: IE can not custom page
        if (err.stack && err.output !== false) {// 对未捕获的错误记录堆栈信息
            logger.error(formatOpLog({
                msg: err.stack,
                req
            }));
        }
        const message = err.message || err || 'Unknown Error.';
        if (req.xhr) {
            res.status(err.status || codeSuccess).type('application/json');
            res.send({
                code: err.code || codeError,
                message,
                token: req.csrfToken()
            });
        } else {
            const status = err.status || codeNotFound;
            res.status(status).type('text/html');
            res.render(`${appConfig.pathViews}/error/${status}`, {
                code: err.code || codeNotFound,
                status,
                message
            });
        }
    },
    /**
     * 全局错误捕捉、处理
     * @method globalError
     * @static
     * @param {Server} server, we need to close it and stop taking new requests.
     * @return {Function} middleware fn.
     * @author Fuyun
     * @version 2.0.0
     * @since 2.0.0
     */
    globalError: function (server) {
        return function (req, res, next) {
            const d = domain.create();
            const killTimeout = 5000;

            d.add(req);
            d.add(res);
            d.on('error', function (err) {
                logger.error(formatOpLog({
                    msg: `Domain Error Caught: \n${err.stack}`,
                    req
                }));
                setTimeout(() => {
                    logger.error(formatOpLog({
                        msg: 'Failsafe shutdown.',
                        req
                    }));
                    process.exit(1);
                }, killTimeout);

                const curWorker = cluster.worker;
                try {// because server could already closed, need try catch the error: `Error: Not running`
                    if (curWorker) {
                        curWorker.disconnect();
                    }
                    server.close();
                } catch (serverErr) {
                    logger.error(formatOpLog({
                        msg: `Error on server: [pid: ${process.pid}] close or worker: [id: ${(curWorker && curWorker.id) || '-'}] disconnect. \n${serverErr.stack}`,
                        req
                    }));
                }

                try {
                    err.status = codeError;
                    err.code = codeError;
                    err.output = false;
                    next(err);
                } catch (nextErr) {
                    logger.error(formatOpLog({
                        msg: `Express error mechanism failed. \n${nextErr.stack}`,
                        req
                    }));
                }
            });
            d.run(next);
        };
    }
};
