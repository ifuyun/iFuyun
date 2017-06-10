module.exports = function (sequelize, DataTypes) {
    const Link = sequelize.define('Link', {
        linkId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'link_id'
        },
        linkUrl: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'link_url'
        },
        linkName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'link_name'
        },
        linkImage: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'link_image'
        },
        linkTarget: {
            type: DataTypes.ENUM('_blank', '_top', '_self'),
            allowNull: false,
            defaultValue: '_blank',
            field: 'link_target'
        },
        linkDescription: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'link_description'
        },
        linkVisible: {
            type: DataTypes.ENUM('site', 'homepage', 'invisible'),
            allowNull: false,
            defaultValue: 'site',
            field: 'link_visible'
        },
        linkOwner: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'link_owner'
        },
        linkRating: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: '0',
            field: 'link_rating'
        },
        linkCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'link_created'
        },
        linkModified: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'link_modified'
        },
        linkRss: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'link_rss'
        }
    }, {
        tableName: 'links',
        createdAt: 'link_created',
        updatedAt: 'link_modified',
        deletedAt: false,
        classMethods: {
        }
    });
    Link.associate = function (models) {
        Link.belongsToMany(models.TermTaxonomy, {
            through: models.TermRelationship,
            foreignKey: 'objectId',
            otherKey: 'termTaxonomyId'
        });
    };

    return Link;
};
