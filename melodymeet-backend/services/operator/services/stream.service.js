const { Stream, Track } = require('../models/stream.model');
const { notFound } = require('../utils/errors');
const { schemas, validate } = require('../utils/validators');

const getAllStreams = async () => {
  return await Stream.findAll({
    include: [{ model: Track }],
    order: [
      ['createdAt', 'ASC'],
      [Track, 'createdAt', 'DESC'],
    ],
  });
};

const createStream = async (data) => {
  const payload = validate(schemas.stream, data);
  if (!payload.description) payload.description = 'Custom Stream Channel';
  return await Stream.create(payload);
};

const toggleLive = async (id, isLive) => {
  const stream = await Stream.findByPk(id);
  if (!stream) throw notFound('Stream not found');

  stream.isLive = isLive;
  await stream.save();
  return stream;
};

const addTrack = async (streamId, trackData) => {
  const stream = await Stream.findByPk(streamId);
  if (!stream) throw notFound('Stream not found');

  const payload = validate(schemas.track, trackData);
  if (!payload.artist) payload.artist = 'Unknown Artist';
  return await Track.create({ ...payload, streamId });
};

const deleteStream = async (id) => {
  const deleted = await Stream.destroy({ where: { id } });
  if (!deleted) throw notFound('Stream not found');
};

const deleteTrack = async (id) => {
  const deleted = await Track.destroy({ where: { id } });
  if (!deleted) throw notFound('Track not found');
};

module.exports = {
  getAllStreams,
  createStream,
  toggleLive,
  addTrack,
  deleteStream,
  deleteTrack,
};
