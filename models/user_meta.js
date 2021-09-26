module.exports = function (sequelize, DataTypes) {
    const UserMeta = sequelize.define('UserMeta', {
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
        tableName: 'user_meta',
        timestamps: false,
        classMethods: {
        }
    });
    UserMeta.associate = function (models) {
        UserMeta.belongsTo(models.User, {
            foreignKey: 'userId',
            targetKey: 'userId'
        });
    };

    return UserMeta;
};
