const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const PodcastNotification = sequelize.define('PodcastNotification', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'system',
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'dashboard',
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = PodcastNotification;
