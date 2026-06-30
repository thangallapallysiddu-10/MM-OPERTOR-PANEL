const { Stream, Track } = require('../models/stream.model');
const {
  RjStudio,
  RjPlaylistItem,
  RjLocalFile,
  RjNotification,
  RjChatBan,
} = require('../models/rj.model');
const rjProfileService = require('./rj.profile.service');
const chatSocket = require('../sockets/chat.socket');
const activityService = require('./activity.service');
const streamService = require('./stream.service');
const { deleteUploadedFile } = require('./audio.service');
const { badRequest, notFound } = require('../utils/errors');
const { schemas, validate } = require('../utils/validators');
const {
  DEFAULT_DUAL_PLAYER,
  DEFAULT_STATS,
  DEFAULT_OPERATOR_PROFILE,
  DEFAULT_MICS,
  LIBRARY_CATALOG,
  parseDurationSeconds,
} = require('./rj.defaults');
const {
  resetTrackPlayhead,
  pauseTrackPlayhead,
  resumeTrackPlayhead,
  tickSessionMinutes,
  shouldAdvanceTrack,
  getTrackElapsedMs,
} = require('./rj.playlist');

const normalizeStudioId = (studioId) => {
  const id = String(studioId || '').trim();
  if (!id) throw badRequest('studioId is required');
  return id;
};

const CHAT_GIFT_OPTIONS = [
  { id: 'gold-mic', emoji: '🎤', label: 'Gold Mic', points: 100 },
  { id: 'party-rocket', emoji: '🚀', label: 'Party Rocket', points: 250 },
  { id: 'diamond-vinyl', emoji: '💿', label: 'Diamond Vinyl', points: 400 },
  { id: 'crown-wave', emoji: '👑', label: 'Crown Wave', points: 600 },
  { id: 'firestorm', emoji: '🔥', label: 'Firestorm', points: 800 },
];

const CHAT_EMOJI_OPTIONS = [
  { id: 'hype', emoji: '🙌', label: 'Hype' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'vibe', emoji: '🕺', label: 'Vibe' },
  { id: 'shock', emoji: '😮', label: 'Shock' },
  { id: 'goat', emoji: '🐐', label: 'GOAT' },
];

const toClientStudio = (studio) => {
  const data = studio.get ? studio.get({ plain: true }) : { ...studio };
  return data;
};

const buildDefaultStudioPayload = (streamId) => ({
  streamId,
  dualPlayer: { ...DEFAULT_DUAL_PLAYER },
  mics: [...DEFAULT_MICS],
  stats: { ...DEFAULT_STATS },
  listenerHistory: [],
  announcement: { visible: false, message: '' },
  operatorProfile: JSON.parse(JSON.stringify(DEFAULT_OPERATOR_PROFILE)),
});

const getOrCreateStudio = async (studioId) => {
  const id = normalizeStudioId(studioId);
  let studio = await RjStudio.findByPk(id);
  if (!studio) {
    studio = await RjStudio.create(buildDefaultStudioPayload(id));
  }

  return studio;
};

const serializeTrack = (track) => {
  if (!track) return null;
  const plain = track.toJSON ? track.toJSON() : track;
  return {
    id: plain.id,
    title: plain.title,
    artist: plain.artist,
    duration: plain.duration,
    bpm: plain.bpm || 120,
    channel: plain.channel || 1,
    fileUrl: plain.fileUrl,
    beatIntensity: plain.beatIntensity || 70,
    shortTitle: plain.shortTitle || String(plain.title || '').substring(0, 6).toUpperCase(),
    gain: plain.gain ?? 70,
    eq: plain.eq || { low: 50, mid: 50, high: 50 },
    fx: plain.fx || { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
  };
};

const formatStudioBundle = async (studio) => {
  const streamId = studio.streamId;
  const [playlist, localFiles, notifications, bans, messages, reactions] = await Promise.all([
    RjPlaylistItem.findAll({ where: { streamId }, order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] }),
    RjLocalFile.findAll({ where: { streamId }, order: [['createdAt', 'DESC']] }),
    RjNotification.findAll({ where: { streamId }, order: [['createdAt', 'DESC']], limit: 50 }),
    RjChatBan.findAll({ where: { streamId }, order: [['createdAt', 'DESC']] }),
    activityService.getMessages(streamId, { limit: 100 }),
    activityService.getReactions(streamId, { limit: 50 }),
  ]);

  // ── DIAGNOSTIC: P0 phantom-file trace ──────────────────────────────────
  console.log('[formatStudioBundle] streamId:', streamId);
  console.log('[formatStudioBundle] localFiles in DB:', localFiles.map((f) => ({ id: f.id, name: f.name })));
  console.log('[formatStudioBundle] playlist items in DB:', playlist.map((p) => ({ id: p.id, title: p.title })));
  // ── END DIAGNOSTIC ───────────────────────────────────────────────────────

  const pinned = messages.find((m) => m.isPinned) || null;

  const studioJson = studio.toJSON();

  return {
    studio: studioJson,
    playlist: playlist.map((p) => p.toJSON()),
    localFiles: localFiles.map((f) => f.toJSON()),
    notifications: notifications.map((n) => n.toJSON()),
    bannedUsers: bans.map((b) => b.username),
    chat: {
      messages: messages.reverse().map((m) => ({
        id: m.id,
        user: m.username,
        text: m.text,
        time: m.createdAt,
        system: m.type === 'system',
        isPinned: m.isPinned,
      })),
      pinnedMessage: pinned
        ? { id: pinned.id, user: pinned.username, text: pinned.text, time: pinned.createdAt }
        : null,
    },
    reactions: reactions.map((r) => r.toJSON()),
    libraryCatalog: LIBRARY_CATALOG,
  };
};

const getStudioBundle = async (studioId) => {
  const studio = await getOrCreateStudio(studioId);
  return formatStudioBundle(studio);
};

const patchStudioState = async (studioId, patch) => {
  const payload = validate(schemas.rjStudioStatePatch, patch);
  const studio = await getOrCreateStudio(studioId);

  if (payload.dualPlayer) {
    studio.dualPlayer = { ...(studio.dualPlayer || DEFAULT_DUAL_PLAYER), ...payload.dualPlayer };
  }

  if (payload.mics) studio.mics = payload.mics;
  if (payload.stats) studio.stats = { ...(studio.stats || DEFAULT_STATS), ...payload.stats };
  if (payload.listenerHistory) studio.listenerHistory = payload.listenerHistory;
  if (payload.announcement !== undefined) studio.announcement = payload.announcement;

  const scalarFields = [
    'profileName', 'currentMood', 'currentTrack', 'liveTimerSeconds', 'isTimerPaused', 'activeListeners',
  ];
  scalarFields.forEach((key) => {
    if (payload[key] !== undefined) studio[key] = payload[key];
  });

  await studio.save();
  return studio;
};

const getLibraryCatalog = async (studioId) => {
  await getOrCreateStudio(studioId);
  const stream = await Stream.findByPk(studioId, { include: [Track] });
  const streamTracks = stream?.Tracks?.map((t) => ({
    title: t.title,
    artist: t.artist,
    duration: t.duration || '0:00',
    bpm: 120,
    trackId: t.id,
    source: 'track',
  })) || [];

  return [...LIBRARY_CATALOG.map((s) => ({ ...s, source: 'library' })), ...streamTracks];
};

const getNextPlaylistSortOrder = async (streamId) => {
  const maxItem = await RjPlaylistItem.findOne({
    where: { streamId },
    order: [['sortOrder', 'DESC']],
  });
  return maxItem ? maxItem.sortOrder + 1 : 0;
};

const normalizeDurationString = (duration) => {
  if (!duration || typeof duration !== 'string') return '0:00';
  const trimmed = duration.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed) || /^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const secs = parseInt(trimmed, 10);
  if (!Number.isNaN(secs) && secs >= 0) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return '0:00';
};

const addPlaylistItem = async (studioId, data) => {
  const payload = validate(schemas.rjPlaylistItem, data);
  payload.duration = normalizeDurationString(payload.duration);
  payload.title = payload.title.trim();
  payload.artist = (payload.artist || 'Unknown').trim();
  const streamId = normalizeStudioId(studioId);
  await getOrCreateStudio(streamId);

  const duplicate = await RjPlaylistItem.findOne({
    where: { streamId, title: payload.title, artist: payload.artist },
  });
  if (duplicate) throw badRequest(`"${payload.title}" is already in the playlist`);

  const item = await RjPlaylistItem.create({
    ...payload,
    streamId,
    sortOrder: await getNextPlaylistSortOrder(streamId),
  });

  await createNotification(streamId, {
    title: 'Playlist',
    message: `Added "${payload.title}" to playlist`,
    type: 'system',
  });

  return item;
};

const addPlaylistFromLibrary = async (studioId, { title, artist }) => {
  const catalog = await getLibraryCatalog(studioId);
  const match = catalog.find(
    (s) => s.title.toLowerCase() === String(title).toLowerCase()
      && (!artist || s.artist.toLowerCase() === String(artist).toLowerCase())
  );
  if (!match) throw notFound('Song not found in library');

  return addPlaylistItem(studioId, {
    title: match.title,
    artist: match.artist,
    duration: match.duration,
    bpm: match.bpm || 120,
    source: match.source || 'library',
    trackId: match.trackId || null,
  });
};

const removePlaylistItem = async (studioId, itemId) => {
  const streamId = normalizeStudioId(studioId);

  // Log what we're looking for so mismatches are visible in the server console.
  console.log('[removePlaylistItem] studioId:', studioId, '→ streamId:', streamId, 'itemId:', itemId);

  // First check the item exists and belongs to this studio.
  const item = await RjPlaylistItem.findByPk(itemId);
  console.log('[removePlaylistItem] found item:', item ? { id: item.id, streamId: item.streamId, title: item.title } : null);

  if (!item) throw notFound('Playlist item not found');
  if (item.streamId !== streamId) {
    console.warn('[removePlaylistItem] streamId mismatch — item.streamId:', item.streamId, 'requested streamId:', streamId);
    throw notFound('Playlist item not found');
  }

  await item.destroy();
  console.log('[removePlaylistItem] deleted itemId:', itemId);
};

const reorderPlaylist = async (studioId, orderedIds) => {
  const payload = validate(schemas.rjPlaylistReorder, { orderedIds });
  const streamId = normalizeStudioId(studioId);

  await Promise.all(
    payload.orderedIds.map((id, index) =>
      RjPlaylistItem.update({ sortOrder: index }, { where: { id, streamId } })
    )
  );

  return RjPlaylistItem.findAll({ where: { streamId }, order: [['sortOrder', 'ASC']] });
};

const clearPlaylist = async (studioId) => {
  await RjPlaylistItem.destroy({ where: { streamId: normalizeStudioId(studioId) } });
};

const resolveTrackForPlaylistItem = async (item) => {
  if (item.trackId) {
    const track = await Track.findByPk(item.trackId);
    if (track) return serializeTrack({ ...track.toJSON(), channel: item.metadata?.channel || 1 });
  }
  if (item.localFileId) {
    const file = await RjLocalFile.findByPk(item.localFileId);
    if (file) {
      const fileUrl = file.fileUrl?.startsWith('http')
        ? file.fileUrl
        : file.fileUrl;
      return {
        id: item.id,
        title: item.title,
        artist: 'Local File',
        duration: item.duration,
        bpm: item.bpm,
        channel: 1,
        fileUrl,
        audioUrl: fileUrl,
        beatIntensity: 70,
        shortTitle: item.title.substring(0, 6).toUpperCase(),
        gain: 70,
        eq: { low: 50, mid: 50, high: 50 },
        fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
      };
    }
  }
  const lib = LIBRARY_CATALOG.find((s) => s.title === item.title);
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    duration: item.duration,
    bpm: item.bpm,
    channel: 1,
    beatIntensity: lib ? 70 : 50,
    shortTitle: item.title.substring(0, 6).toUpperCase(),
    gain: 70,
    eq: { low: 50, mid: 50, high: 50 },
    fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
  };
};

const startPlaylistSession = async (studioId, options = {}) => {
  const streamId = normalizeStudioId(studioId);
  const studio = await getOrCreateStudio(streamId);
  const items = await RjPlaylistItem.findAll({ where: { streamId }, order: [['sortOrder', 'ASC']] });
  if (!items.length) throw badRequest('Cannot start an empty playlist');

  const sessionPayload = validate(schemas.rjPlaylistSession, options);
  const duration = sessionPayload.durationMinutes || studio.playlistDuration || 60;

  const firstTrack = await resolveTrackForPlaylistItem(items[0]);
  studio.isPlaylistActive = true;
  studio.isPlaylistPaused = false;
  studio.playlistDuration = duration;
  studio.playlistTimerRemaining = duration;
  studio.playlistCurrentIndex = 0;
  studio.playlistStartedAt = new Date();
  studio.playlistSessionLastTickAt = new Date();
  resetTrackPlayhead(studio);
  studio.currentTrack = firstTrack;
  studio.dualPlayer = {
    ...(studio.dualPlayer || DEFAULT_DUAL_PLAYER),
    playerATrack: firstTrack,
    activePlayer: 'A',
    crossfadeValue: 0,
    isCrossfading: false,
  };
  await studio.save();

  await createNotification(streamId, {
    title: 'Playlist',
    message: `Playlist started (${duration} min) — now playing: ${firstTrack.title}`,
    type: 'system',
  });

  return { studio: toClientStudio(studio), currentItem: items[0], currentTrack: firstTrack };
};

const pausePlaylistSession = async (studioId) => {
  const studio = await getOrCreateStudio(studioId);
  if (!studio.isPlaylistActive) throw badRequest('Playlist is not active');
  studio.isPlaylistPaused = true;
  pauseTrackPlayhead(studio);
  await studio.save();
  return toClientStudio(studio);
};

const resumePlaylistSession = async (studioId) => {
  const studio = await getOrCreateStudio(studioId);
  if (!studio.isPlaylistActive) throw badRequest('Playlist is not active');
  studio.isPlaylistPaused = false;
  resumeTrackPlayhead(studio);
  await studio.save();
  return toClientStudio(studio);
};

const stopPlaylistSession = async (studioId) => {
  const studio = await getOrCreateStudio(studioId);
  studio.isPlaylistActive = false;
  studio.isPlaylistPaused = false;
  studio.playlistTimerRemaining = 0;
  studio.playlistCurrentIndex = 0;
  studio.playlistStartedAt = null;
  studio.playlistTrackStartedAt = null;
  studio.playlistTrackElapsedMs = 0;
  studio.playlistSessionLastTickAt = null;
  await studio.save();
  return toClientStudio(studio);
};

const advancePlaylist = async (studioId) => {
  const streamId = normalizeStudioId(studioId);
  const studio = await getOrCreateStudio(streamId);
  if (!studio.isPlaylistActive) {
    throw badRequest('Playlist is not active');
  }
  // Allow advance even when paused (manual skip unpauses automatically)

  const items = await RjPlaylistItem.findAll({ where: { streamId }, order: [['sortOrder', 'ASC']] });
  const nextIndex = studio.playlistCurrentIndex + 1;
  if (nextIndex >= items.length) {
    // Last track — stop session and return completed flag with fresh studio state
    await stopPlaylistSession(streamId);
    const stoppedStudio = await getOrCreateStudio(streamId);
    await createNotification(streamId, {
      title: 'Playlist',
      message: 'Playlist completed',
      type: 'system',
    });
    return { completed: true, studio: toClientStudio(stoppedStudio) };
  }

  const nextTrack = await resolveTrackForPlaylistItem(items[nextIndex]);
  studio.playlistCurrentIndex = nextIndex;
  studio.currentTrack = nextTrack;
  // Un-pause if skipping while paused
  studio.isPlaylistPaused = false;

  const dual = studio.dualPlayer || { ...DEFAULT_DUAL_PLAYER };
  if (dual.activePlayer === 'A') {
    dual.playerBTrack = nextTrack;
    dual.activePlayer = 'B';
    dual.crossfadeValue = 100;
  } else {
    dual.playerATrack = nextTrack;
    dual.activePlayer = 'A';
    dual.crossfadeValue = 0;
  }
  dual.isCrossfading = false;
  studio.dualPlayer = dual;
  resetTrackPlayhead(studio);
  await studio.save();

  return {
    completed: false,
    studio: toClientStudio(studio),
    currentItem: items[nextIndex],
    currentTrack: nextTrack,
  };
};

const playLibraryTrackOnDual = (dual, track) => {
  const serialized = serializeTrack(track);
  if (dual.activePlayer === 'A') {
    dual.playerBTrack = serialized;
    dual.activePlayer = 'B';
    dual.crossfadeValue = 100;
  } else {
    dual.playerATrack = serialized;
    dual.activePlayer = 'A';
    dual.crossfadeValue = 0;
  }
  dual.isCrossfading = false;
  return serialized;
};

const resolveLibraryIndex = async (studioId, studio, direction) => {
  const catalog = await getLibraryCatalog(studioId);
  if (!catalog.length) throw notFound('Library is empty');
  const currentTitle = studio.currentTrack?.title;
  let idx = 0;
  if (currentTitle) {
    const found = catalog.findIndex(
      (s) => s.title.toLowerCase() === String(currentTitle).toLowerCase()
    );
    if (found >= 0) {
      idx = direction === 'prev'
        ? (found - 1 + catalog.length) % catalog.length
        : (found + 1) % catalog.length;
    }
  }
  return { catalog, match: catalog[idx] };
};

const applyDualPlayerAction = async (studioId, body) => {
  const payload = validate(schemas.rjDualPlayerAction, body);
  const studio = await getOrCreateStudio(studioId);
  const dual = { ...(studio.dualPlayer || DEFAULT_DUAL_PLAYER) };

  switch (payload.action) {
    case 'load_to_player': {
      if (!payload.track) throw badRequest('track is required for load_to_player');
      const track = serializeTrack(payload.track);
      const target = payload.playerId || 'A';
      if (target === 'A') {
        dual.playerATrack = track;
        dual.isPlayingA = false;
      } else {
        dual.playerBTrack = track;
        dual.isPlayingB = false;
      }
      break;
    }
    case 'load_standby': {
      if (!payload.track) throw badRequest('track is required for load_standby');
      const track = serializeTrack(payload.track);
      if (dual.activePlayer === 'A') {
        dual.playerBTrack = track;
        dual.isPlayingB = false;
      } else {
        dual.playerATrack = track;
        dual.isPlayingA = false;
      }
      break;
    }
    case 'play_standby': {
      const target = payload.playerId || (dual.activePlayer === 'A' ? 'B' : 'A');
      if (target === 'A' && dual.playerATrack) {
        dual.activePlayer = 'A';
        dual.isPlayingA = true;
        dual.crossfadeValue = 0;
        studio.currentTrack = dual.playerATrack;
      } else if (target === 'B' && dual.playerBTrack) {
        dual.activePlayer = 'B';
        dual.isPlayingB = true;
        dual.crossfadeValue = 100;
        studio.currentTrack = dual.playerBTrack;
      }
      break;
    }
    case 'switch_a_to_b': {
      if (!dual.playerATrack) throw badRequest('No track loaded in Player A');
      dual.playerBTrack = dual.playerATrack;
      dual.playerATrack = null;
      dual.isPlayingB = dual.isPlayingA;
      dual.isPlayingA = false;
      if (dual.activePlayer === 'A') {
        dual.activePlayer = 'B';
        dual.crossfadeValue = 100;
        studio.currentTrack = dual.playerBTrack;
      }
      break;
    }
    case 'crossfade_to_a':
      dual.activePlayer = 'A';
      dual.isPlayingA = true;
      dual.crossfadeValue = 0;
      studio.currentTrack = dual.playerATrack;
      break;
    case 'crossfade_to_b':
      dual.activePlayer = 'B';
      dual.isPlayingB = true;
      dual.crossfadeValue = 100;
      studio.currentTrack = dual.playerBTrack;
      break;
    case 'clear_deck': {
      const target = payload.playerId;
      if (target === 'A') {
        dual.playerATrack = null;
        dual.isPlayingA = false;
        if (dual.activePlayer === 'A') studio.currentTrack = null;
      } else if (target === 'B') {
        dual.playerBTrack = null;
        dual.isPlayingB = false;
        if (dual.activePlayer === 'B') studio.currentTrack = null;
      }
      break;
    }
    case 'set_crossfade':
      dual.crossfadeValue = payload.crossfadeValue ?? dual.crossfadeValue;
      break;
    case 'pause_active':
      if (dual.activePlayer === 'A') dual.isPlayingA = false;
      else dual.isPlayingB = false;
      break;
    case 'stop_active':
      if (dual.activePlayer === 'A') dual.isPlayingA = false;
      else dual.isPlayingB = false;
      break;
    case 'stop_standby': {
      const target = payload.playerId || (dual.activePlayer === 'A' ? 'B' : 'A');
      if (target === 'A') {
        dual.isPlayingA = false;
      } else {
        dual.isPlayingB = false;
      }
      break;
    }
    case 'pause_standby':
      if (payload.playerId === 'A' || (dual.activePlayer === 'B' && !payload.playerId)) {
        dual.isPlayingA = false;
      } else {
        dual.isPlayingB = false;
      }
      break;
    case 'toggle_play': {
      const target = payload.playerId || dual.activePlayer;
      if (target === 'A' && dual.playerATrack) dual.isPlayingA = !dual.isPlayingA;
      else if (target === 'B' && dual.playerBTrack) dual.isPlayingB = !dual.isPlayingB;
      break;
    }
    case 'library_next': {
      const { match } = await resolveLibraryIndex(studioId, studio, 'next');
      studio.currentTrack = playLibraryTrackOnDual(dual, {
        ...match,
        id: match.trackId || 0,
        channel: 1,
        beatIntensity: 70,
      });
      break;
    }
    case 'library_prev': {
      const { match } = await resolveLibraryIndex(studioId, studio, 'prev');
      studio.currentTrack = playLibraryTrackOnDual(dual, {
        ...match,
        id: match.trackId || 0,
        channel: 1,
        beatIntensity: 70,
      });
      break;
    }
    case 'clear_all':
      Object.assign(dual, { ...DEFAULT_DUAL_PLAYER });
      studio.currentTrack = null;
      break;
    default:
      throw badRequest('Unknown dual player action');
  }

  studio.dualPlayer = dual;
  await studio.save();
  return toClientStudio(studio);
};


const patchMic = async (studioId, body) => {
  const payload = validate(schemas.rjMicPatch, body);
  const studio = await getOrCreateStudio(studioId);
  const mics = [...(studio.mics || DEFAULT_MICS)];
  const idx = mics.findIndex((m) => m.id === payload.micId);
  if (idx === -1) throw notFound('Mic not found');

  const { micId, ...updates } = payload;
  mics[idx] = { ...mics[idx], ...updates };
  studio.mics = mics;
  await studio.save();
  return studio;
};

const addMic = async (studioId, body) => {
  const payload = validate(schemas.rjMicCreate, body);
  const studio = await getOrCreateStudio(studioId);
  const mics = [...(studio.mics || DEFAULT_MICS)];

  const id = `mic-${Date.now()}`;
  mics.push({
    id,
    name: payload.name.toUpperCase(),
    avatar: payload.avatar || payload.name.substring(0, 2).toUpperCase(),
    isActive: false,
    isMuted: false,
    volume: 0,
  });
  studio.mics = mics;
  await studio.save();
  return studio;
};

const removeMic = async (studioId, micId) => {
  const studio = await getOrCreateStudio(studioId);
  const mics = (studio.mics || []).filter((m) => m.id !== micId);
  if (mics.length === (studio.mics || []).length) throw notFound('Mic not found');
  if (mics.length < 2) throw badRequest('At least two mic slots are required');
  studio.mics = mics;
  await studio.save();
  return studio;
};

const addLocalFile = async (studioId, fileInfo, meta = {}) => {
  const streamId = normalizeStudioId(studioId);
  await getOrCreateStudio(streamId);

  return RjLocalFile.create({
    streamId,
    name: meta.name || fileInfo.originalName || fileInfo.fileName,
    fileUrl: fileInfo.filePath,
    fileSize: fileInfo.fileSize,
    fileSizeBytes: fileInfo.fileSizeBytes,
    duration: meta.duration || '0:00',
    format: fileInfo.audioFormat || meta.format || 'mp3',
  });
};

const listLocalFiles = async (studioId) => {
  return RjLocalFile.findAll({
    where: { streamId: normalizeStudioId(studioId) },
    order: [['createdAt', 'DESC']],
  });
};

const deleteLocalFile = async (studioId, fileId) => {
  const streamId = normalizeStudioId(studioId);
  console.log('[deleteLocalFile] studioId:', studioId, '→ streamId:', streamId, 'fileId:', fileId);

  const file = await RjLocalFile.findOne({
    where: { id: fileId, streamId },
  });

  if (!file) {
    console.warn('[deleteLocalFile] NOT FOUND in DB — fileId:', fileId, 'streamId:', streamId);
    throw notFound('Local file not found');
  }

  console.log('[deleteLocalFile] Found file:', file.name, 'fileUrl:', file.fileUrl, '— deleting...');
  await deleteUploadedFile(file.fileUrl);
  await file.destroy();
  await RjPlaylistItem.destroy({ where: { localFileId: fileId } });
  console.log('[deleteLocalFile] DB record destroyed for fileId:', fileId);
};

const loadLocalFileToStandby = async (studioId, fileId, playerId = 'A') => {
  const file = await RjLocalFile.findOne({
    where: { id: fileId, streamId: normalizeStudioId(studioId) },
  });
  if (!file) throw notFound('Local file not found');

  const title = file.name.replace(/\.[^/.]+$/, '');
  const track = {
    id: file.id,
    title,
    artist: 'Local File',
    duration: file.duration,
    bpm: 120,
    channel: 1,
    fileUrl: file.fileUrl,
    beatIntensity: 70,
    shortTitle: title.substring(0, 6).toUpperCase(),
    gain: 70,
    eq: { low: 50, mid: 50, high: 50 },
    fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
  };

  return applyDualPlayerAction(studioId, { action: 'load_to_player', track, playerId });
};

const createNotification = async (studioId, data) => {
  const payload = validate(schemas.rjNotification, data);
  return RjNotification.create({
    ...payload,
    streamId: normalizeStudioId(studioId),
  });
};

const listNotifications = async (studioId, options = {}) => {
  const where = { streamId: normalizeStudioId(studioId) };
  if (options.unreadOnly) where.read = false;
  return RjNotification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Math.min(Number(options.limit) || 50, 200),
  });
};

const markNotificationRead = async (studioId, notificationId) => {
  const notification = await RjNotification.findOne({
    where: { id: notificationId, streamId: normalizeStudioId(studioId) },
  });
  if (!notification) throw notFound('Notification not found');
  notification.read = true;
  await notification.save();
  return notification;
};

const markAllNotificationsRead = async (studioId) => {
  await RjNotification.update(
    { read: true },
    { where: { streamId: normalizeStudioId(studioId), read: false } }
  );
};

const banUser = async (studioId, body) => {
  const payload = validate(schemas.rjChatBan, body);
  const streamId = normalizeStudioId(studioId);
  const cooldownUntil = payload.mode === 'cooldown'
    ? new Date(Date.now() + payload.cooldownMinutes * 60 * 1000)
    : null;
  const [ban] = await RjChatBan.findOrCreate({
    where: { streamId, username: payload.username },
    defaults: {
      reason: payload.reason || null,
      mode: payload.mode,
      cooldownUntil,
    },
  });
  if (!ban.isNewRecord) {
    ban.reason = payload.reason || ban.reason || null;
    ban.mode = payload.mode;
    ban.cooldownUntil = cooldownUntil;
    await ban.save();
  }

  const durationStr = payload.mode === 'cooldown' ? `for ${payload.cooldownMinutes} minutes` : 'permanently';
  const reasonStr = payload.reason ? ` Reason: ${payload.reason}` : '';
  chatSocket.emitSystemMessage(streamId, `User ${payload.username} has been restricted ${durationStr}.${reasonStr}`);

  return ban;
};

const unbanUser = async (studioId, username) => {
  const streamId = normalizeStudioId(studioId);
  const deleted = await RjChatBan.destroy({
    where: { streamId, username: String(username).trim() },
  });
  if (!deleted) throw notFound('User is not banned');

  chatSocket.emitSystemMessage(streamId, `User ${username} has been unbanned.`);
};

const listBans = async (studioId) => {
  const rows = await RjChatBan.findAll({
    where: { streamId: normalizeStudioId(studioId) },
    order: [['createdAt', 'DESC']],
  });
  const now = Date.now();
  return rows.map((row) => {
    const plain = row.toJSON();
    const until = plain.cooldownUntil ? new Date(plain.cooldownUntil).getTime() : null;
    return {
      ...plain,
      activeCooldown: Boolean(until && until > now),
      cooldownRemainingSeconds: until && until > now ? Math.ceil((until - now) / 1000) : 0,
    };
  });
};

const clearChat = async (studioId) => {
  const streamId = normalizeStudioId(studioId);
  chatSocket.emitSystemMessage(streamId, 'Chat cleared by operator');
  const { ChatMessage } = require('../models/activity.model');
  await ChatMessage.destroy({ where: { studioId: streamId } });
};

const postChatMessage = async (studioId, body) => {
  const payload = validate(schemas.rjChatPost, body);
  const streamId = normalizeStudioId(studioId);
  const username = payload.username;

  const banned = await RjChatBan.findOne({ where: { streamId, username } });
  if (banned) {
    if (banned.mode === 'ban') {
      throw badRequest(`User "${username}" is blocked`);
    }
    const until = banned.cooldownUntil ? new Date(banned.cooldownUntil).getTime() : 0;
    if (until > Date.now()) {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      const err = badRequest(`User "${username}" is on cooldown`);
      err.data = { code: 'CHAT_COOLDOWN', remainingSeconds: remaining };
      throw err;
    }
    await banned.destroy();
  }

  return activityService.createMessage({
    studioId: streamId,
    username,
    text: payload.text,
    type: payload.type,
  });
};

const getChatOptions = async (studioId) => {
  await getOrCreateStudio(studioId);
  return {
    gifts: CHAT_GIFT_OPTIONS,
    emojis: CHAT_EMOJI_OPTIONS,
  };
};

const sendGift = async (studioId, body) => {
  const payload = validate(schemas.rjChatGift, body);
  const chosen = CHAT_GIFT_OPTIONS.find((g) => g.id === payload.giftId);
  if (!chosen) throw badRequest('Invalid gift');
  return postChatMessage(studioId, {
    username: payload.username || 'RJ',
    text: `${chosen.emoji} sent ${chosen.label}!`,
    type: 'system',
  });
};

const sendEmoji = async (studioId, body) => {
  const payload = validate(schemas.rjChatEmoji, body);
  const chosen = CHAT_EMOJI_OPTIONS.find((e) => e.id === payload.emojiId);
  if (!chosen) throw badRequest('Invalid emoji');
  return postChatMessage(studioId, {
    username: payload.username || 'RJ',
    text: `${payload.emoji} ${payload.label || chosen.label}`,
    type: 'message',
  });
};

const pinChatMessage = async (studioId, messageId, text) => {
  return activityService.pinMessage({
    studioId: normalizeStudioId(studioId),
    messageId,
    text,
  });
};

const setAnnouncement = async (studioId, body) => {
  const payload = validate(schemas.rjAnnouncement, body);
  const studio = await getOrCreateStudio(studioId);
  studio.announcement = { visible: payload.visible, message: payload.message };
  await studio.save();

  if (payload.visible) {
    await activityService.createMessage({
      studioId: normalizeStudioId(studioId),
      username: 'System',
      text: `📢 ${payload.message}`,
      type: 'system',
    });
  }
  return studio;
};

const patchStats = async (studioId, body) => {
  const payload = validate(schemas.rjStatsPatch, body);
  const studio = await getOrCreateStudio(studioId);
  const stats = { ...(studio.stats || DEFAULT_STATS) };

  if (payload.listeners !== undefined) stats.listeners = payload.listeners;
  if (payload.likes !== undefined) stats.likes = payload.likes;
  if (payload.subscribers !== undefined) stats.subscribers = payload.subscribers;
  if (payload.followers !== undefined) stats.followers = payload.followers;
  if (payload.shares !== undefined) stats.shares = payload.shares;

  if (payload.increment) {
    Object.entries(payload.increment).forEach(([key, val]) => {
      if (typeof stats[key] === 'number' && typeof val === 'number') {
        stats[key] = Math.max(0, stats[key] + val);
      }
    });
  }

  studio.stats = stats;
  if (payload.listeners !== undefined || payload.increment?.listeners) {
    const listeners = stats.listeners;
    const history = Array.isArray(studio.listenerHistory) ? [...studio.listenerHistory] : [];
    history.push(listeners);
    studio.listenerHistory = history.slice(-24);
    studio.activeListeners = listeners;
  }

  await studio.save();
  return studio;
};

const syncListenerCount = async (studioId, count) => {
  return patchStats(studioId, { listeners: Math.max(0, Number(count) || 0) });
};

const goLive = async (studioId, body = {}) => {
  const payload = validate(schemas.rjGoLive, body);
  const streamId = normalizeStudioId(studioId);
  const studio = await getOrCreateStudio(streamId);

  try {
    await streamService.toggleLive(streamId, true);
  } catch (err) {
    if (err.statusCode !== 404) throw err;
  }

  await clearChat(streamId);
  await RjNotification.destroy({ where: { streamId } });

  await activityService.startLiveSession({
    streamId,
    streamName: payload.streamName,
    viewerCount: payload.viewerCount,
  });

  studio.isLive = true;
  studio.isTimerPaused = false;
  studio.liveTimerStartedAt = new Date();
  studio.liveTimerSeconds = 0;
  await studio.save();

  await createNotification(streamId, {
    title: 'Live',
    message: `${payload.streamName} is now live`,
    type: 'system',
  });

  return studio;
};

const stopLive = async (studioId, body = {}) => {
  const payload = validate(schemas.rjStopLive, body);
  const streamId = normalizeStudioId(studioId);
  const studio = await getOrCreateStudio(streamId);

  try {
    await streamService.toggleLive(streamId, false);
  } catch (err) {
    if (err.statusCode !== 404) throw err;
  }

  const endedSession = await activityService.endLiveSession({
    streamId,
    viewerCount: payload.viewerCount,
  });
  if (endedSession) {
    const { recordEndedLiveSession } = require('./rj.profile.service');
    await recordEndedLiveSession(streamId, endedSession).catch(() => {});
  }
  await stopPlaylistSession(streamId);

  await clearChat(streamId);
  await RjNotification.destroy({ where: { streamId } });

  studio.isLive = false;
  studio.isTimerPaused = true;
  studio.liveTimerStartedAt = null;
  studio.liveTimerSeconds = 0;
  await studio.save();

  await createNotification(streamId, {
    title: 'Live',
    message: 'Broadcast ended',
    type: 'system',
  });

  return studio;
};

const tickLiveTimer = async (studioId) => {
  const studio = await getOrCreateStudio(studioId);
  if (!studio.isLive || studio.isTimerPaused) return studio;

  studio.liveTimerSeconds = (studio.liveTimerSeconds || 0) + 1;
  await studio.save();
  return studio;
};

const tickPlaylistTimer = async (studioId) => {
  const streamId = normalizeStudioId(studioId);
  let studio = await getOrCreateStudio(streamId);
  if (!studio.isPlaylistActive || studio.isPlaylistPaused) {
    return { studio, advanced: false, trackElapsedMs: 0, trackDurationMs: 0 };
  }

  const items = await RjPlaylistItem.findAll({
    where: { streamId },
    order: [['sortOrder', 'ASC']],
  });
  const current = items[studio.playlistCurrentIndex];
  const trackDurationMs = current ? parseDurationSeconds(current.duration) * 1000 : 0;

  if (!studio.playlistTrackStartedAt && current) {
    resetTrackPlayhead(studio);
    await studio.save();
  }

  const sessionEnded = tickSessionMinutes(studio);
  if (sessionEnded) {
    await stopPlaylistSession(streamId);
    studio = await getOrCreateStudio(streamId);
    await createNotification(streamId, {
      title: 'Playlist',
      message: 'Playlist session time ended',
      type: 'system',
    });
    return {
      studio: toClientStudio(studio),
      advanced: false,
      completed: true,
      sessionEnded: true,
    };
  }

  if (current && shouldAdvanceTrack(studio, current)) {
    const result = await advancePlaylist(streamId);
    return {
      ...result,
      studio: result.studio,
      advanced: !result.completed,
      currentTrack: result.currentTrack,
      trackElapsedMs: 0,
      trackDurationMs: result.currentItem
        ? parseDurationSeconds(result.currentItem.duration) * 1000
        : 0,
    };
  }

  await studio.save();
  return {
    studio: toClientStudio(studio),
    advanced: false,
    trackElapsedMs: getTrackElapsedMs(studio),
    trackDurationMs,
    playlistTimerRemaining: studio.playlistTimerRemaining,
    playlistCurrentIndex: studio.playlistCurrentIndex,
  };
};

const resetStudio = async (studioId) => {
  const streamId = normalizeStudioId(studioId);
  await RjPlaylistItem.destroy({ where: { streamId } });
  await RjLocalFile.destroy({ where: { streamId } });
  await RjNotification.destroy({ where: { streamId } });
  await RjChatBan.destroy({ where: { streamId } });
  await RjStudio.destroy({ where: { streamId } });
  return getOrCreateStudio(streamId);
};

/**
 * patchMixer — updates mixer-related fields on the studio JSONB column.
 * Called by the `mixer_update` socket handler.
 * Accepted fields: mixerChannels, mixerCrossfader, masterGain, selectedFX, activeChannel
 */
const patchMixer = async (studioId, body) => {
  const studio = await getOrCreateStudio(studioId);
  const allowed = ['mixerChannels', 'mixerCrossfader', 'masterGain', 'selectedFX', 'activeChannel'];
  allowed.forEach((key) => {
    if (body[key] !== undefined) {
      studio[key] = body[key];
    }
  });
  // Persist mixer state inside the dualPlayer JSONB blob so it survives restarts
  const dual = { ...(studio.dualPlayer || DEFAULT_DUAL_PLAYER) };
  if (body.mixerCrossfader !== undefined) dual.crossfadeValue = Number(body.mixerCrossfader);
  if (body.masterGain !== undefined) dual.masterGain = Number(body.masterGain);
  if (body.selectedFX !== undefined) dual.selectedFX = body.selectedFX;
  if (body.activeChannel !== undefined) dual.activeChannel = Number(body.activeChannel);
  studio.dualPlayer = dual;
  if (body.activeChannel !== undefined) studio.activeChannel = Number(body.activeChannel);
  await studio.save();
  return studio;
};

/**
 * getMixerStateForClient — extracts mixer-related fields from a studio record
 * and returns a flat object that the frontend expects.
 */
const getMixerStateForClient = (studio) => {
  const s = studio.get ? studio.get({ plain: true }) : { ...studio };
  const dual = s.dualPlayer || {};
  return {
    mixerChannels: s.mixerChannels || dual.mixerChannels || [],
    mixerCrossfader: dual.crossfadeValue ?? s.mixerCrossfader ?? 0,
    masterGain: dual.masterGain ?? s.masterGain ?? 75,
    selectedFX: dual.selectedFX ?? s.selectedFX ?? '',
    activeChannel: dual.activeChannel ?? s.activeChannel ?? 1,
    crossfadeValue: dual.crossfadeValue ?? 0,
  };
};

module.exports = {
  getOrCreateStudio,
  getStudioBundle,
  patchStudioState,
  getLibraryCatalog,
  addPlaylistItem,
  addPlaylistFromLibrary,
  removePlaylistItem,
  reorderPlaylist,
  clearPlaylist,
  startPlaylistSession,
  pausePlaylistSession,
  resumePlaylistSession,
  stopPlaylistSession,
  advancePlaylist,
  applyDualPlayerAction,

  patchMixer,
  getMixerStateForClient,
  patchMic,
  addMic,
  removeMic,
  addLocalFile,
  listLocalFiles,
  deleteLocalFile,
  loadLocalFileToStandby,
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  banUser,
  unbanUser,
  listBans,
  clearChat,
  postChatMessage,
  getChatOptions,
  sendGift,
  sendEmoji,
  pinChatMessage,
  setAnnouncement,
  patchStats,
  syncListenerCount,
  goLive,
  stopLive,
  tickLiveTimer,
  tickPlaylistTimer,
  resetStudio,
  resolveTrackForPlaylistItem,
  serializeTrack,

  toClientStudio,
};
