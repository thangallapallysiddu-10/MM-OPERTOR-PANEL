const express = require('express');
const { authenticate } = require('../auth/middleware');
const router = express.Router();
const { validateRequest } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const {
  getMessages,
  createMessage,
  getSongRequests,
  createSongRequest,
  voteSongRequest,
  updateSongRequestStatus,
  getReactions,
  getLiveSessions,
} = require('../controllers/activity.controller');

// Apply authentication middleware to all activity routes
router.use(authenticate);

router.get('/studios/:studioId/messages', getMessages);
router.post('/studios/:studioId/messages', (req, _res, next) => {
  req.body.studioId = req.params.studioId;
  next();
}, validateRequest(schemas.chatMessage, 'body'), createMessage);
router.get('/studios/:studioId/song-requests', getSongRequests);
router.post('/studios/:studioId/song-requests', (req, _res, next) => {
  req.body.studioId = req.params.studioId;
  next();
}, validateRequest(schemas.songRequest, 'body'), createSongRequest);
router.post('/studios/:studioId/song-requests/:requestId/vote', (req, _res, next) => {
  req.body.studioId = req.params.studioId;
  req.body.requestId = req.params.requestId;
  next();
}, validateRequest(schemas.songRequestVote, 'body'), voteSongRequest);
router.put('/studios/:studioId/song-requests/:requestId/status', updateSongRequestStatus);
router.get('/studios/:studioId/reactions', getReactions);
router.get('/live-sessions', getLiveSessions);

module.exports = router;
