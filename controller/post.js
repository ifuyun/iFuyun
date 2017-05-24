/**
 * Created by fuyun on 2017/04/12.
 */
const models = require('../models/index');
const common = require('./common');
const async = require('async');
const util = require('../helper/util');
const moment = require('moment');
const url = require('url');
const logger = require('../helper/logger').sysLog;

function getCommonData (param, cb) {
    // 执行时间在30-60ms，间歇60-80ms
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
function queryPostsByIds (posts, postIds, cb) {
    // 执行时间在10-20ms
    /**
     * 根据group方式去重（distinct需要使用子查询，sequelize不支持include时的distinct）
     * 需要注意的是posts和postsCount的一致性
     * 评论数的查询通过posts进行循环查询，采用关联查询会导致结果不全（hasMany关系对应的是INNER JOIN，并不是LEFT OUTER JOIN），且并不需要所有评论数据，只需要总数
     *
     * sequelize有一个Bug：
     * 关联查询去重时，通过group by方式无法获取关联表的多行数据（如：此例的文章分类，只能返回第一条，并没有返回所有的分类）*/
    models.TermTaxonomy.findAll({
        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'count'],
        include: [{
            model: models.TermRelationship,
            attributes: ['objectId', 'termTaxonomyId'],
            where: {
                objectId: postIds
            }
        }],
        where: {
            taxonomy: ['post', 'tag']
        },
        order: [['termOrder', 'asc']]
    }).then((data) => {
        let result = [];
        posts.forEach((post) => {
            let tags = [];
            let categories = [];
            data.forEach((u) => {
                if (u.taxonomy === 'tag') {
                    u.TermRelationships.forEach((v) => {
                        if (v.objectId === post.postId) {
                            tags.push(u);
                        }
                    });
                } else {
                    u.TermRelationships.forEach((v) => {
                        if (v.objectId === post.postId) {
                            categories.push(u);
                        }
                    });
                }
            });
            result.push({
                post,
                tags,
                categories
            });
        });
        cb(null, result);
    });
}
function queryPosts (param, cb) {
    let queryOpt = {
        where: param.where,
        attributes: ['postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus', 'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
        include: [{
            model: models.User,
            attributes: ['userDisplayName']
        }],
        order: [['postCreated', 'desc'], ['postDate', 'desc']],
        limit: 10,
        offset: 10 * (param.page - 1),
        subQuery: false
    };
    switch (param.from) {
        case 'category':
            queryOpt.include.push({
                model: models.TermRelationship,
                attributes: ['objectId'],
                where: param.relationshipWhere
            });
            queryOpt.group = ['postId'];
            break;
        case 'tag':
            queryOpt.include.push({
                model: models.TermTaxonomy,
                attributes: ['taxonomyId'],
                where: param.tagWhere
            });
            break;
        default:
    }
    models.Post.findAll(queryOpt).then((posts) => {
        let postIds = [];
        posts.forEach((v) => {
            postIds.push(v.postId);
        });
        queryPostsByIds(posts, postIds, cb);
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
                    page,
                    from: 'list'
                }, cb);
            },
            posts: (cb) => {
                queryPosts({
                    page,
                    where,
                    // taxonomyWhere: {
                    //     taxonomy: 'post'
                    // },
                    from: 'index'
                }, cb);
            },
            postsCount: (cb) => {
                models.Post.count({
                    where
                }).then(function (result) {
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
            commonData: (cb) => {
                getCommonData({
                    from: 'post'
                }, cb);
            },
            post: function (cb) {
                models.Post.findById(postId, {
                    attributes: ['postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus', 'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
                    include: [{
                        model: models.User,
                        attributes: ['userDisplayName']
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
            comments: ['post', function (result, cb) {
                common.getCommentsByPostId(result.post.postId, cb);
            }],
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
                resData.user.userName = req.session.user.userDisplayName;
                resData.user.userEmail = req.session.user.userEmail;
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
            resData.comments = result.comments;
            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/post', resData);
        });
    },
    showPage: function (req, res, next) {
        const reqUrl = url.parse(req.url);
        const reqPath = reqUrl.pathname;
        async.auto({
            commonData: (cb) => {
                getCommonData({
                    from: 'page'
                }, cb);
            },
            post: function (cb) {
                models.Post.findOne({
                    attributes: ['postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus', 'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
                    include: [{
                        model: models.User,
                        attributes: ['userDisplayName']
                    }],
                    where: {
                        postGuid: reqPath
                    }
                }).then(function (result) {
                    if (!result || !result.postId) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'showPage',
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
                            funcName: 'showPage',
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
            comments: ['post', function (result, cb) {
                common.getCommentsByPostId(result.post.postId, cb);
            }]
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            let resData = {
                curNav: '',
                showCrumb: false,
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

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), 140);
            resData.meta.keywords = result.post.postTitle + ',' + options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.post = result.post;
            resData.comments = result.comments;
            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/page', resData);
        });
    },
    listByCategory: function (req, res, next) {
        const page = parseInt(req.params.page, 10) || 1;
        const category = req.params.category;
        let where = {
            postStatus: 'publish',
            postType: 'post'
        };
        let relationshipWhere = {};
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
            setRelationshipWhere: ['subCategories', (result, cb) => {
                relationshipWhere.termTaxonomyId = result.subCategories.subCatIds;
                cb(null);
            }],
            posts: ['setRelationshipWhere', function (result, cb) {
                queryPosts({
                    page,
                    where,
                    // taxonomyWhere: {
                    //     taxonomy: 'post'
                    // },
                    relationshipWhere,
                    from: 'category'
                }, cb);
            }],
            postsCount: ['setRelationshipWhere', function (result, cb) {
                models.Post.count({
                    where,
                    include: [{
                        model: models.TermRelationship,
                        attributes: ['objectId'],
                        where: relationshipWhere
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
        });
    },
    listByTag: function (req, res, next) {
        const page = parseInt(req.params.page, 10) || 1;
        const tag = req.params.tag;
        let where = {
            postStatus: 'publish',
            postType: 'post'
        };
        let tagWhere = {
            taxonomy: ['tag'],
            slug: tag
        };
        async.auto({
            commonData: (cb) => {
                getCommonData({
                    page: page,
                    from: 'tag'
                }, cb);
            },
            posts: (cb) => {
                queryPosts({
                    page,
                    where,
                    tagWhere,
                    taxonomyWhere: {
                        taxonomy: 'post'
                    },
                    from: 'tag'
                }, cb);
            },
            postsCount: function (cb) {
                models.Post.count({
                    where,
                    include: [{
                        model: models.TermTaxonomy,
                        attributes: ['taxonomyId'],
                        where: tagWhere
                    }]
                }).then((count) => {
                    cb(null, count);
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
                showCrumb: true,
                user: {},
                meta: {}
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            const crumbData = [{
                'title': '标签',
                'tooltip': '标签',
                'url': '',
                'headerFlag': false
            }, {
                'title': tag,
                'tooltip': tag,
                'url': '/tag/' + tag,
                'headerFlag': true
            }];
            resData.curPos = util.createCrumb(crumbData);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), 9);
            resData.posts.linkUrl = '/tag/' + tag + '/page-';
            resData.posts.linkParam = '';
            resData.comments = result.comments;

            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', tag, '标签', options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle([tag, '标签', options.site_name.optionValue]);
            }

            resData.meta.description = '[' + tag + ']' + (page > 1 ? '(第' + page + '页)' : '') + options.site_description.option_value;
            resData.meta.keywords = tag + ',' + options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/postList', resData);
        });
    },
    listByDate: function (req, res, next) {
        const page = parseInt(req.params.page, 10) || 1;
        let year = parseInt(req.params.year, 10) || new Date().getFullYear();
        let month = parseInt(req.params.month, 10);

        year = year.toString();
        month = month ? month < 10 ? '0' + month : month.toString() : '';
        const where = ['post_status = "publish" and post_type = "post" and date_format(post_date, ?) = ?', month ? '%Y%m' : '%Y', month ? year + month : year];

        async.auto({
            commonData: (cb) => {
                getCommonData({
                    page,
                    from: 'archive'
                }, cb);
            },
            posts: (cb) => {
                queryPosts({
                    page,
                    where,
                    from: 'archive'
                }, cb);
            },
            postsCount: (cb) => {
                models.Post.count({
                    where
                }).then(function (result) {
                    cb(null, result);
                });
            },
            comments: ['posts', function (result, cb) {
                common.getCommentCountByPosts(result.posts, cb);
            }]
        }, (err, result) => {
            if (err) {
                return next(err);
            }
            let resData = {
                curNav: 'index',
                showCrumb: true,
                meta: {}
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            let crumbData = [{
                'title': '文章归档',
                'tooltip': '文章归档',
                'url': '',
                'headerFlag': false
            }, {
                'title': `${year}年`,
                'tooltip': `${year}年`,
                'url': '/archive/' + year,
                'headerFlag': !month
            }];
            if (month) {
                crumbData.push({
                    'title': `${parseInt(month, 10)}月`,
                    'tooltip': `${year}年${month}月`,
                    'url': `/archive/${year}/${month}`,
                    'headerFlag': true
                });
            }
            resData.curPos = util.createCrumb(crumbData);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), 9);
            resData.posts.linkUrl = `/archive/${year}${month ? '/' + month : ''}/page-`;
            resData.posts.linkParam = '';
            resData.comments = result.comments;

            const title = `${year}年${month ? month + '月' : ''}`;
            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', title, '文章归档', options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle([title, '文章归档', options.site_name.optionValue]);
            }

            resData.meta.description = `[${title}]` + (page > 1 ? '(第' + page + '页)' : '') + options.site_description.optionValue;
            resData.meta.keywords = options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render('front/pages/postList', resData);
        });
    },
    listEdit: function (req, res, next) {
        const page = parseInt(req.params.page, 10) || 1;
        res.send();
    }
};
