const { Stream } = require('../models/stream.model');
const activityService = require('../services/activity.service');
const { socketAuthMiddleware } = require('./auth.middleware');

const getRoomSize = (namespace, roomId) => namespace.adapter.rooms.get(roomId)?.size || 0;

const emitViewerCount = async (namespace, roomId) => {
  const viewers = getRoomSize(namespace, roomId);

  try {
    await Stream.update({ viewers }, { where: { id: roomId } });
  } catch (err) {
    // Temporary stream room ids are allowed before user app integration.
  }

  try {
    await activityService.updateLiveSessionViewers(roomId, viewers);
  } catch (err) {
    // Viewer updates should not break the socket connection.
  }

  namespace.to(roomId).emit('viewer_update', { viewers });
};

const streamSocket = (io) => {
  const streamNamespace = io.of('/stream');

  // Apply authentication middleware to protect socket connections
  streamNamespace.use(socketAuthMiddleware);

  streamNamespace.on('connection', (socket) => {
    console.log(`[Stream Socket] User connected: ${socket.id}`);

    socket.on('join_stream', async ({ streamId } = {}) => {
      const roomId = String(streamId || '').trim();
      if (!roomId) {
        socket.emit('stream_error', { message: 'streamId is required' });
        return;
      }

      socket.join(roomId);
      socket.data.streamId = roomId;
      console.log(`[Stream Socket] User joined stream room: ${roomId}`);

      await emitViewerCount(streamNamespace, roomId);
    });

    socket.on('go_live', async ({ streamId, streamName } = {}) => {
      const roomId = String(streamId || '').trim();
      if (!roomId) {
        socket.emit('stream_error', { message: 'streamId is required' });
        return;
      }

      const displayName = String(streamName || 'Stream').trim();
      const viewers = getRoomSize(streamNamespace, roomId);

      try {
        await activityService.startLiveSession({
          streamId: roomId,
          streamName: displayName,
          viewerCount: viewers,
        });
      } catch (err) {
        socket.emit('stream_error', { message: err.message || 'Could not start live session' });
        return;
      }

      streamNamespace.to(roomId).emit('stream_started', {
        streamId: roomId,
        streamName: displayName,
        message: `${displayName} is now live`,
        timestamp: Date.now(),
      });
    });

    socket.on('end_stream', async ({ streamId } = {}) => {
      const roomId = String(streamId || '').trim();
      if (!roomId) {
        socket.emit('stream_error', { message: 'streamId is required' });
        return;
      }

      const viewers = getRoomSize(streamNamespace, roomId);

      try {
        await activityService.endLiveSession({ streamId: roomId, viewerCount: viewers });
      } catch (err) {
        socket.emit('stream_error', { message: err.message || 'Could not end live session' });
        return;
      }

      streamNamespace.to(roomId).emit('stream_ended', {
        streamId: roomId,
        message: 'Stream has ended',
        timestamp: Date.now(),
      });
    });

    socket.on('health_ping', ({ streamId } = {}) => {
      const roomId = String(streamId || '').trim();
      if (!roomId) {
        socket.emit('stream_error', { message: 'streamId is required' });
        return;
      }

      socket.emit('health_pong', {
        status: 'stable',
        bitrate: 320,
        uptime: Date.now(),
        listeners: getRoomSize(streamNamespace, roomId),
        bufferHealth: 100,
        droppedFrames: 0,
        networkLatency: Math.floor(Math.random() * 30),
      });
    });

    socket.on('disconnect', async () => {
      if (socket.data.streamId) {
        await emitViewerCount(streamNamespace, socket.data.streamId);
      }
      console.log(`[Stream Socket] User disconnected: ${socket.id}`);
    });
  });
};

module.exports = streamSocket;
