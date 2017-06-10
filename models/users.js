module.exports = function (sequelize, DataTypes) {
    const User = sequelize.define('User', {
        userId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'user_id'
        },
        userLogin: {
            type: DataTypes.STRING(60),
            allowNull: false,
            defaultValue: '',
            field: 'user_login'
        },
        userPass: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: '',
            field: 'user_pass'
        },
        userPassSalt: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: '',
            field: 'user_pass_salt'
        },
        userNicename: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: '',
            field: 'user_nicename'
        },
        userEmail: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: '',
            field: 'user_email'
        },
        userLink: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: '',
            field: 'user_link'
        },
        userRegistered: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'user_registered'
        },
        userActivationKey: {
            type: DataTypes.STRING(60),
            allowNull: false,
            defaultValue: '',
            field: 'user_activation_key'
        },
        userStatus: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: '0',
            field: 'user_status'
        },
        userDisplayName: {
            type: DataTypes.STRING(250),
            allowNull: false,
            defaultValue: '',
            field: 'user_display_name'
        }
    }, {
        tableName: 'users',
        createdAt: 'user_registered',
        updatedAt: false,
        deletedAt: false,
        classMethods: {
        }
    });
    User.associate = function (models) {
        User.hasMany(models.Post, {
            foreignKey: 'postAuthor',
            sourceKey: 'userId'
        });
        User.hasMany(models.Usermeta, {
            foreignKey: 'userId',
            sourceKey: 'userId'
        });
    };

    return User;
};
