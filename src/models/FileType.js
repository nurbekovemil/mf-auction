const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FileType = sequelize.define('FileType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: false,
});

module.exports = FileType;
