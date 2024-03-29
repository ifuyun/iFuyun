/**
 * 文章
 * @author fuyun
 * @version 3.3.7
 * @since 1.0.0(2017/04/12)
 */
const fs = require('fs');
const formidable = require('formidable');
const path = require('path');
const moment = require('moment');
const url = require('url');
const xss = require('sanitizer');
const appConfig = require('../config/core');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const util = require('../helper/util');
const constants = require('../services/constants');
const commonService = require('../services/common');
const STATUS_CODES = require('../services/status-codes');
const optionService = require('../services/option');
const postService = require('../services/post');
const idReg = /^[0-9a-fA-F]{16}$/i;

module.exports = {
    listPosts(req, res, next) {
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
                meta: {},
                token: req.csrfToken()
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), constants.PAGINATION_SIZE);
            resData.posts.linkUrl = '/post/page-';
            resData.posts.linkParam = req.query.keyword ? '?keyword=' + req.query.keyword : '';
            resData.comments = result.comments;

            if (req.query.keyword) {
                if (page > 1) {
                    resData.meta.title = util.getTitle([req.query.keyword, `第${page}页`, '搜索结果', options.site_name.optionValue]);
                } else {
                    resData.meta.title = util.getTitle([req.query.keyword, '搜索结果', options.site_name.optionValue]);
                }
            } else {
                if (page > 1) {
                    resData.meta.title = util.getTitle([`第${page}页`, options.site_slogan.optionValue, options.site_name.optionValue]);
                } else {
                    resData.meta.title = util.getTitle([options.site_slogan.optionValue, options.site_name.optionValue]);
                }
            }

            resData.meta.description = (page > 1 ? `${options.site_name.optionValue}文章列表(第${page}页)；` : '') + options.site_description.optionValue;
            resData.meta.keywords = options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    showPost(req, res, next) {
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
        let referer = util.getReferrer(req) || '';
        referer = referer.split('?')[0].split('#')[0];
        postService.showPost({
            isAdmin,
            postId,
            referer
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
                if (err.code === STATUS_CODES.POST_NOT_EXIST) {// 如果找不到post，向后判断是否page
                    return next();
                }
                return next(err);
            }
            let resData = {
                showCrumb: true,
                user: {},
                meta: {},
                token: req.csrfToken(),
                formatter
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

            resData.post = result.post;
            resData.post.meta = {};
            if (result.post.PostMeta) {
                result.post.PostMeta.forEach((meta) => {
                    resData.post.meta[meta.metaKey] = meta.metaValue;
                });
            }
            resData.post.meta.postAuthor = resData.post.meta.post_author || result.post.User.userDisplayName;

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), constants.POST_SUMMARY_LENGTH);
            resData.meta.keywords = util.uniqueTags(keywords.join(','));
            resData.meta.author = options.site_author.optionValue;
            resData.prevPost = result.prevPost;
            resData.nextPost = result.nextPost;
            resData.comments = result.comments;
            resData.urlShare = util.appendUrlRef(options.site_url.optionValue + result.post.postGuid, 'qrcode');
            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/post`, resData);
        });
    },
    showPage(req, res, next) {
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

            resData.postMeta = {};
            if (result.post.PostMeta) {
                result.post.PostMeta.forEach((meta) => {
                    resData.postMeta[meta.metaKey] = meta.metaValue;
                });
            }

            resData.meta.title = util.getTitle([result.post.postTitle, options.site_name.optionValue]);
            resData.meta.description = result.post.postExcerpt || util.cutStr(util.filterHtmlTag(result.post.postContent), constants.POST_SUMMARY_LENGTH);
            resData.meta.keywords = util.uniqueTags(result.post.postTitle + ',' + options.site_keywords.optionValue);
            resData.meta.author = options.site_author.optionValue;

            resData.post = result.post;
            resData.comments = result.comments;
            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/page`, resData);
        });
    },
    listByCategory(req, res, next) {
        const isAdmin = util.isAdminUser(req.session.user);
        let page = parseInt(req.params.page, 10) || 1;
        const category = req.params.category;

        postService.listByCategory({
            isAdmin,
            page,
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
                meta: {},
                token: req.csrfToken()
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);

            resData.curPos = util.createCrumb(result.subCategories.catPath);

            resData.posts = result.posts;
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), constants.PAGINATION_SIZE);
            resData.posts.linkUrl = '/category/' + category + '/page-';
            resData.posts.linkParam = '';
            resData.comments = result.comments;

            const curCat = result.subCategories.catPath[result.subCategories.catPath.length - 1].title;
            if (page > 1) {
                resData.meta.title = util.getTitle([`第${page}页`, curCat, '分类目录', options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle([curCat, '分类目录', options.site_name.optionValue]);
            }

            resData.meta.description = `「${curCat}」相关文章` + (page > 1 ? `(第${page}页)` : '') + '；' + options.site_description.optionValue;
            resData.meta.keywords = util.uniqueTags(curCat + ',' + options.site_keywords.optionValue);
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    listByTag(req, res, next) {
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
                meta: {},
                token: req.csrfToken()
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
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), constants.PAGINATION_SIZE);
            resData.posts.linkUrl = '/tag/' + tag + '/page-';
            resData.posts.linkParam = '';
            resData.comments = result.comments;

            if (page > 1) {
                resData.meta.title = util.getTitle([`第${page}页`, tag, '标签', options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle([tag, '标签', options.site_name.optionValue]);
            }

            resData.meta.description = `「${tag}」相关文章` + (page > 1 ? `(第${page}页)` : '') + '；' + options.site_description.optionValue;
            resData.meta.keywords = util.uniqueTags(tag + ',' + options.site_keywords.optionValue);
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    listByDate(req, res, next) {
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
                meta: {},
                token: req.csrfToken()
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
            resData.posts.paginator = util.paginator(page, Math.ceil(result.postsCount / 10), constants.PAGINATION_SIZE);
            resData.posts.linkUrl = `/archive/${year}${month ? '/' + month : ''}/page-`;
            resData.posts.linkParam = '';
            resData.comments = result.comments;

            const title = `${year}年${month ? month + '月' : ''}`;
            if (page > 1) {
                resData.meta.title = util.getTitle([`第${page}页`, title, '文章归档', options.site_name.optionValue]);
            } else {
                resData.meta.title = util.getTitle([title, '文章归档', options.site_name.optionValue]);
            }

            resData.meta.description = `${options.site_name.optionValue}${title}文章` + (page > 1 ? `(第${page}页)` : '') + '；' + options.site_description.optionValue;
            resData.meta.keywords = options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            resData.moment = moment;
            res.render(`${appConfig.pathViews}/front/pages/postList`, resData);
        });
    },
    listArchiveDate(req, res, next) {
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
                meta: {},
                token: req.csrfToken()
            };
            const options = result.commonData.options;
            Object.assign(resData, result.commonData);
            resData.archiveDateList = {};
            (resData.archiveDates || []).forEach((item, idx) => {
                const data = item.get();
                const year = data.linkDate.split('/')[0];
                resData.archiveDateList[year] = resData.archiveDateList[year] || {};
                resData.archiveDateList[year].list = resData.archiveDateList[year].list || [];
                resData.archiveDateList[year].list.push(data);
                resData.archiveDateList[year].postCount = resData.archiveDateList[year].postCount || 0;
                resData.archiveDateList[year].postCount += data.count;
            });
            resData.archiveDateYears = Object.keys(resData.archiveDateList).sort((a, b) => a < b ? 1 : -1);

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
            resData.meta.description = `${options.site_name.optionValue}文章归档，查看${options.site_name.optionValue}全部历史文章；` + options.site_description.optionValue;
            resData.meta.keywords = options.site_keywords.optionValue;
            resData.meta.author = options.site_author.optionValue;

            resData.util = util;
            res.render(`${appConfig.pathViews}/front/pages/archiveList`, resData);
        });
    },
    listEdit(req, res, next) {
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
            resData.paginator = util.paginator(data.page, Math.ceil(result.postsCount / 10), constants.PAGINATION_SIZE);
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

            result.posts.forEach((post) => {
                post.comment = {};
                for (let pid of Object.keys(result.comments)) {
                    if (post.post.postId === pid) {
                        post.comment.count = result.comments[pid];
                        break;
                    }
                }
                post.comment.count = post.comment.count || 0;
            });

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
    editPost(req, res, next) {
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
            let title = [];
            let postTitle;
            const pageTitle = {
                page: '撰写新页面',
                post: '撰写新文章'
            };
            const editTitle = {
                page: '编辑页面',
                post: '编辑文章'
            };
            if (result.post) {
                resData.page = result.post.postType;
                resData.post = result.post;

                postTitle = editTitle[result.post.postType];
                title.push(postTitle);
                title.unshift(result.post.postTitle);
            } else {
                resData.page = req.query.type === 'page' ? 'page' : 'post';
                resData.post = {
                    postStatus: 'publish',
                    postOriginal: 1,
                    commentFlag: 'verify'
                };

                postTitle = pageTitle[resData.page];
                title.push(postTitle);
            }

            resData.postTitle = postTitle;
            resData.meta.title = util.getTitle(title.concat('管理后台', result.options.site_name.optionValue));
            resData.postMeta = {
                'show_wechat_card': '1',
                'copyright_type': '1',
                'post_source': '',
                'post_author': ''
            };
            if (result.post && result.post.PostMeta) {
                result.post.PostMeta.forEach((meta) => {
                    resData.postMeta[meta.metaKey] = meta.metaValue;
                });
            }
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
    savePost(req, res, next) {
        // todo: page应该限制url前缀，且postGuid必填（有默认值）
        const param = req.body;
        const type = req.query.type !== 'page' ? 'post' : 'page';
        const nowTime = new Date();
        let postId = util.sanitizeField(param.postId);
        postId = idReg.test(postId) ? postId : '';
        const newPostId = postId || util.getUuid();
        const postSource = util.trim(xss.sanitize(param.postSource));
        const postAuthor = util.trim(xss.sanitize(param.postAuthor));

        // todo: 防纂改
        let data = {
            postTitle: util.sanitizeField(param.postTitle),
            postContent: util.trim(param.postContent),
            postExcerpt: util.sanitizeField(param.postExcerpt),
            postGuid: util.sanitizeField(param.postGuid, true, '/post/' + newPostId),
            postAuthor: req.session.user.userId,
            postStatus: util.sanitizeField(param.postStatus),
            postPassword: util.trim(param.postPassword),
            postOriginal: util.sanitizeField(param.postOriginal, true, '1'),
            commentFlag: util.sanitizeField(param.commentFlag),
            postDate: param.postDate ? new Date(+moment(param.postDate)) : nowTime,
            postType: type
        };
        const toArray = (param) => {
            if (param === '') {
                param = [];
            } else if (typeof param === 'string') {
                param = param.split(/[,\s]/i);
            } else {
                param = Array.isArray(param) ? param : [];
            }
            return param;
        };
        const postCategory = toArray(util.sanitizeField(param.postCategory));
        const postTag = toArray(util.sanitizeField(param.postTag));

        const checkResult = postService.validatePostFields({
            data,
            type,
            postCategory,
            postTag,
            postSource,
            postAuthor
        });
        if (checkResult !== true) {
            return next(checkResult);
        }
        if (data.postStatus === 'password') {
            data.postStatus = 'publish';
        } else {
            data.postPassword = '';
        }

        const updateModified = util.sanitizeField(param.updateModified, true, '1');
        if (postId && data.postContent !== param.postRawContent && updateModified === '1') {
            data.postModified = data.postModifiedGmt = nowTime;
        }
        postService.savePost({
            postId,
            data,
            newPostId,
            nowTime,
            type,
            postCategory,
            postTag,
            showWechatCard: util.trim(xss.sanitize(param.showWechatCard)),
            copyrightType: util.trim(xss.sanitize(param.copyrightType)),
            postSource,
            postAuthor
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
    listMedia(req, res, next) {
        postService.listMedia({
            page: req.params.page,
            query: req.query
        }, (err, result, data) => {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'listMedia',
                    msg: err.messageDetail || err.message,
                    data: {
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
            resData.paginator = util.paginator(data.page, Math.ceil(result.postsCount / 10), constants.PAGINATION_SIZE);
            resData.paginator.linkUrl = '/admin/media/page-';
            resData.paginator.linkParam = data.paramArr.length > 0 ? '?' + data.paramArr.join('&') : '';
            resData.paginator.pageLimit = 10;
            resData.paginator.total = result.postsCount;

            if (data.page > 1) {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat(['第' + data.page + '页', '多媒体列表', '管理后台', result.options.site_name.optionValue])
                );
            } else {
                resData.meta.title = util.getTitle(
                    data.titleArr.concat(['多媒体列表', '管理后台', result.options.site_name.optionValue])
                );
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
    createMedia(req, res, next) {
        optionService.getInitOptions((err, options) => {
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
    uploadFile(req, res, next) {
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

        form.on('error', (err) => {
            logger.error(formatOpLog({
                fn: 'uploadFile',
                msg: err,
                data: {
                    uploadPath
                },
                req
            }));
        });
        form.parse(req, (err, fields, files) => {
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
            fileData.postOriginal = parseInt(fields.original, 10) ? 1 : 0;
            fileData.postId = util.getUuid();
            fileData.postGuid = '/' + curYear + '/' + curMonth + '/' + filename;
            fileData.postModifiedGmt = fileData.postDateGmt = fileData.postDate = nowTime;

            res.type('application/json');
            postService.uploadFile({
                fileData
            }, () => {
                logger.info(formatOpLog({
                    fn: 'uploadFile',
                    msg: `File: ${filename}:${fileData.postTitle} is uploaded.`,
                    data: {
                        uploadPath,
                        filename: files.mediafile.name,
                        original: fields.original === '1',
                        watermark: fields.watermark === '1'
                    },
                    req
                }));

                const response = (err) => {
                    if (err) {
                        logger.error(formatOpLog({
                            fn: 'uploadFile',
                            msg: `水印处理失败: ${err.message}`,
                            data: {
                                uploadPath,
                                filename: files.mediafile.name,
                                watermark: fields.watermark === '1'
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
                logger.error(formatOpLog({
                    fn: 'uploadFile',
                    msg: err.messageDetail || err.message,
                    data: err.data,
                    req
                }));
                res.send({
                    status: 200,
                    code: 500,
                    message: typeof err === 'string' ? err : err.message,
                    token: req.csrfToken()
                });
            });
        });
    }
};
