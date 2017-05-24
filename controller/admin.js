/**
 *
 * @author fuyun
 * @since 2017/05/25
 */
const util = require('../helper/util');

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
    }
};
