/**
 * option services
 * @author fuyun
 * @version 3.3.5
 * @since 3.3.5
 */
const async = require('async');
const models = require('../models/index');
const {Option} = models;
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
    saveOptions(param, successCb, errorCb) {
        const {settings} = param;
        models.sequelize.transaction((t) =>
            // 需要返回promise实例
            new Promise((resolve, reject) => {
                async.times(settings.length, (i, nextFn) => {
                    Option.update({
                        optionValue: settings[i].value
                    }, {
                        where: {
                            optionName: {
                                [Op.eq]: settings[i].name
                            }
                        },
                        transaction: t
                    }).then((option) => nextFn(null, option));
                }, (err, result) => {
                    if (err) {
                        reject(new Error(err));
                    } else {
                        resolve(result);
                    }
                });
            })
        ).then(successCb).catch(errorCb);
    },
    async getOptionsByKeys(param) {
        let data = await Option.findAll({
            attributes: ['optionId', 'optionName', 'optionValue', 'autoload'],
            where: {
                optionName: {
                    [Op.in]: param.optionKeys
                }
            }
        });
        let tmpObj = {};
        data.forEach((item) => {
            tmpObj[item.optionName] = {
                blogId: item.blogId,
                optionValue: item.optionValue
            };
        });
        return tmpObj;
    }
};
