const rjService = require('../services/rj.service');
const rjProfileService = require('../services/rj.profile.service');
const operatorProfileService = require('../services/operator.profile.service');
const { handleUpload } = require('../services/audio.service');
const { sendError } = require('../utils/errors');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const getStudio = async (req, res) => {
  try {
    const data = await rjService.getStudioBundle(req.params.studioId);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const getOperatorProfile = async (req, res) => {
  try {
    const data = await rjProfileService.getOperatorProfile(req.params.studioId);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const getOperatorProfileDashboard = async (req, res) => {
  try {
    const data = await rjProfileService.getOperatorProfileDashboard(req.params.studioId);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const patchOperatorProfile = async (req, res) => {
  try {
    const data = await rjProfileService.patchOperatorProfile(req.params.studioId, req.body);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const getMyOperatorProfile = async (req, res) => {
  try {
    const data = await rjProfileService.getOperatorProfileForAuthUser(req.authUser);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const getMyOperatorProfileDashboard = async (req, res) => {
  try {
    const data = await rjProfileService.getOperatorProfileDashboardForAuthUser(req.authUser);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const patchMyOperatorProfile = async (req, res) => {
  try {
    const data = await rjProfileService.patchOperatorProfileForAuthUser(req.authUser, req.body);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const uploadMyProfileAvatar = async (req, res) => {
  let fileInfo = null;
  try {
    fileInfo = handleUpload(req, {
      kind: 'image',
      fieldNames: ['avatar', 'coverArt', 'thumbnail'],
    });
    const data = await operatorProfileService.updateAvatarForAuthUser(
      req.authUser,
      fileInfo.filePath
    );
    return ok(res, {
      avatarUrl: fileInfo.filePath,
      profile: data,
    }, 201);
  } catch (err) {
    if (fileInfo?.filePath) {
      const { deleteUploadedFile } = require('../services/audio.service');
      await deleteUploadedFile(fileInfo.filePath).catch(() => {});
    }
    return sendError(res, err, 400);
  }
};

const patchStudio = async (req, res) => {
  try {
    const studio = await rjService.patchStudioState(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const resetStudio = async (req, res) => {
  try {
    const studio = await rjService.resetStudio(req.params.studioId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err);
  }
};

const getLibrary = async (req, res) => {
  try {
    const catalog = await rjService.getLibraryCatalog(req.params.studioId);
    return ok(res, catalog);
  } catch (err) {
    return sendError(res, err);
  }
};

const getPlaylist = async (req, res) => {
  try {
    const bundle = await rjService.getStudioBundle(req.params.studioId);
    return ok(res, bundle.playlist);
  } catch (err) {
    return sendError(res, err);
  }
};

const addPlaylistItem = async (req, res) => {
  try {
    const item = await rjService.addPlaylistItem(req.params.studioId, req.body);
    return ok(res, item, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const addPlaylistFromLibrary = async (req, res) => {
  try {
    const item = await rjService.addPlaylistFromLibrary(req.params.studioId, req.body);
    return ok(res, item, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const removePlaylistItem = async (req, res) => {
  try {
    await rjService.removePlaylistItem(req.params.studioId, req.params.itemId);
    return ok(res, { message: 'Removed' });
  } catch (err) {
    return sendError(res, err);
  }
};

const reorderPlaylist = async (req, res) => {
  try {
    const items = await rjService.reorderPlaylist(req.params.studioId, req.body.orderedIds);
    return ok(res, items);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const clearPlaylist = async (req, res) => {
  try {
    await rjService.clearPlaylist(req.params.studioId);
    return ok(res, { message: 'Playlist cleared' });
  } catch (err) {
    return sendError(res, err);
  }
};

const startPlaylist = async (req, res) => {
  try {
    const result = await rjService.startPlaylistSession(req.params.studioId, req.body);
    return ok(res, result);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const pausePlaylist = async (req, res) => {
  try {
    const studio = await rjService.pausePlaylistSession(req.params.studioId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const resumePlaylist = async (req, res) => {
  try {
    const studio = await rjService.resumePlaylistSession(req.params.studioId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const stopPlaylist = async (req, res) => {
  try {
    const studio = await rjService.stopPlaylistSession(req.params.studioId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const advancePlaylist = async (req, res) => {
  try {
    const result = await rjService.advancePlaylist(req.params.studioId);
    return ok(res, result);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const dualPlayerAction = async (req, res) => {
  try {
    const studio = await rjService.applyDualPlayerAction(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

// ─── Player Effects Controllers ─────────────────────────────────
const playerEffectsService = require('../services/player.effects.service');

const getPlayerEffects = async (req, res) => {
  try {
    const effects = await playerEffectsService.getPlayerEffects(
      req.params.studioId,
      req.params.playerName
    );
    return ok(res, effects);
  } catch (err) {
    return sendError(res, err);
  }
};

const updatePlayerEffect = async (req, res) => {
  try {
    const { effectName, value } = req.body;
    const effects = await playerEffectsService.updatePlayerEffect(
      req.params.studioId,
      req.params.playerName,
      effectName,
      value
    );
    return ok(res, effects);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const updatePlayerEffects = async (req, res) => {
  try {
    const effects = await playerEffectsService.updatePlayerEffects(
      req.params.studioId,
      req.params.playerName,
      req.body
    );
    return ok(res, effects);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const updatePlayerVolume = async (req, res) => {
  try {
    const { volume } = req.body;
    const result = await playerEffectsService.updatePlayerVolume(
      req.params.studioId,
      req.params.playerName,
      volume
    );
    return ok(res, result);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const getPlayerSettings = async (req, res) => {
  try {
    const settings = await playerEffectsService.getPlayerSettings(
      req.params.studioId,
      req.params.playerName
    );
    return ok(res, settings);
  } catch (err) {
    return sendError(res, err);
  }
};

const resetPlayerEffects = async (req, res) => {
  try {
    const effects = await playerEffectsService.resetPlayerEffects(
      req.params.studioId,
      req.params.playerName
    );
    return ok(res, effects);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const getEffectMetadata = async (req, res) => {
  try {
    const metadata = playerEffectsService.getEffectMetadata();
    return ok(res, metadata);
  } catch (err) {
    return sendError(res, err);
  }
};


const patchMic = async (req, res) => {
  try {
    const studio = await rjService.patchMic(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const addMic = async (req, res) => {
  try {
    const studio = await rjService.addMic(req.params.studioId, req.body);
    return ok(res, studio, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const removeMic = async (req, res) => {
  try {
    const studio = await rjService.removeMic(req.params.studioId, req.params.micId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err);
  }
};

const listLocalFiles = async (req, res) => {
  try {
    const files = await rjService.listLocalFiles(req.params.studioId);
    return ok(res, files);
  } catch (err) {
    return sendError(res, err);
  }
};

const uploadLocalFile = async (req, res) => {
  try {
    const fileInfo = handleUpload(req);
    const file = await rjService.addLocalFile(req.params.studioId, fileInfo, {
      name: req.body.name,
      duration: req.body.duration,
      format: req.body.format,
    });
    return ok(res, file, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const deleteLocalFile = async (req, res) => {
  try {
    await rjService.deleteLocalFile(req.params.studioId, req.params.fileId);
    return ok(res, { message: 'Deleted' });
  } catch (err) {
    return sendError(res, err);
  }
};

const loadLocalToStandby = async (req, res) => {
  try {
    const playerId = String(req.body?.playerId || req.query?.playerId || 'A').toUpperCase() === 'B' ? 'B' : 'A';
    const studio = await rjService.loadLocalFileToStandby(req.params.studioId, req.params.fileId, playerId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const listNotifications = async (req, res) => {
  try {
    const items = await rjService.listNotifications(req.params.studioId, req.query);
    return ok(res, items);
  } catch (err) {
    return sendError(res, err);
  }
};

const createNotification = async (req, res) => {
  try {
    const item = await rjService.createNotification(req.params.studioId, req.body);
    return ok(res, item, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const item = await rjService.markNotificationRead(req.params.studioId, req.params.notificationId);
    return ok(res, item);
  } catch (err) {
    return sendError(res, err);
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await rjService.markAllNotificationsRead(req.params.studioId);
    return ok(res, { message: 'All marked read' });
  } catch (err) {
    return sendError(res, err);
  }
};

const listBans = async (req, res) => {
  try {
    const bans = await rjService.listBans(req.params.studioId);
    return ok(res, bans);
  } catch (err) {
    return sendError(res, err);
  }
};

const banUser = async (req, res) => {
  try {
    const ban = await rjService.banUser(req.params.studioId, req.body);
    return ok(res, ban, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const unbanUser = async (req, res) => {
  try {
    await rjService.unbanUser(req.params.studioId, req.params.username);
    return ok(res, { message: 'Unbanned' });
  } catch (err) {
    return sendError(res, err);
  }
};

const clearChat = async (req, res) => {
  try {
    await rjService.clearChat(req.params.studioId);
    return ok(res, { message: 'Chat cleared' });
  } catch (err) {
    return sendError(res, err);
  }
};

const postMessage = async (req, res) => {
  try {
    const message = await rjService.postChatMessage(req.params.studioId, req.body);
    return ok(res, message, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const getChatOptions = async (req, res) => {
  try {
    const data = await rjService.getChatOptions(req.params.studioId);
    return ok(res, data);
  } catch (err) {
    return sendError(res, err);
  }
};

const sendGift = async (req, res) => {
  try {
    const message = await rjService.sendGift(req.params.studioId, req.body);
    return ok(res, message, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const sendEmoji = async (req, res) => {
  try {
    const message = await rjService.sendEmoji(req.params.studioId, req.body);
    return ok(res, message, 201);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const pinMessage = async (req, res) => {
  try {
    const message = await rjService.pinChatMessage(
      req.params.studioId,
      req.params.messageId,
      req.body.text
    );
    return ok(res, message);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const setAnnouncement = async (req, res) => {
  try {
    const studio = await rjService.setAnnouncement(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const patchStats = async (req, res) => {
  try {
    const studio = await rjService.patchStats(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const syncListeners = async (req, res) => {
  try {
    const studio = await rjService.syncListenerCount(req.params.studioId, req.body.count);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const goLive = async (req, res) => {
  try {
    const studio = await rjService.goLive(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const stopLive = async (req, res) => {
  try {
    const studio = await rjService.stopLive(req.params.studioId, req.body);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err, 400);
  }
};

const tickTimer = async (req, res) => {
  try {
    const studio = await rjService.tickLiveTimer(req.params.studioId);
    return ok(res, studio);
  } catch (err) {
    return sendError(res, err);
  }
};

const tickPlaylist = async (req, res) => {
  try {
    const result = await rjService.tickPlaylistTimer(req.params.studioId);
    return ok(res, result);
  } catch (err) {
    return sendError(res, err);
  }
};

module.exports = {
  getOperatorProfile,
  getOperatorProfileDashboard,
  patchOperatorProfile,
  getMyOperatorProfile,
  getMyOperatorProfileDashboard,
  patchMyOperatorProfile,
  uploadMyProfileAvatar,
  getStudio,
  patchStudio,
  resetStudio,
  getLibrary,
  getPlaylist,
  addPlaylistItem,
  addPlaylistFromLibrary,
  removePlaylistItem,
  reorderPlaylist,
  clearPlaylist,
  startPlaylist,
  pausePlaylist,
  resumePlaylist,
  stopPlaylist,
  advancePlaylist,
  dualPlayerAction,
  getPlayerEffects,
  updatePlayerEffect,
  updatePlayerEffects,
  updatePlayerVolume,
  getPlayerSettings,
  resetPlayerEffects,
  getEffectMetadata,
  patchMic,
  addMic,
  removeMic,
  listLocalFiles,
  uploadLocalFile,
  deleteLocalFile,
  loadLocalToStandby,
  listNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  listBans,
  banUser,
  unbanUser,
  clearChat,
  postMessage,
  getChatOptions,
  sendGift,
  sendEmoji,
  pinMessage,
  setAnnouncement,
  patchStats,
  syncListeners,
  goLive,
  stopLive,
  tickTimer,
  tickPlaylist,
};
