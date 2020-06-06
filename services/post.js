/**
 * post services
 * @author fuyun
 * @version 3.3.4
 * @since 3.0.0
 */
const async = require('async');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const formatter = require('../helper/formatter');
const util = require('../helper/util');
const models = require('../models/index');
const commonService = require('../services/common');
const constants = require('../services/constants');
const STATUS_CODES = require('./status-codes');
const {Post, User, Postmeta, TermTaxonomy, VTagVisibleTaxonomy} = models;
const Op = models.Sequelize.Op;

module.exports = {
    /**
     * 查询公共数据
     * @param {Object} param 参数对象
     * @param {Function} cb 回调函数
     * @return {*} null
     * @since 2.0.0
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
                    status: [1]
                } : {
                    status: [0, 1]
                });
            },
            mainNavs: commonService.mainNavs,
            options: commonService.getInitOptions
        }, (err, result) => {
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
     * @since 2.0.0
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
            [Op.or]: [{
                taxonomy: {
                    [Op.eq]: 'post'
                },
                status: {
                    [Op.in]: [0, 1]
                }
            }, {
                taxonomy: {
                    [Op.eq]: 'tag'
                },
                status: {
                    [Op.in]: [0, 1]
                }
            }]
        };
        if (filterCategory) {
            where[Op.or][0].status = where[Op.or][1].status = {
                [Op.eq]: 1
            };
        }
        TermTaxonomy.findAll({
            attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'status', 'count'],
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
     * @since 2.0.0
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
            attributes: ['taxonomyId', 'status'],
            where: {
                status: {
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
        }, (err, result) => cb(err, result, {
            where,
            page
        }));
    },
    showPost(param, cb) {
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    from: 'post',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            post: (cb) => {
                let where = {
                    [Op.or]: [{
                        taxonomy: {
                            [Op.eq]: 'post'
                        }
                    }, {
                        taxonomy: {
                            [Op.eq]: 'tag'
                        },
                        status: {
                            [Op.eq]: 1
                        }
                    }]
                };
                if (!param.isAdmin) {
                    where[Op.or][0].status = {
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
                        model: TermTaxonomy,
                        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'status', 'count'],
                        where
                    }, {
                        model: Postmeta,
                        attributes: ['metaKey', 'metaValue']
                    }]
                }).then((post) => {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: STATUS_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.postId} Not Exist.`
                        }));
                    }
                    // 无管理员权限不允许访问非公开文章(包括草稿)
                    if (!param.isAdmin && post.postStatus !== 'publish') {
                        return cb(util.catchError({
                            status: 404,
                            code: STATUS_CODES.UNAUTHORIZED,
                            message: 'Page Not Found.',
                            messageDetail: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
                        }));
                    }
                    cb(null, post);
                });
            },
            comments: ['post', (result, cb) => commonService.getCommentsByPostId(result.post.postId, cb)],
            crumb: ['commonData', 'post', (result, cb) => {
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
                        code: STATUS_CODES.CATEGORY_NOT_EXIST,
                        message: 'Page Not Found.',
                        messageDetail: 'Category Not Exist.',
                        data: {
                            postId: post.postId,
                            postTitle: post.postTitle
                        }
                    }));
                }
                categories = categories.filter((item) => item.status === 1 || param.isAdmin);
                let crumbCatId;
                if (categories.length > 0) {
                    // todo: parent category
                    const crumbCats = categories.filter((item) => param.referer.endsWith(`/${item.slug}`));
                    if (crumbCats.length > 0) {
                        crumbCatId = crumbCats[0].taxonomyId;
                    }
                    crumbCatId = crumbCatId || categories[0].taxonomyId;
                }
                if (!param.isAdmin && !crumbCatId) {
                    return cb(util.catchError({
                        status: 404,
                        code: STATUS_CODES.CATEGORY_INVISIBLE,
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
    },
    showPage(param, cb) {
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    from: 'page',
                    postType: 'post',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            post: (cb) => {
                Post.findOne({
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
                    where: {
                        postGuid: {
                            [Op.eq]: decodeURIComponent(param.reqPath)
                        },
                        postType: {
                            [Op.in]: ['post', 'page']
                        }
                    }
                }).then((post) => {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: STATUS_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.reqPath} Not Exist.`
                        }));
                    }
                    // 无管理员权限不允许访问非公开文章(包括草稿)
                    if (!util.isAdminUser(param.user) && post.postStatus !== 'publish') {
                        return cb(util.catchError({
                            status: 404,
                            code: STATUS_CODES.UNAUTHORIZED,
                            message: 'Page Not Found.',
                            messageDetail: `[Unauthorized]${post.postId}:${post.postTitle} is ${post.postStatus}`
                        }));
                    }
                    cb(null, post);
                });
            },
            comments: ['post', (result, cb) => commonService.getCommentsByPostId(result.post.postId, cb)],
            postViewCount: ['post', (result, cb) => {
                const viewCount = models.sequelize.literal('post_view_count + 1');
                Post.update({
                    postViewCount: viewCount
                }, {
                    where: {
                        postId: {
                            [Op.eq]: result.post.postId
                        }
                    },
                    silent: true
                }).then((post) => {
                    cb(null, post);
                });
            }]
        }, cb);
    },
    listByCategory(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        let where = {
            postStatus: {
                [Op.eq]: 'publish'
            },
            postType: {
                [Op.eq]: 'post'
            }
        };
        let includeOpt = [{
            model: TermTaxonomy,
            attributes: ['taxonomyId', 'status'],
            where: {
                status: {
                    [Op.eq]: 1
                }
            }
        }];
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    page,
                    from: 'category',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            categories: commonService.getCategoryTree.bind(commonService),
            subCategories: ['categories', (result, cb) => {
                commonService.getSubCategoriesBySlug({
                    catData: result.categories.catData,
                    slug: param.category,
                    filterCategory: !param.isAdmin
                }, cb);
            }],
            setRelationshipWhere: ['subCategories', (result, cb) => {
                includeOpt.push({
                    model: models.TermRelationship,
                    attributes: ['objectId'],
                    where: {
                        termTaxonomyId: {
                            [Op.in]: result.subCategories.subCatIds
                        }
                    }
                });
                cb(null);
            }],
            postsCount: ['setRelationshipWhere', (result, cb) => {
                Post.count({
                    where,
                    include: includeOpt,
                    subQuery: false,
                    distinct: true
                }).then((count) => cb(null, count));
            }],
            posts: ['postsCount', (result, cb) => {
                page = (page > result.postsCount / 10 ? Math.ceil(result.postsCount / 10) : page) || 1;
                this.queryPosts({
                    page,
                    where,
                    includeOpt,
                    filterCategory: !param.isAdmin,
                    from: 'category'
                }, cb);
            }],
            comments: ['posts', (result, cb) => commonService.getCommentCountByPosts(result.posts, cb)]
        }, (err, result) => {
            cb(err, result, {
                where,
                category: param.category,
                page
            });
        });
    },
    listByTag(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        let where = {
            postStatus: {
                [Op.eq]: 'publish'
            },
            postType: {
                [Op.eq]: 'post'
            }
        };
        let includeOpt = [{
            model: param.isAdmin ? TermTaxonomy : VTagVisibleTaxonomy,
            attributes: ['taxonomyId'],
            where: {
                taxonomy: {
                    [Op.eq]: 'tag'
                },
                slug: {
                    [Op.eq]: param.tag
                }
            }
        }];
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    page,
                    from: 'tag',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            postsCount: (cb) => {
                Post.count({
                    where,
                    include: includeOpt,
                    distinct: true
                }).then((count) => cb(null, count));
            },
            posts: ['postsCount', (result, cb) => {
                page = (page > result.postsCount / 10 ? Math.ceil(result.postsCount / 10) : page) || 1;
                this.queryPosts({
                    page,
                    where,
                    includeOpt,
                    filterCategory: !param.isAdmin,
                    from: 'tag'
                }, cb);
            }],
            comments: ['posts', (result, cb) => commonService.getCommentCountByPosts(result.posts, cb)]
        }, (err, result) => {
            cb(err, result, {
                where,
                tag: param.tag,
                page
            });
        });
    },
    listByDate(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        const where = {
            postStatus: {
                [Op.eq]: 'publish'
            },
            postType: {
                [Op.eq]: 'post'
            },
            [Op.and]: [
                models.sequelize.where(
                    models.sequelize.fn('date_format', models.sequelize.col('post_date'), param.month ? '%Y%m' : '%Y'),
                    param.month ? param.year + param.month : param.year
                )
            ]
        };
        let includeOpt = [{
            model: TermTaxonomy,
            attributes: ['taxonomyId', 'status'],
            where: {
                status: {
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
                    from: 'archive',
                    filterCategory: !param.isAdmin
                }, cb);
            },
            postsCount: (cb) => {
                Post.count({
                    where,
                    include: includeOpt,
                    distinct: true
                }).then((data) => cb(null, data));
            },
            posts: ['postsCount', (result, cb) => {
                page = (page > result.postsCount / 10 ? Math.ceil(result.postsCount / 10) : page) || 1;
                this.queryPosts({
                    page,
                    where,
                    includeOpt,
                    filterCategory: !param.isAdmin,
                    from: 'archive'
                }, cb);
            }],
            comments: ['posts', (result, cb) => commonService.getCommentCountByPosts(result.posts, cb)]
        }, (err, result) => {
            cb(err, result, {
                year: param.year,
                month: param.month,
                page
            });
        });
    },
    listArchiveDate(param, cb) {
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    from: 'archive',
                    filterCategory: !param.isAdmin
                }, cb);
            }
        }, cb);
    },
    listEdit(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        let where = {};
        let titleArr = [];
        let paramArr = [];
        let from = 'admin';

        if (param.query.status) {
            if (param.query.status === 'draft') {
                where.postStatus = {
                    [Op.in]: ['draft', 'auto-draft']
                };
            } else {
                where.postStatus = {
                    [Op.eq]: param.query.status
                };
            }
            paramArr.push(`status=${param.query.status}`);
            titleArr.push(formatter.postStatus(param.query.status) || param.query.status, '状态');
        } else {
            where.postStatus = {
                [Op.in]: ['publish', 'private', 'draft', 'auto-draft', 'trash']
            };
        }
        if (param.query.author) {
            where.postAuthor = {
                [Op.eq]: param.query.author
            };
            paramArr.push(`author=${param.query.author}`);
            titleArr.push('作者');
        }
        if (param.query.date) {
            where[Op.and] = [models.sequelize.where(models.sequelize.fn('date_format', models.sequelize.col('post_date'), '%Y/%m'), '=', param.query.date)];
            paramArr.push(`date=${param.query.date}`);
            titleArr.push(param.query.date, '日期');
        }
        if (param.query.keyword) {
            where[Op.or] = [{
                postTitle: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }, {
                postContent: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }, {
                postExcerpt: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }];
            paramArr.push(`keyword=${param.query.keyword}`);
            titleArr.push(param.query.keyword, '搜索');
        }
        let includeOpt = [];
        let tagWhere;
        if (param.query.tag) {
            from = 'tag';
            tagWhere = {
                taxonomy: {
                    [Op.eq]: 'tag'
                },
                slug: {
                    [Op.eq]: param.query.tag
                }
            };
            includeOpt.push({
                model: TermTaxonomy,
                attributes: ['taxonomyId'],
                where: tagWhere
            });
            paramArr.push(`tag=${param.query.tag}`);
            titleArr.push(param.query.tag, '标签');
        }
        where.postType = param.query.type === 'page' ? 'page' : 'post';
        paramArr.push(`type=${where.postType}`);

        async.auto({
            options: commonService.getInitOptions,
            archiveDates: (cb) => {
                commonService.archiveDates(cb, {
                    postType: where.postType
                });
            },
            categories: commonService.getCategoryTree.bind(commonService),
            subCategories: ['categories', (result, cb) => {
                if (param.query.category) {
                    from = 'category';
                    paramArr.push(`category=${param.query.category}`);

                    commonService.getSubCategoriesBySlug({
                        catData: result.categories.catData,
                        slug: param.query.category
                    }, (err, data) => {
                        if (err) {
                            return cb(util.catchError({
                                status: 404,
                                code: STATUS_CODES.CATEGORY_QUERY_ERROR,
                                message: err.message,
                                messageDetail: `[listEdit.getSubCategoriesBySlug]${err.message}`,
                                data: {
                                    catData: result.categories.catData,
                                    slug: param.query.category
                                }
                            }));
                        }
                        includeOpt.push({
                            model: models.TermRelationship,
                            attributes: ['objectId'],
                            where: {
                                termTaxonomyId: {
                                    [Op.in]: data.subCatIds
                                }
                            }
                        });
                        titleArr.push(data.catRoot.name, '分类');
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }],
            postsCount: ['subCategories', (result, cb) => {
                Post.count({
                    where,
                    include: includeOpt,
                    distinct: true
                }).then((data) => cb(null, data));
            }],
            posts: ['postsCount', (result, cb) => {
                page = (page > result.postsCount / 10 ? Math.ceil(result.postsCount / 10) : page) || 1;
                this.queryPosts({
                    page,
                    where,
                    from,
                    includeOpt
                }, cb);
            }],
            comments: ['posts', (result, cb) => commonService.getCommentCountByPosts(result.posts, cb)],
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
        }, (err, result) => {
            cb(err, result, {
                where,
                page,
                titleArr,
                paramArr
            });
        });
    },
    editPost(param, cb) {
        let tasks = {
            categories: commonService.getCategoryTree.bind(commonService),
            options: commonService.getInitOptions
        };
        if (param.postId) {
            let includeOpt = [{
                model: User,
                attributes: ['userDisplayName']
            }, {
                model: Postmeta,
                attributes: ['metaKey', 'metaValue']
            }];
            if (param.query.type !== 'page') {
                includeOpt.push({
                    model: TermTaxonomy,
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'status', 'count'],
                    where: {
                        [Op.or]: [{
                            taxonomy: {
                                [Op.eq]: 'post'
                            }
                        }, {
                            taxonomy: {
                                [Op.eq]: 'tag'
                            },
                            status: {
                                [Op.eq]: 1
                            }
                        }]
                    }
                });
            }
            tasks.post = (cb) => {
                Post.findByPk(param.postId, {
                    attributes: [
                        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus', 'postType', 'postPassword',
                        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
                    include: includeOpt
                }).then((post) => {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: STATUS_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.postId} Not Exist`
                        }));
                    }
                    cb(null, post);
                });
            };
        }
        async.parallel(tasks, cb);
    },
    savePost(param, successCb, errorCb) {
        models.sequelize.transaction((t) => {
            let tasks = {
                deleteCatRel: (cb) => {
                    if (param.type !== 'post' || !param.postId) {
                        return cb(null);
                    }
                    models.TermRelationship.destroy({
                        where: {
                            objectId: {
                                [Op.eq]: param.postId
                            }
                        },
                        transaction: t
                    }).then((data) => cb(null, data));
                },
                checkGuid: (cb) => {
                    let where = {
                        postGuid: {
                            [Op.eq]: param.data.postGuid
                        }
                    };
                    if (param.postId) {
                        where.postId = {
                            [Op.ne]: param.postId
                        };
                    }
                    Post.count({
                        where
                    }).then((count) => cb(null, count));
                },
                post: ['checkGuid', (result, cb) => {
                    if (result.checkGuid > 0) {
                        return cb('URL已存在');
                    }
                    param.data.postDateGmt = param.data.postDate;
                    if (!param.postId) {
                        param.data.postId = param.newPostId;
                        param.data.postModifiedGmt = param.nowTime;
                        Post.create(param.data, {
                            transaction: t
                        }).then((post) => cb(null, post));
                    } else {
                        Post.update(param.data, {
                            where: {
                                postId: {
                                    [Op.eq]: param.postId
                                }
                            },
                            transaction: t
                        }).then((post) => cb(null, post));
                    }
                }],
                removePostMeta: ['post', (result, cb) => {
                    Postmeta.destroy({
                        where: {
                            postId: {
                                [Op.eq]: param.newPostId
                            },
                            metaKey: {
                                [Op.eq]: 'show_wechat_card'
                            }
                        },
                        transaction: t
                    }).then((postMeta) => cb(null, postMeta));
                }],
                insertPostMeta: ['removePostMeta', (result, cb) => {
                    Postmeta.create({
                        metaId: util.getUuid(),
                        postId: param.newPostId,
                        metaKey: 'show_wechat_card',
                        metaValue: param.showWechatCard || '0'
                    }, {
                        transaction: t
                    }).then((postMeta) => cb(null, postMeta));
                }]
            };
            // 对于异步的循环，若中途其他操作出现报错，将触发rollback，但循环并未中断，从而导致事务执行报错，因此需要强制加入依赖关系，改为顺序执行
            if (param.type !== 'page' && param.type !== 'attachment') {
                tasks.category = ['deleteCatRel', 'post', (result, cb) => {
                    async.times(param.postCategory.length, (i, nextFn) => {
                        if (param.postCategory[i]) {
                            models.TermRelationship.create({
                                objectId: param.newPostId,
                                termTaxonomyId: param.postCategory[i]
                            }, {
                                transaction: t
                            }).then((rel) => nextFn(null, rel));
                        } else {
                            nextFn(null);
                        }
                    }, (err, categories) => {
                        cb(err, categories);
                    });
                }];
                tasks.tag = ['deleteCatRel', 'post', (result, cb) => {
                    async.times(param.postTag.length, (i, nextFn) => {
                        const tag = param.postTag[i].trim();
                        if (tag) {
                            async.auto({
                                taxonomy: (innerCb) => {
                                    TermTaxonomy.findAll({
                                        attributes: ['taxonomyId', 'taxonomy', 'status'],
                                        where: {
                                            slug: {
                                                [Op.eq]: tag
                                            }
                                        }
                                    }).then((tags) => {
                                        if (tags.length > 0) {// 已存在标签
                                            if (tags[0].status !== 1) {// 非正常显示标签
                                                return TermTaxonomy.update({
                                                    status: 1
                                                }, {
                                                    where: {
                                                        slug: {
                                                            [Op.eq]: tag
                                                        }
                                                    },
                                                    transaction: t
                                                }).then(() => innerCb(null, tags[0].taxonomyId));
                                            }
                                            if (tags[0].taxonomy !== 'tag') {
                                                return innerCb(`已存在同名的分类、标签：${tag}`, tags[0].taxonomyId);
                                            }
                                            return innerCb(null, tags[0].taxonomyId);
                                        }
                                        const taxonomyId = util.getUuid();
                                        // sequelize对事务中的created、modified处理有bug，会保存为invalid date，因此取消默认的行为，改为显式赋值
                                        TermTaxonomy.create({
                                            taxonomyId: taxonomyId,
                                            taxonomy: 'tag',
                                            name: tag,
                                            slug: tag,
                                            description: tag,
                                            count: 1,
                                            created: param.nowTime,
                                            modified: param.nowTime
                                        }, {
                                            transaction: t
                                        }).then(() => innerCb(null, taxonomyId)).catch(innerCb);
                                    });
                                },
                                relationship: ['taxonomy', (innerResult, innerCb) => {
                                    models.TermRelationship.create({
                                        objectId: param.newPostId,
                                        termTaxonomyId: innerResult.taxonomy
                                    }, {
                                        transaction: t
                                    }).then((rel) => innerCb(null, rel)).catch(innerCb);
                                }]
                            }, (err, tags) => {
                                if (err) {
                                    return nextFn(err);
                                }
                                nextFn(null, tags);
                            });
                        } else {
                            nextFn(null);
                        }
                    }, (err, tags) => {
                        cb(err, tags);
                    });
                }];
            }
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, (err, result) => {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: STATUS_CODES.POST_SAVE_ERROR,
                            message: typeof err === 'string' ? err : 'Post Save Error.',
                            messageDetail: `Post: ${param.newPostId}:${param.data.postTitle} save failed.`,
                            data: param.data
                        }));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(successCb).catch(errorCb);
    },
    listMedia(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        let where = {};
        let titleArr = [];
        let paramArr = [];
        let from = 'admin';

        if (param.query.status) {
            if (param.query.status === 'draft') {
                where.postStatus = {
                    [Op.in]: ['draft', 'auto-draft']
                };
            } else {
                where.postStatus = {
                    [Op.eq]: param.query.status
                };
            }
            paramArr.push(`status=${param.query.status}`);
            titleArr.push(formatter.postStatus(param.query.status) || param.query.status, '状态');
        } else {
            where.postStatus = {
                [Op.in]: ['publish', 'private', 'draft', 'auto-draft', 'trash']
            };
        }
        if (param.query.author) {
            where.postAuthor = {
                [Op.eq]: param.query.author
            };
            paramArr.push(`author=${param.query.author}`);
            titleArr.push('作者');
        }
        if (param.query.date) {
            where[Op.and] = [models.sequelize.where(models.sequelize.fn('date_format', models.sequelize.col('post_date'), '%Y/%m'), '=', param.query.date)];
            paramArr.push(`date=${param.query.date}`);
            titleArr.push(param.query.date, '日期');
        }
        if (param.query.keyword) {
            where[Op.or] = [{
                postTitle: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }, {
                postContent: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }, {
                postExcerpt: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }];
            paramArr.push(`keyword=${param.query.keyword}`);
            titleArr.push(param.query.keyword, '搜索');
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
                this.queryPosts({
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
        }, (err, result) => {
            cb(err, result, {
                where,
                page,
                titleArr,
                paramArr
            });
        });
    },
    uploadFile(param, successCb, errorCb) {
        models.sequelize.transaction((t) => {
            let tasks = {
                options: commonService.getInitOptions,
                checkGuid: (cb) => {
                    const where = {
                        postGuid: {
                            [Op.eq]: param.fileData.postGuid
                        }
                    };
                    Post.count({
                        where
                    }).then((count) => cb(null, count));
                },
                post: ['options', 'checkGuid', (result, cb) => {
                    if (result.checkGuid > 0) {
                        return cb('URL已存在');
                    }
                    param.fileData.postGuid = result.options.upload_path.optionValue + param.fileData.postGuid;
                    Post.create(param.fileData, {
                        transaction: t
                    }).then((post) => cb(null, post));
                }]
            };
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, (err, result) => {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: STATUS_CODES.UPLOAD_ERROR,
                            message: 'Upload Error.',
                            messageDetail: `File: ${param.fileData.postTitle} upload failed.`,
                            data: param.fileData
                        }));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(successCb, errorCb);
    },
    /**
     * post保存校验
     * @param {Object} data 数据
     * @param {String} type post类型
     * @param {Array} postCategory 分类数组
     * @param {Array} postTag 标签数组
     * @return {*} null
     */
    validatePostFields({data, type, postCategory, postTag}) {
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
                rule: postCategory.length > constants.POST_CATEGORY_LIMIT,
                message: `目录数应不大于${constants.POST_CATEGORY_LIMIT}个`
            }, {
                rule: postTag.length > constants.POST_TAG_LIMIT,
                message: `标签数应不大于${constants.POST_TAG_LIMIT}个`
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
};
