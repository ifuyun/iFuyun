/* jshint indent: 4 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('votes', {
        voteId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'vote_id'
        },
        objectId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            field: 'object_id'
        },
        voteCount: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: '0',
            field: 'vote_count'
        },
        voteCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'vote_created'
        },
        userId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            field: 'user_id'
        },
        userIp: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'user_ip'
        },
        userAgent: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'user_agent'
        }
    }, {
        tableName: 'votes',
        createdAt: 'vote_created'
    });
};
