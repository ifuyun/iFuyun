module.exports = function (sequelize, DataTypes) {
    const Post = sequelize.define('Post', {
        postId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'post_id'
        },
        postAuthor: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'post_author'
        },
        postDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'post_date'
        },
        postDateGmt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'post_date_gmt'
        },
        postContent: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'post_content'
        },
        postTitle: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'post_title'
        },
        postExcerpt: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'post_excerpt'
        },
        postStatus: {
            type: DataTypes.ENUM('publish', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
            allowNull: false,
            defaultValue: 'publish',
            field: 'post_status'
        },
        commentFlag: {
            type: DataTypes.ENUM('open', 'verify', 'closed'),
            allowNull: false,
            defaultValue: 'verify',
            field: 'comment_flag'
        },
        postOriginal: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: false,
            defaultValue: '1',
            field: 'post_original'
        },
        postPassword: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: '',
            field: 'post_password'
        },
        postName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            defaultValue: '',
            field: 'post_name'
        },
        postModified: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'post_modified'
        },
        postModifiedGmt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'post_modified_gmt'
        },
        postCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'post_created'
        },
        postParent: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'post_parent'
        },
        postGuid: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'post_guid'
        },
        postType: {
            type: DataTypes.ENUM('post', 'page', 'revision', 'attachment'),
            allowNull: false,
            defaultValue: 'post',
            field: 'post_type'
        },
        postMimeType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: '',
            field: 'post_mime_type'
        },
        commentCount: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: '0',
            field: 'comment_count'
        },
        postViewCount: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: '0',
            field: 'post_view_count'
        }
    }, {
        tableName: 'posts',
        createdAt: 'post_created',
        updatedAt: 'post_modified',
        deletedAt: false,
        classMethods: {
        }
    });
    Post.associate = function (models) {
        Post.belongsTo(models.User, {
            foreignKey: 'postAuthor',
            targetKey: 'userId'
        });
        Post.hasMany(models.Comment, {
            foreignKey: 'postId',
            sourceKey: 'postId'
        });
        Post.belongsToMany(models.TermTaxonomy, {
            through: models.TermRelationship,
            foreignKey: 'objectId',
            otherKey: 'termTaxonomyId'
        });
        Post.hasMany(models.TermRelationship, {
            foreignKey: 'objectId',
            sourceKey: 'postId'
        });
        Post.hasMany(models.VTagVisibleTaxonomy, {
            foreignKey: 'objectId',
            sourceKey: 'postId'
        });
        Post.hasMany(models.Postmeta, {
            foreignKey: 'postId',
            sourceKey: 'postId'
        });
    };

    return Post;
};
