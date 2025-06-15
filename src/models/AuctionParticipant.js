const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuctionParticipant = sequelize.define('AuctionParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  auction_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Date.now(),
  }
}, {
    timestamps: false
  })

module.exports = AuctionParticipant;
