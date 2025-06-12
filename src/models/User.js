const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'initiator', 'admin'),
    defaultValue: 'user',
  },
}, {
  timestamps: true,
});

module.exports = User;
