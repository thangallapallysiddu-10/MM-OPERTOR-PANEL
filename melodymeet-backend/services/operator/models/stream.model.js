const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Stream = sequelize.define('Stream', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { notEmpty: true, len: [1, 120] },
  },
  description: {
    type: DataTypes.STRING,
    defaultValue: 'Custom Stream Channel',
    validate: { len: [0, 500] },
  },
  isLive: { type: DataTypes.BOOLEAN, defaultValue: false },
  viewers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  bitrate: {
    type: DataTypes.INTEGER,
    defaultValue: 128,
    validate: { min: 32, max: 320 },
  },
  quality: {
    type: DataTypes.ENUM('MAXIMUM', 'HIGH', 'BALANCED', 'LOSSLESS'),
    defaultValue: 'BALANCED',
  },
}, { timestamps: true });

const Track = sequelize.define('Track', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 160] },
  },
  artist: {
    type: DataTypes.STRING,
    defaultValue: 'Unknown Artist',
    validate: { len: [0, 120] },
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  fileSize: { type: DataTypes.STRING },
  duration: { type: DataTypes.STRING },
  format: { type: DataTypes.STRING },
}, { timestamps: true });

Stream.hasMany(Track, { foreignKey: 'streamId', onDelete: 'CASCADE' });
Track.belongsTo(Stream, { foreignKey: 'streamId' });

module.exports = { Stream, Track };
