const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * PodcastRecording — stores metadata for operator recordings
 * (captured via mic or trimmed from existing recordings).
 * These are the raw materials BEFORE they become a Podcast episode.
 * The actual audio file is stored in /uploads and referenced by fileUrl.
 */
const PodcastRecording = sequelize.define('PodcastRecording', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 255] },
  },

  // Human-readable duration e.g. "03:24"
  duration: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 20] },
  },

  // Duration in seconds — used for accurate trimming math
  durationSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 86400 },
  },

  // Human-readable file size e.g. "4.2 MB"
  size: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 50] },
  },

  fileSizeBytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
    validate: { min: 0 },
  },

  // Filename on disk (inside /uploads)
  storageKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Public URL path e.g. "/uploads/audio-xxx.mp3"
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [0, 120] },
  },

  // 'recording' = captured from mic; 'trimmed' = trimmed from another recording
  source: {
    type: DataTypes.ENUM('recording', 'trimmed'),
    defaultValue: 'recording',
  },

  // If trimmed, reference the original recording id
  originalRecordingId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Trim ranges applied (array of {start, end} percentage objects)
  trimRanges: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },

  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['source'] },
    { fields: ['createdAt'] },
    { fields: ['originalRecordingId'] },
  ],
});

module.exports = PodcastRecording;
