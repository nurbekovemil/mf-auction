const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Deal = sequelize.define('Deal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  auction_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  lot_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  offer_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  percent: {
    type: DataTypes.DECIMAL,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Deal;
