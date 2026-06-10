const activityService = require('../services/activity.service');
const { socketAuthMiddleware } = require('./auth.middleware');

const getRequiredRoom = (socket, studioId) => {
  const roomId = String(studioId || '').trim();
  if (!roomId) {
    socket.emit('chat_error', { message: 'studioId is required' });
    return null;
  }
  return roomId;
};

const getDisplayName = (username) => String(username || 'Guest').trim() || 'Guest';

const getTimestamp = (record) => new Date(record.createdAt || Date.now()).getTime();

const handleSocketError = (socket, error) => {
  socket.emit('chat_error', { message: error.message || 'Chat event failed' });
};

let chatNamespace = null;

const chatSocket = (io) => {
  chatNamespace = io.of('/chat');

  // Apply authentication middleware to protect socket connections
  chatNamespace.use(socketAuthMiddleware);

  chatNamespace.on('connection', (socket) => {
    console.log(`[Chat Socket] User connected: ${socket.id}`);

    socket.on('join_studio', ({ studioId, username } = {}) => {
      const roomId = getRequiredRoom(socket, studioId);
      if (!roomId) return;

      const displayName = getDisplayName(username);
      socket.join(roomId);
      socket.data.username = displayName;
      socket.data.studioId = roomId;
      console.log(`[Chat Socket] ${displayName} joined studio: ${roomId}`);

      socket.to(roomId).emit('user_joined', {
        username: displayName,
        message: `${displayName} joined the studio`,
        timestamp: Date.now(),
      });
    });

    socket.on('send_message', async ({ studioId, text, username } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        const messageText = String(text || '').trim();
        if (!messageText) {
          socket.emit('chat_error', { message: 'text is required' });
          return;
        }

        const message = await activityService.createMessage({
          studioId: roomId,
          username: getDisplayName(username),
          text: messageText,
        });

        chatNamespace.to(roomId).emit('receive_message', {
          id: message.id,
          username: message.username,
          text: message.text,
          timestamp: getTimestamp(message),
          type: 'message',
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('send_gift', async ({ studioId, gift, username } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        if (!gift) {
          socket.emit('chat_error', { message: 'gift is required' });
          return;
        }

        const reaction = await activityService.createReaction({
          studioId: roomId,
          username: getDisplayName(username),
          type: 'gift',
          value: gift,
        });

        chatNamespace.to(roomId).emit('receive_gift', {
          id: reaction.id,
          username: reaction.username,
          gift,
          timestamp: getTimestamp(reaction),
          type: 'gift',
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('send_sticker', async ({ studioId, sticker, username } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        if (!sticker) {
          socket.emit('chat_error', { message: 'sticker is required' });
          return;
        }

        const reaction = await activityService.createReaction({
          studioId: roomId,
          username: getDisplayName(username),
          type: 'sticker',
          value: sticker,
        });

        chatNamespace.to(roomId).emit('receive_sticker', {
          id: reaction.id,
          username: reaction.username,
          sticker,
          timestamp: getTimestamp(reaction),
          type: 'sticker',
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('like_stream', async ({ studioId, username } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        const reaction = await activityService.createReaction({
          studioId: roomId,
          username: getDisplayName(username),
          type: 'like',
          value: null,
        });

        chatNamespace.to(roomId).emit('receive_like', {
          id: reaction.id,
          username: reaction.username,
          timestamp: getTimestamp(reaction),
          type: 'like',
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('request_song', async ({ studioId, songTitle, username } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        const title = String(songTitle || '').trim();
        if (!title) {
          socket.emit('chat_error', { message: 'songTitle is required' });
          return;
        }

        const request = await activityService.createSongRequest({
          studioId: roomId,
          username: getDisplayName(username),
          songTitle: title,
        });

        chatNamespace.to(roomId).emit('song_requested', {
          id: request.id,
          username: request.username,
          songTitle: request.songTitle,
          votes: request.votes,
          timestamp: getTimestamp(request),
          type: 'request',
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('vote_song', async ({ studioId, requestId, username } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        if (!requestId) {
          socket.emit('chat_error', { message: 'requestId is required' });
          return;
        }

        const request = await activityService.voteSongRequest({
          studioId: roomId,
          requestId,
          username: getDisplayName(username),
        });

        chatNamespace.to(roomId).emit('song_voted', {
          requestId: request.id,
          username: getDisplayName(username),
          votes: request.votes,
          timestamp: Date.now(),
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('pin_message', async ({ studioId, messageId, text } = {}) => {
      try {
        const roomId = getRequiredRoom(socket, studioId);
        if (!roomId) return;

        const messageText = String(text || '').trim();
        if (!messageId || !messageText) {
          socket.emit('chat_error', { message: 'messageId and text are required' });
          return;
        }

        const message = await activityService.pinMessage({
          studioId: roomId,
          messageId,
          text: messageText,
        });

        chatNamespace.to(roomId).emit('message_pinned', {
          messageId,
          storedMessageId: message.id,
          text: messageText,
          timestamp: Date.now(),
        });
      } catch (err) {
        handleSocketError(socket, err);
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.studioId && socket.data.username) {
        chatNamespace.to(socket.data.studioId).emit('user_left', {
          username: socket.data.username,
          timestamp: Date.now(),
        });
      }
      console.log(`[Chat Socket] User disconnected: ${socket.id}`);
    });
  });
};

chatSocket.emitSystemMessage = (studioId, text) => {
  if (!chatNamespace || !studioId) return;
  chatNamespace.to(String(studioId)).emit('receive_message', {
    id: Date.now() + Math.random(),
    username: 'System',
    text: String(text).trim(),
    timestamp: Date.now(),
    type: 'system',
  });
};

module.exports = chatSocket;
