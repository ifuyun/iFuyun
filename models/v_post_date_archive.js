module.exports = function (sequelize, DataTypes) {
    return sequelize.define('VPostDateArchive', {
        postId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            field: 'post_id'
        },
        postDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: '0000-00-00 00:00:00',
            field: 'post_date'
        },
        postStatus: {
            type: DataTypes.ENUM('publish', 'private', 'pending', 'draft', 'auto-draft', 'inherit', 'trash'),
            allowNull: false,
            defaultValue: 'publish',
            field: 'post_status'
        },
        postType: {
            type: DataTypes.ENUM('post', 'page', 'revision', 'attachment'),
            allowNull: false,
            defaultValue: 'post',
            field: 'post_type'
        },
        linkDate: {
            type: DataTypes.STRING(7),
            allowNull: true,
            field: 'link_date'
        },
        displayDate: {
            type: DataTypes.STRING(12),
            allowNull: true,
            field: 'display_date'
        },
        status: {
            type: DataTypes.INTEGER(1).UNSIGNED,
            allowNull: true,
            defaultValue: '1',
            field: 'status'
        }
    }, {
        tableName: 'v_post_date_archive'
    });
};
