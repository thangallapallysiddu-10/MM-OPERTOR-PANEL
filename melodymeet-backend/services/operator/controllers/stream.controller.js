const streamService = require('../services/stream.service');
const { handleUpload, upload } = require('../services/audio.service');
const { sendError } = require('../utils/errors');

const getStreams = async (req, res) => {
  try {
    const streams = await streamService.getAllStreams();
    res.status(200).json({ success: true, data: streams });
  } catch (err) {
    sendError(res, err);
  }
};

const createStream = async (req, res) => {
  try {
    const stream = await streamService.createStream(req.body);
    res.status(201).json({ success: true, data: stream });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const goLive = async (req, res) => {
  try {
    const stream = await streamService.toggleLive(req.params.id, true);
    res.status(200).json({ success: true, data: stream });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const stopLive = async (req, res) => {
  try {
    const stream = await streamService.toggleLive(req.params.id, false);
    res.status(200).json({ success: true, data: stream });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const uploadTrack = async (req, res) => {
  try {
    const fileInfo = handleUpload(req);
    const track = await streamService.addTrack(req.params.streamId, {
      title: req.body.title || fileInfo.originalName,
      artist: req.body.artist || 'Unknown Artist',
      fileUrl: fileInfo.filePath,
      fileSize: fileInfo.fileSize,
      format: req.body.format || 'mp3',
    });
    res.status(201).json({ success: true, data: track, file: fileInfo });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const deleteStream = async (req, res) => {
  try {
    await streamService.deleteStream(req.params.id);
    res.status(200).json({ success: true, message: 'Stream deleted' });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteTrack = async (req, res) => {
  try {
    await streamService.deleteTrack(req.params.trackId);
    res.status(200).json({ success: true, message: 'Track deleted' });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  getStreams,
  createStream,
  goLive,
  stopLive,
  uploadTrack,
  deleteStream,
  deleteTrack,
  upload,
};
