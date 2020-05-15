/**
 * common services
 * @author fuyun
 * @version 3.2.4
 * @since 1.0.0(2017/04/13)
 */
const path = require('path');
const gm = require('gm').subClass({imageMagick: true});
const appConfig = require('../config/core');
const util = require('../helper/util');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const models = require('../models');
const {Link, Post, TermTaxonomy, Comment, Option, VPostDateArchive, vPostViewsAverage} = models;
const Op = models.Sequelize.Op;

module.exports = {
    getInitOptions(cb) {
        Option.findAll({
            attributes: ['blogId', 'optionName', 'optionValue', 'autoload'],
            where: {
                autoload: {
                    [Op.eq]: 1
                }
            }
        }).then((data) => {
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
    archiveDates(cb, param) {
        // 模型定义之外（别名）的属性需要通过.get()方式访问
        // 查询count时根据link_date、visible分组，其他情况只查询唯一的link_date
        const postType = param.postType || 'post';
        let queryOpt = {
            attributes: ['postDate', 'linkDate', 'displayDate'],
            where: {
                postStatus: {
                    [Op.eq]: 'publish'
                },
                postType: {
                    [Op.eq]: postType
                }
            },
            group: ['linkDate'],
            order: [['linkDate', 'desc']]
        };
        if (typeof param.filterCategory === 'boolean') {
            queryOpt.attributes.push([models.sequelize.fn('count', 1), 'count']);
            queryOpt.group = ['linkDate', 'status'];
            if (param.filterCategory === true) {
                queryOpt.having = {
                    status: {
                        [Op.eq]: 1
                    }
                };
            }
        }
        VPostDateArchive.findAll(queryOpt).then((data) => {
            cb(null, data);
        });
    },
    recentPosts(cb) {
        Post.findAll({
            attributes: ['postId', 'postTitle', 'postGuid'],
            where: {
                postStatus: {
                    [Op.eq]: 'publish'
                },
                postType: {
                    [Op.eq]: 'post'
                }
            },
            order: [
                ['postModified', 'desc'],
                ['postDate', 'desc']
            ],
            limit: 10,
            offset: 0
        }).then((data) => {
            cb(null, data);
        });
    },
    randPosts(cb) {
        Post.findAll({
            attributes: ['postId', 'postTitle', 'postGuid'],
            where: {
                postStatus: {
                    [Op.eq]: 'publish'
                },
                postType: {
                    [Op.eq]: 'post'
                }
            },
            order: [
                [models.sequelize.fn('rand'), 'asc']
            ],
            limit: 10,
            offset: 0
        }).then((data) => {
            cb(null, data);
        });
    },
    hotPosts(cb) {
        vPostViewsAverage.findAll({
            attributes: ['postId', 'postTitle', 'postGuid'],
            where: {
                postStatus: {
                    [Op.eq]: 'publish'
                },
                postType: {
                    [Op.eq]: 'post'
                }
            },
            order: [
                ['viewsAverage', 'desc']
            ],
            limit: 10,
            offset: 0
        }).then((data) => {
            cb(null, data);
        });
    },
    getLinks(slug, visible, cb) {
        Link.findAll({
            attributes: ['linkDescription', 'linkUrl', 'linkTarget', 'linkName'],
            include: [{
                model: TermTaxonomy,
                attributes: ['created', 'modified'],
                where: {
                    slug: {
                        [Op.eq]: slug
                    },
                    taxonomy: {
                        [Op.eq]: 'link'
                    }
                }
            }],
            where: {
                linkVisible: {
                    [Op.in]: visible
                }
            },
            order: [
                ['linkRating', 'desc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getUserById(userId, cb) {
        models.User.findByPk(userId, {
            attributes: ['userId', 'userLogin', 'userNicename', 'userEmail', 'userUrl', 'userDisplayName']
        }).then((result) => {
            cb(null, result);
        });
    },
    createCategoryTree(categoryData) {
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
                            status: curNode.status,
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
    getCategoryArray(catTree, outArr) {
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
    getCategoryTree(cb, param = {}) {
        let where = {
            taxonomy: {
                [Op.eq]: param.type || 'post'
            }
        };
        if (param.status !== undefined) {
            where.status = {
                [Op.in]: param.status
            };
        }
        TermTaxonomy.findAll({
            attributes: ['name', 'description', 'slug', 'count', 'taxonomyId', 'parent', 'status'],
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
    getCategoryPath({catData, slug, taxonomyId}) {
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
    getSubCategoriesBySlug({catData, slug, filterCategory}, cb) {
        const catTree = this.createCategoryTree(catData);
        let subCatIds = [];
        // 循环获取子分类ID：父->子
        const iterateCatTree = (curNode) => {
            subCatIds.push(curNode.taxonomyId);
            Object.keys(curNode.children).forEach((v) => {
                iterateCatTree(curNode.children[v]);
            });
        };
        // 获取匹配slug的根分类
        const getRootCatNodeBySlug = (slug, curNode) => {
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
        if ((!filterCategory || rootNode && rootNode.status === 1) && subCatIds.length > 0) {// 分类可见，并且子分类（含）存在
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
                    visible: rootNode && rootNode.status === 1
                }
            }));
            cb('分类不存在');
        }
    },
    mainNavs(cb) {
        TermTaxonomy.findAll({
            attributes: ['name', 'description', 'slug', 'count', 'taxonomyId'],
            where: {
                taxonomy: {
                    [Op.eq]: 'post'
                },
                parent: {
                    [Op.eq]: ''
                }
            },
            order: [
                ['termOrder', 'asc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getCommentCountByPosts(posts, cb) {
        let postIds = [];
        posts.forEach((v) => {
            postIds.push(v.post.postId);
        });
        Comment.findAll({
            attributes: ['postId', [models.sequelize.fn('count', 1), 'count']],
            where: {
                postId: {
                    [Op.in]: postIds
                },
                commentStatus: {
                    [Op.eq]: 'normal'
                }
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
    getCommentsByPostId(postId, cb) {
        Comment.findAll({
            attributes: ['commentId', 'commentContent', 'commentAuthor', 'commentVote', 'commentCreated'],
            where: {
                postId: {
                    [Op.eq]: postId
                },
                commentStatus: {
                    [Op.eq]: 'normal'
                }
            },
            order: [
                ['commentCreated', 'desc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getPrevPost(postId, cb) {
        Post.findOne({
            attributes: ['postId', 'postGuid', 'postTitle'],
            where: {
                postStatus: {
                    [Op.eq]: 'publish'
                },
                postType: {
                    [Op.eq]: 'post'
                },
                postCreated: {
                    [Op.gt]: models.sequelize.literal(`(select post_created from posts where post_id = '${postId}')`)
                }
            },
            order: [
                ['postCreated', 'asc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    getNextPost(postId, cb) {
        Post.findOne({
            attributes: ['postId', 'postGuid', 'postTitle'],
            where: {
                postStatus: {
                    [Op.eq]: 'publish'
                },
                postType: {
                    [Op.eq]: 'post'
                },
                postCreated: {
                    [Op.lt]: models.sequelize.literal(`(select post_created from posts where post_id = '${postId}')`)
                }
            },
            order: [
                ['postCreated', 'desc']
            ]
        }).then((data) => {
            cb(null, data);
        });
    },
    /**
     * 水印处理
     * @param {String} imgPath 图片路径
     * @param {Function} cb 回调函数
     * @return {*} null
     */
    watermark(imgPath, cb) {
        const fontSize = 18;
        const lineMargin = 2;
        const markWidth = 138;
        const markHeight = fontSize * 2 + lineMargin;
        // 字体实际高度比字体大小略小≈17
        const markMarginX = 10;
        const markMarginY = 6;
        const copy = `@${appConfig.siteName}`;
        const site = appConfig.domain;
        const fontPath = path.join(__dirname, '..', 'config', 'PingFang.ttc');
        let imgWidth;
        let imgHeight;
        let markedWidth;
        let markedHeight;
        let ratio = 1;
        let gmImg = gm(imgPath);
        gmImg
            .size((err, data) => {
                if (err) {
                    return cb(err);
                }
                imgWidth = markedWidth = data.width;
                imgHeight = markedHeight = data.height;
                ratio = Math.max(markWidth / imgWidth, markHeight / imgHeight);

                if (ratio > 1) {
                    markedWidth = imgWidth * ratio;
                    markedHeight = imgHeight * ratio;
                    gmImg = gmImg.resize(markedWidth, markedHeight, '!');
                }
                gmImg.font(fontPath, fontSize)
                    .fill('#222222')
                    .drawText(markMarginX, markMarginY + fontSize + lineMargin, copy, 'SouthEast')
                    .drawText(markMarginX, markMarginY, site, 'SouthEast')
                    .fill('#ffffff')
                    .drawText(markMarginX + 1, markMarginY + fontSize + lineMargin + 1, copy, 'SouthEast')
                    .drawText(markMarginX + 1, markMarginY + 1, site, 'SouthEast');
                if (ratio > 1) {
                    gmImg = gmImg.resize(markedWidth / ratio, markedHeight / ratio, '!');
                }
                gmImg
                    .write(imgPath, (err) => {
                        if (err) {
                            return cb(err);
                        }
                        logger.info(formatOpLog({
                            fn: 'watermark',
                            msg: 'Watermark added',
                            data: {
                                imgPath
                            }
                        }));
                        cb();
                    });
            });
    }
};
