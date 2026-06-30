/**
 * podcast.guest.service.js
 *
 * Guest Link Manager — business logic for slot-based guest joining.
 * This is a responsibility split from podcast.service.js, NOT a new architecture.
 *
 * Called by: podcast.controller.js (same controller as the rest of the podcast module)
 * Socket:    podcast.socket.js (same namespace)
 * Model:     podcast.guest.model.js (extended with slotId + guestToken)
 */

const crypto = require('crypto');
const { Op } = require('sequelize');
const PodcastGuest = require('../models/podcast.guest.model');
const PodcastLiveSession = require('../models/podcast.live.model');
const { badRequest, notFound } = require('../utils/errors');
const { schemas, validate } = require('../utils/validators');

// mic1 is always the host — only mic2–mic5 are guest slots
const GUEST_SLOTS = ['mic2', 'mic3', 'mic4', 'mic5'];

/**
 * Generate shareable join URLs for MIC 2–5 of a live room.
 * Can be called before OR after Go Live — no active session required.
 * Links are distributed to guests ahead of the session start.
 *
 * URL shape: <baseUrl>/podcast/guest/<slotId>/<roomId>
 */
const generateGuestLinks = async (data) => {
  const payload = validate(schemas.podcastGuestLinkGenerate, data);
  const { roomId } = payload;

  // No live-session gate — links are valid before and after Go Live.
  // joinGuestSlot() enforces the live-session requirement at join time.

  const base = (payload.baseUrl || process.env.FRONTEND_URL || '').replace(/\/$/, '');

  return GUEST_SLOTS.map((slotId) => ({
    slotId,
    label: `MIC ${slotId.replace('mic', '')}`,
    url: base
      ? `${base}/podcast/guest/${slotId}/${roomId}`
      : `/podcast/guest/${slotId}/${roomId}`,
  }));
};

/**
 * Return current slot occupancy for a room (MIC 2–5).
 * Used by the operator UI to render the mic cards with guest names.
 */
const getGuestSlots = async (roomId) => {
  if (!roomId) throw badRequest('roomId is required');

  const guests = await PodcastGuest.findAll({
    where: {
      roomId,
      slotId: { [Op.in]: GUEST_SLOTS },
      status: { [Op.in]: ['approved', 'pending'] },
    },
    order: [['slotId', 'ASC']],
  });

  const occupied = {};
  guests.forEach((g) => { occupied[g.slotId] = g; });

  return GUEST_SLOTS.map((slotId) => {
    const guest = occupied[slotId];
    return {
      slotId,
      label: `MIC ${slotId.replace('mic', '')}`,
      status: guest ? 'connected' : 'empty',
      guestName: guest ? guest.name : null,
      guestId: guest ? guest.id : null,
    };
  });
};

/**
 * Guest claims a slot via their unique join link.
 *
 * Rules enforced here:
 *  - Session must be live.
 *  - Slot must be empty — second join attempt returns 400 "Slot already in use".
 *  - If guestToken matches the existing record the same guest can reconnect
 *    after a page refresh without being blocked.
 *  - Slot-based guests are auto-approved (no operator approval step needed).
 */
const joinGuestSlot = async (data) => {
  const payload = validate(schemas.podcastGuestSlotJoin, data);
  const { roomId, slotId, guestName, guestToken } = payload;

  const session = await PodcastLiveSession.findOne({
    where: { roomId, status: 'live' },
  });
  if (!session) throw badRequest('No active live session found for this room');

  // Check occupancy
  const existing = await PodcastGuest.findOne({
    where: {
      roomId,
      slotId,
      status: { [Op.in]: ['approved', 'pending'] },
    },
  });

  if (existing) {
    // Same guest reconnecting after a page refresh
    if (guestToken && existing.guestToken === guestToken) {
      await existing.update({ name: guestName, joinedAt: new Date() });
      return existing;
    }
    throw badRequest('Slot already in use');
  }

  const newToken = crypto.randomBytes(24).toString('hex');

  return await PodcastGuest.create({
    roomId,
    slotId,
    name: guestName,
    device: 'Guest Link',
    status: 'approved',
    guestToken: newToken,
    joinedAt: new Date(),
    respondedAt: new Date(),
  });
};

/**
 * Release a slot voluntarily — called when a guest clicks Leave or the
 * page fires beforeunload. Requires guestToken to prevent drive-by ejection.
 */
const leaveGuestSlot = async (data) => {
  const payload = validate(schemas.podcastGuestSlotLeave, data);
  const { roomId, slotId, guestToken } = payload;

  const guest = await PodcastGuest.findOne({
    where: { roomId, slotId, guestToken },
  });
  if (!guest) throw notFound('Guest slot record not found');

  await guest.destroy();
  return { slotId, status: 'empty', guestName: null };
};

/**
 * Operator kick — forcibly removes a guest from a slot.
 * No guestToken required; operator authority is established by JWT on the route.
 */
const kickGuestSlot = async (roomId, slotId) => {
  if (!roomId) throw badRequest('roomId is required');
  if (!GUEST_SLOTS.includes(slotId)) throw badRequest('Invalid slotId');

  const guest = await PodcastGuest.findOne({
    where: { roomId, slotId, status: { [Op.in]: ['approved', 'pending'] } },
  });
  if (!guest) throw notFound('No guest found in this slot');

  const guestData = guest.get({ plain: true });
  await guest.destroy();
  return { slotId, status: 'empty', guestName: null, kickedGuest: guestData };
};

// ---------------------------------------------------------------------------
// Guest Control Center
// ---------------------------------------------------------------------------

/**
 * Operator mutes or unmutes a guest slot.
 * Persists the state to DB so it survives socket reconnects.
 * Returns the updated guest record — caller emits socket event.
 */
const muteGuestSlot = async (roomId, slotId, muted) => {
  const payload = validate(schemas.podcastGuestSlotMute, { roomId, slotId, muted });

  const guest = await PodcastGuest.findOne({
    where: {
      roomId: payload.roomId,
      slotId: payload.slotId,
      status: { [Op.in]: ['approved', 'pending'] },
    },
  });
  if (!guest) throw notFound('No connected guest in this slot');

  await guest.update({ micMuted: payload.muted });

  return {
    roomId: payload.roomId,
    slotId: payload.slotId,
    guestId: guest.id,
    guestName: guest.name,
    micMuted: guest.micMuted,
  };
};

/**
 * Operator sets absolute volume on a guest slot (0–200).
 * The frontend calls this with delta=-10 or +10 after clamping; the route
 * controller handles the delta → absolute conversion using current DB value.
 */
const setGuestSlotVolume = async (roomId, slotId, volume) => {
  const payload = validate(schemas.podcastGuestSlotVolume, { roomId, slotId, volume });

  const guest = await PodcastGuest.findOne({
    where: {
      roomId: payload.roomId,
      slotId: payload.slotId,
      status: { [Op.in]: ['approved', 'pending'] },
    },
  });
  if (!guest) throw notFound('No connected guest in this slot');

  const clamped = Math.max(0, Math.min(200, payload.volume));
  await guest.update({ volume: clamped });

  return {
    roomId: payload.roomId,
    slotId: payload.slotId,
    guestId: guest.id,
    guestName: guest.name,
    volume: guest.volume,
  };
};

/**
 * Read current volume for a slot — used by controller for delta adjustments.
 */
const getGuestSlotVolume = async (roomId, slotId) => {
  const guest = await PodcastGuest.findOne({
    where: { roomId, slotId, status: { [Op.in]: ['approved', 'pending'] } },
  });
  return guest ? guest.volume : 100;
};

// ---------------------------------------------------------------------------
// Legacy approval-flow guests (no slotId — operator approve/deny)
// Used by GET/POST /live/guests/* and socket guest_request events.
// ---------------------------------------------------------------------------

const serializeLegacyGuest = (guest) => {
  const row = guest.get ? guest.get({ plain: true }) : guest;
  return {
    id: row.id,
    roomId: row.roomId,
    name: row.name,
    device: row.device || 'Unknown Device',
    status: row.status,
    joinedAt: row.joinedAt,
    respondedAt: row.respondedAt || null,
  };
};

const getLegacyGuests = async (roomId, query = {}) => {
  if (!roomId) throw badRequest('roomId is required');

  const where = {
    roomId,
    slotId: null,
  };
  if (query.status) where.status = query.status;

  const rows = await PodcastGuest.findAll({
    where,
    order: [['joinedAt', 'DESC']],
  });
  return rows.map(serializeLegacyGuest);
};

const joinLegacyGuest = async (data) => {
  const payload = validate(schemas.podcastGuestJoin, data);

  const session = await PodcastLiveSession.findOne({
    where: { roomId: payload.roomId, status: 'live' },
  });
  if (!session) throw badRequest('No active live session found for this room');

  const guest = await PodcastGuest.create({
    roomId: payload.roomId,
    name: payload.name,
    device: payload.device || 'Unknown Device',
    status: 'pending',
    slotId: null,
  });

  return serializeLegacyGuest(guest);
};

const respondToLegacyGuest = async (id, action) => {
  const payload = validate(schemas.podcastGuestRespond, { action });
  const guestId = Number(id);
  if (!Number.isInteger(guestId) || guestId <= 0) throw badRequest('Invalid guest id');

  const guest = await PodcastGuest.findOne({
    where: { id: guestId, slotId: null },
  });
  if (!guest) throw notFound('Guest request not found');
  if (guest.status !== 'pending') throw badRequest('Guest request has already been responded to');

  await guest.update({
    status: payload.action === 'approve' ? 'approved' : 'denied',
    respondedAt: new Date(),
  });

  return serializeLegacyGuest(guest);
};

const removeLegacyGuest = async (id) => {
  const guestId = Number(id);
  if (!Number.isInteger(guestId) || guestId <= 0) throw badRequest('Invalid guest id');

  const guest = await PodcastGuest.findOne({
    where: { id: guestId, slotId: null },
  });
  if (!guest) throw notFound('Guest not found');

  const serialized = serializeLegacyGuest(guest);
  await guest.destroy();
  return serialized;
};

module.exports = {
  generateGuestLinks,
  getGuestSlots,
  joinGuestSlot,
  leaveGuestSlot,
  kickGuestSlot,
  // Guest Control Center
  muteGuestSlot,
  setGuestSlotVolume,
  getGuestSlotVolume,
  // Legacy approval-flow guests
  getLegacyGuests,
  joinLegacyGuest,
  respondToLegacyGuest,
  removeLegacyGuest,
  serializeLegacyGuest,
};
