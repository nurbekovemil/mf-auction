const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  auction_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  volume: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = Offer;
