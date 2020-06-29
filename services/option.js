/**
 * option services
 * @author fuyun
 * @version 3.3.5
 * @since 3.3.5
 */
const {sysLog: logger, formatOpLog} = require('../helper/logger');
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
    async saveOptions(param) {
        const {settings} = param;
        let transaction;

        try {
            transaction = await models.sequelize.transaction();
            for (let setting of settings) {
                await Option.update({
                    optionValue: setting.value
                }, {
                    where: {
                        optionName: {
                            [Op.eq]: setting.name
                        }
                    },
                    transaction
                });
            }
            await transaction.commit();
        } catch (err) {
            logger.error(formatOpLog({
                fn: 'saveOptions',
                msg: err.message,
                data: {
                    options: settings
                }
            }));
            if (transaction) {
                await transaction.rollback();
            }
            throw err;
        }
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
