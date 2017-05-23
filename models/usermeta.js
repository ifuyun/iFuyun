/* jshint indent: 4 */

module.exports = function (sequelize, DataTypes) {
    const Usermeta = sequelize.define('Usermeta', {
        metaId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'meta_id'
        },
        userId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'user_id'
        },
        metaKey: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'meta_key'
        },
        metaValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'meta_value'
        }
    }, {
        tableName: 'usermeta',
        timestamps: false,
        classMethods: {
            associate: function (models) {
                Usermeta.belongsTo(models.User, {
                    foreignKey: 'userId',
                    targetKey: 'userId'
                });
            }
        }
    });

    return Usermeta;
};
