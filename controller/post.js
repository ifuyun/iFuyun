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
        friendLinks: (cb) => {
            common.getLinks('friendlink', param.from !== 'list' || param.page > 1 ? 'site' : ['homepage', 'site'], cb);
        },
        quickLinks: (cb) => {
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
        attributes: ['postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus', 'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
        include: [{
            model: models.User,
            attributes: ['userDisplayName']
        // }, {
        //     model: models.Comment,
        //     attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'commentCreated'],
        //     where: {
        //         commentStatus: ['normal']
        //     }
        }, {
            model: models.TermTaxonomy,
            attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'termOrder', 'count'],
            where: param.taxonomyWhere
        }],
        where: param.where,
        order: [['postCreated', 'desc'], ['postDate', 'desc']],
        group: ['postId'],
        limit: 10,
        offset: 10 * (param.page - 1),
        subQuery: false
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
        async.auto({
            commonData: (cb) => {
                getCommonData({
                    page: page,
                    from: 'list'
                }, cb);
            },
            posts: (cb) => {
                queryPosts({
                    page: page,
                    where: where,
                    taxonomyWhere: {
                        taxonomy: ['post']
                    }
                }, cb, next);
            },
            postsCount: (cb) => {
                models.Post.count({
                    // attributes: [[models.sequelize.fn('count', 1), 'count']],
                    where: where,
                    distinct: true
                }).then(function (result) {
                    // console.log(result[0].get({plain: true}).count);
                    cb(null, result);
                });
            },
            comments: ['posts', function (result, cb) {
                common.getCommentCountByPosts(result.posts, cb);
            }]
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            let resData = {
                curNav: 'index',
                showCrumb: false,
                meta: {}
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), 9);
            resData.posts.linkUrl = '/post/page-';
            resData.posts.linkParam = req.query.keyword ? '?keyword=' + req.query.keyword : '';
            resData.comments = result.comments;

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
                    // 无管理员权限不允许访问非公开文章(包括草稿)
                    if (!util.isAdminUser(req) && result.postStatus !== 'publish') {
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
            crumb: ['commonData', 'post',
                function (result, cb) {
                    let post = result.post;
                    let categories = [];
                    post.TermTaxonomies.forEach((v) => {
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
                    cb(null, common.getCategoryPath({
                        catData: result.commonData.categories.catData,
                        taxonomyId: categories[0].taxonomyId
                    }));
                }],
            prevPost: (cb) => {
                common.getPrevPost(postId, cb);
            },
            nextPost: (cb) => {
                common.getNextPost(postId, cb);
            }
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            let resData = {
                showCrumb: true,
                user: {},
                meta: {},
                token: req.csrfToken()
            };
            if (req.session.user) {
                resData.user.userName = req.session.user.user.user_display_name;
                resData.user.userEmail = req.session.user.user.user_email;
            }
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.curNav = result.crumb[0].slug;
            resData.curPos = util.createCrumb(result.crumb);
            resData.postCats = [];
            resData.postTags = [];

            let tagArr = [];
            result.post.TermTaxonomies.forEach((v) => {
                if (v.taxonomy === 'tag') {
                    tagArr.push(v.name);
                    resData.postTags.push(v);
                } else if (v.taxonomy === 'post') {
                    resData.postCats.push(v);
                }
            });
            tagArr.push(options.site_keywords.optionValue);

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), 140);
            resData.meta.keywords = tagArr.join(',') + ',' + options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;
            resData.post = result.post;
            resData.prevPost = result.prevPost;
            resData.nextPost = result.nextPost;
            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/post', resData);
        });
    },
    listByCategory: function (req, res, next) {
        const page = parseInt(req.params.page, 10) || 1;
        const category = req.params.category;
        let where = {
            postStatus: 'publish',
            postType: 'post'
        };
        let taxonomyWhere = {
            taxonomy: ['post']// , 'tag'
        };
        async.auto({
            commonData: (cb) => {
                getCommonData({
                    page: page,
                    from: 'category'
                }, cb);
            },
            subCategories: ['commonData', (result, cb) => {
                common.getSubCategoriesBySlug({
                    catData: result.commonData.categories.catData,
                    slug: category
                }, cb);
            }],
            setTaxonomyWhere: ['subCategories', (result, cb) => {
                taxonomyWhere.taxonomyId = result.subCategories.subCatIds;
                cb(null);
            }],
            posts: ['setTaxonomyWhere', function (result, cb) {
                queryPosts({
                    page,
                    where,
                    taxonomyWhere
                }, cb, next);
            }],
            postsCount: ['setTaxonomyWhere', function (result, cb) {
                models.Post.count({
                    where,
                    include: [{
                        model: models.TermTaxonomy,
                        attributes: ['taxonomyId'],
                        where: taxonomyWhere
                    }],
                    subQuery: false,
                    distinct: true
                }).then((count) => {
                    cb(null, count);
                });
            }],
            comments: ['posts', function (result, cb) {
                common.getCommentCountByPosts(result.posts, cb);
            }]
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            // res.send(JSON.stringify(result));
            let resData = {
                curNav: result.subCategories.catPath[0].slug,
                showCrumb: true,
                user: {},
                meta: {}
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.curPos = util.createCrumb(result.subCategories.catPath);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), 9);
            resData.posts.linkUrl = '/category/' + category + '/page-';
            resData.posts.linkParam = '';
            resData.comments = result.comments;

            const curCat = result.subCategories.catPath[result.subCategories.catPath.length - 1].title;
            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', curCat, '分类目录', options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle([curCat, '分类目录', options.site_name.optionValue]);
            }

            resData.meta.description = '[' + curCat + ']' + (page > 1 ? '(第' + page + '页)' : '') + options.site_description.option_value;
            resData.meta.keywords = curCat + ',' + options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/postList', resData);
            // const options = result.commonData.options;
            // Object.assign(resData, result.commonData);
            //
            // resData.posts = result.posts;
            // resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), 9);
            // resData.posts.linkUrl = '/post/page-';
            // resData.posts.linkParam = req.query.keyword ? '?keyword=' + req.query.keyword : '';
            //
            // resData.meta.description = (page > 1 ? '[文章列表](第' + page + '页)' : '') + options.site_description.optionValue;
            // resData.meta.keywords = options.site_keywords.optionValue;
            // resData.meta.author = options.site_author.optionValue;
            //
            // resData.util = util;
            // resData.moment = moment;
            // res.render('front/pages/postList', resData);
        });
    }
}