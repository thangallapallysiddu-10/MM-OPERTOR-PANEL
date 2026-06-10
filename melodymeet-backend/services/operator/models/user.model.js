const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  authUid: { type: DataTypes.STRING, allowNull: true, unique: true },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: 'U',
    validate: { len: [1, 8] },
  },
  role: {
    type: DataTypes.ENUM('RJ', 'Podcast Host', 'Listener'),
    defaultValue: 'Listener',
  },
  followers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
  reports: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  joinDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 200] },
  },
}, { timestamps: true });

module.exports = User;
