module.exports = function (sequelize, DataTypes) {
    return sequelize.define('Material', {
        materialId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'material_id'
        },
        materialTitle: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'material_title'
        },
        materialContent: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
            field: 'material_content'
        },
        materialAuthor: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'material_author'
        },
        materialTranslator: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'material_translator'
        },
        materialSource: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'material_source'
        },
        materialPress: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'material_press'
        },
        materialStatus: {
            type: DataTypes.ENUM('normal', 'trash'),
            allowNull: false,
            defaultValue: 'normal',
            field: 'material_status'
        },
        materialCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'material_created'
        }
    }, {
        tableName: 'materials',
        createdAt: 'material_created',
        updatedAt: false,
        deletedAt: false
    });
};
