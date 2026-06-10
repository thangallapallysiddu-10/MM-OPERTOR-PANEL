const rjService = require('../services/rj.service');
const activityService = require('../services/activity.service');
const { socketAuthMiddleware } = require('./auth.middleware');

const emitStudioState = async (namespace, studioId) => {
  const bundle = await rjService.getStudioBundle(studioId);
  namespace.to(studioId).emit('rj_studio_state', bundle);
};

const handleSocketError = (socket, error) => {
  socket.emit('rj_error', { message: error.message || 'RJ event failed' });
};

const rjSocket = (io) => {
  const rjNamespace = io.of('/rj');
  rjNamespace.use(socketAuthMiddleware);

  rjNamespace.on('connection', (socket) => {
    console.log(`[RJ Socket] Connected: ${socket.id}`);

    socket.on('join_studio', async ({ studioId, username } = {}) => {
      const roomId = String(studioId || '').trim();
      if (!roomId) {
        socket.emit('rj_error', { message: 'studioId is required' });
        return;
      }

      socket.join(roomId);
      socket.data.studioId = roomId;
      socket.data.username = String(username || 'RJ').trim();

      try {
        await rjService.getOrCreateStudio(roomId);
        const bundle = await rjService.getStudioBundle(roomId);
        socket.emit('rj_studio_state', bundle);
        socket.to(roomId).emit('rj_operator_joined', {
          username: socket.data.username,
          timestamp: Date.now(),
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('sync_studio', async ({ studioId, patch } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        if (!roomId) throw new Error('studioId is required');
        if (patch && Object.keys(patch).length) {
          await rjService.patchStudioState(roomId, patch);
        }
        await emitStudioState(rjNamespace, roomId);
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('dual_player_action', async ({ studioId, ...body } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.applyDualPlayerAction(roomId, body);
        rjNamespace.to(roomId).emit('rj_dual_player_updated', {
          dualPlayer: studio.dualPlayer,
          currentTrack: studio.currentTrack,
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('mixer_update', async ({ studioId, ...body } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.patchMixer(roomId, body);
        rjNamespace.to(roomId).emit('rj_mixer_updated', {
          ...rjService.getMixerStateForClient(studio),
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('mic_update', async ({ studioId, ...body } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.patchMic(roomId, body);
        rjNamespace.to(roomId).emit('rj_mics_updated', { mics: studio.mics });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('playlist_add', async ({ studioId, song } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const item = song?.title
          ? await rjService.addPlaylistItem(roomId, song)
          : await rjService.addPlaylistFromLibrary(roomId, song);
        const bundle = await rjService.getStudioBundle(roomId);
        rjNamespace.to(roomId).emit('rj_playlist_updated', { playlist: bundle.playlist });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('playlist_start', async ({ studioId, durationMinutes } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const result = await rjService.startPlaylistSession(roomId, { durationMinutes });
        await emitStudioState(rjNamespace, roomId);
        rjNamespace.to(roomId).emit('rj_playlist_started', result);
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('go_live', async ({ studioId, streamName, viewerCount } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.goLive(roomId, { streamName, viewerCount });
        rjNamespace.to(roomId).emit('rj_live_started', { studio, timestamp: Date.now() });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('stop_live', async ({ studioId, viewerCount } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.stopLive(roomId, { viewerCount });
        rjNamespace.to(roomId).emit('rj_live_stopped', { studio, timestamp: Date.now() });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('listener_count', async ({ studioId, count } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.syncListenerCount(roomId, count);
        rjNamespace.to(roomId).emit('rj_stats_updated', {
          stats: studio.stats,
          activeListeners: studio.activeListeners,
          listenerHistory: studio.listenerHistory,
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('send_message', async ({ studioId, text, username } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const message = await rjService.postChatMessage(roomId, { text, username });
        rjNamespace.to(roomId).emit('rj_receive_message', {
          id: message.id,
          user: message.username,
          text: message.text,
          time: message.createdAt,
          system: message.type === 'system',
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('pin_message', async ({ studioId, messageId, text } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        await rjService.pinChatMessage(roomId, messageId, text);
        rjNamespace.to(roomId).emit('rj_message_pinned', { messageId, text, timestamp: Date.now() });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('ban_user', async ({ studioId, username, reason } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        await rjService.banUser(roomId, { username, reason });
        rjNamespace.to(roomId).emit('rj_user_banned', { username, timestamp: Date.now() });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('announcement', async ({ studioId, message, visible } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const studio = await rjService.setAnnouncement(roomId, { message, visible: visible !== false });
        rjNamespace.to(roomId).emit('rj_announcement', studio.announcement);
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('playlist_tick', async ({ studioId } = {}) => {
      try {
        const roomId = String(studioId || socket.data.studioId || '').trim();
        const result = await rjService.tickPlaylistTimer(roomId);
        rjNamespace.to(roomId).emit('rj_playlist_tick', result);
        if (result.advanced) {
          rjNamespace.to(roomId).emit('rj_playlist_advanced', {
            currentTrack: result.currentTrack,
            playlistCurrentIndex: result.studio?.playlistCurrentIndex,
          });
          await emitStudioState(rjNamespace, roomId);
        }
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[RJ Socket] Disconnected: ${socket.id}`);
    });
  });
};

module.exports = rjSocket;
