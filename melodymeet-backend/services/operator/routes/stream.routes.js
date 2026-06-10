const express = require('express');
const { authenticate } = require('../auth/middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { schemas } = require('../utils/validators');
const router = express.Router();
const {
  getStreams, createStream, goLive, stopLive,
  uploadTrack, deleteStream, deleteTrack, upload
} = require('../controllers/stream.controller');

// Apply authentication middleware to all stream routes
router.use(authenticate);

// GET all streams/channels
router.get('/', getStreams);

// POST create a new stream/channel - with validation
router.post('/', validateRequest(schemas.stream, 'body'), createStream);

// PUT go live / stop live
router.put('/:id/live', validateRequest(schemas.liveSessionStart, 'body'), goLive);
router.put('/:id/stop', validateRequest(schemas.liveSessionEnd, 'body'), stopLive);

// POST upload a track to a stream - with validation
router.post('/:streamId/tracks', upload.single('audioFile'), uploadTrack);

// DELETE a stream or a track
router.delete('/tracks/:trackId', deleteTrack);
router.delete('/:id', deleteStream);

module.exports = router;
