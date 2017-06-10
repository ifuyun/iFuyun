/* jshint indent: 4 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('postmeta', {
    metaId: {
      type: DataTypes.CHAR(16),
      allowNull: false,
      primaryKey: true,
      field: 'meta_id'
    },
    postId: {
      type: DataTypes.CHAR(16),
      allowNull: false,
      defaultValue: '',
      field: 'post_id'
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
    tableName: 'postmeta'
  });
};
