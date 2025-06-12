const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
  winner_id: {
    type: DataTypes.UUID,
    allowNull: true,
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
    type: DataTypes.ENUM('open', 'closed', 'finished', 'canceled'),
    defaultValue: 'open',
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Auction;
