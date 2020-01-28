
const async = require('async');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const util = require('../helper/util');
const models = require('../models/index');
const commonService = require('../services/common');
const ERR_CODES = require('../services/error-codes');
const {Post, User, Postmeta, TermTaxonomy, VTagVisibleTaxonomy} = models;
const Op = models.Sequelize.Op;

module.exports = {
    /**
     * 查询公共数据
     * @param {Object} param 参数对象
     * @param {Function} cb 回调函数
     * @return {*} null
     */
    getCommonData(param, cb) {
        // 执行时间在30-60ms，间歇60-80ms
        async.parallel({
            archiveDates: (cb) => {
                commonService.archiveDates(cb, {
                    postType: param.postType || 'post',
                    filterCategory: param.filterCategory
                });
            },
            recentPosts: commonService.recentPosts,
            randPosts: commonService.randPosts,
            hotPosts: commonService.hotPosts,
            friendLinks: (cb) => commonService.getLinks('friendlink', param.from !== 'list' || param.page > 1 ? ['site'] : ['homepage', 'site'], cb),
            quickLinks: (cb) => commonService.getLinks('quicklink', ['homepage', 'site'], cb),
            categories: (cb) => {
                commonService.getCategoryTree(cb, param.filterCategory === true ? {
                    visible: 1
                } : {});
            },
            mainNavs: commonService.mainNavs,
            options: commonService.getInitOptions
        }, function (err, result) {
            if (err) {
                logger.error(formatOpLog({
                    fn: 'getCommonData',
                    msg: err,
                    data: param
                }));
                cb(err);
            } else {
                cb(null, result);
            }
        });
    },
    /**
     * 根据IDs查询post
     * @param {Object} param 参数对象
     *     {Array}[posts] post对象数组,
     *     {Array}[postIds] post id数组,
     *     {Boolean}[filterCategory] 是否过滤隐藏分类下的文章
     * @param {Function} cb 回调函数
     * @return {*} null
     */
    queryPostsByIds(param, cb) {
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
    },
    /**
     * 查询posts
     * @param {Object} param 参数对象
     * @param {Function} cb 回调函数
     * @return {*} null
     */
    queryPosts(param, cb) {
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
            this.queryPostsByIds({
                posts,
                postIds,
                filterCategory: param.filterCategory
            }, cb);
        });
    },
    listPosts(param, cb) {
        let page = param.page;
        let where = {
            postStatus: {
                [Op.eq]: 'publish'
            },
            postType: {
                [Op.eq]: 'post'
            }
        };
        if (param.keyword) {
            where[Op.or] = [{
                postTitle: {
                    [Op.like]: `%${param.keyword}%`
                }
            }, {
                postContent: {
                    [Op.like]: `%${param.keyword}%`
                }
            }, {
                postExcerpt: {
                    [Op.like]: `%${param.keyword}%`
                }
            }];
        }
        let includeOpt = [{
            model: TermTaxonomy,
            attributes: ['taxonomyId', 'visible'],
            where: {
                visible: {
                    [Op.in]: param.isAdmin ? [0, 1] : [1]
                },
                taxonomy: {
                    [Op.eq]: 'post'
                }
            }
        }];
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    page,
                    from: 'list',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            postsCount: (cb) => {
                Post.count({
                    where,
                    include: includeOpt,
                    distinct: true
                }).then((result) => cb(null, result));
            },
            posts: ['postsCount', (result, cb) => {
                page = (page > result.postsCount / 10 ? Math.ceil(result.postsCount / 10) : page) || 1;
                this.queryPosts({
                    page,
                    where,
                    includeOpt,
                    filterCategory: !param.isAdmin,
                    from: 'index'
                }, cb);
            }],
            comments: ['posts', (result, cb) => commonService.getCommentCountByPosts(result.posts, cb)]
        }, (err, result) => cb(err, result, {where, page}));
    },
    showPost(param, cb) {
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    from: 'post',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            post: function (cb) {
                let where = {
                    taxonomy: {
                        [Op.in]: ['post', 'tag']
                    }
                };
                if (!param.isAdmin) {
                    where.visible = {
                        [Op.eq]: 1
                    };
                }
                Post.findByPk(param.postId, {
                    attributes: [
                        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus',
                        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated',
                        'postGuid', 'commentCount', 'postViewCount'
                    ],
                    include: [{
                        model: User,
                        attributes: ['userDisplayName']
                    }, {
                        model: models.TermTaxonomy,
                        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'visible', 'count'],
                        where
                    }]
                }).then(function (post) {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.postId} Not Exist.`
                        }));
                    }
                    // 无管理员权限不允许访问非公开文章(包括草稿)
                    if (!param.isAdmin && post.postStatus !== 'publish') {
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.UNAUTHORIZED,
                            message: 'Page Not Found.',
                            messageDetail: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
                        }));
                    }
                    cb(null, post);
                });
            },
            comments: ['post', (result, cb) => commonService.getCommentsByPostId(result.post.postId, cb)],
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
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.CATEGORY_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: 'Category Not Exist.',
                            data: {
                                postId: post.postId,
                                postTitle: post.postTitle
                            }
                        }));
                    }
                    let crumbCatId;
                    for (let i = 0; i < categories.length; i += 1) {
                        const curCat = categories[i];
                        if (curCat.visible || param.isAdmin) {
                            crumbCatId = curCat.taxonomyId;
                            break;
                        }
                    }
                    if (!param.isAdmin && !crumbCatId) {
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.CATEGORY_INVISIBLE,
                            message: 'Page Not Found.',
                            messageDetail: 'Category is Invisible.',
                            data: {
                                postId: post.postId,
                                postTitle: post.postTitle
                            }
                        }));
                    }
                    cb(null, commonService.getCategoryPath({
                        catData: result.commonData.categories.catData,
                        taxonomyId: crumbCatId
                    }));
                }],
            postViewCount: (cb) => {
                const viewCount = models.sequelize.literal('post_view_count + 1');
                Post.update({
                    postViewCount: viewCount
                }, {
                    where: {
                        postId: {
                            [Op.eq]: param.postId
                        }
                    },
                    silent: true
                }).then((post) => {
                    cb(null, post);
                });
            },
            prevPost: (cb) => commonService.getPrevPost(param.postId, cb),
            nextPost: (cb) => commonService.getNextPost(param.postId, cb)
        }, cb);
    }
};
