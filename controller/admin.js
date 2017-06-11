/**
 *
 * @author fuyun
 * @since 2017/05/25
 */
const async = require('async');
const xss = require('sanitizer');
const util = require('../helper/util');
const models = require('../models/index');
const common = require('./common');
const appConfig = require('../config/core');

module.exports = {
    welcome: function (req, res, next) {
        res.redirect('/admin/post');
    },
    checkAuth: function (req, res, next) {
        res.locals.isLogin = util.isLogin(req);
        if (util.isAdminUser(req)) {
            return next();
        }
        if (res.locals.isLogin) {
            util.catchError({
                status: 403,
                code: 403,
                message: 'Page Forbidden'
            }, next);
        } else {
            res.redirect('/user/login');
        }
    },
    settings: function (req, res, next) {
        const type = (req.query.type || 'general').toLowerCase();

        if (!['general', 'writing', 'reading', 'discussion'].includes(type)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        common.getInitOptions((err, options) => {
            if (err) {
                return next(err);
            }
            const title = {
                general: '常规选项',
                writing: '写作设置',
                reading: '阅读设置',
                discussion: '讨论设置'
            }[type];
            let resData = {
                meta: {
                    title: util.getTitle([title, '站点设置', '管理后台', options.site_name.optionValue])
                },
                page: 'settings',
                token: req.csrfToken(),
                options,
                title
            };
            res.render(`${appConfig.pathViews}/admin/pages/settings`, resData);
        });
    },
    saveSettings: function (req, res, next) {
        const param = req.body;
        const settings = [{
            name: 'site_name',
            value: (xss.sanitize(param.siteName) || '').trim(),
            required: true,
            message: '站点标题'
        }, {
            name: 'site_description',
            value: (xss.sanitize(param.siteDescription) || '').trim(),
            required: true,
            message: '站点描述'
        }, {
            name: 'site_slogan',
            value: (xss.sanitize(param.siteSlogan) || '').trim(),
            required: true,
            message: '口号'
        }, {
            name: 'site_url',
            value: (xss.sanitize(param.siteUrl) || '').trim(),
            required: true,
            message: '站点地址'
        }, {
            name: 'site_keywords',
            value: (xss.sanitize(param.siteKeywords) || '').trim(),
            required: true,
            message: '关键词'
        }, {
            name: 'admin_email',
            value: (xss.sanitize(param.adminEmail) || '').trim(),
            required: true,
            message: '电子邮件地址'
        }, {
            name: 'icp_num',
            value: (xss.sanitize(param.icpNum) || '').trim(),
            required: false,
            message: 'ICP备案号'
        }, {
            name: 'copyright_notice',
            value: (xss.sanitize(param.copyNotice) || '').trim(),
            required: true,
            message: '版权信息'
        }];
        for (let i = 0; i < settings.length; i += 1) {
            if (settings[i].required && !settings[i].value) {
                return util.catchError({
                    status: 200,
                    code: 400,
                    message: settings[i].message + '不能为空'
                }, next);
            }
        }
        models.sequelize.transaction(function (t) {
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.times(settings.length, (i, nextFn) => {
                    models.Option.update({
                        optionValue: settings[i].value
                    }, {
                        where: {
                            optionName: settings[i].name
                        },
                        transaction: t
                    }).then((option) => nextFn(null, option));
                }, (err, result) => {
                    if (err) {
                        reject(new Error(err));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(() => {
            res.set('Content-type', 'application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: '/admin/settings'
                }
            });
        }, (err) => {
            next({
                code: 500,
                message: err.message || err
            });
        });
    }
};
