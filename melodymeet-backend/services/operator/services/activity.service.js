const { Stream } = require('../models/stream.model');
const {
  ChatMessage,
  SongRequest,
  StreamReaction,
  LiveSession,
} = require('../models/activity.model');
const { badRequest, notFound } = require('../utils/errors');
const {
  LIVE_SESSION_STATUSES,
  REACTION_TYPES,
  SONG_REQUEST_STATUSES,
  schemas,
  validate,
} = require('../utils/validators');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeLimit = (limit, fallback = 50, max = 200) => {
  const parsed = Number(limit || fallback);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const createMessage = async (data) => {
  const payload = validate(schemas.chatMessage, data);
  return await ChatMessage.create(payload);
};

const pinMessage = async ({ studioId, messageId, text }) => {
  if (!studioId) throw badRequest('studioId is required');
  if (!messageId) throw badRequest('messageId is required');

  if (uuidPattern.test(String(messageId))) {
    const message = await ChatMessage.findOne({ where: { id: messageId, studioId } });
    if (message) {
      message.isPinned = true;
      await message.save();
      return message;
    }
  }

  return await ChatMessage.create({
    studioId,
    username: 'System',
    text: text || 'Message pinned',
    type: 'system',
    isPinned: true,
  });
};

const getMessages = async (studioId, options = {}) => {
  if (!studioId) throw badRequest('studioId is required');

  return await ChatMessage.findAll({
    where: { studioId },
    order: [['createdAt', 'DESC']],
    limit: normalizeLimit(options.limit),
  });
};

const createReaction = async (data) => {
  const payload = validate(schemas.streamReaction, data);
  return await StreamReaction.create(payload);
};

const getReactions = async (studioId, options = {}) => {
  if (!studioId) throw badRequest('studioId is required');

  const where = { studioId };
  if (options.type) {
    if (!REACTION_TYPES.includes(options.type)) throw badRequest('Invalid reaction type');
    where.type = options.type;
  }

  return await StreamReaction.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: normalizeLimit(options.limit),
  });
};

const createSongRequest = async (data) => {
  const payload = validate(schemas.songRequest, data);
  return await SongRequest.create({
    ...payload,
    votedBy: [payload.username],
  });
};

const voteSongRequest = async ({ studioId, requestId, username }) => {
  const payload = validate(schemas.songRequestVote, { studioId, requestId, username });
  const request = await SongRequest.findOne({
    where: { id: payload.requestId, studioId: payload.studioId },
  });

  if (!request) throw notFound('Song request not found');

  const votedBy = Array.isArray(request.votedBy) ? request.votedBy : [];
  if (!votedBy.includes(payload.username)) {
    votedBy.push(payload.username);
    request.votes += 1;
    request.votedBy = votedBy;
    await request.save();
  }

  return request;
};

const updateSongRequestStatus = async ({ studioId, requestId, status }) => {
  const payload = validate(schemas.songRequestStatus, { studioId, requestId, status });
  const request = await SongRequest.findOne({
    where: { id: payload.requestId, studioId: payload.studioId },
  });

  if (!request) throw notFound('Song request not found');

  request.status = payload.status;
  await request.save();
  return request;
};

const getSongRequests = async (studioId, options = {}) => {
  if (!studioId) throw badRequest('studioId is required');

  const where = { studioId };
  if (options.status) {
    if (!SONG_REQUEST_STATUSES.includes(options.status)) throw badRequest('Invalid song request status');
    where.status = options.status;
  }

  return await SongRequest.findAll({
    where,
    order: [
      ['votes', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit: normalizeLimit(options.limit),
  });
};

const startLiveSession = async ({ streamId, streamName, viewerCount = 0 }) => {
  const payload = validate(schemas.liveSessionStart, { streamId, streamName, viewerCount });

  const [session] = await LiveSession.findOrCreate({
    where: { streamId: payload.streamId, status: 'live' },
    defaults: {
      streamId: payload.streamId,
      streamName: payload.streamName,
      peakViewers: payload.viewerCount,
      lastViewerCount: payload.viewerCount,
    },
  });

  if (session.streamName !== payload.streamName || session.lastViewerCount !== payload.viewerCount) {
    session.streamName = payload.streamName;
    session.lastViewerCount = payload.viewerCount;
    session.peakViewers = Math.max(session.peakViewers || 0, payload.viewerCount);
    await session.save();
  }

  if (uuidPattern.test(payload.streamId)) {
    await Stream.update({ isLive: true, viewers: payload.viewerCount }, { where: { id: payload.streamId } });
  }

  return session;
};

const updateLiveSessionViewers = async (streamId, viewerCount) => {
  if (!streamId) return null;

  const count = Math.max(0, Number(viewerCount || 0));
  const session = await LiveSession.findOne({ where: { streamId, status: 'live' } });
  if (!session) return null;

  session.lastViewerCount = count;
  session.peakViewers = Math.max(session.peakViewers || 0, count);
  await session.save();
  return session;
};

const endLiveSession = async ({ streamId, viewerCount = 0 }) => {
  const payload = validate(schemas.liveSessionEnd, { streamId, viewerCount });
  const session = await LiveSession.findOne({
    where: { streamId: payload.streamId, status: 'live' },
    order: [['createdAt', 'DESC']],
  });

  if (!session) return null;

  session.status = 'ended';
  session.endedAt = new Date();
  session.lastViewerCount = payload.viewerCount;
  session.peakViewers = Math.max(session.peakViewers || 0, payload.viewerCount);
  await session.save();

  if (uuidPattern.test(payload.streamId)) {
    await Stream.update({ isLive: false, viewers: payload.viewerCount }, { where: { id: payload.streamId } });
  }

  return session;
};

const getLiveSessions = async (options = {}) => {
  const where = {};
  if (options.streamId) where.streamId = options.streamId;
  if (options.status) {
    if (!LIVE_SESSION_STATUSES.includes(options.status)) throw badRequest('Invalid live session status');
    where.status = options.status;
  }

  return await LiveSession.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: normalizeLimit(options.limit),
  });
};

const getActivitySummary = async () => {
  const [
    totalMessages,
    totalSongRequests,
    pendingSongRequests,
    totalReactions,
    totalLikes,
    totalGifts,
    totalStickers,
    activeLiveSessions,
  ] = await Promise.all([
    ChatMessage.count(),
    SongRequest.count(),
    SongRequest.count({ where: { status: 'pending' } }),
    StreamReaction.count(),
    StreamReaction.count({ where: { type: 'like' } }),
    StreamReaction.count({ where: { type: 'gift' } }),
    StreamReaction.count({ where: { type: 'sticker' } }),
    LiveSession.count({ where: { status: 'live' } }),
  ]);

  return {
    messages: totalMessages,
    songRequests: { total: totalSongRequests, pending: pendingSongRequests },
    reactions: {
      total: totalReactions,
      likes: totalLikes,
      gifts: totalGifts,
      stickers: totalStickers,
    },
    liveSessions: { active: activeLiveSessions },
  };
};

module.exports = {
  createMessage,
  pinMessage,
  getMessages,
  createReaction,
  getReactions,
  createSongRequest,
  voteSongRequest,
  updateSongRequestStatus,
  getSongRequests,
  startLiveSession,
  updateLiveSessionViewers,
  endLiveSession,
  getLiveSessions,
  getActivitySummary,
};
