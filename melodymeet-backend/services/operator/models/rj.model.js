const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/** Full RJ studio row — one per stream/studio id */
const RjStudio = sequelize.define('RjStudio', {
  streamId: {
    type: DataTypes.STRING(120),
    primaryKey: true,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  ownerAuthUid: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  profileName: {
    type: DataTypes.STRING(120),
    defaultValue: 'DJ MAVERICK',
  },
  currentMood: {
    type: DataTypes.STRING(40),
    defaultValue: 'chill',
  },
  activeChannel: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 1, max: 6 },
  },
  dualPlayer: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },

  mics: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  currentTrack: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  isLive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  liveTimerSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  isTimerPaused: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  liveTimerStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isPlaylistActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPlaylistPaused: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  playlistDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    validate: { min: 1, max: 480 },
  },
  playlistTimerRemaining: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  playlistCurrentIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  playlistStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  playlistTrackStartedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  playlistTrackElapsedMs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  playlistSessionLastTickAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  announcement: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  stats: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  trackStats: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Map of trackId -> { playCount, lastPlayedAt }',
  },
  playlistSession: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    comment: '{ startedAt, stoppedAt, totalRuntime, tracksPlayed, pausedAt, accumulatedMs }',
  },
  listenerHistory: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  activeListeners: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  operatorProfile: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  timestamps: true,
  tableName: 'rj_studios',
});

const RjPlaylistItem = sequelize.define('RjPlaylistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  streamId: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: { notEmpty: true },
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  title: {
    type: DataTypes.STRING(180),
    allowNull: false,
  },
  artist: {
    type: DataTypes.STRING(120),
    defaultValue: 'Unknown',
  },
  duration: {
    type: DataTypes.STRING(20),
    defaultValue: '0:00',
  },
  bpm: {
    type: DataTypes.INTEGER,
    defaultValue: 120,
    validate: { min: 0, max: 300 },
  },
  source: {
    type: DataTypes.ENUM('library', 'local', 'track', 'custom'),
    defaultValue: 'library',
  },
  trackId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  localFileId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  timestamps: true,
  tableName: 'rj_playlist_items',
  indexes: [
    { fields: ['streamId', 'sortOrder'] },
    { fields: ['streamId', 'title', 'artist'] },
  ],
});

const RjLocalFile = sequelize.define('RjLocalFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  streamId: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  fileSizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(20),
    defaultValue: '0:00',
  },
  format: {
    type: DataTypes.STRING(20),
    defaultValue: 'mp3',
  },
}, {
  timestamps: true,
  tableName: 'rj_local_files',
  indexes: [{ fields: ['streamId', 'createdAt'] }],
});

const RjNotification = sequelize.define('RjNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  streamId: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(180),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('system', 'request', 'alert'),
    defaultValue: 'system',
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: 'rj_notifications',
  indexes: [{ fields: ['streamId', 'read', 'createdAt'] }],
});

const RjChatBan = sequelize.define('RjChatBan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  streamId: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  mode: {
    type: DataTypes.ENUM('cooldown', 'ban'),
    defaultValue: 'cooldown',
  },
  cooldownUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'rj_chat_bans',
  indexes: [
    { unique: true, fields: ['streamId', 'username'] },
  ],
});

RjStudio.hasMany(RjPlaylistItem, { foreignKey: 'streamId', sourceKey: 'streamId', onDelete: 'CASCADE' });
RjPlaylistItem.belongsTo(RjStudio, { foreignKey: 'streamId', targetKey: 'streamId' });

RjStudio.hasMany(RjLocalFile, { foreignKey: 'streamId', sourceKey: 'streamId', onDelete: 'CASCADE' });
RjLocalFile.belongsTo(RjStudio, { foreignKey: 'streamId', targetKey: 'streamId' });

RjStudio.hasMany(RjNotification, { foreignKey: 'streamId', sourceKey: 'streamId', onDelete: 'CASCADE' });
RjNotification.belongsTo(RjStudio, { foreignKey: 'streamId', targetKey: 'streamId' });

RjStudio.hasMany(RjChatBan, { foreignKey: 'streamId', sourceKey: 'streamId', onDelete: 'CASCADE' });
RjChatBan.belongsTo(RjStudio, { foreignKey: 'streamId', targetKey: 'streamId' });

module.exports = {
  RjStudio,
  RjPlaylistItem,
  RjLocalFile,
  RjNotification,
  RjChatBan,
};
