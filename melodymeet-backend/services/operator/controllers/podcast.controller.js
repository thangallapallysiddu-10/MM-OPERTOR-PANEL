const podcastService = require('../services/podcast.service');
const { handleUpload, deleteUploadedFile } = require('../services/audio.service');
const { sendError } = require('../utils/errors');
const podcastSocket = require('../sockets/podcast.socket');

const getPodcasts = async (req, res) => {
  try {
    const result = await podcastService.getAllPodcasts(req.query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    sendError(res, err);
  }
};

const getPodcastById = async (req, res) => {
  try {
    const podcast = await podcastService.getPodcastById(req.params.id);
    res.status(200).json({ success: true, data: podcast });
  } catch (err) {
    sendError(res, err);
  }
};

const createPodcast = async (req, res) => {
  try {
    const podcast = await podcastService.createPodcast({
      ...req.body,
      source: req.body.source || 'metadata',
    });
    res.status(201).json({ success: true, data: podcast });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const uploadEpisode = async (req, res) => {
  let fileInfo = null;
  let coverInfo = null;

  try {
    fileInfo = handleUpload(req, { kind: 'audio', fieldNames: ['file', 'audioFile'] });
    coverInfo = handleUpload(req, {
      kind: 'image',
      fieldNames: ['coverArt', 'thumbnail'],
      required: false,
    });

    const podcast = await podcastService.createPodcast({
      title: req.body.title || fileInfo.originalName,
      description: req.body.description || '',
      genre: req.body.genre || null,
      seasonNumber: req.body.seasonNumber || null,
      episodeNumber: req.body.episodeNumber || null,
      fileName: req.body.fileName || fileInfo.originalName,
      storageKey: fileInfo.fileName,
      fileUrl: fileInfo.filePath,
      fileSize: fileInfo.fileSize,
      fileSizeBytes: fileInfo.fileSizeBytes,
      mimeType: fileInfo.mimeType,
      audioFormat: fileInfo.audioFormat,
      scheduleDate: req.body.scheduleDate || null,
      duration: req.body.duration || null,
      durationSeconds: req.body.durationSeconds || null,
      status: req.body.status || 'Draft',
      host: req.body.host || 'DJ MAVERICK',
      coverArt: coverInfo?.filePath || req.body.coverArt || null,
      source: req.body.source || 'upload',
      metadata: {
        uploadedOriginalName: fileInfo.originalName,
        coverOriginalName: coverInfo?.originalName || null,
      },
    });

    res.status(201).json({ success: true, data: podcast, file: fileInfo, cover: coverInfo });
  } catch (err) {
    if (fileInfo?.filePath) {
      try {
        await deleteUploadedFile(fileInfo.filePath);
      } catch (cleanupError) {
        console.warn('Podcast upload cleanup failed:', cleanupError.message);
      }
    }
    if (coverInfo?.filePath) {
      try {
        await deleteUploadedFile(coverInfo.filePath);
      } catch (cleanupError) {
        console.warn('Podcast cover cleanup failed:', cleanupError.message);
      }
    }
    sendError(res, err, 400);
  }
};

const uploadCoverArt = async (req, res) => {
  let coverInfo = null;

  try {
    coverInfo = handleUpload(req, { kind: 'image', fieldNames: ['coverArt', 'thumbnail'] });
    res.status(201).json({
      success: true,
      data: { coverArt: coverInfo.filePath },
      file: coverInfo,
    });
  } catch (err) {
    if (coverInfo?.filePath) {
      try {
        await deleteUploadedFile(coverInfo.filePath);
      } catch (cleanupError) {
        console.warn('Podcast cover cleanup failed:', cleanupError.message);
      }
    }
    sendError(res, err, 400);
  }
};

const updatePodcast = async (req, res) => {
  try {
    const podcast = await podcastService.updatePodcast(req.params.id, req.body);
    res.status(200).json({ success: true, data: podcast });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const updatePodcastStatus = async (req, res) => {
  try {
    const podcast = await podcastService.updateStatus(
      req.params.id,
      req.body.status,
      req.body.scheduleDate
    );
    res.status(200).json({ success: true, data: podcast });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const deletePodcast = async (req, res) => {
  try {
    const podcast = await podcastService.deletePodcast(req.params.id);
    res.status(200).json({ success: true, message: 'Podcast deleted', data: podcast });
  } catch (err) {
    sendError(res, err);
  }
};

const getRecordings = async (req, res) => {
  try {
    const recordings = await podcastService.getAllRecordings(req.query);
    res.status(200).json({ success: true, data: recordings });
  } catch (err) {
    sendError(res, err);
  }
};

const uploadRecording = async (req, res) => {
  let fileInfo = null;
  try {
    fileInfo = handleUpload(req);
    const recording = await podcastService.createRecording({
      name: req.body.name || fileInfo.originalName,
      duration: req.body.duration || null,
      durationSeconds: req.body.durationSeconds ? Number(req.body.durationSeconds) : null,
      size: fileInfo.fileSize,
      fileSizeBytes: fileInfo.fileSizeBytes,
      storageKey: fileInfo.fileName,
      fileUrl: fileInfo.filePath,
      mimeType: fileInfo.mimeType,
      source: 'recording',
      metadata: { originalName: fileInfo.originalName },
    });
    res.status(201).json({ success: true, data: recording, file: fileInfo });
  } catch (err) {
    if (fileInfo?.filePath) {
      try {
        await deleteUploadedFile(fileInfo.filePath);
      } catch (cleanupError) {
        console.warn('Recording upload cleanup failed:', cleanupError.message);
      }
    }
    sendError(res, err, 400);
  }
};

const trimRecording = async (req, res) => {
  try {
    const recording = await podcastService.trimRecording(req.params.id, req.body);
    res.status(201).json({ success: true, data: recording });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const adjustVolume = async (req, res) => {
  try {
    const recording = await podcastService.adjustVolume(req.params.id, req.body);
    res.status(200).json({ success: true, data: recording });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const deleteRecording = async (req, res) => {
  try {
    const recording = await podcastService.deleteRecording(req.params.id);
    res.status(200).json({ success: true, message: 'Recording deleted', data: recording });
  } catch (err) {
    sendError(res, err);
  }
};

const getPodcastLiveSessions = async (req, res) => {
  try {
    const sessions = await podcastService.getLiveSessions(req.query);
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    sendError(res, err);
  }
};

const startLiveSession = async (req, res) => {
  try {
    const session = await podcastService.startLiveSession(req.body);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const stopLiveSession = async (req, res) => {
  try {
    const session = await podcastService.stopLiveSession(req.body);
    podcastSocket.emitSessionEnded(session.roomId);
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const updateLiveViewers = async (req, res) => {
  try {
    const session = await podcastService.updateLiveViewers(req.body.roomId, req.body.viewerCount);
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const getGuests = async (req, res) => {
  try {
    const guests = await podcastService.getGuests(req.params.roomId, req.query);
    res.status(200).json({ success: true, data: guests });
  } catch (err) {
    sendError(res, err);
  }
};

const joinLiveSession = async (req, res) => {
  try {
    const guest = await podcastService.joinLiveSession(req.body);
    res.status(201).json({ success: true, data: guest });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const respondToGuest = async (req, res) => {
  try {
    const guest = await podcastService.respondToGuest(req.params.id, req.body.action);
    await podcastSocket.emitGuestChanged(guest.roomId, guest);
    res.status(200).json({ success: true, data: guest });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const removeGuest = async (req, res) => {
  try {
    const guest = await podcastService.removeGuest(req.params.id);
    const plainGuest = guest.get ? guest.get({ plain: true }) : guest;
    await podcastSocket.emitGuestChanged(plainGuest.roomId, { ...plainGuest, status: 'denied' });
    res.status(200).json({ success: true, message: 'Guest removed from session', data: guest });
  } catch (err) {
    sendError(res, err);
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await podcastService.getNotifications(req.query);
    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    sendError(res, err);
  }
};

const createNotification = async (req, res) => {
  try {
    const notification = await podcastService.createNotification(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await podcastService.markNotificationRead(req.params.id);
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await podcastService.markAllNotificationsRead(req.query.category);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const clearNotifications = async (req, res) => {
  try {
    const result = await podcastService.clearNotifications(req.query.category);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

// ---------------------------------------------------------------------------
// Guest Link Manager controllers
// ---------------------------------------------------------------------------

const generateGuestLinks = async (req, res) => {
  try {
    const links = await podcastService.generateGuestLinks(req.body);
    res.status(200).json({ success: true, data: links });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const getGuestSlots = async (req, res) => {
  try {
    const slots = await podcastService.getGuestSlots(req.params.roomId);
    res.status(200).json({ success: true, data: slots });
  } catch (err) {
    sendError(res, err);
  }
};

// Public — no JWT. Called by the guest join page.
const joinGuestSlot = async (req, res) => {
  try {
    const guest = await podcastService.joinGuestSlot(req.body);
    const plain = guest.get ? guest.get({ plain: true }) : guest;

    // Map DB field names to the shape the operator UI expects.
    // DB row has: { id, name, status: 'approved', ... }
    // Frontend (onSlotUpdated) expects: { guestId, guestName, status: 'connected' }
    const slotPayload = {
      ...plain,
      guestId:   plain.id,
      guestName: plain.name,
      status:    'connected',
    };

    await podcastSocket.emitSlotUpdated(plain.roomId, slotPayload);
    res.status(201).json({ success: true, data: plain });
  } catch (err) {
    sendError(res, err, 400);
  }
};

// Public — no JWT. Called by the guest page on unload / leave button.
const leaveGuestSlot = async (req, res) => {
  try {
    const result = await podcastService.leaveGuestSlot(req.body);
    await podcastSocket.emitSlotUpdated(req.body.roomId, { ...result, roomId: req.body.roomId });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

// Authenticated — operator kicks a guest from a slot.
const kickGuestSlot = async (req, res) => {
  try {
    const { roomId, slotId } = req.params;
    const result = await podcastService.kickGuestSlot(roomId, slotId);
    await podcastSocket.emitSlotUpdated(roomId, { ...result, roomId });
    // Tell the guest's socket they've been removed
    podcastSocket.emitGuestRemoved(roomId, slotId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------------------------------------------------------------------------
// Guest Control Center controllers
// ---------------------------------------------------------------------------

// PATCH /api/podcasts/guest-slots/slots/:roomId/:slotId/mute
const muteGuestSlot = async (req, res) => {
  try {
    const { roomId, slotId } = req.params;
    const { muted } = req.body;
    const result = await podcastService.muteGuestSlot(roomId, slotId, muted);
    podcastSocket.emitGuestMuteChanged(roomId, slotId, result);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

// PATCH /api/podcasts/guest-slots/slots/:roomId/:slotId/volume
// Accepts body: { volume: <absolute> }  OR  body: { delta: -10 | +10 }
const setGuestVolume = async (req, res) => {
  try {
    const { roomId, slotId } = req.params;
    let target;

    if (req.body.delta !== undefined) {
      const current = await podcastService.getGuestSlotVolume(roomId, slotId);
      target = Math.max(0, Math.min(200, current + Number(req.body.delta)));
    } else {
      target = Number(req.body.volume);
    }

    const result = await podcastService.setGuestSlotVolume(roomId, slotId, target);
    podcastSocket.emitGuestVolumeChanged(roomId, slotId, result);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const getMics = async (req, res) => {
  try {
    const mics = await podcastService.getMics();
    res.status(200).json({ success: true, data: mics });
  } catch (err) {
    sendError(res, err);
  }
};

const createMic = async (req, res) => {
  try {
    const mic = await podcastService.createMic(req.body);
    res.status(201).json({ success: true, data: mic });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const updateMic = async (req, res) => {
  try {
    const mic = await podcastService.updateMic(req.params.id, req.body);
    res.status(200).json({ success: true, data: mic });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const deleteMic = async (req, res) => {
  try {
    const result = await podcastService.deleteMic(req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    sendError(res, err, 400);
  }
};

module.exports = {
  createPodcast,
  deletePodcast,
  getPodcastById,
  getPodcasts,
  updatePodcast,
  updatePodcastStatus,
  uploadEpisode,
  uploadCoverArt,
  // Recordings
  getRecordings,
  uploadRecording,
  trimRecording,
  adjustVolume,
  deleteRecording,
  // Live Sessions
  getPodcastLiveSessions,
  startLiveSession,
  stopLiveSession,
  updateLiveViewers,
  // Guests (approval flow)
  getGuests,
  joinLiveSession,
  respondToGuest,
  removeGuest,
  // Guest Link Manager
  generateGuestLinks,
  getGuestSlots,
  joinGuestSlot,
  leaveGuestSlot,
  kickGuestSlot,
  // Guest Control Center
  muteGuestSlot,
  setGuestVolume,
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
