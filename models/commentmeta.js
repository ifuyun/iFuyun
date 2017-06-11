/* jshint indent: 4 */

module.exports = function (sequelize, DataTypes) {
    const Commentmeta = sequelize.define('Commentmeta', {
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
        tableName: 'commentmeta',
        timestamps: false
    });

    return Commentmeta;
};
