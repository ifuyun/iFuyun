module.exports = function (sequelize, DataTypes) {
    const TermRelationship = sequelize.define('TermRelationship', {
        objectId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'object_id'
        },
        termTaxonomyId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            primaryKey: true,
            field: 'term_taxonomy_id'
        },
        termOrder: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: '0',
            field: 'term_order'
        }
    }, {
        tableName: 'term_relationships',
        timestamps: false,
        classMethods: {
            associate: function (models) {
                TermRelationship.belongsTo(models.Post, {
                    foreignKey: 'objectId',
                    targetKey: 'postId'
                });
            }
        }
    });

    return TermRelationship;
};
