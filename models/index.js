'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(module.filename);
const env = (process.env.ENV && process.env.ENV.trim()) || 'development';
const config = require(__dirname + '/../config/database.js')[env];
let db = {};
let sequelize;

// warning: uncomment this will cause a warning: String based operators are deprecated.
// config.operatorsAliases = {};

if (config.use_env_constiable) {
    sequelize = new Sequelize(process.env[config.use_env_constiable]);
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
    .readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(function (file) {
        // eslint-disable-next-line global-require
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

Object.keys(db).forEach(function (modelName) {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
