module.exports = function (sequelize, DataTypes) {
    return sequelize.define('vPostViewsAverage', {
        postId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            field: 'post_id'
        },
        postTitle: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'post_title'
        },
        postStatus: {
            type: DataTypes.ENUM('publish', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
            allowNull: false,
            defaultValue: 'publish',
            field: 'post_status'
        },
        postGuid: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
            field: 'post_guid'
        },
        postType: {
            type: DataTypes.ENUM('post', 'page'),
            allowNull: false,
            defaultValue: 'post',
            field: 'post_type'
        },
        postCreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: '0000-00-00 00:00:00',
            field: 'post_created'
        },
        days: {
            type: DataTypes.INTEGER(7),
            allowNull: true,
            field: 'days'
        },
        views: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: '0',
            field: 'views'
        },
        viewsAverage: {
            type: DataTypes.DECIMAL,
            allowNull: true,
            field: 'views_average'
        }
    }, {
        tableName: 'v_post_views_average'
    });
};
