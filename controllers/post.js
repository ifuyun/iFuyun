/**
 * 文章
 * @author fuyun
 * @since 2017/04/12
 */
const fs = require('fs');
const path = require('path');
const async = require('async');
const moment = require('moment');
const url = require('url');
const xss = require('sanitizer');
const formidable = require('formidable');
const appConfig = require('../config/core');
const credentials = require('../config/credentials');
const constants = require('../services/constants');
const util = require('../helper/util');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const formatter = require('../helper/formatter');
const models = require('../models/index');
const commonService = require('../services/common');
const postService = require('../services/post');
const uploader = require('./upload');
const idReg = /^[0-9a-fA-F]{16}$/i;
const pagesOut = 9;
const {Post, User, Postmeta} = models;
const Op = models.Sequelize.Op;

/**
 * 根据IDs查询post
 * @param {Object} param 参数对象
 *     {Array}[posts] post对象数组,
 *     {Array}[postIds] post id数组,
 *     {Boolean}[filterCategory] 是否过滤隐藏分类下的文章
 * @param {Function} cb 回调函数
 * @return {*} null
 */
function queryPostsByIds(param, cb) {
    const {posts, postIds, filterCategory} = param;
    // 执行时间在10-20ms
    /**
     * 根据group方式去重（distinct需要使用子查询，sequelize不支持include时的distinct）
     * 需要注意的是posts和postsCount的一致性
     * 评论数的查询通过posts进行循环查询，采用关联查询会导致结果不全（hasMany关系对应的是INNER JOIN，并不是LEFT OUTER JOIN），且并不需要所有评论数据，只需要总数
     *
     * sequelize有一个Bug：
     * 关联查询去重时，通过group by方式无法获取关联表的多行数据（如：此例的文章分类，只能返回第一条，并没有返回所有的分类）*/
    let where = {
        taxonomy: {
            [Op.in]: ['post', 'tag']
        }
    };
    if (filterCategory) {
        where.visible = {
            [Op.eq]: 1
        };
    }
    models.TermTaxonomy.findAll({
        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'visible', 'count'],
        include: [{
            model: models.TermRelationship,
            attributes: ['objectId', 'termTaxonomyId'],
            where: {
                objectId: {
                    [Op.in]: postIds
                }
            }
        }],
        where,
        order: [['termOrder', 'asc']]
    }).then((data) => {
        let result = [];
        posts.forEach((post) => {
            let tags = [];
            let categories = [];
            if (post.Postmeta) {
                post.meta = {};
                post.Postmeta.forEach((u) => {
                    post.meta[u.metaKey] = u.metaValue;
                });
            }
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

/**
 * 查询posts
 * @param {Object} param 参数对象
 * @param {Function} cb 回调函数
 * @return {*} null
 */
function queryPosts(param, cb) {
    let queryOpt = {
        where: param.where,
        attributes: [
            'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus',
            'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'
        ],
        include: [{
            model: User,
            attributes: ['userDisplayName']
        }, {
            model: Postmeta,
            attributes: ['metaKey', 'metaValue']
        }],
        order: [['postCreated', 'desc'], ['postDate', 'desc']],
        limit: 10,
        offset: 10 * (param.page - 1),
        subQuery: false
    };
    if (param.includeOpt) {
        queryOpt.include = queryOpt.include.concat(param.includeOpt);
        queryOpt.group = ['postId'];
    }
    Post.findAll(queryOpt).then((posts) => {
        let postIds = [];
        posts.forEach((v) => postIds.push(v.postId));
        queryPostsByIds({
            posts,
            postIds,
            filterCategory: param.filterCategory
        }, cb);
    });
}

/**
 * post保存校验
 * @param {Object} data 数据
 * @param {String} type post类型
 * @param {Array} postCategory 分类数组
 * @param {Array} postTag 标签数组
 * @return {*} null
 */
function checkPostFields({data, type, postCategory, postTag}) {
    // TODO: postGuid:/page-,/post/page-,/category/,/archive/,/tag/,/comment/,/user/,/admin/,/post/comment/
    let rules = [{
        rule: !data.postTitle,
        message: '标题不能为空'
    }, {
        rule: !data.postContent,
        message: '内容不能为空'
    }, {
        rule: !data.postStatus,
        message: '状态不能为空'
    }, {
        rule: data.postStatus === 'password' && !data.postPassword,
        message: '密码不能为空'
    }];
    if (type === 'post') {
        rules = rules.concat([{
            rule: !postCategory || postCategory.length < 1,
            message: '目录不能为空'
        }, {
            rule: postCategory.length > 5,
            message: '目录数应不大于5个'
        }, {
            rule: postTag.length > 10,
            message: '标签数应不大于10个'
        }]);
    } else {
        rules.push({
            rule: !data.postGuid,
            message: 'URL不能为空'
        });
    }
    for (let i = 0; i < rules.length; i += 1) {
        if (rules[i].rule) {
            return util.catchError({
                status: 200,
                code: 400,
                message: rules[i].message
            });
        }
    }
    return true;
}

module.exports = {
    listPosts: function (req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        postService.listPosts({
            isAdmin: util.isAdminUser(req.session.user),
            page,
            keyword: req.query.keyword
        }, (err, result, logData) => {
            page = logData.page;
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listPosts',
                    msg: err,
                    data: err.data || logData,
                    req
                }));
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
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), pagesOut);
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
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    showPost: function (req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);
        const postId = req.params.postId;
        if (!postId || !/^[0-9a-fA-F]{16}$/i.test(postId)) {// 不能抛出错误，有可能是/page
            logger.warn(formatOpLog({
                fn: 'showPost',
                msg: `Post: ${postId} is not a post, will redirect to next.`,
                req
            }));
            return next();
        }
        postService.showPost({
            isAdmin,
            postId
        }, (err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'showPost',
                    msg: err.messageDetail || err.message,
                    data: err.data || {
                        postId
                    },
                    req
                }));
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

            let keywords = [];
            result.post.TermTaxonomies.forEach((v) => {
                if (v.taxonomy === 'tag') {
                    keywords.push(v.name);
                    resData.postTags.push(v);
                } else if (v.taxonomy === 'post') {
                    resData.postCats.push(v);
                }
            });
            keywords.push(options.site_keywords.optionValue);

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), constants.POST_SUMMARY_LENGTH);
            resData.meta.keywords = keywords.join(',') + ',' + options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;
            resData.post = result.post;
            resData.prevPost = result.prevPost;
            resData.nextPost = result.nextPost;
            resData.comments = result.comments;
            resData.urlShare = util.setUrlRef(options.site_url.optionValue + result.post.postGuid, 'qrcode');
            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/post`, resData);
        });
    },
    showPage: function (req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);
        const reqUrl = url.parse(req.url);
        const reqPath = reqUrl.pathname;

        postService.showPage({
            isAdmin,
            reqPath,
            user: req.session.user
        }, (err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'showPage',
                    msg: err.messageDetail || err.message,
                    data: err.data || {
                        reqUrl
                    },
                    req
                }));
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
                resData.user.userName = req.session.user.userDisplayName;
                resData.user.userEmail = req.session.user.userEmail;
            }
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), constants.POST_SUMMARY_LENGTH);
            resData.meta.keywords = result.post.postTitle + ',' + options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.post = result.post;
            resData.comments = result.comments;
            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/page`, resData);
        });
    },
    listByCategory: function (req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);
        let page = parseInt(req.params.page, 10) || 1;
        const category = req.params.category;

        postService.listByCategory({
            isAdmin,
            page: req.params.page,
            category
        }, (err, result, logData) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listByCategory',
                    msg: err.messageDetail || err.message,
                    data: err.data || logData,
                    req
                }));
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
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), pagesOut);
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
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    listByTag: function (req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);
        let page = parseInt(req.params.page, 10) || 1;
        const tag = req.params.tag;

        postService.listByTag({
            isAdmin,
            page: req.params.page,
            tag
        }, (err, result, logData) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listByTag',
                    msg: err.messageDetail || err.message,
                    data: err.data || logData,
                    req
                }));
                return next(err);
            }
            let resData = {
                curNav: 'tag',
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
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), pagesOut);
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
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    listByDate: function (req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);
        let page = parseInt(req.params.page, 10) || 1;
        let year = parseInt(req.params.year, 10) || new Date().getFullYear();
        let month = parseInt(req.params.month, 10);

        year = year.toString();
        month = month ? month < 10 ? '0' + month : month.toString() : '';

        postService.listByDate({
            isAdmin,
            page,
            year,
            month
        }, (err, result, logData) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listByDate',
                    msg: err.messageDetail || err.message,
                    data: err.data || logData,
                    req
                }));
                return next(err);
            }
            let resData = {
                curNav: 'archive',
                showCrumb: true,
                meta: {}
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            let crumbData = [{
                'title': '文章归档',
                'tooltip': '文章归档',
                'url': '/archive',
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
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), pagesOut);
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
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    listArchiveDate: function (req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);

        postService.listArchiveDate({
            isAdmin
        }, (err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listArchiveDate',
                    msg: err.message,
                    req
                }));
                return next(err);
            }
            let resData = {
                curNav: 'archiveDate',
                showCrumb: true,
                meta: {}
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            let crumbData = [{
                'title': '文章归档',
                'tooltip': '文章归档',
                'url': '/archive',
                'headerFlag': false
            }, {
                'title': '归档历史',
                'tooltip': '归档历史',
                'url': '',
                'headerFlag': true
            }];
            resData.curPos = util.createCrumb(crumbData);

            resData.meta.title = util.getTitle(['文章归档', options.site_name.optionValue]);
            resData.meta.description = '[文章归档]' + options.site_description.optionValue;
            resData.meta.keywords = options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            res.render(`${appConfig.pathViews}/front/pages/archiveList`, resData);
        });
    },
    listEdit: function (req, res, next) {
        postService.listEdit({
            page: req.params.page,
            query: req.query
        }, (err, result, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listEdit',
                    msg: err.messageDetail || err.message,
                    data: err.data || {
                        where: data.where,
                        page: data.page
                    },
                    req
                }));
                return next(err);
            }
            let resData = {
                meta: {},
                type: data.where.postType,
                page: data.where.postType,
                archiveDates: result.archiveDates,
                categories: result.categories,
                options: result.options,
                count: {
                    all: 0,
                    publish: 0,
                    private: 0,
                    draft: 0,
                    trash: 0
                },
                posts: result.posts,
                comments: result.comments,
                util,
                formatter,
                moment
            };
            resData.paginator = util.paginator(data.page, Math.ceil(result.postsCount / 10), pagesOut);
            resData.paginator.linkUrl = '/admin/post/page-';
            resData.paginator.linkParam = data.paramArr.length > 0 ? '?' + data.paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.postsCount;

            if (data.page > 1) {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat(['第' + data.page + '页', data.where.postType === 'page' ? '页面列表' : '文章列表', '管理后台', result.options.site_name.optionValue]));
            } else {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat([data.where.postType === 'page' ? '页面列表' : '文章列表', '管理后台', result.options.site_name.optionValue]));
            }

            result.typeCount.forEach((item) => {
                resData.count.all += item.get('count');

                switch (item.postStatus) {
                    case 'publish':
                        resData.count.publish += item.get('count');
                        break;
                    case 'private':
                        resData.count.private += item.get('count');
                        break;
                    case 'draft':
                        resData.count.draft += item.get('count');
                        break;
                    case 'auto-draft':
                        resData.count.draft += item.get('count');
                        break;
                    case 'trash':
                        resData.count.trash += item.get('count');
                        break;
                    default:
                }
            });

            resData.curCategory = req.query.category;
            resData.curStatus = req.query.status || 'all';
            resData.curDate = req.query.date;
            resData.curKeyword = req.query.keyword;
            res.render(`${appConfig.pathViews}/admin/pages/postList`, resData);
        });
    },
    editPost: function (req, res, next) {
        const postId = req.query.postId;
        const action = (req.query.action || 'create').toLowerCase();
        if (!['create', 'edit'].includes(action)) {
            logger.error(formatOpLog({
                fn: 'editPost',
                msg: `Operate: ${action} is not allowed.`,
                req
            }));
            return util.catchError({
                status: 200,
                code: 400,
                message: '不支持该操作'
            }, next);
        }
        if (postId && !idReg.test(postId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: '文章不存在'
            }, next);
        }
        postService.editPost({
            postId,
            query: req.query
        }, (err, result) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'editPost',
                    msg: err.messageDetail || err.message,
                    data: err.data || {
                        postId
                    },
                    req
                }));
                return next(err);
            }
            let resData = {
                categories: result.categories,
                options: result.options,
                meta: {},
                token: req.csrfToken(),
                util,
                moment
            };
            let title;
            const pageTitle = {
                page: '撰写新页面',
                post: '撰写新文章'
            };
            const editTitle = {
                page: '编辑页面',
                post: '编辑文章'
            };
            if (postId) {
                resData.page = result.post.postType;
                title = editTitle[result.post.postType];
            } else {
                resData.page = req.query.type === 'page' ? 'page' : 'post';
                title = pageTitle[resData.page];
            }
            resData.title = title;
            resData.meta.title = util.getTitle([title, '管理后台', result.options.site_name.optionValue]);

            resData.post = result.post || {
                postStatus: 'publish',
                postOriginal: 1,
                commentFlag: 'verify'
            };
            resData.postCategories = [];
            resData.postTags = '';
            let tagArr = [];
            if (result.post && result.post.TermTaxonomies) {
                result.post.TermTaxonomies.forEach((v) => {
                    if (v.taxonomy === 'tag') {
                        tagArr.push(v.name);
                    } else if (v.taxonomy === 'post') {
                        resData.postCategories.push(v.taxonomyId);
                    }
                });
                resData.postTags = tagArr.join(',');
            }
            req.session.postReferer = util.getReferrer(req);
            res.render(`${appConfig.pathViews}/admin/pages/postForm`, resData);
        });
    },
    savePost: function (req, res, next) {
        const param = req.body;
        const type = req.query.type !== 'page' ? 'post' : 'page';
        const nowTime = new Date();
        let postId = util.trim(xss.sanitize(param.postId));
        postId = idReg.test(postId) ? postId : '';
        const newPostId = postId || util.getUuid();

        let data = {
            postTitle: util.trim(xss.sanitize(param.postTitle)),
            postContent: util.trim(param.postContent),
            postExcerpt: util.trim(xss.sanitize(param.postExcerpt)),
            postGuid: util.trim(xss.sanitize(param.postGuid)) || '/post/' + newPostId,
            postAuthor: req.session.user.userId,
            postStatus: param.postStatus,
            postPassword: util.trim(param.postPassword),
            postOriginal: param.postOriginal,
            commentFlag: util.trim(param.commentFlag),
            postDate: param.postDate ? new Date(+moment(param.postDate)) : nowTime,
            postType: type
        };
        const toArray = function (param) {
            if (param === '') {
                param = [];
            } else if (typeof param === 'string') {
                param = param.split(/[,\s]/i);
            } else {
                param = util.isArray(param) ? param : [];
            }
            return param;
        };
        const postCategory = toArray(util.trim(xss.sanitize(param.postCategory)));
        const postTag = toArray(util.trim(xss.sanitize(param.postTag)));

        const checkResult = checkPostFields({
            data,
            type,
            postCategory,
            postTag
        });
        if (checkResult !== true) {
            return next(checkResult);
        }
        if (data.postStatus === 'password') {
            data.postStatus = 'publish';
        } else {
            data.postPassword = '';
        }

        postService.savePost({
            postId,
            data,
            newPostId,
            nowTime,
            type,
            postCategory,
            postTag
        }, () => {
            logger.info(formatOpLog({
                fn: 'savePost',
                msg: `Post: ${newPostId}:${data.postTitle} is saved.`,
                data,
                req
            }));

            const referer = req.session.postReferer;
            delete req.session.postReferer;
            res.type('application/json');
            res.send({
                status: 200,
                code: 0,
                message: null,
                data: {
                    url: referer || '/admin/post?type=' + type
                }
            });
        }, (err) => {
            logger.error(formatOpLog({
                fn: 'savePost',
                msg: err.messageDetail || err.message,
                data: err.data,
                req
            }));
            next({
                status: 200,
                code: 500,
                message: err.message
            });
        });
    },
    listMedia: function (req, res, next) {
        let page = parseInt(req.params.page, 10) || 1;
        let where = {};
        let titleArr = [];
        let paramArr = [];
        let from = 'admin';

        if (req.query.status) {
            if (req.query.status === 'draft') {
                where.postStatus = {
                    [Op.in]: ['draft', 'auto-draft']
                };
            } else {
                where.postStatus = {
                    [Op.eq]: req.query.status
                };
            }
            paramArr.push(`status=${req.query.status}`);
            titleArr.push(formatter.postStatus(req.query.status) || req.query.status, '状态');
        } else {
            where.postStatus = {
                [Op.in]: ['publish', 'private', 'draft', 'auto-draft', 'trash']
            };
        }
        if (req.query.author) {
            where.postAuthor = {
                [Op.eq]: req.query.author
            };
            paramArr.push(`author=${req.query.author}`);
            titleArr.push('作者');
        }
        if (req.query.date) {
            where[Op.and] = [models.sequelize.where(models.sequelize.fn('date_format', models.sequelize.col('post_date'), '%Y/%m'), '=', req.query.date)];
            paramArr.push(`date=${req.query.date}`);
            titleArr.push(req.query.date, '日期');
        }
        if (req.query.keyword) {
            where[Op.or] = [{
                postTitle: {
                    [Op.like]: `%${req.query.keyword}%`
                }
            }, {
                postContent: {
                    [Op.like]: `%${req.query.keyword}%`
                }
            }, {
                postExcerpt: {
                    [Op.like]: `%${req.query.keyword}%`
                }
            }];
            paramArr.push(`keyword=${req.query.keyword}`);
            titleArr.push(req.query.keyword, '搜索');
        }
        where.postType = 'attachment';
        paramArr.push(`type=${where.postType}`);

        async.auto({
            options: commonService.getInitOptions,
            archiveDates: (cb) => {
                commonService.archiveDates(cb, {
                    postType: where.postType
                });
            },
            postsCount: (cb) => {
                Post.count({
                    where
                }).then((data) => cb(null, data));
            },
            posts: ['postsCount', (result, cb) => {
                page = (page > result.postsCount / 10 ? Math.ceil(result.postsCount / 10) : page) || 1;
                queryPosts({
                    page,
                    where,
                    from
                }, cb);
            }],
            typeCount: (cb) => {
                Post.findAll({
                    attributes: [
                        'postStatus',
                        'postType',
                        [models.sequelize.fn('count', 1), 'count']
                    ],
                    where: {
                        postType: {
                            [Op.eq]: where.postType
                        },
                        postStatus: {
                            [Op.in]: ['publish', 'private', 'draft', 'auto-draft', 'trash']
                        }
                    },
                    group: ['postStatus']
                }).then((data) => cb(null, data));
            }
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listMedia',
                    msg: err,
                    data: {
                        where,
                        page
                    },
                    req
                }));
                return next(err);
            }
            let resData = {
                meta: {},
                type: where.postType,
                page: 'media',
                archiveDates: result.archiveDates,
                options: result.options,
                count: {
                    all: 0,
                    publish: 0,
                    private: 0,
                    draft: 0,
                    trash: 0
                },
                posts: result.posts,
                util,
                formatter,
                moment
            };
            resData.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), pagesOut);
            resData.paginator.linkUrl = '/admin/media/page-';
            resData.paginator.linkParam = paramArr.length > 0 ? '?' + paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.postsCount;

            if (page > 1) {
                resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', '多媒体列表', '管理后台', result.options.site_name.optionValue]));
            } else {
                resData.meta.title = util.getTitle(titleArr.concat(['多媒体列表', '管理后台', result.options.site_name.optionValue]));
            }

            result.typeCount.forEach((item) => {
                resData.count.all += item.get('count');

                switch (item.postStatus) {
                    case 'publish':
                        resData.count.publish += item.get('count');
                        break;
                    case 'private':
                        resData.count.private += item.get('count');
                        break;
                    case 'draft':
                        resData.count.draft += item.get('count');
                        break;
                    case 'auto-draft':
                        resData.count.draft += item.get('count');
                        break;
                    case 'trash':
                        resData.count.trash += item.get('count');
                        break;
                    default:
                }
            });

            resData.curStatus = req.query.status || 'all';
            resData.curDate = req.query.date;
            resData.curKeyword = req.query.keyword;
            res.render(`${appConfig.pathViews}/admin/pages/mediaList`, resData);
        });
    },
    createMedia: function (req, res, next) {
        commonService.getInitOptions((err, options) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'createMedia.getInitOptions',
                    msg: err,
                    req
                }));
                return next(err);
            }
            let resData = {
                meta: {
                    title: util.getTitle(['上传新媒体文件', '管理后台', options.site_name.optionValue])
                },
                page: 'media',
                token: req.csrfToken(),
                options
            };
            req.session.uploadReferer = util.getReferrer(req);
            res.render(`${appConfig.pathViews}/admin/pages/mediaForm`, resData);
        });
    },
    uploadFile: function (req, res, next) {
        const form = new formidable.IncomingForm();
        const now = moment();
        const curYear = now.format('YYYY');
        const curMonth = now.format('MM');
        const sizeLimit = 500;
        let yearPath;
        let uploadPath;

        yearPath = path.join(__dirname, '..', 'public', 'upload', curYear);
        uploadPath = path.join(yearPath, curMonth);
        if (!fs.existsSync(yearPath)) {
            fs.mkdirSync(yearPath);
        }
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        form.uploadDir = uploadPath;
        form.keepExtensions = true;
        form.maxFieldsSize = sizeLimit * 1024 * 1024;

        form.on('error', function (err) {
            logger.error(formatOpLog({
                fn: 'uploadFile',
                msg: err,
                data: {
                    uploadPath
                },
                req
            }));
        });
        form.parse(req, function (err, fields, files) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'uploadFile',
                    msg: err,
                    data: {
                        fields,
                        files
                    },
                    req
                }));
                return next(err);
            }
            let fileExt = files.mediafile.name.split('.');
            if (fileExt.length > 1) {
                fileExt = '.' + fileExt.pop();
            } else {
                fileExt = '';
            }
            const filename = util.getUuid() + fileExt;
            const filepath = path.join(uploadPath, filename);
            const nowTime = new Date();
            let fileData = {};
            fs.renameSync(files.mediafile.path, filepath);

            fileData.postTitle = fileData.postExcerpt = fileData.postContent = xss.sanitize(files.mediafile.name);
            fileData.postAuthor = req.session.user.userId;
            fileData.postStatus = 'publish';
            fileData.postType = 'attachment';
            fileData.postId = util.getUuid();
            fileData.postGuid = '/' + curYear + '/' + curMonth + '/' + filename;
            fileData.postModifiedGmt = fileData.postDateGmt = fileData.postDate = nowTime;

            const saveDb = function (cloudPath) {
                models.sequelize.transaction(function (t) {
                    let tasks = {
                        options: commonService.getInitOptions,
                        checkGuid: function (cb) {
                            const where = {
                                postGuid: {
                                    [Op.eq]: fileData.postGuid
                                }
                            };
                            Post.count({
                                where
                            }).then((count) => cb(null, count));
                        },
                        post: ['options', 'checkGuid', function (result, cb) {
                            if (result.checkGuid > 0) {
                                return cb('URL已存在');
                            }
                            fileData.postGuid = result.options.upload_path.optionValue + fileData.postGuid;
                            Post.create(fileData, {
                                transaction: t
                            }).then((post) => cb(null, post));
                        }]
                    };
                    if (cloudPath) {
                        tasks.postMeta = (cb) => {
                            Postmeta.create({
                                metaId: util.getUuid(),
                                postId: fileData.postId,
                                metaKey: 'cloudPath',
                                metaValue: cloudPath
                            }, {
                                transaction: t
                            }).then((postMeta) => cb(null, postMeta));
                        };
                    }
                    // 需要返回promise实例
                    return new Promise((resolve, reject) => {
                        async.auto(tasks, function (err, result) {
                            if (err) {
                                logger.error(formatOpLog({
                                    fn: 'uploadFile',
                                    msg: err,
                                    data: fileData,
                                    req
                                }));
                                reject(new Error(err));
                            } else {
                                logger.info(formatOpLog({
                                    fn: 'uploadFile',
                                    msg: `File saved: ${filename}`,
                                    data: {
                                        uploadPath,
                                        filename: files.mediafile.name,
                                        watermark: fields.watermark === '1',
                                        uploadCloud: fields.uploadCloud === '1'
                                    },
                                    req
                                }));
                                resolve(result);
                            }
                        });
                    });
                }).then(() => {
                    const response = function (err) {
                        if (err) {
                            logger.error(formatOpLog({
                                fn: 'uploadFile',
                                msg: `水印处理失败: ${err.message}`,
                                data: {
                                    uploadPath,
                                    filename: files.mediafile.name,
                                    watermark: fields.watermark === '1',
                                    uploadCloud: fields.uploadCloud === '1'
                                },
                                req
                            }));
                            return res.send({
                                status: 200,
                                code: 600,
                                message: `水印处理失败: ${err.message}`,
                                token: req.csrfToken()
                            });
                        }
                        const referer = req.session.uploadReferer;
                        delete req.session.uploadReferer;
                        res.send({
                            status: 200,
                            code: 0,
                            message: null,
                            data: {
                                url: referer || '/admin/media'
                            }
                        });
                    };
                    if (fields.watermark !== '0') {// 默认开启水印
                        commonService.watermark(filepath, response);
                    } else {
                        response();
                    }
                }, (err) => {
                    res.send({
                        status: 200,
                        code: 500,
                        message: typeof err === 'string' ? err : err.message,
                        token: req.csrfToken()
                    });
                });
            };
            res.type('application/json');

            if (fields.uploadCloud === '1') {// 不带水印
                uploader.init({
                    appKey: credentials.appKey,
                    appSecret: credentials.appSecret,
                    onSuccess: saveDb,
                    onError: (err) => {
                        res.send({
                            status: 200,
                            code: 500,
                            message: typeof err === 'string' ? err : err.message,
                            token: req.csrfToken()
                        });
                    }
                });
                uploader.upload(filepath);
            } else {
                saveDb();
            }
        });
    }
};
