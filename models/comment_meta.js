module.exports = function (sequelize, DataTypes) {
    const CommentMeta = sequelize.define('CommentMeta', {
        metaId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            primaryKey: true,
            field: 'meta_id'
        },
        commentId: {
            type: DataTypes.CHAR(16),
            allowNull: false,
            defaultValue: '',
            field: 'comment_id'
        },
        metaKey: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'meta_key'
        },
        metaValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'meta_value'
        }
    }, {
        tableName: 'comment_meta',
        timestamps: false
    });

    return CommentMeta;
};
