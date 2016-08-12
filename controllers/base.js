/*global console*/
/**
 * 全局控制器
 * @module c_base
 * @class C_Base
 * @static
 * @requires cfg_core, m_base, util, m_option
 * @author Fuyun
 * @version 1.1.0(2015-02-28)
 * @since 1.0.0(2014-06-01)
 */
var config = require('../config/core'),
    pool = require('../model/base').pool,
    util = require('../helper/util'),
    logger = require('../helper/logger'),
    // browscap = require('browscap'),
    OptionModel = require('../model/option'),
    option = new OptionModel(pool);
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
     * @version 1.1.0(2015-02-28)
     * @since 1.0.0(2014-05-31)
     */
    init: function (req, res, next) {
        'use strict';
        var rememberMe = req.cookies.rememberMe,
            curUser = req.session.user;
        // console.log(browscap.getBrowser(req.headers['user-agent']));
        res.locals.isLogin = curUser ? !!curUser : false;
        // res.cookie('x-csrf-token', req.csrfToken());
        // res.session._csrf = req.csrfToken();
        if (res.locals.isLogin && rememberMe && rememberMe === '1') {//2015-07-28：不能regenerate，否则将导致后续请求无法设置session
            req.session.cookie.expires = new Date(Date.now() + config.cookieExpires);
            req.session.cookie.maxAge = config.cookieExpires;
            // req.session.user = curUser;
            req.session.save();
            next();
        } else {
            next();
        }
    },
    /**
     * 结束路由
     * @method final
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0(2015-02-25)
     * @since 1.0.0(2014-06-01)
     */
    final: function (req, res, next) {
        'use strict';
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
     * @version 1.0.0(2015-02-25)
     * @since 1.0.0(2014-06-01)
     */
    error: function (err, req, res, next) {//TODO: IE can not custom page
        'use strict';
        //app.get('env') === 'development'
        // console.log(err.stack);
        if (req.xhr) {
            res.status(err.status || 500).type('application/json');
            res.send({
                status: err.status || 500,
                code: err.code || 500,
                message: err.message || err || '未知错误',
                token: req.csrfToken ? req.csrfToken() : ''
            });
        } else {
            res.status(err.status || 404).type('text/html');
            res.render('error/' + (err.status || 404), {
                status: err.status || 404,
                code: err.code || 404,
                message: err.message || err || 'Page Not Found'
            });
        }
    },
    /**
     * 查询全局自动加载的配置项
     * @method initOption
     * @static
     * @param {Function} callback 回调函数
     * @return {void}
     * @author Fuyun
     * @version 1.0.0(2014-05-30)
     * @since 1.0.0(2014-05-16)
     */
    initOption: function (callback) {
        'use strict';
        option.getAutoloadOptions(function (err, data) {
            if (err) {
                return callback(err, data);
            }
            var rowIdx,
                tmpArr = {},
                tmpObj;
            for (rowIdx = 0; rowIdx < data.length; rowIdx += 1) {
                tmpObj = {
                    blog_id: data[rowIdx].blog_id,
                    option_value: data[rowIdx].option_value
                };
                tmpArr[data[rowIdx].option_name] = tmpObj;
            }
            callback(null, tmpArr);
        });
    },
    /**
     * 生成面包屑
     * @method createCrumb
     * @static
     * @param {Array} crumbData 面包屑路径对象
     * @param {String} [separator='&nbsp;→&nbsp;'] 路径分隔符
     * @return {String} 面包屑
     * @author Fuyun
     * @version 1.0.0(2014-06-01)
     * @since 1.0.0(2014-05-16)
     */
    createCrumb: function (crumbData, separator) {
        'use strict';
        var tempArr = [],
            crumb;
        separator = separator || '&nbsp;→&nbsp;';
        for (crumb in crumbData) {
            if (crumbData.hasOwnProperty(crumb)) {
                crumb = crumbData[crumb];
                if (crumb.url !== '' && !crumb.headerFlag) {
                    tempArr.push('<a title="' + crumb.tooltip + '" href="' + crumb.url + '">' + crumb.title + '</a>');
                } else if (crumb.url !== '' && crumb.headerFlag) {
                    tempArr.push('<h3><a title="' + crumb.tooltip + '" href="' + crumb.url + '">' + crumb.title + '</a></h3>');
                } else {
                    tempArr.push('<span title="' + crumb.tooltip + '">' + crumb.title + '</span>');
                }
            }
        }
        return tempArr.join(separator);
    }
};
