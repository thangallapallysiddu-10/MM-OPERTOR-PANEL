const express = require('express');
const { authenticate } = require('../auth/middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const { upload } = require('../services/audio.service');
const ctrl = require('../controllers/rj.controller');

const router = express.Router();

router.use(authenticate);

// ─── Logged-in operator profile (no stream / dashboard required) ─
router.get('/me/profile', ctrl.getMyOperatorProfile);
router.get('/me/profile/dashboard', ctrl.getMyOperatorProfileDashboard);
router.patch('/me/profile', validateRequest(schemas.rjOperatorProfilePatch, 'body'), ctrl.patchMyOperatorProfile);
router.post('/me/profile/avatar', upload.single('avatar'), ctrl.uploadMyProfileAvatar);

// ─── Studio bundle ───────────────────────────────────────────────
router.get('/:studioId', ctrl.getStudio);
router.patch('/:studioId/state', validateRequest(schemas.rjStudioStatePatch, 'body'), ctrl.patchStudio);
router.post('/:studioId/reset', ctrl.resetStudio);

// ─── Operator RJ profile ─────────────────────────────────────────
router.get('/:studioId/profile', ctrl.getOperatorProfile);
router.get('/:studioId/profile/dashboard', ctrl.getOperatorProfileDashboard);
router.patch('/:studioId/profile', validateRequest(schemas.rjOperatorProfilePatch, 'body'), ctrl.patchOperatorProfile);

// ─── Library catalog ─────────────────────────────────────────────
router.get('/:studioId/library', ctrl.getLibrary);

// ─── Live broadcast ────────────────────────────────────────────────
router.post('/:studioId/go-live', validateRequest(schemas.rjGoLive, 'body'), ctrl.goLive);
router.post('/:studioId/stop-live', validateRequest(schemas.rjStopLive, 'body'), ctrl.stopLive);
router.post('/:studioId/timer/tick', ctrl.tickTimer);
router.post('/:studioId/announcement', validateRequest(schemas.rjAnnouncement, 'body'), ctrl.setAnnouncement);

// ─── Stats ─────────────────────────────────────────────────────────
router.patch('/:studioId/stats', validateRequest(schemas.rjStatsPatch, 'body'), ctrl.patchStats);
router.put('/:studioId/listeners', ctrl.syncListeners);

// ─── Playlist ──────────────────────────────────────────────────────
router.get('/:studioId/playlist', ctrl.getPlaylist);
router.post('/:studioId/playlist/items', validateRequest(schemas.rjPlaylistItem, 'body'), ctrl.addPlaylistItem);
router.post('/:studioId/playlist/library', ctrl.addPlaylistFromLibrary);
router.put('/:studioId/playlist/reorder', validateRequest(schemas.rjPlaylistReorder, 'body'), ctrl.reorderPlaylist);
router.delete('/:studioId/playlist', ctrl.clearPlaylist);
router.delete('/:studioId/playlist/items/:itemId', ctrl.removePlaylistItem);
router.post('/:studioId/playlist/start', validateRequest(schemas.rjPlaylistSession, 'body'), ctrl.startPlaylist);
router.post('/:studioId/playlist/pause', ctrl.pausePlaylist);
router.post('/:studioId/playlist/resume', ctrl.resumePlaylist);
router.post('/:studioId/playlist/stop', ctrl.stopPlaylist);
router.post('/:studioId/playlist/advance', ctrl.advancePlaylist);
router.post('/:studioId/playlist/tick', ctrl.tickPlaylist);

// ─── Dual player ───────────────────────────────────────────────────
router.post('/:studioId/dual-player', validateRequest(schemas.rjDualPlayerAction, 'body'), ctrl.dualPlayerAction);

// ─── Player Effects ────────────────────────────────────────────────
router.get('/effects/metadata', ctrl.getEffectMetadata);
router.get('/:studioId/players/:playerName/effects', ctrl.getPlayerEffects);
router.patch('/:studioId/players/:playerName/effect', validateRequest(schemas.playerEffectUpdate, 'body'), ctrl.updatePlayerEffect);
router.patch('/:studioId/players/:playerName/effects', validateRequest(schemas.playerEffectsUpdate, 'body'), ctrl.updatePlayerEffects);
router.patch('/:studioId/players/:playerName/volume', validateRequest(schemas.playerVolumeUpdate, 'body'), ctrl.updatePlayerVolume);
router.get('/:studioId/players/:playerName/settings', ctrl.getPlayerSettings);
router.post('/:studioId/players/:playerName/effects/reset', ctrl.resetPlayerEffects);

// ─── Mics ──────────────────────────────────────────────────────────
router.post('/:studioId/mics', validateRequest(schemas.rjMicCreate, 'body'), ctrl.addMic);
router.patch('/:studioId/mics', validateRequest(schemas.rjMicPatch, 'body'), ctrl.patchMic);
router.delete('/:studioId/mics/:micId', ctrl.removeMic);

// ─── Local files ───────────────────────────────────────────────────
router.get('/:studioId/local-files', ctrl.listLocalFiles);
router.post('/:studioId/local-files', upload.single('audioFile'), ctrl.uploadLocalFile);
router.delete('/:studioId/local-files/:fileId', ctrl.deleteLocalFile);
router.post('/:studioId/local-files/:fileId/load-standby', ctrl.loadLocalToStandby);

// ─── Notifications ─────────────────────────────────────────────────
router.get('/:studioId/notifications', ctrl.listNotifications);
router.post('/:studioId/notifications', validateRequest(schemas.rjNotification, 'body'), ctrl.createNotification);
router.put('/:studioId/notifications/read-all', ctrl.markAllNotificationsRead);
router.put('/:studioId/notifications/:notificationId/read', ctrl.markNotificationRead);

// ─── Chat & moderation ─────────────────────────────────────────────
router.get('/:studioId/chat/bans', ctrl.listBans);
router.post('/:studioId/chat/bans', validateRequest(schemas.rjChatBan, 'body'), ctrl.banUser);
router.delete('/:studioId/chat/bans/:username', ctrl.unbanUser);
router.post('/:studioId/chat/clear', ctrl.clearChat);
router.get('/:studioId/chat/options', ctrl.getChatOptions);
router.post('/:studioId/chat/messages', validateRequest(schemas.rjChatPost, 'body'), ctrl.postMessage);
router.post('/:studioId/chat/gifts', validateRequest(schemas.rjChatGift, 'body'), ctrl.sendGift);
router.post('/:studioId/chat/emojis', validateRequest(schemas.rjChatEmoji, 'body'), ctrl.sendEmoji);
router.put('/:studioId/chat/messages/:messageId/pin', validateRequest(schemas.rjPinMessage, 'body'), ctrl.pinMessage);

module.exports = router;
