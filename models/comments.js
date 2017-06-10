module.exports = function (sequelize, DataTypes) {
    const Comment = sequelize.define('Comment', {
        commentId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'comment_id'
        },
        postId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'post_id'
        },
        commentContent: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'comment_content'
        },
        commentStatus: {
            type: DataTypes.ENUM('normal', 'pending', 'reject', 'spam', 'trash'),
            allowNull: false,
            defaultValue: 'pending',
            field: 'comment_status'
        },
        commentAuthor: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'comment_author'
        },
        commentAuthorEmail: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: '',
            field: 'comment_author_email'
        },
        commentAuthorLink: {
            type: DataTypes.STRING(200),
            allowNull: false,
            defaultValue: '',
            field: 'comment_author_Link'
        },
        commentIp: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: '',
            field: 'comment_ip'
        },
        commentCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'comment_created'
        },
        commentCreatedGmt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'comment_created_gmt'
        },
        commentModified: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'comment_modified'
        },
        commentModifiedGmt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: 'sequelize.literal(\'CURRENT_TIMESTAMP\')',
            field: 'comment_modified_gmt'
        },
        commentVote: {
            type: DataTypes.INTEGER(10),
            allowNull: false,
            defaultValue: '0',
            field: 'comment_vote'
        },
        commentAgent: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'comment_agent'
        },
        parentId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'parent_id'
        },
        userId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'user_id'
        }
    }, {
        tableName: 'comments',
        createdAt: 'comment_created',
        updatedAt: 'comment_modified',
        deletedAt: false,
        classMethods: {
        }
    });
    Comment.associate = function (models) {
        Comment.belongsTo(models.Post, {
            foreignKey: 'postId',
            targetKey: 'postId'
        });
    };

    return Comment;
};
