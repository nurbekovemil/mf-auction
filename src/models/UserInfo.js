const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const UserInfo = sequelize.define('UserInfo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    short_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registration_number: {
      type: DataTypes.STRING,
    },
    inn: {
      type: DataTypes.STRING,
    },
    capital: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    legal_address: {
      type: DataTypes.STRING,
    },
    actual_address: {
      type: DataTypes.STRING,
    },
    director_name: {
      type: DataTypes.STRING,
    },
    bank_account: {
      type: DataTypes.STRING,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bic: {
      type: DataTypes.STRING,
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    website: {
      type: DataTypes.STRING,
    },
    registration_date: {
      type: DataTypes.DATE,
    }
}, {
    timestamps: false
  })

module.exports = UserInfo;
