/**
 * 全局控制器
 * @module c_base
 * @static
 * @author Fuyun
 * @version 3.5.1
 * @since 1.0.0
 */
const domain = require('domain');
const cluster = require('cluster');
const appConfig = require('./core');
const util = require('../helper/util');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const STATUS_CODES = require('../services/status-codes');

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
     * @version 3.5.1
     * @since 1.0.0
     */
    init(req, res, next) {
        const rememberMe = req.cookies.rememberMe;
        const user = req.session.user;
        res.locals.isLogin = !!user;
        res.locals.enableWxSdk = appConfig.enableWxSdk;
        // for copyright
        res.locals.curYear = new Date().getFullYear();
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
     * @version 3.5.1
     * @since 1.0.0
     * @deprecated
     */
    last(req, res, next) {
        return util.catchError({
            status: STATUS_CODES.PAGE_NOT_FOUND,
            code: STATUS_CODES.PAGE_NOT_FOUND,
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
     * @version 3.5.1
     * @since 1.0.0
     */
    error(err, req, res, next) {// TODO: IE can not custom page
        if (err.stack && err.output !== false) {// 对未捕获的错误记录堆栈信息
            logger.error(formatOpLog({
                msg: err.stack,
                req
            }));
        }
        const message = err.message || err || 'Unknown Error.';
        if (req.xhr) {
            res.status(err.status || STATUS_CODES.HTTP_SUCCESS).type('application/json');
            res.send({
                code: err.code || STATUS_CODES.SERVER_ERROR,
                message,
                token: req.csrfToken()
            });
        } else {
            const status = err.status || STATUS_CODES.PAGE_NOT_FOUND;
            res.status(status).type('text/html');
            res.render(`${appConfig.pathViews}/error/${status}`, {
                code: err.code || STATUS_CODES.PAGE_NOT_FOUND,
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
     * @version 3.5.1
     * @since 2.0.0
     * @deprecated
     */
    globalError(server) {
        return (req, res, next) => {
            // todo: domain is deprecated
            const d = domain.create();
            const killTimeout = 5000;

            d.add(req);
            d.add(res);
            d.on('error', (err) => {
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
                    server.close();
                    if (curWorker) {
                        curWorker.disconnect();
                    }
                } catch (serverErr) {
                    logger.error(formatOpLog({
                        msg: `Error on server: [pid: ${process.pid}] close or worker: [id: ${(curWorker && curWorker.id) || '-'}] disconnect. \n${serverErr.stack}`,
                        req
                    }));
                }

                try {
                    err.status = STATUS_CODES.SERVER_ERROR;
                    err.code = STATUS_CODES.SERVER_ERROR;
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
