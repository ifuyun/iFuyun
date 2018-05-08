module.exports = function (sequelize, DataTypes) {
    const VTagVisibleTaxonomy = sequelize.define('VTagVisibleTaxonomy', {
        objectId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'object_id'
        },
        taxonomyId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            primaryKey: true,
            field: 'taxonomy_id'
        },
        slug: {
            type: DataTypes.STRING(200),
            allowNull: false,
            defaultValue: '',
            unique: true,
            field: 'slug'
        },
        taxonomy: {
            type: DataTypes.ENUM('post', 'link', 'tag'),
            allowNull: false,
            defaultValue: 'post',
            field: 'taxonomy'
        },
        termOrder: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: '0',
            field: 'term_order'
        }
    }, {
        tableName: 'v_tag_visible_taxonomy',
        timestamps: false,
        classMethods: {
        }
    });
    VTagVisibleTaxonomy.associate = function (models) {
        VTagVisibleTaxonomy.belongsTo(models.Post, {
            foreignKey: 'objectId',
            targetKey: 'postId'
        });
    };

    return VTagVisibleTaxonomy;
};
