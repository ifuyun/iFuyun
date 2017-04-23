/*global console*/
/**
 * 后台路由
 * @module cfg_routes_admin
 * @param {Object} app Server对象
 * @param {Object} router 路由对象
 * @return {Object} router 路由对象
 * @author Fuyun
 * @version 3.0.0
 * @since 1.1.0
 */
'use strict';
module.exports = function (app, router) {
    const base = require('../controllers/base');
    const post = require('../controllers/post');
    const user = require('../controllers/user');
    const admin = require('../controllers/admin');
    const comment = require('../controllers/comment');
    const taxonomy = require('../controllers/taxonomy');
    const link = require('../controllers/link');

    router.use(admin.checkAuth);
    router.get('/', admin.welcome);
    router.get('/profile', user.profile);

    router.get('/post', post.listEdit);
    router.get('/post/page-:page', post.listEdit);
    router.get('/post/new', post.newPost);
    router.post('/post/save', post.savePost);
    router.get('/post/:postId', post.editPost);
    router.post('/post/batch', post.batchSave);
    router.post('/post/remove', post.removePost);//避免误删，采用post

    router.get('/media', post.listMedia);
    router.get('/media/page-:page', post.listMedia);
    router.get('/media/new', post.newMedia);
    router.post('/media/upload', post.uploadFile);

    router.get('/comment', comment.listComments);
    router.get('/comment/page-:page', comment.listComments);
    router.get('/comment/:commentId', comment.editComment);
    router.get('/comment/reply/:commentId', comment.replyComment);
    router.post('/comment/save', comment.saveComment);
    router.post('/comment/saveReply', comment.saveReply);
    router.post('/comment/status', comment.updateStatus);
    // router.post('/comment/remove', comment.removeComment);
    // router.post('/comment/approve', comment.approveComment);//批准
    // router.post('/comment/spam', comment.spamComment);//垃圾评论

    router.get('/category', taxonomy.listCategory);
    router.get('/category/page-:page', taxonomy.listCategory);
    router.get('/category/new', taxonomy.newCategory);
    router.post('/category/save', taxonomy.saveCategory);
    router.get('/category/:taxonomyId', taxonomy.editCategory);
    router.post('/category/remove', taxonomy.removeCategory);

    router.get('/link', link.listLink);
    router.get('/link/page-:page', link.listLink);
    router.get('/link/new', link.newLink);
    router.post('/link/save', link.saveLink);
    router.get('/link/:linkId', link.editLink);
    router.post('/link/remove', link.removeLink);

    router.get('/options/general', admin.setGeneral);
    router.post('/options/general', admin.saveGeneral);
    router.get('/options/writing', admin.setWriting);
    router.post('/options/writing', admin.setWriting);
    router.get('/options/reading', admin.setReading);
    router.post('/options/reading', admin.setReading);
    router.get('/options/discussion', admin.setDiscussion);
    router.post('/options/discussion', admin.setDiscussion);

    return router;
};
