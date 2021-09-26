/**
 * user services
 * @author fuyun
 * @version 3.0.0
 * @since 3.0.0
 */
const models = require('../models/index');
const {User, UserMeta} = models;
const Op = models.Sequelize.Op;

module.exports = {
    login(param, cb) {
        User.findOne({
            attributes: ['userId', 'userLogin', 'userNicename', 'userEmail', 'userLink', 'userRegistered', 'userStatus', 'userDisplayName'],
            include: [{
                model: UserMeta,
                attributes: ['metaId', 'userId', 'metaKey', 'metaValue']
            }],
            where: {
                userLogin: {
                    [Op.eq]: param.username
                },
                userPass: {
                    [Op.eq]: models.sequelize.fn(
                        'md5',
                        models.sequelize.fn('concat', models.sequelize.col('user_pass_salt'), param.password)
                    )
                }
            }
        }).then(cb);
    }
};
