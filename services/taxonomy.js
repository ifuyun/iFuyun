/**
 * taxonomy services
 * @author fuyun
 * @version 3.0.0
 * @since 3.0.0
 */
const async = require('async');
const STATUS_CODES = require('./status-codes');
const util = require('../helper/util');
const models = require('../models/index');
const commonService = require('../services/common');
const constants = require('../services/constants');
const {TermTaxonomy, TermRelationship} = models;
const Op = models.Sequelize.Op;

module.exports = {
    listTaxonomies(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        let titleArr = [];
        let paramArr = [`type=${param.type}`];
        let where = {
            taxonomy: {
                [Op.eq]: param.type
            }
        };
        if (param.query.keyword) {
            where[Op.or] = [{
                name: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }, {
                slug: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }, {
                description: {
                    [Op.like]: `%${param.query.keyword}%`
                }
            }];
            paramArr.push(`keyword=${param.query.keyword}`);
            titleArr.push(param.query.keyword, '搜索');
        }
        async.auto({
            options: commonService.getInitOptions,
            count: (cb) => {
                TermTaxonomy.count({
                    where
                }).then((data) => cb(null, data));
            },
            categories: ['count', (result, cb) => {
                page = (page > result.count / 10 ? Math.ceil(result.count / 10) : page) || 1;
                TermTaxonomy.findAll({
                    where,
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'termOrder', 'count', 'created', 'modified'],
                    order: [['termOrder', 'asc'], ['created', 'desc']],
                    limit: 10,
                    offset: 10 * (page - 1)
                }).then((categories) => cb(null, categories));
            }]
        }, (err, result) => {
            cb(err, result, {
                titleArr,
                paramArr,
                page,
                where
            });
        });
    },
    editTaxonomy(param, cb) {
        let tasks = {
            options: commonService.getInitOptions
        };
        if (param.action === 'edit') {
            tasks.taxonomy = (cb) => {
                TermTaxonomy.findByPk(param.taxonomyId, {
                    attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'status', 'created']
                }).then((taxonomy) => cb(null, taxonomy));
            };
        }
        if (param.type !== 'tag') {
            tasks.categories = (cb) => {
                commonService.getCategoryTree(cb, {type: param.type});
            };
        }
        async.auto(tasks, cb);
    },
    saveTaxonomy(param, cb) {
        async.auto({
            checkSlug: (cb) => {
                let where = {
                    slug: {
                        [Op.eq]: param.data.slug
                    }
                };
                if (param.taxonomyId) {
                    where.taxonomyId = {
                        [Op.ne]: param.taxonomyId
                    };
                }
                TermTaxonomy.count({
                    where
                }).then((count) => cb(null, count));
            },
            taxonomy: ['checkSlug', (result, cb) => {
                if (result.checkSlug > 0) {
                    return cb(util.catchError({
                        status: 200,
                        code: STATUS_CODES.TAXONOMY_SLUG_DUPLICATE,
                        message: 'slug已存在',
                        messageDetail: `Taxonomy slug: ${param.data.slug} is already exist.`
                    }));
                }
                const nowTime = new Date();
                if (param.taxonomyId) {
                    param.data.modified = nowTime;
                    TermTaxonomy.update(param.data, {
                        where: {
                            taxonomyId: {
                                [Op.eq]: param.taxonomyId
                            }
                        }
                    }).then((taxonomy) => cb(null, taxonomy));
                } else {
                    param.data.taxonomyId = util.getUuid();
                    param.data.created = nowTime;
                    param.data.modified = nowTime;
                    TermTaxonomy.create(param.data).then((taxonomy) => cb(null, taxonomy));
                }
            }]
        }, cb);
    },
    removeTaxonomies(param, successCb, errorCb) {
        models.sequelize.transaction((t) => {
            let tasks = {
                taxonomy: (cb) => {
                    TermTaxonomy.destroy({
                        where: {
                            taxonomyId: {
                                [Op.in]: param.taxonomyIds
                            }
                        },
                        transaction: t
                    }).then((taxonomy) => cb(null, taxonomy));
                },
                posts: (cb) => {
                    if (param.type === 'tag') {
                        TermRelationship.destroy({
                            where: {
                                termTaxonomyId: {
                                    [Op.in]: param.taxonomyIds
                                }
                            },
                            transaction: t
                        }).then((termRel) => cb(null, termRel));
                    } else {
                        TermRelationship.update({
                            termTaxonomyId: param.type === 'post' ? constants.DEFAULT_POST_TAXONOMY_ID : constants.DEFAULT_LINK_TAXONOMY_ID
                        }, {
                            where: {
                                termTaxonomyId: {
                                    [Op.in]: param.taxonomyIds
                                }
                            },
                            transaction: t
                        }).then((termRel) => cb(null, termRel)).catch((e) => cb(e));
                    }
                }
            };
            if (param.type !== 'tag') {// 标签没有父子关系
                tasks.children = (cb) => {
                    TermTaxonomy.update({
                        parent: param.type === 'post' ? constants.DEFAULT_POST_TAXONOMY_ID : constants.DEFAULT_LINK_TAXONOMY_ID
                    }, {
                        where: {
                            parent: {
                                [Op.in]: param.taxonomyIds
                            }
                        },
                        transaction: t
                    }).then((taxonomy) => cb(null, taxonomy));
                };
            }
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, (err, result) => {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: STATUS_CODES.TAXONOMY_REMOVE_ERROR,
                            message: 'Taxonomies Remove Error.',
                            messageDetail: `Taxonomies: ${param.taxonomyIds} remove failed.`,
                            data: param.taxonomyIds
                        }));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(successCb, errorCb);
    }
};
