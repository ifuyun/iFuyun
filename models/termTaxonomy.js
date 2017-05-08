/* jshint indent: 4 */

module.exports = function (sequelize, DataTypes) {
    const TermTaxonomy = sequelize.define('TermTaxonomy', {
        taxonomyId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'taxonomy_id'
        },
        taxonomy: {
            type: DataTypes.ENUM('post', 'link', 'tag'),
            allowNull: false,
            defaultValue: 'post',
            field: 'taxonomy'
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            defaultValue: '',
            field: 'name'
        },
        slug: {
            type: DataTypes.STRING(200),
            allowNull: false,
            defaultValue: '',
            unique: true,
            field: 'slug'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'description'
        },
        parent: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'parent'
        },
        termOrder: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            defaultValue: '0',
            field: 'term_order'
        },
        termGroup: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: '0',
            field: 'term_group'
        },
        count: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: '0',
            field: 'count'
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'created'
        },
        modified: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'modified'
        }
    }, {
        tableName: 'term_taxonomy',
        createdAt: 'created',
        updatedAt: 'modified',
        deletedAt: false,
        classMethods: {
            associate: function (models) {
                TermTaxonomy.belongsToMany(models.Link, {
                    through: models.TermRelationship,
                    foreignKey: 'termTaxonomyId',
                    otherKey: 'objectId'
                });
                TermTaxonomy.belongsToMany(models.Post, {
                    through: models.TermRelationship,
                    foreignKey: 'termTaxonomyId',
                    otherKey: 'objectId'
                });
                TermTaxonomy.hasMany(models.TermRelationship, {
                    foreignKey: 'termTaxonomyId',
                    sourceKey: 'taxonomyId'
                });
            }
        }
    });

    return TermTaxonomy;
};
