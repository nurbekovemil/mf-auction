const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Auction.js — убираем лишнее
const Auction = sequelize.define('Auction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
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
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'finished', 'expired'),
    defaultValue: 'open',
  },
  closing_type: {
    type: DataTypes.ENUM('auto', 'manual'),
    allowNull: false,
    defaultValue: 'auto',
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: true,
});




module.exports = Auction;
