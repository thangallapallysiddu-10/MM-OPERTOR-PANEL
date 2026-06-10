const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const PodcastMic = sequelize.define('PodcastMic', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'condenser',
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  phantom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  gain: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  volume: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  muted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: 'mic',
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

module.exports = PodcastMic;
