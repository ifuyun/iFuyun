/*global console*/
/**
 * 后台路由
 * @module cfg_routes_admin
 * @param {Object} app Server对象
 * @param {Object} router 路由对象
 * @return {Object} router 路由对象
 * @author Fuyun
 * @version 2.0.0
 * @since 1.1.0
 */
module.exports = function (app, router) {
    const post = require('../controllers/post');
    // const user = require('../controllers/user');
    const admin = require('../controllers/admin');
    const comment = require('../controllers/comment');
    const taxonomy = require('../controllers/taxonomy');
    const link = require('../controllers/link');

    router.use(admin.checkAuth);
    router.get('/', admin.welcome);
    // router.get('/profile', user.profile);

    router.get('/post', post.listEdit);
    router.get('/post/page-:page', post.listEdit);
    router.get('/post/new', post.editPost);
    router.get('/post/:postId', post.editPost);
    router.post('/post/save', post.savePost);
    // router.post('/post/batch', post.batchSave);
    // router.post('/post/remove', post.removePost);//避免误删，采用post

    router.get('/media', post.listMedia);
    router.get('/media/page-:page', post.listMedia);
    router.get('/media/new', post.newMedia);
    // router.post('/media/upload', post.uploadFile);

    router.get('/comment', comment.listComments);
    router.get('/comment/page-:page', comment.listComments);
    router.get('/comment/:commentId', comment.editComment);
    router.post('/comment/save', comment.saveComment);
    router.post('/comment/status', comment.updateStatus);
    router.post('/comment/remove', comment.removeComments);

    router.get('/taxonomy', taxonomy.listTaxonomy);
    router.get('/taxonomy/page-:page', taxonomy.listTaxonomy);
    router.get('/taxonomy/detail', taxonomy.editTaxonomy);
    router.post('/taxonomy/save', taxonomy.saveTaxonomy);
    router.post('/taxonomy/remove', taxonomy.removeTaxonomy);

    router.get('/link', link.listLink);
    router.get('/link/page-:page', link.listLink);
    router.get('/link/detail', link.editLink);
    router.post('/link/save', link.saveLink);
    router.post('/link/remove', link.removeLink);

    router.get('/settings', admin.settings);// general writing reading discussion
    router.post('/settings', admin.saveSettings);

    return router;
};
