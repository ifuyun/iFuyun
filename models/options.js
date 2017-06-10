module.exports = function (sequelize, DataTypes) {
    const Option = sequelize.define('Option', {
        optionId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'option_id'
        },
        blogId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'blog_id'
        },
        optionName: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: '',
            unique: true,
            field: 'option_name'
        },
        optionValue: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'option_value'
        },
        autoload: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '1',
            field: 'autoload'
        }
    }, {
        tableName: 'options',
        timestamps: false
    });

    return Option;
};
