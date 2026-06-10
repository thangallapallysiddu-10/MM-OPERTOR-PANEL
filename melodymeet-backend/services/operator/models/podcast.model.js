const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Podcast = sequelize.define('Podcast', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 180] },
  },
  description: { type: DataTypes.TEXT },
  genre: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 80] },
  },
  seasonNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 },
  },
  episodeNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 },
  },
  fileName: { type: DataTypes.STRING },
  storageKey: { type: DataTypes.STRING },
  fileUrl: { type: DataTypes.STRING },
  fileSize: { type: DataTypes.STRING },
  fileSizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 120] },
  },
  audioFormat: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 20] },
  },
  duration: { type: DataTypes.STRING },
  durationSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  scheduleDate: { type: DataTypes.STRING },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Published', 'Draft', 'Scheduled'),
    defaultValue: 'Draft',
  },
  host: {
    type: DataTypes.STRING,
    defaultValue: 'DJ MAVERICK',
    validate: { len: [0, 120] },
  },
  coverArt: { type: DataTypes.STRING },
  source: {
    type: DataTypes.ENUM('upload', 'recording', 'metadata', 'trimmed'),
    defaultValue: 'metadata',
  },
  trimRanges: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['host'] },
    { fields: ['genre'] },
    { fields: ['seasonNumber', 'episodeNumber'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Podcast;
