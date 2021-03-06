/**
 * 设置
 * @author fuyun
 * @version 3.3.5
 * @since 1.1.0(2017-05-25)
 */
const xss = require('sanitizer');
const util = require('../helper/util');
const optionService = require('../services/option');
const appConfig = require('../config/core');

module.exports = {
    welcome(req, res) {
        res.redirect('/admin/post');
    },
    checkAuth(req, res, next) {
        res.locals.isLogin = util.isLogin(req.session.user);
        if (util.isAdminUser(req.session.user)) {
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
    settings(req, res, next) {
        const type = (req.query.type || 'general').toLowerCase();

        if (!['general', 'writing', 'reading', 'discussion'].includes(type)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        optionService.getInitOptions((err, options) => {
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
    saveSettings(req, res, next) {
        const param = req.body;
        const settings = [{
            name: 'site_name',
            value: util.trim(xss.sanitize(param.siteName)),
            required: true,
            message: '站点标题'
        }, {
            name: 'site_description',
            value: util.trim(xss.sanitize(param.siteDescription)),
            required: true,
            message: '站点描述'
        }, {
            name: 'site_slogan',
            value: util.trim(xss.sanitize(param.siteSlogan)),
            required: true,
            message: '口号'
        }, {
            name: 'site_url',
            value: util.trim(xss.sanitize(param.siteUrl)),
            required: true,
            message: '站点地址'
        }, {
            name: 'site_keywords',
            value: util.trim(xss.sanitize(param.siteKeywords)),
            required: true,
            message: '关键词'
        }, {
            name: 'admin_email',
            value: util.trim(xss.sanitize(param.adminEmail)),
            required: true,
            message: '电子邮件地址'
        }, {
            name: 'icp_num',
            value: util.trim(xss.sanitize(param.icpNum)),
            required: false,
            message: 'ICP备案号'
        }, {
            name: 'copyright_notice',
            value: util.trim(xss.sanitize(param.copyNotice)),
            required: true,
            message: '版权信息'
        }, {
            name: 'upload_path',
            value: util.trim(xss.sanitize(param.uploadPath)),
            required: true,
            message: '上传路径'
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
        optionService.saveOptions({
            settings
        }).then(() => {
            res.type('application/json');
            res.send({
                code: 0,
                message: null,
                data: {
                    url: '/admin/settings'
                }
            });
        }).catch((err) => {
            next({
                code: 500,
                message: err.message || err
            });
        });
    }
};
