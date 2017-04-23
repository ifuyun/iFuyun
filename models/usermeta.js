/* jshint indent: 4 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usermeta', {
    metaId: {
      type: DataTypes.CHAR(16),
      allowNull: false,
      primaryKey: true,
      field: 'meta_id'
    },
    userId: {
      type: DataTypes.CHAR(16),
      allowNull: false,
      defaultValue: '',
      field: 'user_id'
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
    tableName: 'usermeta'
  });
};
