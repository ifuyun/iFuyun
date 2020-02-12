/**
 * 链接相关service
 * @author fuyun
 * @since 3.0.0
 */
const async = require('async');
const xss = require('sanitizer');
const moment = require('moment');
const models = require('../models/index');
const commonService = require('../services/common');
const appConfig = require('../config/core');
const util = require('../helper/util');
const formatter = require('../helper/formatter');
const {sysLog: logger, formatOpLog} = require('../helper/logger');
const idReg = /^[0-9a-fA-F]{16}$/i;
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
            links: ['count', function (result, cb) {
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
    }
};
