const async = require('async');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const formatter = require('../helper/formatter');
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
            post: function (cb) {
                Post.findOne({
                    attributes: [
                        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus',
                        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'
                    ],
                    include: [{
                        model: User,
                        attributes: ['userDisplayName']
                    }],
                    where: {
                        postGuid: {
                            [Op.eq]: decodeURIComponent(param.reqPath)
                        },
                        postType: {
                            [Op.in]: ['post', 'page']
                        }
                    }
                }).then(function (post) {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.POST_NOT_EXIST,
                            message: 'Page Not Found.',
                            messageDetail: `Post: ${param.reqPath} Not Exist.`
                        }));
                    }
                    // 无管理员权限不允许访问非公开文章(包括草稿)
                    if (!util.isAdminUser(param.user) && post.postStatus !== 'publish') {
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
            attributes: ['taxonomyId', 'visible'],
            where: {
                visible: {
                    [Op.eq]: 1
                }
            }
        }];
        async.auto({
            commonData: (cb) => {
                this.getCommonData({
                    page: page,
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
                    page: page,
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
                model: models.TermTaxonomy,
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
                                code: ERR_CODES.CATEGORY_QUERY_ERROR,
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
            }];
            if (param.query.type !== 'page') {
                includeOpt.push({
                    model: models.TermTaxonomy,
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'count'],
                    where: {
                        taxonomy: {
                            [Op.in]: ['post', 'tag']
                        }
                    }
                });
            }
            tasks.post = (cb) => {
                Post.findByPk(param.postId, {
                    attributes: [
                        'postId', 'postTitle', 'postDate', 'postContent', 'postExcerpt', 'postStatus', 'postType', 'postPassword',
                        'commentFlag', 'postOriginal', 'postName', 'postAuthor', 'postModified', 'postCreated', 'postGuid', 'commentCount', 'postViewCount'],
                    include: includeOpt
                }).then(function (post) {
                    if (!post || !post.postId) {
                        return cb(util.catchError({
                            status: 404,
                            code: ERR_CODES.POST_NOT_EXIST,
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
                deleteCatRel: function (cb) {
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
                checkGuid: function (cb) {
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
                post: ['checkGuid', function (result, cb) {
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
                                taxonomy: function (innerCb) {
                                    models.TermTaxonomy.findAll({
                                        attributes: ['taxonomyId'],
                                        where: {
                                            slug: {
                                                [Op.eq]: tag
                                            }
                                        }
                                    }).then((tags) => {
                                        if (tags.length > 0) {// 已存在标签
                                            return innerCb(null, tags[0].taxonomyId);
                                        }
                                        const taxonomyId = util.getUuid();
                                        // sequelize对事务中的created、modified处理有bug，会保存为invalid date，因此取消默认的行为，改为显式赋值
                                        models.TermTaxonomy.create({
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
                                        }).then((taxonomy) => innerCb(null, taxonomyId));
                                    });
                                },
                                relationship: ['taxonomy', function (innerResult, innerCb) {
                                    models.TermRelationship.create({
                                        objectId: param.newPostId,
                                        termTaxonomyId: innerResult.taxonomy
                                    }, {
                                        transaction: t
                                    }).then((rel) => innerCb(null, rel));
                                }]
                            }, function (err, tags) {
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
                async.auto(tasks, function (err, result) {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: ERR_CODES.POST_SAVE_ERROR,
                            message: 'Post Save Error.',
                            messageDetail: `Post: ${param.newPostId}:${param.data.postTitle} saved fail.`,
                            data: param.data
                        }));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(successCb, errorCb);
    }
};
