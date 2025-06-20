// models/Lot.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lot = sequelize.define('Lot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  auction_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('buy', 'sell'),
    allowNull: false,
  },
  asset: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  volume: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'finished'),
    defaultValue: 'open',
  },
  winner_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  winner_offer_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Lot;
