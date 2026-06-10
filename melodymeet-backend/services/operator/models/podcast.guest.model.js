const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * PodcastGuest — represents a guest request to join a live podcast session.
 * Guests join via a roomLink, submit their name + device, and then the
 * operator approves or denies them. Approved guests get a mic slot.
 *
 * Security: roomId is alphanumeric only (validated by Joi), preventing
 * path traversal or SQL injection through the roomId parameter.
 */
const PodcastGuest = sequelize.define('PodcastGuest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // Links guest to a PodcastLiveSession by roomId
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 120] },
  },

  // Device description sent by guest e.g. "📱 Mobile App", "🌐 Web Browser"
  device: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Unknown Device',
    validate: { len: [0, 200] },
  },

  // Guest Link slot assignment — mic2 through mic5.
  // NULL for guests who joined via the old approval-flow (not a direct link).
  // 'mic2' | 'mic3' | 'mic4' | 'mic5'
  slotId: {
    type: DataTypes.ENUM('mic2', 'mic3', 'mic4', 'mic5'),
    allowNull: true,
    defaultValue: null,
  },

  // Opaque reconnect token issued at join time.
  // Allows the guest to reclaim their slot after a page refresh.
  guestToken: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },

  // 'pending' → waiting for operator decision
  // 'approved' → allowed on mic (includes slot-based guests once connected)
  // 'denied' → rejected
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'denied'),
    defaultValue: 'pending',
  },

  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

  // When operator approved or denied
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Guest Control Center — persisted per slot so state survives reconnects
  micMuted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Volume in percent: 0–200 (100 = unity gain, 200 = max boost)
  volume: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: { min: 0, max: 200 },
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['roomId'] },
    { fields: ['status'] },
    // Composite index — used for "get all pending guests in room X"
    { fields: ['roomId', 'status'] },
    // Slot occupancy check — one active guest per (room, slot)
    { fields: ['roomId', 'slotId'] },
  ],
});

module.exports = PodcastGuest;
