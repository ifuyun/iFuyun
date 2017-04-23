/* jshint indent: 4 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('sequelizeMeta', {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            primaryKey: true,
            field: 'name'
        }
    }, {
        tableName: 'SequelizeMeta'
    });
};
