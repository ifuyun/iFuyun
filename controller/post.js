/*global console*/
/**
 * 主控制器：文章列表和详情
 * @module c_post
 * @class C_Post
 * @static
 * @requires fs, path, url, async, sanitizer, formidable, moment, c_base, m_base, util, logger, m_post, m_link, m_term_taxonomy
 * @author Fuyun
 * @version 2.0.0
 * @since 1.0.0
 */
const fs = require('fs');
const path = require('path');
const url = require('url');
// const iconv = require('iconv-lite');
const async = require('async');
const xss = require('sanitizer');
const formidable = require('formidable');
const moment = require('moment');
const base = require('./base');
const pool = require('../model/base').pool;
const util = require('../helper/util');
const logger = require('../helper/logger').sysLog;
const PostModel = require('../model/post');
const LinkModel = require('../model/link');
const TaxonomyModel = require('../model/termTaxonomy');
const post = new PostModel(pool);
const link = new LinkModel(pool);
const taxonomy = new TaxonomyModel(pool);
const pagesOut = 9;
const idReg = /^[0-9a-fA-F]{16}$/i;

//共用方法
let common = {
    /**
     * 公共方法：根据前序遍历查询目录(包含子目录)
     * @method getCategoryArray
     * @static
     * @param {Function} cb 回调
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCategoryArray: function (cb) {
        taxonomy.getCategoryArray('post', cb);
    },
    /**
     * 公共方法：查询公共的基础数据：归档日期、最近post、随机post、热门post、友情链接、顶部链接、分类目录、主导航、站点配置
     * @method getCommonData
     * @static
     * @param {Function} cb 回调
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    getCommonData: function (param, cb) {
        async.parallel({
            archiveDates: function (cb) {//查询post归档日期, TODO:不能直接用post.getArchiveDates，否则this将引用异常(apply)
                post.getArchiveDates('post', cb);
            },
            recentPosts: post.getRecentPosts.bind(post),
            randPosts: post.getRandPosts.bind(post),
            hotPosts: post.getHotPosts.bind(post),
            friendLinks: param.from !== 'list' || param.page > 1 ? link.getSiteLinks.bind(link) : link.getHomeLinks.bind(link),
            quickLinks: link.getQuickLinks.bind(link),//查询顶部链接
            // categories: taxonomy.getCategoryDom.bind(taxonomy),//查询目录(包含子目录)HTML
            categories: taxonomy.getCategoryTree.bind(taxonomy),//查询目录(包含子目录)
            mainNavs: taxonomy.getMainNavs.bind(taxonomy),//查询主导航
            options: base.getInitOptions.bind(base)
        }, function (err, results) {
            if (err) {
                cb(err);
            } else {
                cb(null, results);
            }
        });
    }
};

module.exports = {
    /**
     * 显示所有文章列表
     * @method listPosts
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    listPosts: function (req, res, next) {
        var page = parseInt(req.params.page, 10) || 1, resData;

        resData = {
            curNav: 'index',
            showCrumb: false,
            postsData: false,
            archiveDates: false,
            mainNavs: false,
            categories: false,
            friendLinks: false,
            recentPosts: false,
            randPosts: false,
            options: false,
            quickLinks: false,
            meta: {
                title: '',
                description: '',
                keywords: '',
                author: ''
            }
        };

        async.parallel({
            allPosts: function (cb) {
                post.getAllPosts({
                    page: page,
                    postStatus: 'publish',
                    category: '',
                    tag: '',
                    author: '',
                    keyword: req.query.keyword || ''
                }, cb);
            },
            commonData: function (cb) {
                common.getCommonData({
                    page: page,
                    from: 'list'
                }, cb);
            }
        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                var options = results.commonData.options;

                resData.postsData = results.allPosts;
                resData.postsData.paginator = util.paginator(page, results.allPosts.pages, pagesOut);
                resData.postsData.linkUrl = '/post/page-';
                resData.postsData.linkParam = req.query.keyword ? '?keyword=' + req.query.keyword : '';

                if (req.query.keyword) {
                    if (page > 1) {
                        resData.meta.title = util.getTitle([req.query.keyword, '第' + page + '页', '搜索结果', options.site_name.option_value]);
                    } else {
                        resData.meta.title = util.getTitle([req.query.keyword, '搜索结果', options.site_name.option_value]);
                    }
                } else {
                    if (page > 1) {
                        resData.meta.title = util.getTitle(['第' + page + '页', '文章列表', options.site_name.option_value]);
                    } else {
                        resData.meta.title = util.getTitle(['爱生活，爱抚云', options.site_name.option_value]);
                    }
                }

                resData.meta.description = (page > 1 ? '[文章列表](第' + page + '页)' : '') + options.site_description.option_value;
                resData.meta.keywords = options.site_keywords.option_value;
                resData.meta.author = options.site_author.option_value;

                Object.assign(resData, results.commonData);

                resData.util = util;
                res.render('v2/pages/postList', resData);
            }
        });
    },
    /**
     * 显示文章内容(即单篇博文)
     * @method showPost
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    showPost: function (req, res, next) {
        var postId = req.params.postId, page = req.params.page || 1, resData;

        if (!postId || !idReg.test(postId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: 'Page Not Found'
            }, next);
        }

        resData = {
            curNav: '',
            curPos: '',
            showCrumb: true,
            post: false,
            archiveDates: false,
            mainNavs: false,
            categories: false,
            friendLinks: false,
            recentPosts: false,
            randPosts: false,
            options: false,
            quickLinks: false,
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

        async.auto({
            post: function (cb) {
                post.getPostById(postId, 'id', util.isAdminUser(req), function (err, data) {
                    if (err || !data.post || !data.post.post_id) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'showPost',//TODO:func.name
                            funcParam: {
                                postId: postId
                            },
                            msg: err
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found'
                        }));
                    }
                    if (!util.isAdminUser(req) && data.post.post_status !== 'publish') {//无管理员权限不允许访问非公开文章(包括草稿)
                        // logger.warn(util.getAccessUser(req), '- "postId: ' + data.post.post_id + ' is ' + data.post.post_status + '"');
                        logger.warn(util.getErrorLog({
                            req: req,
                            funcName: 'showPost',
                            funcParam: {
                                postId: data.post.post_id,
                                postTitle: data.post.post_title
                            },
                            msg: data.post.post_title + ' is ' + data.post.post_status
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found'
                        }));
                    }
                    cb(null, data);
                });
            },
            //@formatter:off
            crumb: ['post',
                function (cb, results) {//因为无需再次查询前置条件，故单独同post并行，而无需合并到post处理中，区别于目录列表
                    if (!results.post.category[0] || !results.post.category[0].parent) {
                        cb();
                    } else {
                        taxonomy.getParentCategories(results.post.category[0].parent, cb);
                    }
                }],
            getPrev: ['post', function (cb, results) {
                post.getPrevPost(postId, cb);
            }],
            getNext: ['post', function (cb, results) {
                post.getNextPost(postId, cb);
            }],
            //@formatter:on
            commonData: function (cb) {
                common.getCommonData({}, cb);
            }
        }, function (err, results) {
            var crumb = [], curPost = results.post, crumbData = results.crumb, crumbIdx, options, tagIdx, tagArr = [];

            if (err) {
                return next(err);
            }
            if (!curPost.category[0]) {
                return next('分类不存在');
            }
            options = results.commonData.options;

            crumb.push({
                'title': '首页',
                'tooltip': 'iFuyun',
                'url': '/',
                'headerFlag': false
            });

            if (crumbData) {
                resData.curNav = crumbData[0].slug;
                for (crumbIdx = 0; crumbIdx < crumbData.length; crumbIdx += 1) {
                    crumb.push({
                        'title': crumbData[crumbIdx].name,
                        'tooltip': crumbData[crumbIdx].description,
                        'url': '/category/' + crumbData[crumbIdx].slug,
                        'headerFlag': false
                    });
                }
            } else {
                resData.curNav = curPost.category[0].slug;
            }
            crumb.push({
                'title': curPost.category[0].name,
                'tooltip': curPost.category[0].description,
                'url': '/category/' + curPost.category[0].slug,
                'headerFlag': true
            });
            resData.curPos = base.createCrumb(crumb);

            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', curPost.post.post_title, options.site_name.option_value]);
            } else {
                resData.meta.title = util.getTitle([curPost.post.post_title, options.site_name.option_value]);
            }
            for (tagIdx = 0; tagIdx < curPost.tag.length; tagIdx += 1) {
                tagArr.push(curPost.tag[tagIdx].name);
            }
            tagArr.push(options.site_keywords.option_value);

            resData.meta.description = (page > 1 ? '(第' + page + '页)' : '') + (curPost.post.post_excerpt || util.cutStr(util.filterHtmlTag(curPost.post.post_content), 140));
            resData.meta.keywords = tagArr.join(',');
            resData.meta.author = options.site_author.option_value;

            resData.post = curPost;
            resData.comments = curPost.comments;

            Object.assign(resData, results.commonData);

            resData.util = util;
            resData.prevPost = results.getPrev;
            resData.nextPost = results.getNext;

            res.render('v2/pages/post', resData);
        });
    },
    /**
     * 显示页面内容(即单篇页面)
     * @method showPage
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    showPage: function (req, res, next) {//req.connection.remoteAddress,req.url,req.originalUrl
        var reqUrl = url.parse(req.url), reqPath = reqUrl.pathname, resData;

        resData = {
            curNav: '',
            curPos: '',
            showCrumb: false,
            post: false,
            archiveDates: false,
            mainNavs: false,
            categories: false,
            friendLinks: false,
            recentPosts: false,
            randPosts: false,
            options: false,
            quickLinks: false,
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

        async.auto({
            post: function (cb) {
                post.getPostById(reqPath, 'guid', util.isAdminUser(req), function (err, data) {
                    if (err || !data.post || !data.post.post_id) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'showPage',
                            funcParam: {
                                reqPath: reqPath
                            },
                            msg: err
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found'
                        }));
                    }
                    if (!util.isAdminUser(req) && data.post.post_status !== 'publish') {//无管理员权限不允许访问非公开文章(包括草稿)
                        // logger.warn(util.getAccessUser(req), '- "postId: ' + data.post.post_id + ' is ' + data.post.post_status + '"');
                        logger.warn(util.getErrorLog({
                            req: req,
                            funcName: 'showPage',
                            funcParam: {
                                postId: data.post.post_id,
                                postTitle: data.post.post_title
                            },
                            msg: data.post.post_title + ' is ' + data.post.post_status
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found'
                        }));
                    }
                    cb(null, data);
                });
            },
            commonData: function (cb) {
                common.getCommonData({}, cb);
            }
        }, function (err, results) {
            var curPost = results.post, options, tagArr = [];

            if (err) {
                return next(err);
            }
            options = results.commonData.options

            tagArr.push(options.site_keywords.option_value);

            resData.meta.title = util.getTitle([curPost.post.post_title, options.site_name.option_value]);
            resData.meta.description = (curPost.post.post_excerpt || util.cutStr(util.filterHtmlTag(curPost.post.post_content), 140));//TODO
            resData.meta.keywords = tagArr.join(',');
            resData.meta.author = options.site_author.option_value;

            resData.post = curPost;
            resData.comments = curPost.comments;

            Object.assign(resData, results.commonData);

            resData.util = util;

            res.render('v2/pages/page', resData);
        });
    },
    /**
     * 根据日期(年月)显示归档文章列表
     * @method listByDate
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    listByDate: function (req, res, next) {
        var page = parseInt(req.params.page, 10) || 1,
            year = parseInt(req.params.year, 10) || new Date().getFullYear(),
            month = parseInt(req.params.month, 10) || (new Date().getMonth() + 1),
            resData;

        resData = {
            curNav: 'index',
            curPos: '',
            showCrumb: true,
            postsData: false,
            archiveDates: false,
            mainNavs: false,
            categories: false,
            friendLinks: false,
            recentPosts: false,
            randPosts: false,
            options: false,
            quickLinks: false,
            meta: {
                title: '',
                description: '',
                keywords: '',
                author: ''
            }
        };

        async.parallel({
            allPosts: function (cb) {
                post.getPostsByDate({
                    year: year,
                    month: req.params.month ? (month < 10 ? '0' + month : month) : '',
                    page: page,
                    postStatus: 'publish',
                    category: '',
                    tag: '',
                    author: '',
                    keyword: req.query.keyword || ''
                }, cb);
            },
            commonData: function (cb) {
                common.getCommonData({}, cb);
            }
        }, function (err, results) {
            var crumb = [], options, title = '';
            if (err) {
                next(err);
            } else {
                options = results.commonData.options;
                crumb = [{
                    'title': '首页',
                    'tooltip': 'iFuyun',
                    'url': '/',
                    'headerFlag': false
                }, {
                    'title': '文章归档',
                    'tooltip': '文章归档',
                    'url': '',
                    'headerFlag': false
                }, {
                    'title': year + '年',
                    'tooltip': year + '年',
                    'url': '/archive/' + year,
                    'headerFlag': !req.params.month
                }];
                if (req.params.month) {
                    crumb.push({
                        'title': month + '月',
                        'tooltip': year + '年' + month + '月',
                        'url': '/archive/' + year + '/' + month,
                        'headerFlag': true
                    });
                }

                resData.postsData = results.allPosts;
                resData.postsData.paginator = util.paginator(page, results.allPosts.pages, pagesOut);
                resData.postsData.linkUrl = '/archive/' + year + (req.params.month ? ('/' + (month < 10 ? '0' + month : month)) : '') + '/page-';
                resData.postsData.linkParam = '';

                resData.curPos = base.createCrumb(crumb);

                title = req.params.month ? year + '年' + month + '月' : year + '年';
                if (page > 1) {
                    resData.meta.title = util.getTitle(['第' + page + '页', title, '文章归档', options.site_name.option_value]);
                } else {
                    resData.meta.title = util.getTitle([title, '文章归档', options.site_name.option_value]);
                }

                resData.meta.description = '[' + title + ']' + (page > 1 ? '(第' + page + '页)' : '') + options.site_description.option_value;
                resData.meta.keywords = options.site_keywords.option_value;
                resData.meta.author = options.site_author.option_value;

                Object.assign(resData, results.commonData);

                resData.util = util;

                res.render('v2/pages/postList', resData);
            }
        });
    },
    /**
     * 根据分类目录显示文章列表
     * @method listByCategory
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    listByCategory: function (req, res, next) {
        var page = parseInt(req.params.page, 10) || 1,
            category = req.params.category,
            resData;

        resData = {
            curNav: '',
            curPos: '',
            showCrumb: true,
            postsData: false,
            archiveDates: false,
            mainNavs: false,
            categories: false,
            friendLinks: false,
            recentPosts: false,
            randPosts: false,
            options: false,
            quickLinks: false,
            meta: {
                title: '',
                description: '',
                keywords: '',
                author: ''
            }
        };

        async.parallel({
            allPosts: function (cb) {
                post.getPostsByCategories({
                    page: page,
                    postStatus: 'publish',
                    postDate: req.query.date || '',
                    category: category,
                    tag: '',
                    author: '',
                    keyword: req.query.keyword || ''
                }, cb);
            },
            commonData: function (cb) {
                common.getCommonData({}, cb);
            }
        }, function (err, results) {
            var crumb = [], crumbIdx, crumbData, options, title = '';
            if (err) {
                return next(err);
            }
            if (!results.allPosts) {
                return util.catchError({
                    status: 404,
                    code: 404,
                    message: 'Page Not Found'
                }, next);
            }
            options = results.commonData.options;
            crumbData = results.allPosts.crumb;
            crumb = [{
                'title': '首页',
                'tooltip': 'iFuyun',
                'url': '/',
                'headerFlag': false
            }];
            for (crumbIdx = 0; crumbIdx < crumbData.length; crumbIdx += 1) {
                crumb.push({
                    'title': crumbData[crumbIdx].name,
                    'tooltip': crumbData[crumbIdx].description,
                    'url': '/category/' + crumbData[crumbIdx].slug,
                    'headerFlag': crumbIdx === crumbData.length - 1 ? true : false
                });
            }

            resData.postsData = results.allPosts;
            resData.postsData.paginator = util.paginator(page, results.allPosts.pages, pagesOut);

            resData.postsData.linkUrl = '/category/' + category + '/page-';
            resData.postsData.linkParam = '';

            resData.curNav = crumbData[0].slug;
            resData.curPos = base.createCrumb(crumb);

            title = crumb[crumbData.length].title;
            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', title, '分类目录', options.site_name.option_value]);
            } else {
                resData.meta.title = util.getTitle([title, '分类目录', options.site_name.option_value]);
            }

            resData.meta.description = '[' + title + ']' + (page > 1 ? '(第' + page + '页)' : '') + options.site_description.option_value;
            resData.meta.keywords = options.site_keywords.option_value;
            resData.meta.author = options.site_author.option_value;

            Object.assign(resData, results.commonData);

            resData.util = util;

            res.render('v2/pages/postList', resData);
        });
    },
    /**
     * 根据标签显示文章列表
     * @method listByTag
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    listByTag: function (req, res, next) {
        var page = parseInt(req.params.page, 10) || 1,
            tag = req.params.tag,
            resData;

        resData = {
            curNav: '',
            curPos: '',
            showCrumb: true,
            postsData: false,
            archiveDates: false,
            mainNavs: false,
            categories: false,
            friendLinks: false,
            recentPosts: false,
            randPosts: false,
            options: false,
            quickLinks: false,
            meta: {
                title: '',
                description: '',
                keywords: '',
                author: ''
            }
        };

        async.parallel({
            allPosts: function (cb) {
                post.getPostsByTag({
                    page: page,
                    postStatus: 'publish',
                    postDate: req.query.date || '',
                    category: '',
                    tag: tag,
                    author: '',
                    keyword: req.query.keyword || ''
                }, cb);
            },
            commonData: function (cb) {
                common.getCommonData({}, cb);
            }
        }, function (err, results) {
            var crumb = [], crumbData, options, tagName;
            if (err) {
                return next(err);
            }
            if (!results.allPosts) {
                return util.catchError({
                    status: 404,
                    code: 404,
                    message: 'Page Not Found'
                }, next);
            }
            options = results.commonData.options;
            crumbData = results.allPosts.crumb;
            tagName = crumbData.tagName;
            crumb = [{
                'title': '首页',
                'tooltip': 'iFuyun',
                'url': '/',
                'headerFlag': false
            }, {
                'title': '标签',
                'tooltip': '标签',
                'url': '',
                'headerFlag': false
            }, {
                'title': tagName,
                'tooltip': tagName,
                'url': '/tag/' + tag,
                'headerFlag': true
            }];

            resData.postsData = results.allPosts;
            resData.postsData.paginator = util.paginator(page, results.allPosts.pages, pagesOut);
            resData.postsData.linkUrl = '/tag/' + tag + '/page-';
            resData.postsData.linkParam = '';

            resData.curNav = 'index';
            resData.curPos = base.createCrumb(crumb);

            if (page > 1) {
                resData.meta.title = util.getTitle(['第' + page + '页', tagName, '标签', options.site_name.option_value]);
            } else {
                resData.meta.title = util.getTitle([tagName, '标签', options.site_name.option_value]);
            }

            resData.meta.description = '[' + tagName + ']' + (page > 1 ? '(第' + page + '页)' : '') + options.site_description.option_value;
            resData.meta.keywords = tagName + ',' + options.site_keywords.option_value;
            resData.meta.author = options.site_author.option_value;

            Object.assign(resData, results.commonData);

            resData.util = util;

            res.render('v2/pages/postList', resData);
        });
    },
    /**
     * 显示文章编辑列表
     * @method listEdit
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    listEdit: function (req, res, next) {
        var page = parseInt(req.params.page, 10) || 1, resData = {
            meta: {
                title: ''
            },
            curStatus: ''
        }, param;

        param = {
            page: page,
            postStatus: req.query.status || 'all',
            postDate: req.query.date || '',
            category: req.query.category || '',
            tag: req.query.tag || '',
            author: req.query.author || '',
            keyword: req.query.keyword || '',
            fromAdmin: true
        };
        if (req.query.type === 'page') {
            resData.page = 'page';
            param.type = 'page';

            async.parallel({
                allPosts: function (cb) {
                    post.getAllPosts(param, cb);
                },
                archiveDates: function (cb) {
                    post.getArchiveDates(param.type, cb);
                },
                options: base.getInitOptions.bind(base),
                countAll: function (cb) {
                    post.getPostCount(['publish', 'private', 'draft', 'auto-draft', 'trash'], 'page', cb);
                },
                countPublish: function (cb) {
                    post.getPostCount('publish', 'page', cb);
                },
                countArchive: function (cb) {
                    post.getPostCount('private', 'page', cb);
                },
                countDraft: function (cb) {
                    post.getPostCount(['draft', 'auto-draft'], 'page', cb);
                },
                countDeleted: function (cb) {
                    post.getPostCount('trash', 'page', cb);
                }
            }, function (err, results) {
                var paramArr = [], titleArr = [], options = results.options;
                if (err) {
                    return next(err);
                }
                paramArr.push('type=' + req.query.type);
                if (param.keyword) {
                    paramArr.push('keyword=' + param.keyword);
                    titleArr.push(param.keyword, '搜索');
                }
                if (req.query.status) {//TODO:英文转中文
                    paramArr.push('status=' + param.postStatus);
                    titleArr.push(param.postStatus, '状态');
                }
                if (param.postDate) {
                    paramArr.push('date=' + param.postDate);
                    titleArr.push(param.postDate, '日期');
                }
                if (results.allPosts) {
                    resData.postsData = results.allPosts;
                    resData.paginator = util.paginator(page, results.allPosts.pages, pagesOut);
                    resData.paginator.pageLimit = resData.postsData.pageLimit;
                    resData.paginator.total = resData.postsData.total;
                    resData.paginator.linkUrl = '/admin/post/page-';
                    resData.paginator.linkParam = paramArr.length > 0 ? '?' + paramArr.join('&') : '';
                } else {//必须设置该字段
                    resData.postsData = '';
                }

                if (page > 1) {
                    resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', '页面列表', '管理后台', options.site_name.option_value]));
                } else {
                    resData.meta.title = util.getTitle(titleArr.concat(['页面列表', '管理后台', options.site_name.option_value]));
                }

                resData.curStatus = param.postDate ? '' : param.postStatus;
                resData.curDate = param.postDate;
                resData.curKeyword = param.keyword;
                resData.options = options;
                resData.util = util;

                resData.archiveDates = results.archiveDates;

                resData.count = {
                    all: results.countAll.total,
                    publish: results.countPublish.total,
                    archive: results.countArchive.total,
                    draft: results.countDraft.total,
                    trash: results.countDeleted.total
                };
                res.render('admin/pages/p_page_list', resData);
            });
        } else {
            resData.page = 'post';
            param.type = 'post';

            async.parallel({
                allPosts: function (cb) {
                    if (req.query.category) {//TODO:分类和标签同时查询的情况
                        post.getPostsByCategories(param, cb);
                    } else if (req.query.tag) {//"&nbsp;"等含特殊字符的处理及IE 11乱码问题: 需要显式encodeURIComponent
                        post.getPostsByTag(param, cb);
                    } else {
                        post.getAllPosts(param, cb);
                    }
                },
                categories: common.getCategoryArray,
                archiveDates: function (cb) {
                    post.getArchiveDates(param.type, cb);
                },
                options: base.getInitOptions.bind(base),
                countAll: function (cb) {
                    post.getPostCount(['publish', 'private', 'draft', 'auto-draft', 'trash'], 'post', cb);
                },
                countPublish: function (cb) {
                    post.getPostCount('publish', 'post', cb);
                },
                countArchive: function (cb) {
                    post.getPostCount('private', 'post', cb);
                },
                countDraft: function (cb) {
                    post.getPostCount(['draft', 'auto-draft'], 'post', cb);
                },
                countDeleted: function (cb) {
                    post.getPostCount('trash', 'post', cb);
                }
            }, function (err, results) {
                var paramArr = [], titleArr = [], options = results.options;
                if (err) {
                    return next(err);
                }
                if (param.keyword) {
                    paramArr.push('keyword=' + param.keyword);
                    titleArr.push(param.keyword, '搜索');
                }
                if (req.query.status) {//TODO:英文转中文
                    paramArr.push('status=' + param.postStatus);
                    titleArr.push(param.postStatus, '状态');
                }
                if (param.postDate) {
                    paramArr.push('date=' + param.postDate);
                    titleArr.push(param.postDate, '日期');
                }
                if (param.category) {//TODO:英文转中文
                    paramArr.push('category=' + param.category);
                    titleArr.push(param.category, '分类');
                }
                if (param.tag) {
                    paramArr.push('tag=' + param.tag);
                    titleArr.push(param.tag, '标签');
                }
                if (param.author) {//TODO:作者
                    paramArr.push('author=' + param.author);
                    // titleArr.push(param.author);
                }
                if (results.allPosts) {
                    resData.postsData = results.allPosts;
                    resData.paginator = util.paginator(page, results.allPosts.pages, pagesOut);
                    resData.paginator.pageLimit = resData.postsData.pageLimit;
                    resData.paginator.total = resData.postsData.total;
                    resData.paginator.linkUrl = '/admin/post/page-';
                    resData.paginator.linkParam = paramArr.length > 0 ? '?' + paramArr.join('&') : '';
                } else {//必须设置该字段
                    resData.postsData = '';
                }

                if (page > 1) {
                    resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', '文章列表', '管理后台', options.site_name.option_value]));
                } else {
                    resData.meta.title = util.getTitle(titleArr.concat(['文章列表', '管理后台', options.site_name.option_value]));
                }

                resData.curStatus = param.postDate || param.category || param.tag || param.author ? '' : param.postStatus;
                resData.curCategory = param.category;
                resData.curDate = param.postDate;
                resData.curKeyword = param.keyword;
                resData.options = options;
                resData.util = util;

                resData.categories = results.categories;
                resData.archiveDates = results.archiveDates;

                resData.count = {
                    all: results.countAll.total,
                    publish: results.countPublish.total,
                    archive: results.countArchive.total,
                    draft: results.countDraft.total,
                    trash: results.countDeleted.total
                };
                res.render('admin/pages/p_post_list', resData);
            });
        }
    },
    /**
     * 新建文章
     * @method newPost
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    newPost: function (req, res, next) {
        var resData = {
            meta: {
                title: ''
            },
            categories: false,
            token: req.csrfToken()
        };

        async.parallel({
            categories: common.getCategoryArray,
            options: base.getInitOptions.bind(base)
        }, function (err, results) {
            var options = results.options;
            if (err) {
                return next(err);
            }
            resData.meta.title = util.getTitle(['撰写新文章', '管理后台', options.site_name.option_value]);

            resData.categories = results.categories;
            resData.options = options;

            if (req.query.type === 'page') {
                resData.page = 'page';
                res.render('admin/pages/p_page_form', resData);
            } else {
                resData.page = 'post';
                res.render('admin/pages/p_post_form', resData);
            }
        });
    },
    /**
     * 保存文章
     * @method savePost
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    savePost: function (req, res, next) {
        var params = req.body,
            referer = req.session.referer,
            type = req.query.type;

        if (!type || type !== 'page') {
            type = 'post';
        }

        //postTitle, postContent, postExcerpt, postTag;
        //params.postContent不能过滤，否则将过滤掉属性
        params.postTitle = xss.sanitize(params.postTitle);
        params.postExcerpt = xss.sanitize(params.postExcerpt);
        params.postTag = xss.sanitize(params.postTag);
        params.postCategory = typeof params.postCategory === 'string' ? params.postCategory.split(',') : params.postCategory;
        params.user = req.session.user;
        params.postId = xss.sanitize(params.postId);
        params.postUrl = xss.sanitize(params.postUrl);
        params.type = type;

        if (typeof params.postTag === 'string') {
            params.postTag = params.postTag.trim();
            if (params.postTag === '') {
                params.postTag = [];
            } else {
                params.postTag = params.postTag.split(/[,\s]/i);
            }
        } else if (!util.isArray(params.postTag)) {
            params.postTag = [];
        }

        if (!params.postId || !idReg.test(params.postId)) {//空或者不符合ID规则
            params.postId = '';
        }
        params.postId = params.postId.trim();
        //trim shouldn't be null or undefined
        if (!params.postStatus) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '状态不能为空'
            }, next);
        }
        if (!params.postTitle.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '标题不能为空'
            }, next);
        }
        if (!params.postContent.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '内容不能为空'
            }, next);
        }
        if (type === 'post' && (!params.postCategory || params.postCategory.length < 1)) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '目录不能为空'
            }, next);
        }
        if (type === 'post' && params.postCategory.length > 5) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '目录数应不大于5个'
            }, next);
        }
        if (type === 'post' && params.postTag.length > 10) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '标签数应不大于10个'
            }, next);
        }
        if (params.postStatus === 'password' && !params.postPassword.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: '密码不能为空'
            }, next);
        }
        if (type === 'page' && !params.postUrl.trim()) {
            return util.catchError({
                status: 200,
                code: 400,
                message: 'URL不能为空'
            }, next);
        }

        async.auto({
            // options: base.getInitOptions.bind(base),
            // post: ['options', function (cb, result) {
            //     post.savePost(params, result.options, cb);
            // }]
            post: function (cb) {
                post.savePost(params, cb);
            }
        }, function (err, results) {
            if (err) {
                next(err);
            } else {
                delete(req.session.referer);

                res.set('Content-type', 'application/json');
                res.send({
                    status: 200,
                    code: 0,
                    message: null,
                    data: {
                        url: referer || '/admin/post?type=' + type
                    }
                });
            }
        });
    },
    /**
     * 修改文章
     * @method editPost
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.0.0
     * @since 1.0.0
     */
    editPost: function (req, res, next) {
        var postId = req.params.postId, resData;

        if (!postId || !idReg.test(postId)) {
            return util.catchError({
                status: 404,
                code: 404,
                message: '文章不存在'
            }, next);
        }

        req.session.referer = req.headers.referer;

        resData = {
            meta: {
                title: ''
            },
            categories: false,
            token: req.csrfToken()
        };

        async.parallel({
            post: function (cb) {
                post.getPostById(postId, 'id', util.isAdminUser(req), function (err, data) {
                    if (err || !data.post || !data.post.post_id) {
                        logger.error(util.getErrorLog({
                            req: req,
                            funcName: 'editPost',
                            funcParam: {
                                postId: postId
                            },
                            msg: err
                        }));
                        return cb(util.catchError({
                            status: 404,
                            code: 404,
                            message: 'Page Not Found'
                        }));
                    }
                    cb(null, data);
                });
            },
            categories: common.getCategoryArray,
            options: base.getInitOptions.bind(base)
        }, function (err, results) {
            var curPost = results.post, options = results.options, tagIdx, tagArr = [], catIdx, catArr = [], postType;
            if (err) {
                return next(err);
            }
            postType = results.post.post.post_type;
            resData.meta.title = util.getTitle([postType === 'post' ? '编辑文章' : '编辑页面', '管理后台', options.site_name.option_value]);

            for (tagIdx = 0; tagIdx < curPost.tag.length; tagIdx += 1) {
                tagArr.push(curPost.tag[tagIdx].name);
            }
            for (catIdx = 0; catIdx < curPost.category.length; catIdx += 1) {
                catArr.push(curPost.category[catIdx].taxonomy_id);
            }
            resData.util = util;
            resData.postCategories = catArr;

            resData.post = results.post;
            resData.categories = results.categories;
            resData.postTags = tagArr.join(',');
            resData.options = options;

            if (postType === 'page') {
                resData.page = 'page';
                res.render('admin/pages/p_page_form_edit', resData);
            } else {
                resData.page = 'post';
                res.render('admin/pages/p_post_form_edit', resData);
            }
        });
    },
    /**
     * 批量保存
     * @method batchSave
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @unimplemented
     */
    batchSave: function (req, res, next) {//TODO
    },
    /**
     * 删除文章
     * @method removePost
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @unimplemented
     */
    removePost: function (req, res, next) {//TODO
    },
    /**
     * 多媒体列表
     * @method listMedia
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    listMedia: function (req, res, next) {
        var page = parseInt(req.params.page, 10) || 1, resData = {
            meta: {
                title: ''
            },
            page: 'media',
            curStatus: ''
        }, param;

        param = {
            page: page,
            postStatus: req.query.status || 'all',
            postDate: req.query.date || '',
            type: 'attachment',
            author: req.query.author || '',
            keyword: req.query.keyword || '',
            fromAdmin: true
        };
        async.parallel({
            allMedia: function (cb) {
                post.getAllPosts(param, cb);
            },
            options: base.getInitOptions.bind(base),
            archiveDates: function (cb) {
                post.getArchiveDates(param.type, cb);
            },
            countAll: function (cb) {
                post.getPostCount(['publish', 'private', 'draft', 'auto-draft', 'trash'], param.type, cb);
            },
            countDeleted: function (cb) {
                post.getPostCount('trash', param.type, cb);
            }
        }, function (err, results) {
            var paramArr = [], titleArr = [], options = results.options;

            if (param.keyword) {
                paramArr.push('keyword=' + param.keyword);
                titleArr.push(param.keyword, '搜索');
            }
            if (req.query.status) {//TODO:英文转中文
                paramArr.push('status=' + param.postStatus);
                titleArr.push(param.postStatus, '状态');
            }
            if (param.postDate) {
                paramArr.push('date=' + param.postDate);
                titleArr.push(param.postDate, '日期');
            }
            if (param.author) {//TODO:作者
                paramArr.push('author=' + param.author);
                // titleArr.push(param.author);
            }

            if (results.allMedia) {
                resData.postsData = results.allMedia;
                resData.paginator = util.paginator(page, results.allMedia.pages, pagesOut);
                resData.paginator.pageLimit = resData.postsData.pageLimit;
                resData.paginator.total = resData.postsData.total;
                resData.paginator.linkUrl = '/admin/media/page-';
                resData.paginator.linkParam = '';
            } else {//必须设置该字段
                resData.postsData = '';
            }

            if (page > 1) {
                resData.meta.title = util.getTitle(titleArr.concat(['第' + page + '页', '多媒体列表', '管理后台', options.site_name.option_value]));
            } else {
                resData.meta.title = util.getTitle(titleArr.concat(['多媒体列表', '管理后台', options.site_name.option_value]));
            }

            resData.curStatus = param.postStatus;
            resData.curDate = param.postDate;
            resData.curKeyword = param.keyword;
            resData.options = options;
            resData.util = util;
            resData.archiveDates = results.archiveDates;

            resData.count = {
                all: results.countAll.total,
                trash: results.countDeleted.total
            };
            res.render('admin/pages/p_media_list', resData);

        });
    },
    /**
     * 新增多媒体
     * @method newMedia
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    newMedia: function (req, res, next) {
        var resData = {
            meta: {
                title: ''
            },
            page: 'media',
            token: req.csrfToken()
        };

        async.parallel({
            options: base.getInitOptions.bind(base)
        }, function (err, results) {
            var options = results.options;
            if (err) {
                return next(err);
            }
            resData.meta.title = util.getTitle(['上传新媒体文件', '管理后台', options.site_name.option_value]);

            resData.options = options;

            res.render('admin/pages/p_media_form', resData);
        });
    },
    /**
     * 上传多媒体文件
     * @method uploadFile
     * @static
     * @param {Object} req 请求对象
     * @param {Object} res 响应对象
     * @param {Object} next 路由对象
     * @return {void}
     * @author Fuyun
     * @version 1.2.0
     * @since 1.2.0
     */
    uploadFile: function (req, res, next) {
        var form = new formidable.IncomingForm(), yearPath, uploadPath, now = moment(), curYear = now.format('YYYY'), curMonth = now.format('MM');

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
        form.maxFieldsSize = 200 * 1024 * 1024;

        form.on('progress', function (bytesReceived, bytesExpected) {
            // console.log(bytesReceived, bytesExpected);
        });
        form.on('field', function (name, value) {
            // console.log('field', name, value);
        });
        form.on('file', function (name, file) {
            // console.log('file', name, file);
        });
        form.on('end', function () {
            // res.set('Content-type', 'application/json');
            // res.send({
            //     code: 200,
            //     msg: 'test'
            // });
        });
        form.on('error', function (err) {
            logger.error(util.getErrorLog({
                req: req,
                funcName: 'uploadFile',//TODO:func.name
                funcParam: {
                    uploadPath: uploadPath
                },
                msg: err
            }));
        });
        form.parse(req, function (err, fields, files) {
            var fileExt = files.mediafile.name.split('.');
            if (fileExt.length > 1) {
                fileExt = '.' + fileExt.pop();
            } else {
                fileExt = '';
            }
            var filename = util.getUuid() + fileExt;
            var filepath = path.join(uploadPath, filename);
            var fileData = {};
            fs.renameSync(files.mediafile.path, filepath);

            fileData.postTitle = fileData.postExcerpt = fileData.postContent = xss.sanitize(files.mediafile.name);
            fileData.postCategory = '';
            fileData.user = req.session.user;
            fileData.postUrl = '';
            fileData.postStatus = 'publish';
            fileData.type = 'attachment';
            fileData.postTag = [];
            fileData.postId = '';
            fileData.postUrl = '/static/' + curYear + '/' + curMonth + '/' + filename;

            async.auto({
                post: function (cb) {
                    post.savePost(fileData, cb);
                }
            }, function (err, results) {
                if (err) {
                    next(err);
                } else {
                    delete(req.session.referer);

                    res.set('Content-type', 'application/json');
                    res.send({
                        status: 200,
                        code: 0,
                        message: null,
                        data: {
                            url: '/admin/media'
                        }
                    });
                }
            });

            logger.info(util.getInfoLog({
                req: req,
                funcName: 'uploadFile',//TODO:func.name
                funcParam: {
                    uploadPath: uploadPath,
                    filename: files.mediafile.name
                },
                msg: 'Upload file: ' + filename
            }));
        });
    }
};
