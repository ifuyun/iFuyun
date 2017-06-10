/* jshint indent: 4 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sessions', {
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      primaryKey: true,
      field: 'session_id'
    },
    sessionData: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'session_data'
    },
    sessionExpires: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'session_expires'
    }
  }, {
    tableName: 'sessions'
  });
};
