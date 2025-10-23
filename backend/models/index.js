const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: false
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.Delivery = require('./Delivery')(sequelize, Sequelize);
db.Bale = require('./Bale')(sequelize, Sequelize);
db.Setting = require('./Setting')(sequelize, Sequelize);

// Define associations
db.Delivery.hasMany(db.Bale, {
  foreignKey: 'deliveryId',
  as: 'bales',
  onDelete: 'CASCADE'
});
db.Bale.belongsTo(db.Delivery, {
  foreignKey: 'deliveryId',
  as: 'delivery'
});

module.exports = db;
