/* jslint nomen:true es5:true */
/* global console */
/* global __dirname */
/**
 * 路由定义，含错误路由
 * @module cfg_routes
 * @param {Object} app express实例
 * @param {Object} express express对象
 * @return {void}
 * @author Fuyun
 * @version 2.0.0
 * @since 1.0.0
 */
module.exports = function (app, express) {
    const path = require('path');
    const router = express.Router();
    const base = require('./routes-base');
    const post = require('../controllers/post');
    const user = require('../controllers/user');
    const comment = require('../controllers/comment');
    const admin = require('./routes-admin')(app, router);

    // 静态文件(若先路由后静态文件，将导致session丢失)
    app.use(express.static(path.join(__dirname, '..', 'public', 'static')));
    app.use(express.static(path.join(__dirname, '..', 'public', process.env.ENV && process.env.ENV.trim() === 'production' ? 'dist' : 'dev')));

    app.use(base.init);
    app.get('/', post.listPosts);
    app.get('/page-:page', post.listPosts);
    app.get('/post/page-:page', post.listPosts);
    app.get('/post/:postId', post.showPost);
    app.get('/category/:category', post.listByCategory);
    app.get('/category/:category/page-:page', post.listByCategory);
    app.get('/archive/:year', post.listByDate);
    app.get('/archive/:year/page-:page', post.listByDate);
    app.get('/archive/:year/:month', post.listByDate);
    app.get('/archive/:year/:month/page-:page', post.listByDate);
    app.get('/tag/:tag', post.listByTag);
    app.get('/tag/:tag/page-:page', post.listByTag);

    app.post('/post/comment/save', comment.saveComment);
    app.post('/post/comment/vote', comment.saveVote);

    // app.get('/comment/:postId', comment.listComments);
    // app.get('/comment/:postId/page-:page', comment.listComments);
    app.get('/user/login', user.showLogin);
    app.post('/user/login', user.login);
    app.get('/user/logout', user.logout);

    // 后台路由
    app.use('/admin', admin);
    // 独立页面
    app.use(post.showPage);
    // 可以省略
    app.use(base.last);
    // 错误路由
    app.use(base.error);
};
