/**
 * 链接相关service
 * @author fuyun
 * @since 3.0.0
 */
const async = require('async');
const ERR_CODES = require('./error-codes');
const util = require('../helper/util');
const models = require('../models/index');
const commonService = require('../services/common');
const {Link, TermTaxonomy, TermRelationship} = models;
const Op = models.Sequelize.Op;

module.exports = {
    listLinks(param, cb) {
        let page = parseInt(param.page, 10) || 1;
        async.auto({
            options: commonService.getInitOptions,
            count: (cb) => {
                Link.count().then((data) => cb(null, data));
            },
            links: ['count', (result, cb) => {
                page = (page > result.count / 10 ? Math.ceil(result.count / 10) : page) || 1;
                Link.findAll({
                    attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkRating', 'linkRss', 'linkCreated'],
                    order: [['linkRating', 'desc']],
                    limit: 10,
                    offset: 10 * (page - 1)
                }).then((links) => cb(null, links));
            }]
        }, (err, result) => {
            cb(err, result, {
                page
            });
        });
    },
    editLink(param, cb) {
        let tasks = {
            options: commonService.getInitOptions,
            categories: (cb) => {
                commonService.getCategoryTree(cb, {
                    type: 'link'
                });
            }
        };
        if (param.action === 'edit') {
            tasks.link = (cb) => {
                Link.findByPk(param.linkId, {
                    attributes: ['linkId', 'linkUrl', 'linkName', 'linkTarget', 'linkDescription', 'linkVisible', 'linkRating'],
                    include: [{
                        model: TermTaxonomy,
                        attributes: ['taxonomyId', 'taxonomy', 'name', 'slug', 'description', 'parent', 'termOrder', 'count'],
                        where: {
                            taxonomy: {
                                [Op.eq]: 'link'
                            }
                        }
                    }]
                }).then((link) => cb(null, link));
            };
        }
        async.auto(tasks, cb);
    },
    saveLink(param, successCb, errorCb) {
        models.sequelize.transaction((t) => {
            let tasks = {
                link: (cb) => {
                    if (!param.linkId) {
                        param.data.linkId = param.newLinkId;
                        Link.create(param.data, {
                            transaction: t
                        }).then((link) => {
                            cb(null, link);
                        });
                    } else {
                        Link.update(param.data, {
                            where: {
                                linkId: {
                                    [Op.eq]: param.linkId
                                }
                            },
                            transaction: t
                        }).then((link) => {
                            cb(null, link);
                        });
                    }
                },
                taxonomy: (cb) => {
                    if (!param.linkId) {
                        TermRelationship.create({
                            objectId: param.newLinkId,
                            termTaxonomyId: param.taxonomyId
                        }, {
                            transaction: t
                        }).then((termRel) => cb(null, termRel));
                    } else {
                        TermRelationship.update({
                            termTaxonomyId: param.taxonomyId
                        }, {
                            where: {
                                objectId: {
                                    [Op.eq]: param.linkId
                                }
                            },
                            transaction: t
                        }).then((termRel) => cb(null, termRel));
                    }
                }
            };
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, (err, result) => {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: ERR_CODES.LINK_SAVE_ERROR,
                            message: 'Link Save Error.',
                            messageDetail: `Link: ${param.newLinkId}:${param.data.linkName} save failed.`,
                            data: param.data
                        }));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(successCb, errorCb);
    },
    removeLinks(param, successCb, errorCb) {
        models.sequelize.transaction((t) => {
            let tasks = {
                links: (cb) => {
                    Link.destroy({
                        where: {
                            linkId: {
                                [Op.in]: param.linkIds
                            }
                        },
                        transaction: t
                    }).then((link) => cb(null, link));
                },
                termRels: (cb) => {
                    TermRelationship.destroy({
                        where: {
                            objectId: {
                                [Op.in]: param.linkIds
                            }
                        },
                        transaction: t
                    }).then((termRel) => cb(null, termRel));
                }
            };
            // 需要返回promise实例
            return new Promise((resolve, reject) => {
                async.auto(tasks, (err, result) => {
                    if (err) {
                        reject(util.catchError({
                            status: 500,
                            code: ERR_CODES.LINK_REMOVE_ERROR,
                            message: 'Link(s) Remove Error.',
                            messageDetail: `Link(s): ${param.linkIds} remove failed.`,
                            data: param.linkIds
                        }));
                    } else {
                        resolve(result);
                    }
                });
            });
        }).then(successCb, errorCb);
    }
};
