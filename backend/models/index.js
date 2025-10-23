const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// For MySQL, read from environment variables (production) or use config (development)
const database = process.env.DB_NAME || dbConfig.database;
const username = process.env.DB_USER || dbConfig.username;
const password = process.env.DB_PASSWORD || dbConfig.password;
const host = process.env.DB_HOST || dbConfig.host || '127.0.0.1';
const port = process.env.DB_PORT || dbConfig.port || 3306;

const sequelize = new Sequelize(
  database,
  username,
  password,
  {
    host: host,
    port: port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging || false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

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
