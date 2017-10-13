/**
 * 通用方法
 * @author fuyun
 * @since 2017/04/13.
 */
const models = require('../models/index');
const util = require('../helper/util');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const {Link, Post, TermTaxonomy, Comment, Option, VPostDateArchive} = models;

module.exports = {
    getInitOptions: function (cb) {
        Option.findAll({
            attributes: ['blogId', 'optionName', 'optionValue', 'autoload'],
            where: {
                autoload: 1
            }
        }).then(function (data) {
            let tmpObj = {};
            data.forEach((item) => {
                tmpObj[item.optionName] = {
                    blogId: item.blogId,
                    optionValue: item.optionValue
                };
            });
            cb(null, tmpObj);
        });
    },
    archiveDates: function (cb, param) {
        // 模型定义之外（别名）的属性需要通过.get()方式访问
        // 查询count时根据link_date、visible分组，其他情况只查询唯一的link_date
        // let queryOpt = {
        //     attributes: [
        //         'postDate',
        //         [models.sequelize.fn('date_format', models.sequelize.col('post_date'), '%Y/%m'), 'linkDate'],
        //         [models.sequelize.fn('date_format', models.sequelize.col('post_date'), '%Y年%m月'), 'displayDate'],
        //         [models.sequelize.fn('count', 'linkDate'), 'count']
        //     ],
        //     where: {
        //         postStatus: 'publish',
        //         postType: param.postType || 'post'
        //     },
        //     group: [models.sequelize.fn('date_format', models.sequelize.col('postDate'), '%Y-%m')],
        //     order: [[models.sequelize.col('linkDate'), 'desc']]
        // };
        // if (typeof param.filterCategory === 'boolean') {
        //     queryOpt.include = [{
        //         model: TermTaxonomy,
        //         attributes: ['taxonomyId', 'visible'],
        //         where: {
        //             visible: param.filterCategory + 0
        //         }
        //     }];
        // }
        let queryOpt = {
            attributes: ['postDate', 'linkDate', 'displayDate'],
            where: {
                postStatus: 'publish',
                postType: param.postType || 'post'
            },
            group: ['linkDate'],
            order: [['linkDate', 'desc']]
        };
        if (typeof param.filterCategory === 'boolean') {
            queryOpt.attributes.push([models.sequelize.fn('count', 1), 'count']);
            queryOpt.group = ['linkDate', 'visible'];
            queryOpt.having = {
                visible: param.filterCategory + 0
            };
        }
        VPostDateArchive.findAll(queryOpt).then(function (data) {
            cb(null, data);
        });
    },
    recentPosts: function (cb) {
        Post.findAll({
            attributes: ['postId', 'postTitle', 'postGuid'],
            where: {
                postStatus: 'publish',
                postType: 'post'
            },
            order: [
                ['postModified', 'desc'],
                ['postDate', 'desc']
            ],
            limit: 10,
            offset: 0
        }).then(function (data) {
            cb(null, data);
        });
    },
    randPosts: function (cb) {
        Post.findAll({
            attributes: ['postId', 'postTitle', 'postGuid'],
            where: {
                postStatus: 'publish',
                postType: 'post'
            },
            order: [
                [models.sequelize.fn('rand'), 'asc']
            ],
            limit: 10,
            offset: 0
        }).then(function (data) {
            cb(null, data);
        });
    },
    hotPosts: function (cb) {
        Post.findAll({
            attributes: ['postId', 'postTitle', 'postGuid'],
            where: {
                postStatus: 'publish',
                postType: 'post'
            },
            order: [
                ['postViewCount', 'desc']
            ],
            limit: 10,
            offset: 0
        }).then(function (data) {
            cb(null, data);
        });
    },
    getLinks: function (slug, visible, cb) {
        Link.findAll({
            attributes: ['linkDescription', 'linkUrl', 'linkTarget', 'linkName'],
            include: [{
                model: TermTaxonomy,
                attributes: ['created', 'modified'],
                where: {
                    slug: slug,
                    taxonomy: 'link'
                }
            }],
            where: {
                linkVisible: visible
            },
            order: [
                ['linkRating', 'desc']
            ]
        }).then(function (data) {
            cb(null, data);
        });
    },
    getUserById: function (userId, cb) {
        models.User.findById(userId, {
            attributes: ['userId', 'userLogin', 'userNicename', 'userEmail', 'userUrl', 'userDisplayName']
        }).then((result) => {
            cb(null, result);
        });
    },
    createCategoryTree: function (categoryData) {
        let catTree = {};
        let treeNodes = [];

        /**
         * 递归生成树节点
         * @param {Object} treeData 源数据
         * @param {String} parentId 父节点ID
         * @param {Object} parentNode 父节点
         * @param {Number} level 当前层级
         * @return {Undefined} null
         */
        function iterateCategory(treeData, parentId, parentNode, level) {
            for (let arrIdx = 0; arrIdx < treeData.length; arrIdx += 1) {
                let curNode = treeData[arrIdx];
                if (!treeNodes.includes(curNode.taxonomyId)) {
                    if (curNode.parent === parentId) {
                        parentNode[curNode.taxonomyId] = {
                            name: curNode.name,
                            description: curNode.description,
                            slug: curNode.slug,
                            count: curNode.count,
                            taxonomyId: curNode.taxonomyId,
                            parentId: curNode.parent,
                            visible: curNode.visible,
                            level,
                            children: {}
                        };
                        treeNodes.push(curNode.taxonomyId);
                        iterateCategory(treeData, curNode.taxonomyId, parentNode[curNode.taxonomyId].children, level + 1);
                    }
                }
            }
        }

        iterateCategory(categoryData, '', catTree, 1);
        return catTree;
    },
    getCategoryArray: function (catTree, outArr) {
        Object.keys(catTree).forEach((key) => {
            const curNode = catTree[key];
            outArr.push({
                level: curNode.level,
                name: curNode.name,
                slug: curNode.slug,
                taxonomyId: curNode.taxonomyId
            });
            if (!util.isEmptyObject(curNode.children)) {
                this.getCategoryArray(curNode.children, outArr);
            }
        });
        return outArr;
    },
    getCategoryTree: function (cb, param = {}) {
        let where = {
            taxonomy: param.type || 'post'
        };
        if (param.visible !== undefined) {
            where.visible = param.visible;
        }
        TermTaxonomy.findAll({
            attributes: ['name', 'description', 'slug', 'count', 'taxonomyId', 'parent', 'visible'],
            where,
            order: [
                ['termOrder', 'asc']
            ]
        }).then((data) => {
            if (data.length > 0) {
                const catTree = this.createCategoryTree(data);
                cb(null, {
                    catData: data,
                    catTree,
                    catArray: this.getCategoryArray(catTree, [])
                });
            } else {
                logger.error(formatOpLog({
                    fn: 'getCategoryTree',
                    msg: '分类不存在',
                    data: param
                }));
                cb('分类不存在');
            }
        });
    },
    getCategoryPath: function ({catData, slug, taxonomyId}) {
        let catPath = [];
        if (slug) {
            // 根据slug获取ID
            for (let i = 0; i < catData.length; i += 1) {
                if (catData[i].slug === slug) {
                    taxonomyId = catData[i].taxonomyId;
                    break;
                }
            }
        }
        // 循环获取父分类
        while (taxonomyId) {
            for (let i = 0; i < catData.length; i += 1) {
                const curCat = catData[i];
                if (curCat.taxonomyId === taxonomyId) {
                    taxonomyId = curCat.parent;
                    catPath.unshift({
                        'title': curCat.name,
                        'tooltip': curCat.description,
                        'slug': curCat.slug,
                        'url': '/category/' + curCat.slug,
                        'headerFlag': false
                    });
                    break;
                }
            }
        }
        if (catPath.length > 0) {
            catPath[catPath.length - 1].headerFlag = true;
        }
        return catPath;
    },
    getSubCategoriesBySlug: function ({catData, slug, filterCategory}, cb) {
        const catTree = this.createCategoryTree(catData);
        let subCatIds = [];
        // 循环获取子分类ID：父->子
        const iterateCatTree = function (curNode) {
            subCatIds.push(curNode.taxonomyId);
            Object.keys(curNode.children).forEach((v) => {
                iterateCatTree(curNode.children[v]);
            });
        };
        // 获取匹配slug的根分类
        const getRootCatNodeBySlug = function (slug, curNode) {
            let rootNode;
            const nodeKeys = Object.keys(curNode.children);
            for (let i = 0; i < nodeKeys.length; i += 1) {
                const v = nodeKeys[i];
                if (curNode.children[v].slug === slug) {
                    rootNode = curNode.children[v];
                    break;
                }
                if (Object.keys(curNode.children[v].children.length > 0)) {
                    getRootCatNodeBySlug(slug, curNode.children[v]);
                }
            }
            return rootNode;
        };
        const nodeKeys = Object.keys(catTree);
        let rootNode;
        for (let i = 0; i < nodeKeys.length; i += 1) {
            const v = nodeKeys[i];
            if (catTree[v].slug === slug) {
                rootNode = catTree[v];
            } else {
                if (Object.keys(catTree[v].children).length > 0) {
                    rootNode = getRootCatNodeBySlug(slug, catTree[v]);
                }
            }
            if (rootNode) {
                iterateCatTree(rootNode);
                break;
            }
        }
        if ((!filterCategory || rootNode && rootNode.visible) && subCatIds.length > 0) {// 分类可见，并且子分类（含）存在
            cb(null, {
                subCatIds,
                catPath: this.getCategoryPath({
                    catData,
                    slug
                }),
                catRoot: rootNode || {}
            });
        } else {
            logger.error(formatOpLog({
                fn: 'getSubCategoriesBySlug',
                msg: '分类不存在',
                data: {
                    catData,
                    slug,
                    visible: rootNode && rootNode.visible
                }
            }));
            cb('分类不存在');
        }
    },
    mainNavs: function (cb) {
        TermTaxonomy.findAll({
            attributes: ['name', 'description', 'slug', 'count', 'taxonomyId'],
            where: {
                taxonomy: 'post',
                parent: ''
            },
            order: [
                ['termOrder', 'asc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getCommentCountByPosts: function (posts, cb) {
        let postIds = [];
        posts.forEach((v) => {
            postIds.push(v.post.postId);
        });
        Comment.findAll({
            attributes: ['postId', [models.sequelize.fn('count', 1), 'count']],
            where: {
                postId: postIds,
                commentStatus: 'normal'
            },
            group: ['postId']
        }).then((data) => {
            let result = {};
            data.forEach((v) => {
                result[v.postId] = v.dataValues.count;
            });
            cb(null, result);
        });
    },
    getCommentsByPostId: function (postId, cb) {
        Comment.findAll({
            attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'commentCreated'],
            where: {
                postId,
                commentStatus: 'normal'
            },
            order: [
                ['commentCreated', 'desc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getPrevPost: function (postId, cb) {
        Post.findOne({
            attributes: ['postId', 'postGuid', 'postTitle'],
            where: {
                postStatus: 'publish',
                postType: 'post',
                postCreated: {
                    $gt: models.sequelize.literal(`(select post_created from posts where post_id = '${postId}')`)
                }
            },
            order: [
                ['postCreated', 'asc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getNextPost: function (postId, cb) {
        Post.findOne({
            attributes: ['postId', 'postGuid', 'postTitle'],
            where: {
                postStatus: 'publish',
                postType: 'post',
                postCreated: {
                    $lt: models.sequelize.literal(`(select post_created from posts where post_id = '${postId}')`)
                }
            },
            order: [
                ['postCreated', 'desc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    }
};
