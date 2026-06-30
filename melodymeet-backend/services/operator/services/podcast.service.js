const { Op } = require('sequelize');
const Podcast = require('../models/podcast.model');
const PodcastRecording = require('../models/podcast.recording.model');
const PodcastLiveSession = require('../models/podcast.live.model');
const PodcastGuest = require('../models/podcast.guest.model');
const PodcastMic = require('../models/podcast.mic.model');
const PodcastNotification = require('../models/podcast.notification.model');
const fs = require('fs');
const path = require('path');
const { badRequest, notFound } = require('../utils/errors');
const { schemas, validate } = require('../utils/validators');
const { deleteUploadedFile, uploadDir } = require('./audio.service');

const DEFAULT_HOST = 'DJ MAVERICK';

const parseId = (id) => {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest('Invalid podcast id');
  }
  return parsed;
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatMegabytes = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)} MB`;
};

const formatDuration = (seconds) => {
  if (!Number.isInteger(seconds) || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(remainingSeconds).padStart(2, '0'),
    ].join(':');
  }

  return [String(minutes).padStart(2, '0'), String(remainingSeconds).padStart(2, '0')].join(':');
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const normalizeText = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
};

const normalizeFileSize = (value, fallback = null) => {
  if (typeof value === 'number') return formatMegabytes(value) || fallback;
  return normalizeText(value, fallback);
};

const normalizePositiveInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeCreatePayload = (data) => {
  const payload = validate(schemas.podcast, data);

  payload.host = normalizeText(payload.host, DEFAULT_HOST);
  payload.genre = normalizeText(payload.genre);
  payload.seasonNumber = normalizePositiveInteger(payload.seasonNumber);
  payload.episodeNumber = normalizePositiveInteger(payload.episodeNumber);
  payload.fileName = normalizeText(payload.fileName);
  payload.storageKey = normalizeText(payload.storageKey);
  payload.fileUrl = normalizeText(payload.fileUrl);
  payload.fileSize = normalizeFileSize(payload.fileSize, formatBytes(payload.fileSizeBytes));
  payload.duration = normalizeText(payload.duration, formatDuration(payload.durationSeconds));
  payload.scheduleDate = normalizeText(payload.scheduleDate);
  payload.coverArt = normalizeText(payload.coverArt);
  payload.mimeType = normalizeText(payload.mimeType);
  payload.audioFormat = normalizeText(payload.audioFormat);
  payload.metadata = payload.metadata || {};
  payload.trimRanges = payload.trimRanges || [];

  if (payload.status === 'Scheduled' && !payload.scheduleDate) {
    throw badRequest('Scheduled podcasts require a schedule date');
  }

  if (payload.status === 'Published' && !payload.publishedAt) {
    payload.publishedAt = new Date();
  }

  if (payload.status !== 'Published') {
    payload.publishedAt = payload.publishedAt || null;
  }

  return payload;
};

const normalizeUpdatePayload = (data, existingPodcast) => {
  const payload = validate(schemas.podcastUpdate, data);
  const nextStatus = payload.status || existingPodcast.status;
  const nextScheduleDate =
    payload.scheduleDate !== undefined
      ? normalizeText(payload.scheduleDate)
      : normalizeText(existingPodcast.scheduleDate);

  if (payload.host !== undefined) payload.host = normalizeText(payload.host, DEFAULT_HOST);
  if (payload.genre !== undefined) payload.genre = normalizeText(payload.genre);
  if (payload.seasonNumber !== undefined) payload.seasonNumber = normalizePositiveInteger(payload.seasonNumber);
  if (payload.episodeNumber !== undefined) payload.episodeNumber = normalizePositiveInteger(payload.episodeNumber);
  if (payload.fileName !== undefined) payload.fileName = normalizeText(payload.fileName);
  if (payload.storageKey !== undefined) payload.storageKey = normalizeText(payload.storageKey);
  if (payload.fileUrl !== undefined) payload.fileUrl = normalizeText(payload.fileUrl);
  if (payload.fileSize !== undefined) payload.fileSize = normalizeFileSize(payload.fileSize);
  if (payload.duration !== undefined) payload.duration = normalizeText(payload.duration);
  if (payload.scheduleDate !== undefined) payload.scheduleDate = nextScheduleDate;
  if (payload.coverArt !== undefined) payload.coverArt = normalizeText(payload.coverArt);
  if (payload.mimeType !== undefined) payload.mimeType = normalizeText(payload.mimeType);
  if (payload.audioFormat !== undefined) payload.audioFormat = normalizeText(payload.audioFormat);

  if (!payload.fileSize && payload.fileSizeBytes !== undefined) {
    payload.fileSize = formatBytes(payload.fileSizeBytes);
  }

  if (!payload.duration && payload.durationSeconds !== undefined) {
    payload.duration = formatDuration(payload.durationSeconds);
  }

  if (nextStatus === 'Scheduled' && !nextScheduleDate) {
    throw badRequest('Scheduled podcasts require a schedule date');
  }

  if (payload.status === 'Published' && !existingPodcast.publishedAt) {
    payload.publishedAt = new Date();
  }

  if (payload.status && payload.status !== 'Published') {
    payload.publishedAt = null;
  }

  return payload;
};

const serializePodcast = (podcast) => {
  const data = podcast.get ? podcast.get({ plain: true }) : podcast;
  const duration = data.duration || formatDuration(data.durationSeconds);
  const fileSize = data.fileSize || formatBytes(data.fileSizeBytes);
  const schedule = data.scheduleDate || 'Not scheduled';

  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    genre: data.genre || '',
    seasonNumber: data.seasonNumber ?? null,
    episodeNumber: data.episodeNumber ?? null,
    fileName: data.fileName || '',
    storageKey: data.storageKey || null,
    fileUrl: data.fileUrl || null,
    fileSize: fileSize || '',
    fileSizeBytes: data.fileSizeBytes ?? null,
    mimeType: data.mimeType || null,
    audioFormat: data.audioFormat || null,
    duration: duration || null,
    durationSeconds: data.durationSeconds ?? null,
    schedule,
    scheduleDate: data.scheduleDate || null,
    status: data.status,
    host: data.host || DEFAULT_HOST,
    coverArt: data.coverArt || null,
    source: data.source || 'metadata',
    trimRanges: data.trimRanges || [],
    metadata: data.metadata || {},
    publishedAt: data.publishedAt || null,
    date: formatDate(data.publishedAt || data.createdAt),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const findPodcastOrFail = async (id) => {
  const podcast = await Podcast.findByPk(parseId(id));
  if (!podcast) throw notFound('Podcast not found');
  return podcast;
};

const getAllPodcasts = async (query = {}) => {
  const filters = validate(schemas.podcastQuery, query);
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.host) where.host = filters.host;
  if (filters.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${filters.search}%` } },
      { description: { [Op.iLike]: `%${filters.search}%` } },
      { host: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;
  const { rows, count } = await Podcast.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    data: rows.map(serializePodcast),
    meta: {
      page: filters.page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

const getPodcastById = async (id) => {
  const podcast = await findPodcastOrFail(id);
  return serializePodcast(podcast);
};

const createPodcast = async (data) => {
  const payload = normalizeCreatePayload(data);
  const podcast = await Podcast.create(payload);
  return serializePodcast(podcast);
};

const updatePodcast = async (id, data) => {
  const podcast = await findPodcastOrFail(id);
  const payload = normalizeUpdatePayload(data, podcast);

  await podcast.update(payload);
  return serializePodcast(podcast);
};

const updateStatus = async (id, status, scheduleDate) => {
  const payload = validate(schemas.podcastStatus, { status, scheduleDate });
  return await updatePodcast(id, payload);
};

const deletePodcast = async (id) => {
  const podcast = await findPodcastOrFail(id);
  const serialized = serializePodcast(podcast);

  await podcast.destroy();

  if (serialized.fileUrl) {
    await deleteUploadedFile(serialized.fileUrl);
  }
  if (serialized.coverArt) {
    await deleteUploadedFile(serialized.coverArt);
  }

  return serialized;
};

const serializeRecording = (recording) => {
  const row = recording.get ? recording.get({ plain: true }) : recording;
  return {
    id: row.id,
    name: row.name,
    duration: row.duration || '0:00',
    durationSeconds: row.durationSeconds,
    size: row.size || formatBytes(row.fileSizeBytes),
    fileUrl: row.fileUrl,
    source: row.source,
    createdAt: row.createdAt,
  };
};

const getAllRecordings = async (query = {}) => {
  const where = {};
  if (query.source) where.source = query.source;
  if (query.search) {
    where.name = { [Op.iLike]: `%${query.search}%` };
  }
  const rows = await PodcastRecording.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });
  return rows.map(serializeRecording);
};

const createRecording = async (data) => {
  const payload = validate(schemas.podcastRecording, data);
  const recording = await PodcastRecording.create(payload);
  return serializeRecording(recording);
};

const trimRecording = async (id, data) => {
  const original = await PodcastRecording.findByPk(parseId(id));
  if (!original) throw notFound('Original recording not found');
  if (!original.fileUrl) throw badRequest('Original recording does not have an audio file');

  const name = normalizeText(data.name, `${original.name}_trimmed`);
  const trimRanges = data.trimRanges || [];
  if (!Array.isArray(trimRanges)) throw badRequest('trimRanges must be an array');

  // Resolve source file
  const srcFileName = path.basename(original.fileUrl);
  const srcPath = path.join(uploadDir, srcFileName);
  if (!fs.existsSync(srcPath)) throw badRequest('Original physical file not found on disk');

  const ext = path.extname(srcFileName).toLowerCase() || '.mp3';
  const destFileName = `audio-trimmed-${Date.now()}-${path.parse(srcFileName).name}${ext}`;
  const destPath = path.join(uploadDir, destFileName);

  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);

  if (trimRanges.length === 0) {
    // No trimming needed — just copy as-is
    fs.copyFileSync(srcPath, destPath);
  } else {
    const totalDurSecs = original.durationSeconds || 0;

    // Sort removal ranges by start percent
    const sorted = [...trimRanges].sort((a, b) => a.start - b.start);

    // Build list of KEPT segments (the inverse of the removal ranges)
    const keptSegments = [];
    let cursorPct = 0;
    for (const range of sorted) {
      if (range.start > cursorPct) {
        keptSegments.push({
          start: (cursorPct / 100) * totalDurSecs,
          end: (range.start / 100) * totalDurSecs,
        });
      }
      cursorPct = Math.max(cursorPct, range.end);
    }
    if (cursorPct < 100) {
      keptSegments.push({
        start: (cursorPct / 100) * totalDurSecs,
        end: totalDurSecs,
      });
    }

    // Temp directory for segment files
    const tmpDir = path.join(uploadDir, '_tmp_trim');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Extract each kept segment in parallel
    const segmentPaths = new Array(keptSegments.length).fill(null);
    await Promise.all(
      keptSegments.map((seg, idx) => {
        const duration = seg.end - seg.start;
        if (duration <= 0.05) return Promise.resolve(); // skip near-zero segments

        const segPath = path.join(tmpDir, `seg_${Date.now()}_${idx}${ext}`);
        segmentPaths[idx] = segPath;

        return new Promise((resolve, reject) => {
          ffmpeg(srcPath)
            .setStartTime(seg.start)
            .setDuration(duration)
            .output(segPath)
            .audioCodec('libmp3lame')
            .on('end', resolve)
            .on('error', reject)
            .run();
        });
      })
    );

    const validSegments = segmentPaths.filter(Boolean);
    if (validSegments.length === 0) throw badRequest('No valid segments remain after trimming');

    if (validSegments.length === 1) {
      fs.renameSync(validSegments[0], destPath);
    } else {
      // Write concat list and merge all segments
      const concatListPath = path.join(tmpDir, `concat_${Date.now()}.txt`);
      const concatContent = validSegments.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent, 'utf8');

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .output(destPath)
          .audioCodec('libmp3lame')
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      fs.unlinkSync(concatListPath);
      validSegments.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
    }
  }

  // Read real output file size
  const stats = fs.existsSync(destPath) ? fs.statSync(destPath) : null;
  const fileSizeBytes = stats ? stats.size : null;

  // Compute actual kept duration from ranges
  let durationSeconds = original.durationSeconds || null;
  if (trimRanges.length > 0 && original.durationSeconds) {
    let totalRemovedPct = 0;
    trimRanges.forEach((r) => {
      if (typeof r.start === 'number' && typeof r.end === 'number') {
        totalRemovedPct += (r.end - r.start);
      }
    });
    durationSeconds = Math.max(0, Math.round(((100 - totalRemovedPct) / 100) * original.durationSeconds));
  }

  const trimmed = await PodcastRecording.create({
    name: name.endsWith(ext.replace('.', '')) ? name : `${name}${ext}`,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    size: formatBytes(fileSizeBytes),
    fileSizeBytes,
    storageKey: destFileName,
    fileUrl: `/uploads/${destFileName}`,
    mimeType: original.mimeType || 'audio/mpeg',
    source: 'trimmed',
    originalRecordingId: original.id,
    trimRanges,
    metadata: {
      originalName: original.name,
      trimmedAt: new Date().toISOString(),
      segmentsKept: trimRanges.length > 0 ? 'multiple' : 'all',
    },
  });

  return serializeRecording(trimmed);
};


const adjustVolume = async (id, data) => {
  const payload = validate(schemas.podcastRecordingVolume, data);
  const original = await PodcastRecording.findByPk(parseId(id));
  if (!original) throw notFound('Original recording not found');
  if (!original.fileUrl) throw badRequest('Original recording does not have an audio file');

  // Resolve physical files
  const srcFileName = path.basename(original.fileUrl);
  const srcPath = path.join(uploadDir, srcFileName);

  if (!fs.existsSync(srcPath)) {
    throw badRequest('Original physical file not found on disk');
  }

  // Generate unique dest filename
  const ext = path.extname(srcFileName).toLowerCase() || '.mp3';
  const destFileName = `audio-vol-${payload.volumeMultiplier}x-${Date.now()}-${path.parse(srcFileName).name}${ext}`;
  const destPath = path.join(uploadDir, destFileName);

  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);

  await new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .audioFilters(`volume=${payload.volumeMultiplier}`)
      .output(destPath)
      .audioCodec('libmp3lame')
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  const stats = fs.existsSync(destPath) ? fs.statSync(destPath) : null;
  const fileSizeBytes = stats ? stats.size : original.fileSizeBytes;

  const adjusted = await PodcastRecording.create({
    name: `${original.name} (Vol ${payload.volumeMultiplier}x)`,
    duration: original.duration,
    durationSeconds: original.durationSeconds,
    size: formatBytes(fileSizeBytes),
    fileSizeBytes,
    storageKey: destFileName,
    fileUrl: `/uploads/${destFileName}`,
    mimeType: original.mimeType,
    source: 'recording',
    originalRecordingId: original.id,
    metadata: {
      originalName: original.name,
      volumeMultiplier: payload.volumeMultiplier,
      adjustedAt: new Date().toISOString(),
    },
  });

  return serializeRecording(adjusted);
};

const deleteRecording = async (id) => {
  const recording = await PodcastRecording.findByPk(parseId(id));
  if (!recording) throw notFound('Recording not found');

  const serialized = serializeRecording(recording);
  const fileUrl = recording.fileUrl;
  await recording.destroy();

  if (fileUrl) {
    await deleteUploadedFile(fileUrl);
  }
  return serialized;
};

const getLiveSessions = async (query = {}) => {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.roomId) where.roomId = query.roomId;
  return await PodcastLiveSession.findAll({
    where,
    order: [['startedAt', 'DESC']],
  });
};

const startLiveSession = async (data) => {
  const payload = validate(schemas.podcastLiveStart, data);

  // End any existing live sessions for the same roomId to avoid active duplicates
  await PodcastLiveSession.update(
    { status: 'ended', endedAt: new Date() },
    { where: { roomId: payload.roomId, status: 'live' } }
  );

  // A new live run must never inherit approved/pending guests from an older run.
  await PodcastGuest.destroy({ where: { roomId: payload.roomId } });

  const existingSession = await PodcastLiveSession.findOne({
    where: { roomId: payload.roomId },
    order: [['updatedAt', 'DESC']],
  });

  if (existingSession) {
    await existingSession.update({
      ...payload,
      status: 'live',
      startedAt: new Date(),
      endedAt: null,
      peakViewers: 0,
      lastViewerCount: 0,
    });
    return existingSession;
  }

  return await PodcastLiveSession.create({
    ...payload,
    status: 'live',
    startedAt: new Date(),
  });
};

const stopLiveSession = async (data) => {
  const payload = validate(schemas.podcastLiveStop, data);
  const session = await PodcastLiveSession.findOne({
    where: { roomId: payload.roomId, status: 'live' },
  });

  if (!session) {
    const endedSession = await PodcastLiveSession.findOne({
      where: { roomId: payload.roomId, status: 'ended' },
      order: [['endedAt', 'DESC'], ['updatedAt', 'DESC']],
    });
    if (endedSession) return endedSession;
    throw notFound('Active live session not found for this room');
  }

  session.status = 'ended';
  session.endedAt = new Date();
  session.lastViewerCount = payload.lastViewerCount;
  session.peakViewers = Math.max(session.peakViewers || 0, payload.peakViewers, payload.lastViewerCount);
  await session.save();

  // Deny every active guest left in the session so nobody remains auto-approved.
  await PodcastGuest.update(
    { status: 'denied', respondedAt: new Date() },
    { where: { roomId: payload.roomId, status: { [Op.in]: ['pending', 'approved'] } } }
  );

  return session;
};

const updateLiveViewers = async (roomId, viewerCount) => {
  if (!roomId) throw badRequest('roomId is required');
  const count = Math.max(0, Number(viewerCount || 0));

  const session = await PodcastLiveSession.findOne({
    where: { roomId, status: 'live' },
  });

  if (!session) throw notFound('Active live session not found');

  session.lastViewerCount = count;
  session.peakViewers = Math.max(session.peakViewers || 0, count);
  await session.save();
  return session;
};

// Notifications
const getNotifications = async (query = {}) => {
  const where = {};
  if (query.category) where.category = query.category;
  if (query.read !== undefined) where.read = query.read === 'true';

  return await PodcastNotification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(query.limit) || 100,
  });
};

const createNotification = async (data) => {
  const payload = validate(schemas.podcastNotification, data);
  return await PodcastNotification.create(payload);
};

const markNotificationRead = async (id) => {
  const notification = await PodcastNotification.findByPk(parseId(id));
  if (!notification) throw notFound('Notification not found');
  notification.read = true;
  await notification.save();
  return notification;
};

const markAllNotificationsRead = async (category) => {
  const where = { read: false };
  if (category) where.category = category;

  await PodcastNotification.update({ read: true }, { where });
  return { success: true, message: 'Notifications marked as read' };
};

const clearNotifications = async (category) => {
  const where = {};
  if (category) where.category = category;
  
  await PodcastNotification.destroy({ where });
  return { success: true, message: 'Notifications cleared' };
};

// Mics
const DEFAULT_MICS = [
  { name: 'MIC 1', type: 'STUDIO', active: true, phantom: true, gain: 60, volume: 75, muted: true, icon: 'mic', level: 0 },
  { name: 'MIC 2', type: 'DYNAMIC', active: false, phantom: false, gain: 45, volume: 70, muted: true, icon: 'mic', level: 0 },
  { name: 'MIC 3', type: 'RIBBON', active: false, phantom: true, gain: 55, volume: 65, muted: true, icon: 'mic', level: 0 },
  { name: 'MIC 4', type: 'WIRELESS', active: false, phantom: false, gain: 50, volume: 60, muted: true, icon: 'mic', level: 0 },
  { name: 'MIC 5', type: 'LAVALIER', active: false, phantom: false, gain: 40, volume: 55, muted: true, icon: 'mic', level: 0 },
];

const ensureDefaultMics = async () => {
  const count = await PodcastMic.count();
  if (count > 0) return;

  await PodcastMic.bulkCreate(DEFAULT_MICS);
};

const getMics = async () => {
  await ensureDefaultMics();
  return await PodcastMic.findAll({
    order: [['id', 'ASC']],
  });
};

const createMic = async (data) => {
  const payload = validate(schemas.podcastMicCreate, data);
  return await PodcastMic.create(payload);
};

const updateMic = async (id, data) => {
  const payload = validate(schemas.podcastMicUpdate, data);
  const mic = await PodcastMic.findByPk(parseId(id));
  if (!mic) throw notFound('Mic not found');

  if (payload.active === true) {
    await PodcastMic.update({ active: false }, { where: { id: { [Op.ne]: mic.id } } });
  }

  await mic.update(payload);
  return mic;
};

const deleteMic = async (id) => {
  const mic = await PodcastMic.findByPk(parseId(id));
  if (!mic) throw notFound('Mic not found');
  await mic.destroy();
  return { success: true, message: 'Mic deleted' };
};

// ---------------------------------------------------------------------------
// Guest Link Manager — delegated to podcast.guest.service.js
// Keeping exports here so podcast.controller.js has a single service import.
// ---------------------------------------------------------------------------
const {
  generateGuestLinks,
  getGuestSlots,
  joinGuestSlot,
  leaveGuestSlot,
  kickGuestSlot,
  muteGuestSlot,
  setGuestSlotVolume,
  getGuestSlotVolume,
  getLegacyGuests,
  joinLegacyGuest,
  respondToLegacyGuest,
  removeLegacyGuest,
} = require('./podcast.guest.service');

module.exports = {
  createPodcast,
  deletePodcast,
  getAllPodcasts,
  getPodcastById,
  updatePodcast,
  updateStatus,
  // Recordings
  getAllRecordings,
  createRecording,
  trimRecording,
  adjustVolume,
  deleteRecording,
  // Live Sessions
  getLiveSessions,
  startLiveSession,
  stopLiveSession,
  updateLiveViewers,
  // Guest Link Manager
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
  // Notifications
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  // Mics
  getMics,
  createMic,
  updateMic,
  deleteMic,
};
