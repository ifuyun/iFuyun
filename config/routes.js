/* jslint nomen:true es5:true */
/* global console,__dirname */
/**
 * 路由定义，含错误路由
 * @module cfg_routes
 * @param {Object} app express实例
 * @param {Object} express express对象
 * @return {void}
 * @author Fuyun
 * @version 3.3.4
 * @since 1.0.0
 */
const path = require('path');
const routesBase = require('./routes-base');
const routesAdmin = require('./routes-admin');
const post = require('../controllers/post');
const user = require('../controllers/user');
const comment = require('../controllers/comment');
const captcha = require('../controllers/captcha');
const wechat = require('../controllers/wechat');
const config = require('./core');

module.exports = (app, express) => {
    const router = express.Router();
    const admin = routesAdmin(app, router);
    // 静态文件(若先路由后静态文件，将导致session丢失)
    app.use(express.static(path.join(__dirname, '..', 'public', 'static')));
    app.use(express.static(path.join(__dirname, '..', 'public', config.isDev ? 'dev' : 'dist')));

    app.use(routesBase.init);
    app.get('/', post.listPosts);
    app.get('/page-:page', post.listPosts);
    app.get('/post/page-:page', post.listPosts);
    app.get('/post/:postId', post.showPost);
    app.get('/category/:category', post.listByCategory);
    app.get('/category/:category/page-:page', post.listByCategory);
    app.get('/archive', post.listArchiveDate);
    app.get('/archive/:year', post.listByDate);
    app.get('/archive/:year/page-:page', post.listByDate);
    app.get('/archive/:year/:month', post.listByDate);
    app.get('/archive/:year/:month/page-:page', post.listByDate);
    app.get('/tag/:tag', post.listByTag);
    app.get('/tag/:tag/page-:page', post.listByTag);
    app.get('/captcha', captcha.create);

    app.post('/post/comment/save', comment.saveComment);
    app.post('/post/comment/vote', comment.saveVote);
    app.post('/wechat/sign', wechat.getSignature);

    // app.get('/comment/:postId', comment.listComments);
    // app.get('/comment/:postId/page-:page', comment.listComments);
    app.get('/user/login', user.showLogin);
    app.post('/user/login', user.login);
    app.get('/user/logout', user.logout);

    // 后台路由
    app.use('/admin', admin);
    // 独立页面
    app.use(post.showPage);
    // 错误路由
    app.use(routesBase.error);
};
