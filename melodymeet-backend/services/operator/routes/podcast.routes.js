const express = require('express');
const { authenticate } = require('../auth/middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const {
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
  // Guest Link Manager
  generateGuestLinks,
  getGuestSlots,
  joinGuestSlot,
  leaveGuestSlot,
  kickGuestSlot,
  // Guest Control Center
  muteGuestSlot,
  setGuestVolume,
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
} = require('../controllers/podcast.controller');
const { upload } = require('../services/audio.service');

const router = express.Router();

// ---------------------------------------------------------------------------
// Public guest routes — NO authentication required.
// Guests open a link on their device and have no JWT.
// Mounted BEFORE router.use(authenticate) so they are reachable without a token.
// ---------------------------------------------------------------------------
const publicGuestRouter = express.Router();

// POST /api/podcasts/guest-slots/join
publicGuestRouter.post(
  '/join',
  validateRequest(schemas.podcastGuestSlotJoin, 'body'),
  joinGuestSlot,
);

// POST /api/podcasts/guest-slots/leave
publicGuestRouter.post(
  '/leave',
  validateRequest(schemas.podcastGuestSlotLeave, 'body'),
  leaveGuestSlot,
);

router.use('/guest-slots', publicGuestRouter);

// POST /api/podcasts/live/guests/join — public legacy approval-flow join
router.post(
  '/live/guests/join',
  validateRequest(schemas.podcastGuestJoin, 'body'),
  joinLegacyGuest,
);

// ---------------------------------------------------------------------------
// All routes below this line require a valid operator JWT
// ---------------------------------------------------------------------------
router.use(authenticate);

const podcastUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverArt', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

const recordingUpload = upload.single('file');
const coverUpload = upload.single('coverArt');

// Recording routes
router.get('/recordings', getRecordings);
router.post('/recordings/upload', recordingUpload, uploadRecording);
router.post('/recordings/:id/trim', validateRequest(schemas.podcastRecordingTrim, 'body'), trimRecording);
router.post('/recordings/:id/volume', validateRequest(schemas.podcastRecordingVolume, 'body'), adjustVolume);
router.delete('/recordings/:id', deleteRecording);

// Live Session routes
router.get('/live/sessions', getPodcastLiveSessions);
router.post('/live/start', validateRequest(schemas.podcastLiveStart, 'body'), startLiveSession);
router.post('/live/stop', validateRequest(schemas.podcastLiveStop, 'body'), stopLiveSession);
router.put('/live/viewers', validateRequest(schemas.podcastLiveViewers, 'body'), updateLiveViewers);

// Legacy approval-flow guest routes (authenticated — operator only)
router.get('/live/guests/:roomId', getLegacyGuests);
router.put('/live/guests/:id/respond', validateRequest(schemas.podcastGuestRespond, 'body'), respondToLegacyGuest);
router.delete('/live/guests/:id', removeLegacyGuest);

// Notification routes
router.get('/notifications', getNotifications);
router.post('/notifications', validateRequest(schemas.podcastNotification, 'body'), createNotification);
router.put('/notifications/mark-all-read', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);
router.delete('/notifications', clearNotifications);

// Mic routes
router.get('/mics', getMics);
router.post('/mics', validateRequest(schemas.podcastMicCreate, 'body'), createMic);
router.put('/mics/:id', validateRequest(schemas.podcastMicUpdate, 'body'), updateMic);
router.delete('/mics/:id', deleteMic);

// Guest Link Manager routes (authenticated — operator only)
// POST   /api/podcasts/guest-slots/links/generate  → generate 4 join URLs
// GET    /api/podcasts/guest-slots/slots/:roomId   → current slot occupancy
// DELETE /api/podcasts/guest-slots/slots/:roomId/:slotId → remove (kick) a guest
router.post(
  '/guest-slots/links/generate',
  validateRequest(schemas.podcastGuestLinkGenerate, 'body'),
  generateGuestLinks,
);
router.get('/guest-slots/slots/:roomId', getGuestSlots);
router.delete('/guest-slots/slots/:roomId/:slotId', kickGuestSlot);

// Guest Control Center routes (authenticated — operator only)
// PATCH /api/podcasts/guest-slots/slots/:roomId/:slotId/mute   body: { muted: true|false }
// PATCH /api/podcasts/guest-slots/slots/:roomId/:slotId/volume body: { volume: 0-200 } OR { delta: ±10 }
router.patch(
  '/guest-slots/slots/:roomId/:slotId/mute',
  validateRequest(schemas.podcastGuestSlotMuteBody, 'body'),
  muteGuestSlot,
);
router.patch('/guest-slots/slots/:roomId/:slotId/volume', validateRequest(schemas.podcastGuestSlotVolumeBody, 'body'), setGuestVolume);

// Episode routes must stay after fixed sub-routes, otherwise /recordings,
// /live, /notifications, and /mics are parsed as :id.
router.get('/', getPodcasts);
router.post('/', validateRequest(schemas.podcast, 'body'), createPodcast);
router.post('/upload', podcastUpload, uploadEpisode);
router.post('/cover-art', coverUpload, uploadCoverArt);
router.get('/:id', getPodcastById);
router.put('/:id', validateRequest(schemas.podcastUpdate, 'body'), updatePodcast);
router.put('/:id/status', validateRequest(schemas.podcastStatus, 'body'), updatePodcastStatus);
router.delete('/:id', deletePodcast);

module.exports = router;
