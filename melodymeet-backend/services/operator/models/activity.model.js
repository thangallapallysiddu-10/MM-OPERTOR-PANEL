const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  studioId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true },
  },
  type: {
    type: DataTypes.ENUM('message', 'system'),
    defaultValue: 'message',
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['studioId', 'createdAt'] },
    { fields: ['studioId', 'isPinned'] },
  ],
});

const SongRequest = sequelize.define('SongRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  studioId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  songTitle: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 180] },
  },
  votes: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 0 },
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'played'),
    defaultValue: 'pending',
  },
  votedBy: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['studioId', 'status'] },
    { fields: ['studioId', 'votes'] },
  ],
});

const StreamReaction = sequelize.define('StreamReaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  studioId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  type: {
    type: DataTypes.ENUM('like', 'gift', 'sticker'),
    allowNull: false,
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['studioId', 'type'] },
    { fields: ['studioId', 'createdAt'] },
  ],
});

const LiveSession = sequelize.define('LiveSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  streamId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },
  streamName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 180] },
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  peakViewers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  lastViewerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  status: {
    type: DataTypes.ENUM('live', 'ended'),
    defaultValue: 'live',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['streamId', 'status'] },
    { fields: ['startedAt'] },
  ],
});

module.exports = {
  ChatMessage,
  SongRequest,
  StreamReaction,
  LiveSession,
};
