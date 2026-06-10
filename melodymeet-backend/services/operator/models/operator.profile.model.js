const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** Dedicated operator / RJ public profile — one row per auth account */
const OperatorProfile = sequelize.define(
  'OperatorProfile',
  {
    authUid: {
      type: DataTypes.STRING(120),
      primaryKey: true,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING(120),
      defaultValue: '',
    },
    tagline: {
      type: DataTypes.STRING(200),
      defaultValue: '',
    },
    bio: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    location: {
      type: DataTypes.STRING(120),
      defaultValue: '',
    },
    email: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    avatarInitials: {
      type: DataTypes.STRING(8),
      defaultValue: 'RJ',
    },
    currentMood: {
      type: DataTypes.STRING(40),
      defaultValue: 'chill',
    },
    genres: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    languages: {
      type: DataTypes.JSONB,
      defaultValue: ['English'],
    },
    timezone: {
      type: DataTypes.STRING(80),
      defaultValue: '',
    },
    socialLinks: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    podcastFollowers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    rjListeners: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    rjLikes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    rjSubscribers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    rjFollowers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    rjShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    bestLiveEvents: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    legacyStudioId: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'operator_profiles',
    indexes: [{ fields: ['legacyStudioId'] }],
  }
);

module.exports = OperatorProfile;
