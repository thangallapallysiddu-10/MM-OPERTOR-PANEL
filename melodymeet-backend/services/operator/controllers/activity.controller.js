const activityService = require('../services/activity.service');
const { sendError } = require('../utils/errors');

const getMessages = async (req, res) => {
  try {
    const messages = await activityService.getMessages(req.params.studioId, req.query);
    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const getSongRequests = async (req, res) => {
  try {
    const requests = await activityService.getSongRequests(req.params.studioId, req.query);
    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const updateSongRequestStatus = async (req, res) => {
  try {
    const request = await activityService.updateSongRequestStatus({
      studioId: req.params.studioId,
      requestId: req.params.requestId,
      status: req.body.status,
    });
    res.status(200).json({ success: true, data: request });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const getReactions = async (req, res) => {
  try {
    const reactions = await activityService.getReactions(req.params.studioId, req.query);
    res.status(200).json({ success: true, data: reactions });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const getLiveSessions = async (req, res) => {
  try {
    const sessions = await activityService.getLiveSessions(req.query);
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const createMessage = async (req, res) => {
  try {
    const message = await activityService.createMessage({
      studioId: req.params.studioId,
      username: req.body.username,
      text: req.body.text,
      type: req.body.type,
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const createSongRequest = async (req, res) => {
  try {
    const request = await activityService.createSongRequest({
      studioId: req.params.studioId,
      username: req.body.username,
      songTitle: req.body.songTitle,
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const voteSongRequest = async (req, res) => {
  try {
    const request = await activityService.voteSongRequest({
      studioId: req.params.studioId,
      requestId: req.params.requestId,
      username: req.body.username,
    });
    res.status(200).json({ success: true, data: request });
  } catch (err) {
    sendError(res, err, 400);
  }
};

module.exports = {
  getMessages,
  createMessage,
  getSongRequests,
  createSongRequest,
  voteSongRequest,
  updateSongRequestStatus,
  getReactions,
  getLiveSessions,
};
