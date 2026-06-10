const { Op } = require('sequelize');
const OperatorProfile = require('../models/operator.profile.model');
const { RjStudio } = require('../models/rj.model');
const activityService = require('./activity.service');
const podcastService = require('./podcast.service');
const { DEFAULT_OPERATOR_PROFILE } = require('./rj.defaults');
const { schemas, validate } = require('../utils/validators');
const { badRequest, notFound } = require('../utils/errors');

const DEFAULT_SOCIAL = {
  instagram: '',
  youtube: '',
  twitter: '',
  spotify: '',
  website: '',
  facebook: '',
};

const resolveAuthUid = (authUser) => {
  const key = authUser?.uid || authUser?.sub || authUser?.userId || authUser?.id;
  if (!key) throw badRequest('Authenticated user id required');
  return String(key).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
};

const legacyStudioIdFor = (authUid) => `op-profile-${authUid}`;

const mergeSocialLinks = (raw = {}) => ({
  ...DEFAULT_SOCIAL,
  ...(raw && typeof raw === 'object' ? raw : {}),
});

const rowToOperatorProfile = (row) => {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    displayName: plain.displayName || '',
    tagline: plain.tagline || '',
    bio: plain.bio || '',
    location: plain.location || '',
    email: plain.email || '',
    avatarUrl: plain.avatarUrl || '',
    avatarInitials: plain.avatarInitials || 'RJ',
    genres: Array.isArray(plain.genres) ? plain.genres : [],
    languages: Array.isArray(plain.languages) ? plain.languages : ['English'],
    timezone: plain.timezone || '',
    socialLinks: mergeSocialLinks(plain.socialLinks),
    podcastFollowers: plain.podcastFollowers || 0,
    bestLiveEvents: Array.isArray(plain.bestLiveEvents) ? plain.bestLiveEvents : [],
  };
};

const serializeProfileResponse = (row, extra = {}) => {
  const plain = row.get ? row.get({ plain: true }) : row;
  const operatorProfile = rowToOperatorProfile(plain);
  return {
    authUid: plain.authUid,
    streamId: plain.legacyStudioId || legacyStudioIdFor(plain.authUid),
    profileName: operatorProfile.displayName || 'RJ',
    currentMood: plain.currentMood || 'chill',
    isLive: extra.isLive ?? false,
    stats: {
      listeners: plain.rjListeners || 0,
      likes: plain.rjLikes || 0,
      subscribers: plain.rjSubscribers || 0,
      followers: plain.rjFollowers || 0,
      shares: plain.rjShares || 0,
    },
    operatorProfile,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const buildCreatePayload = (authUser) => {
  const authUid = resolveAuthUid(authUser);
  const legacy = DEFAULT_OPERATOR_PROFILE;
  return {
    authUid,
    legacyStudioId: legacyStudioIdFor(authUid),
    displayName: authUser?.name || '',
    email: authUser?.email || '',
    avatarInitials:
      (authUser?.name || 'RJ')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'RJ',
    socialLinks: { ...DEFAULT_SOCIAL },
    genres: [],
    languages: ['English'],
    bestLiveEvents: [],
  };
};

const migrateFromLegacyStudio = async (authUid) => {
  const legacyId = legacyStudioIdFor(authUid);
  const studio = await RjStudio.findByPk(legacyId);
  if (!studio) return null;

  const legacy = studio.operatorProfile && typeof studio.operatorProfile === 'object'
    ? studio.operatorProfile
    : {};
  const stats = studio.stats || {};

  return OperatorProfile.create({
    authUid,
    legacyStudioId: legacyId,
    displayName: legacy.displayName || studio.profileName || '',
    tagline: legacy.tagline || '',
    bio: legacy.bio || '',
    location: legacy.location || '',
    email: legacy.email || '',
    avatarUrl: legacy.avatarUrl || '',
    avatarInitials: legacy.avatarInitials || 'RJ',
    currentMood: studio.currentMood || 'chill',
    genres: Array.isArray(legacy.genres) ? legacy.genres : [],
    languages: Array.isArray(legacy.languages) ? legacy.languages : ['English'],
    timezone: legacy.timezone || '',
    socialLinks: mergeSocialLinks(legacy.socialLinks),
    podcastFollowers: legacy.podcastFollowers || 0,
    rjListeners: stats.listeners || 0,
    rjLikes: stats.likes || 0,
    rjSubscribers: stats.subscribers || 0,
    rjFollowers: stats.followers || 0,
    rjShares: stats.shares || 0,
    bestLiveEvents: Array.isArray(legacy.bestLiveEvents) ? legacy.bestLiveEvents : [],
  });
};

const seedFromAuth = (row, authUser) => {
  let dirty = false;
  if (authUser?.name && !row.displayName) {
    row.displayName = authUser.name;
    dirty = true;
  }
  if (authUser?.email && !row.email) {
    row.email = authUser.email;
    dirty = true;
  }
  return dirty;
};

const getOrCreateProfile = async (authUser) => {
  const authUid = resolveAuthUid(authUser);
  let row = await OperatorProfile.findByPk(authUid);
  if (!row) {
    try {
      row = await migrateFromLegacyStudio(authUid);
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      row = await OperatorProfile.findByPk(authUid);
    }
  }
  if (!row) {
    row = await OperatorProfile.create(buildCreatePayload(authUser));
  }
  if (seedFromAuth(row, authUser)) {
    await row.save();
  }
  return row;
};

const applyPatchToRow = (row, payload) => {
  if (payload.socialLinks) {
    row.socialLinks = mergeSocialLinks({ ...row.socialLinks, ...payload.socialLinks });
    delete payload.socialLinks;
  }
  const allowed = [
    'displayName',
    'tagline',
    'bio',
    'location',
    'email',
    'avatarUrl',
    'avatarInitials',
    'currentMood',
    'genres',
    'languages',
    'timezone',
    'podcastFollowers',
    'bestLiveEvents',
    'rjListeners',
    'rjLikes',
    'rjSubscribers',
    'rjFollowers',
    'rjShares',
  ];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) row[key] = payload[key];
  });
};

const formatSessionEvent = (session, type = 'rj') => {
  const started = session.startedAt || session.createdAt;
  const ended = session.endedAt || session.updatedAt;
  let durationMinutes = null;
  if (started && ended) {
    durationMinutes = Math.max(1, Math.round((new Date(ended) - new Date(started)) / 60000));
  }
  return {
    id: String(session.id),
    title: session.streamName || session.roomTitle || session.roomId || 'Live show',
    date: ended || started || new Date(),
    peakListeners: session.peakViewers || session.peakListeners || session.viewerCount || 0,
    durationMinutes,
    type,
  };
};

const appendBestLiveEvent = async (authUid, event) => {
  const row = await OperatorProfile.findByPk(authUid);
  if (!row) return;
  const events = Array.isArray(row.bestLiveEvents) ? [...row.bestLiveEvents] : [];
  if (!events.some((e) => String(e.id) === String(event.id))) {
    events.push(event);
  }
  events.sort((a, b) => (b.peakListeners || 0) - (a.peakListeners || 0));
  row.bestLiveEvents = events.slice(0, 8);
  await row.save();
};

const getProfileForAuthUser = async (authUser) => {
  const row = await getOrCreateProfile(authUser);
  let isLive = false;
  if (row.legacyStudioId) {
    const studio = await RjStudio.findByPk(row.legacyStudioId);
    isLive = !!studio?.isLive;
  }
  return serializeProfileResponse(row, { isLive });
};

const saveProfileForAuthUser = async (authUser, body) => {
  const payload = validate(schemas.operatorProfileSave, body);
  const row = await getOrCreateProfile(authUser);
  applyPatchToRow(row, payload);
  await row.save();
  return getProfileForAuthUser(authUser);
};

const patchProfileForAuthUser = async (authUser, body) => {
  const payload = validate(schemas.operatorProfilePatch, body);
  const row = await getOrCreateProfile(authUser);
  applyPatchToRow(row, payload);
  await row.save();
  return getProfileForAuthUser(authUser);
};

const updateAvatarForAuthUser = async (authUser, avatarUrl) => {
  const row = await getOrCreateProfile(authUser);
  row.avatarUrl = avatarUrl;
  await row.save();
  return getProfileForAuthUser(authUser);
};

const getProfileDashboardForAuthUser = async (authUser) => {
  const base = await getProfileForAuthUser(authUser);
  const streamId = base.streamId;

  const [rjSessions, podcastSessions, podcastsResult] = await Promise.all([
    activityService.getLiveSessions({ streamId, status: 'ended', limit: 12 }).catch(() => []),
    podcastService.getLiveSessions({ status: 'ended' }).catch(() => []),
    podcastService.getAllPodcasts({ limit: 50, page: 1 }).catch(() => ({ data: [] })),
  ]);
  const podcasts = podcastsResult?.data || [];

  const podcastEvents = (podcastSessions || [])
    .map((s) => formatSessionEvent(s, 'podcast'))
    .slice(0, 6);
  const rjEventsFromHistory = (rjSessions || []).map((s) => formatSessionEvent(s, 'rj'));
  const mergedEvents = [
    ...(base.operatorProfile.bestLiveEvents || []),
    ...rjEventsFromHistory,
    ...podcastEvents,
  ];
  const seen = new Set();
  const bestLiveEvents = mergedEvents
    .filter((e) => {
      const key = `${e.type}:${e.id}:${e.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.peakListeners || 0) - (a.peakListeners || 0))
    .slice(0, 8);

  const published = (podcasts || []).filter((p) => p.status === 'Published');
  const stats = base.stats;

  return {
    ...base,
    operatorProfile: { ...base.operatorProfile, bestLiveEvents },
    metrics: {
      rjFollowers: stats.followers || 0,
      rjListeners: stats.listeners || 0,
      rjLikes: stats.likes || 0,
      rjSubscribers: stats.subscribers || 0,
      rjShares: stats.shares || 0,
      podcastFollowers: base.operatorProfile.podcastFollowers || 0,
      podcastEpisodes: podcasts.length,
      podcastPublished: published.length,
      rjLiveSessions: (rjSessions || []).length,
      podcastLiveSessions: (podcastSessions || []).length,
    },
    bestLiveEvents,
    recentPodcasts: podcasts.slice(0, 6).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      duration: p.duration,
      coverArt: p.coverArt,
      createdAt: p.createdAt,
    })),
  };
};

const getProfileByLegacyStudioId = async (studioId) => {
  const id = String(studioId || '').trim();
  if (!id) throw badRequest('studioId is required');

  let row = await OperatorProfile.findOne({
    where: {
      [Op.or]: [{ legacyStudioId: id }, { authUid: id.replace(/^op-profile-/, '') }],
    },
  });

  if (!row && id.startsWith('op-profile-')) {
    const authUid = id.replace(/^op-profile-/, '');
    row = await OperatorProfile.findByPk(authUid);
    if (!row) {
      row = await migrateFromLegacyStudio(authUid);
    }
  }

  if (!row) throw notFound('Operator profile not found');
  return serializeProfileResponse(row);
};

const patchProfileByLegacyStudioId = async (studioId, body) => {
  const base = await getProfileByLegacyStudioId(studioId);
  const authUid = base.authUid;
  const payload = validate(schemas.operatorProfilePatch, body);
  const row = await OperatorProfile.findByPk(authUid);
  applyPatchToRow(row, payload);
  await row.save();
  return getProfileByLegacyStudioId(studioId);
};

const recordEndedLiveSession = async (studioId, session) => {
  if (!session) return;
  const studio = await RjStudio.findByPk(studioId);
  const authUid =
    studio?.ownerAuthUid ||
    (String(studioId).startsWith('op-profile-')
      ? String(studioId).replace(/^op-profile-/, '')
      : null);

  if (!authUid) return;

  await getOrCreateProfile({ uid: authUid });
  const event = formatSessionEvent(session, 'rj');
  if ((event.peakListeners || 0) > 0) {
    await appendBestLiveEvent(authUid, event);
  }
};

module.exports = {
  resolveAuthUid,
  getOrCreateProfile,
  getProfileForAuthUser,
  saveProfileForAuthUser,
  patchProfileForAuthUser,
  updateAvatarForAuthUser,
  getProfileDashboardForAuthUser,
  getProfileByLegacyStudioId,
  patchProfileByLegacyStudioId,
  getProfileDashboard: getProfileDashboardForAuthUser,
  recordEndedLiveSession,
  appendBestLiveEvent,
};
