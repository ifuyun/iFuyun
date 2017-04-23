/**
 * Created by fuyun on 2017/04/12.
 */
const models = require('../models/index');
const common = require('./common');
const async = require('async');
const util = require('../helper/util');
const moment = require('moment');
const logger = require('../helper/logger').sysLog;

function getCommonData (param, cb) {
    async.parallel({
        archiveDates: common.archiveDates,
        recentPosts: common.recentPosts,
        randPosts: common.randPosts,
        hotPosts: common.hotPosts,
        friendLinks: function (cb) {
            common.getLinks('friendlink', param.from !== 'list' || param.page > 1 ? 'site' : ['homepage', 'site'], cb);
        },
        quickLinks: function (cb) {
            common.getLinks('quicklink', ['homepage', 'site'], cb);
        },
        categories: common.getCategoryTree.bind(common),
        mainNavs: common.mainNavs,
        options: common.getInitOptions
    }, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}
function queryPosts (param, cb, next) {
    models.Post.findAll({
        attributes: ['postId', 'postAuthor', 'postDate', 'postContent', 'postTitle', 'postExcerpt', 'postStatus', 'commentFlag', 'postOriginal', 'postName', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
        include: [{
            model: models.User,
            attributes: ['userDisplayName']
        }, {
            model: models.Comment,
            attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'commentCreated'],
            where: {
                commentStatus: ['normal']
            }
        }, {
            model: models.TermTaxonomy,
            attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'termOrder', 'count'],
            where: {
                taxonomy: ['post']// , 'tag'
            }
        }],
        where: param.where,
        order: [['postCreated', 'desc'], ['postDate', 'desc']],
        limit: 10,
        offset: 10 * (param.page - 1)
    }).then(function (posts) {
        cb(null, posts);
    }).catch(function (err) {
        next(err);
    });
}
module.exports = {
    listPosts: function (req, res, next) {
        const page = parseInt(req.params.page, 10) || 1;
        let where = {
            postStatus: 'publish',
            postType: 'post'
        };
        if (req.query.keyword) {
            where.$or = [{
                postTitle: {
                    $like: `%${req.query.keyword}%`
                }
            }, {
                postContent: {
                    $like: `%${req.query.keyword}%`
                }
            }, {
                postExcerpt: {
                    $like: `%${req.query.keyword}%`
                }
            }];
        }
        async.parallel({
            commonData: function (cb) {
                getCommonData({
                    page: page,
                    from: 'list'
                }, cb);
            },
            posts: function (cb) {
                queryPosts({
                    page: page,
                    where: where
                }, cb, next);
            },
            postsCount: function (cb) {
                models.Post.count({
                    // attributes: [[models.sequelize.fn('count', 1), 'count']],
                    where: where
                }).then(function (result) {
                    // console.log(result[0].get({plain: true}).count);
                    cb(null, result);
                });
            }
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            let resData = {
                curNav: 'index',
                showCrumb: false,
                meta: {
                    title: '',
                    description: '',
                    keywords: '',
                    author: ''
                }
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), 9);
            resData.posts.linkUrl = '/post/page-';
            resData.posts.linkParam = req.query.keyword ? '?keyword=' + req.query.keyword : '';

            if (req.query.keyword) {
                if (page > 1) {
                    resData.meta.title = util.getTitle([req.query.keyword, '第' + page + '页', '搜索结果', options.site_name.optionValue]);
                } else {
                    resData.meta.title = util.getTitle([req.query.keyword, '搜索结果', options.site_name.optionValue]);
                }
            } else {
                if (page > 1) {
                    resData.meta.title = util.getTitle(['第' + page + '页', '文章列表', options.site_name.optionValue]);
                } else {
                    resData.meta.title = util.getTitle(['爱生活，爱抚云', options.site_name.optionValue]);
                }
            }

            resData.meta.description = (page > 1 ? '[文章列表](第' + page + '页)' : '') + options.site_description.optionValue;
            resData.meta.keywords = options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/postList', resData);
        });
    },
    showPost: function (req, res, next) {
        const postId = req.params.postId;
        if (!postId || !/^[0-9a-fA-F]{16}$/i.test(postId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }
        async.auto({
            commonData: function (cb) {
                getCommonData({
                    from: 'post'
                }, cb);
            },
            post: function (cb) {
                models.Post.findById(postId, {
                    attributes: ['postId', 'postAuthor', 'postDate', 'postContent', 'postTitle', 'postExcerpt', 'postStatus', 'commentFlag', 'postOriginal', 'postName', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
                    include: [{
                        model: models.User,
                        attributes: ['userDisplayName']
                    }, {
                        model: models.Comment,
                        attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'commentCreated'],
                        where: {
                            commentStatus: ['normal']
                        }
                    }, {
                        model: models.TermTaxonomy,
                        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'count'],
                        where: {
                            taxonomy: ['post', 'tag']
                        }
                    }]
                }).then(function (result) {
                    if (!result || !result.postId) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'showPost', // TODO:func.name
                            funcParam: {
                                postId: result.postId
                            },
                            msg: 'Post Not Exist.'
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found.'
                        }));
                    }
                    if (!util.isAdminUser(req) && result.postStatus !== 'publish') {// 无管理员权限不允许访问非公开文章(包括草稿)
                        logger.warn(util.getErrorLog({
                            req: req,
                            funcName: 'showPost',
                            funcParam: {
                                postId: result.postId,
                                postTitle: result.postTitle,
                                postStatus: result.postStatus
                            },
                            msg: result.postTitle + ' is ' + result.postStatus
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found.'
                        }));
                    }
                    cb(null, result);
                });
            },
            crumb: ['post',
                function (result, cb) {
                    let post = result.post;
                    let categories = [];
                    post.TermTaxonomies.forEach(function (v) {
                        if (v.taxonomy === 'post') {
                            categories.push(v);
                        }
                    });
                    if (categories.length < 1) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'showPost',
                            funcParam: {
                                postId: post.postId,
                                postTitle: post.postTitle
                            },
                            msg: 'Category Not Exist.'
                        }));
                        return cb('Category Not Exist.');
                    }
                    let catCrumb = [];
                    catCrumb.push({
                        'title': categories[0].name,
                        'tooltip': categories[0].description,
                        'url': '/category/' + categories[0].slug,
                        'headerFlag': true
                    });
                    if (!categories[0].parent) {
                        return cb(null, catCrumb);
                    }
                    common.getCategoryPath(catCrumb, categories[0].parent, cb);
                }],
            prevPost: function (cb) {
                common.getPrevPost(postId, cb);
            },
            nextPost: function (cb) {
                common.getNextPost(postId, cb);
            }
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            let resData = {
                curNav: '',
                curPos: '',
                showCrumb: true,
                user: {
                    userName: '',
                    userEmail: ''
                },
                meta: {
                    title: '',
                    description: '',
                    keywords: '',
                    author: ''
                },
                token: req.csrfToken()
            };
            if (req.session.user) {
                resData.user.userName = req.session.user.user.user_display_name;
                resData.user.userEmail = req.session.user.user.user_email;
            }
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            result.crumb.unshift({
                'title': '首页',
                'tooltip': 'iFuyun',
                'url': '/',
                'headerFlag': false
            });
            resData.curNav = result.crumb[1].slug;
            resData.curPos = util.createCrumb(result.crumb);
            resData.categories = [];
            resData.tags = [];

            let tagArr = [];
            result.post.TermTaxonomies.forEach(function (v) {
                if (v.taxonomy === 'tag') {
                    tagArr.push(v.name);
                    resData.tags.push(v);
                } else if (v.taxonomy === 'post') {
                    resData.categories.push(v);
                }
            });
            tagArr.push(options.site_keywords.optionValue);

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), 140);
            resData.meta.keywords = tagArr.join(',');
            resData.meta.author = options.site_author.optionValue;
            resData.post = result.post;
            resData.prevPost = result.prevPost;
            resData.nextPost = result.nextPost;
            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/post', resData);
        });
    }
}