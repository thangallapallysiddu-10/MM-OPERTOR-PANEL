const podcastService = require('../services/podcast.service');
const { socketOptionalAuthMiddleware } = require('./auth.middleware');

let podcastNamespace = null;
const roomConnections = new Map();
const CHAT_HISTORY_LIMIT = 100;
const CHAT_MESSAGE_LIMIT = 500;
const CHAT_RATE_LIMIT_MS = 2000; // Increased from 900ms to 2 seconds for better rate limiting

const getRoom = (roomId) => {
  const key = String(roomId || '').trim();
  if (!roomConnections.has(key)) {
    roomConnections.set(key, {
      hosts: new Set(),
      audience: new Set(),
      audienceNames: new Map(),
      approvedGuests: new Map(),
      guestSockets: new Map(),
      chatHistory: [],
    });
  }
  return roomConnections.get(key);
};

const normalizeChatText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const canSendChat = (socket) => {
  const now = Date.now();
  if (socket.data.lastPodcastChatAt && now - socket.data.lastPodcastChatAt < CHAT_RATE_LIMIT_MS) {
    return false;
  }
  socket.data.lastPodcastChatAt = now;
  return true;
};

const emitChatMessage = (roomId, message) => {
  const room = getRoom(roomId);
  room.chatHistory.push(message);
  if (room.chatHistory.length > CHAT_HISTORY_LIMIT) {
    room.chatHistory.splice(0, room.chatHistory.length - CHAT_HISTORY_LIMIT);
  }

  podcastNamespace.to(`podcast:${roomId}`).emit('chat_message', message);
  podcastNamespace.to(`podcast:${roomId}:hosts`).emit('chat_message', message);
};

const createChatMessage = ({ roomId, senderId, senderName, senderRole, text }) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  roomId,
  senderId: String(senderId || senderRole),
  senderName: String(senderName || senderRole || 'Guest').slice(0, 80),
  senderRole,
  text,
  createdAt: new Date().toISOString(),
});

const emitOpenConnectStatus = (socket, payload) => {
  // DEPRECATED — openconnect_status only consumed by legacy GuestRoom.tsx (old approval flow).
  // No current UI path uses this. Keep emitting so old client links do not break silently.
  socket.emit('listener_status', payload);
  socket.emit('openconnect_status', payload);
};

const emitGuestStatus = (guestId, guestPayload) => {
  // DEPRECATED — guest_status / openconnect_mic_status consumed by legacy GuestRoom.tsx
  // (old approval flow). Not used by GuestJoinPage (new slot flow).
  podcastNamespace.to(`guest:${guestId}`).emit('guest_status', guestPayload);
  podcastNamespace.to(`guest:${guestId}`).emit('openconnect_mic_status', guestPayload);
};

const getViewerCount = (roomId) => {
  const room = getRoom(roomId);
  const uniqueViewerSocketIds = new Set(room.audience);
  room.approvedGuests.forEach((socketId) => uniqueViewerSocketIds.add(socketId));
  return uniqueViewerSocketIds.size;
};

const emitViewerCount = async (roomId) => {
  if (!podcastNamespace || !roomId) return 0;

  const viewerCount = getViewerCount(roomId);
  podcastNamespace.to(`podcast:${roomId}`).emit('viewer_count', { roomId, viewerCount });
  podcastNamespace.to(`podcast:${roomId}:hosts`).emit('viewer_count', { roomId, viewerCount });

  try {
    await podcastService.updateLiveViewers(roomId, viewerCount);
  } catch (_) {
    // A stale room should not break active socket connections.
  }

  return viewerCount;
};

const emitGuestChanged = async (roomId, guest) => {
  // DEPRECATED — emitGuestChanged is only triggered by the legacy approval flow
  // (respondToGuest / removeGuest via old HTTP routes).
  // The new slot system uses emitSlotUpdated, emitGuestMuteChanged, emitGuestRemoved instead.
  // Keep for backward compatibility until legacy routes are removed.
  if (!podcastNamespace || !roomId || !guest) return;

  const room = getRoom(roomId);
  if (guest.status === 'approved') {
    const guestSocketId = room.guestSockets?.get?.(String(guest.id));
    if (guestSocketId) {
      room.approvedGuests.set(String(guest.id), guestSocketId);
      const guestSocket = podcastNamespace.sockets.get(guestSocketId);
      if (guestSocket) {
        guestSocket.data.guestStatus = 'approved';
        guestSocket.emit('chat_history', { roomId, messages: room.chatHistory });
      }
    }
  } else {
    room.approvedGuests.delete(String(guest.id));
  }

  emitGuestStatus(guest.id, {
    ...(guest.get ? guest.get({ plain: true }) : guest),
    approvedByHost: guest.status === 'approved',
  });
  podcastNamespace.to(`podcast:${roomId}:hosts`).emit('guest_update', guest);
  await emitViewerCount(roomId);
};

const emitSessionEnded = (roomId) => {
  if (!podcastNamespace || !roomId) return;
  const room = getRoom(roomId);
  room.audience.clear();
  room.audienceNames.clear();
  room.approvedGuests.clear();
  room.guestSockets.clear();
  room.chatHistory = [];
  podcastNamespace.to(`podcast:${roomId}`).emit('live_ended', { roomId });
  podcastNamespace.to(`podcast:${roomId}:hosts`).emit('live_ended', { roomId });
};

// ---------------------------------------------------------------------------
// Guest Link Manager — slot-level socket helpers
// ---------------------------------------------------------------------------

/**
 * emitSlotUpdated — broadcast whenever any slot changes (join, leave, kick).
 * Called by the HTTP controllers after a DB mutation so the dashboard
 * reflects the change instantly without a page refresh.
 */
const emitSlotUpdated = (roomId, slotPayload) => {
  if (!podcastNamespace || !roomId || !slotPayload) return;
  podcastNamespace.to(`podcast:${roomId}:hosts`).emit('slot_updated', {
    roomId,
    ...slotPayload,
  });
};

// ---------------------------------------------------------------------------
// Guest Control Center — socket emit helpers (called from HTTP controllers)
// ---------------------------------------------------------------------------

/**
 * Tell the guest their mic has been muted/unmuted by the operator,
 * and tell the operator UI to update the card state.
 */
const emitGuestMuteChanged = (roomId, slotId, payload) => {
  if (!podcastNamespace || !roomId) return;
  // Notify the specific guest socket via their slot room
  podcastNamespace
    .to(`guest_slot:${roomId}:${slotId}`)
    .emit('guest_muted', { roomId, slotId, ...payload });
  // Notify operator UI
  podcastNamespace
    .to(`podcast:${roomId}:hosts`)
    .emit(payload.micMuted ? 'guest_muted' : 'guest_unmuted', { roomId, slotId, ...payload });
};

/**
 * Tell the guest their volume has changed and update the operator UI card.
 */
const emitGuestVolumeChanged = (roomId, slotId, payload) => {
  if (!podcastNamespace || !roomId) return;
  podcastNamespace
    .to(`guest_slot:${roomId}:${slotId}`)
    .emit('guest_volume_changed', { roomId, slotId, ...payload });
  podcastNamespace
    .to(`podcast:${roomId}:hosts`)
    .emit('guest_volume_changed', { roomId, slotId, ...payload });
};

/**
 * Tell the guest they have been removed by the operator.
 * The guest page listens for this and shows "Removed by host".
 */
const emitGuestRemoved = (roomId, slotId) => {
  if (!podcastNamespace || !roomId) return;
  podcastNamespace
    .to(`guest_slot:${roomId}:${slotId}`)
    .emit('guest_removed', { roomId, slotId, reason: 'Removed by host' });
};

const removeSocketFromRooms = async (socket) => {
  const rooms = socket.data.podcastRooms || [];
  const guestId = socket.data.guestId ? String(socket.data.guestId) : null;

  for (const roomId of rooms) {
    const room = getRoom(roomId);
    room.hosts.delete(socket.id);
    room.audience.delete(socket.id);
    room.audienceNames.delete(socket.id);

    if (guestId) {
      room.approvedGuests.delete(guestId);
      room.guestSockets.delete(guestId);

      try {
        const guest = await podcastService.removeGuest(guestId);
        const plainGuest = guest.get ? guest.get({ plain: true }) : guest;
        podcastNamespace.to(`podcast:${roomId}:hosts`).emit('guest_update', {
          ...plainGuest,
          status: 'denied',
        });
        emitGuestStatus(guestId, {
          ...plainGuest,
          status: 'denied',
        });
      } catch (_) {
        // Already removed guests are fine during disconnect cleanup.
      }
    }

    await emitViewerCount(roomId);
  }

  socket.data.guestId = null;
  socket.data.podcastRooms = [];
};

const podcastSocket = (io) => {
  podcastNamespace = io.of('/podcast');

  // Operators send JWT; guest/listener links may connect without auth
  podcastNamespace.use(socketOptionalAuthMiddleware);

  podcastNamespace.on('connection', (socket) => {
    socket.data.podcastRooms = [];

    const handleHostJoin = async ({ roomId } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      if (!cleanRoomId) {
        socket.emit('podcast_error', { message: 'roomId is required' });
        return;
      }

      const room = getRoom(cleanRoomId);
      room.hosts.add(socket.id);
      if (!socket.data.podcastRooms.includes(cleanRoomId)) {
        socket.data.podcastRooms.push(cleanRoomId);
      }
      socket.join(`podcast:${cleanRoomId}:hosts`);

      const guests = await podcastService.getGuests(cleanRoomId).catch(() => []);
      socket.emit('room_snapshot', {
        roomId: cleanRoomId,
        guests,
        viewerCount: getViewerCount(cleanRoomId),
        chatHistory: room.chatHistory,
      });
      socket.emit('chat_history', { roomId: cleanRoomId, messages: room.chatHistory });
    };

    socket.on('host_join', handleHostJoin);
    socket.on('operator_join', handleHostJoin);

    const handleOpenConnectJoin = async ({ roomId, name } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      if (!cleanRoomId) {
        socket.emit('podcast_error', { message: 'roomId is required' });
        return;
      }

      const room = getRoom(cleanRoomId);
      room.audience.add(socket.id);
      room.audienceNames.set(socket.id, String(name || 'Listener').trim().slice(0, 80) || 'Listener');
      socket.data.listenerName = room.audienceNames.get(socket.id);
      if (!socket.data.podcastRooms.includes(cleanRoomId)) {
        socket.data.podcastRooms.push(cleanRoomId);
      }
      socket.join(`podcast:${cleanRoomId}`);
      await emitViewerCount(cleanRoomId);
      socket.emit('chat_history', { roomId: cleanRoomId, messages: room.chatHistory });
      emitOpenConnectStatus(socket, { roomId: cleanRoomId, status: 'connected', name: socket.data.listenerName });
    };

    socket.on('audience_join', handleOpenConnectJoin);
    socket.on('openconnect_join', handleOpenConnectJoin);

    // -----------------------------------------------------------------------
    // DEPRECATED — Legacy approval-flow socket handlers.
    // These handlers support the old GuestRoom.tsx flow:
    //   guest_request → creates pending PodcastGuest → host approves/denies.
    // The current UI uses the slot-join flow exclusively.
    // These handlers MUST NOT be used as the identity anchor for WebRTC signaling.
    // Remove after legacy routes (POST /live/guests/join, PUT /live/guests/:id/respond)
    // are formally decommissioned.
    // -----------------------------------------------------------------------

    const handleGuestRequest = async ({ roomId, name, device } = {}) => {
      // DEPRECATED — old approval flow. Not triggered by GuestJoinPage.
      const cleanRoomId = String(roomId || '').trim();
      if (!cleanRoomId || !String(name || '').trim()) {
        socket.emit('podcast_error', { message: 'roomId and name are required' });
        return;
      }

      try {
        const guest = await podcastService.joinLiveSession({
          roomId: cleanRoomId,
          name,
          device: device || 'Unknown Device',
        });

        const room = getRoom(cleanRoomId);
        room.guestSockets.set(String(guest.id), socket.id);

        socket.data.guestId = guest.id;
        socket.data.guestName = guest.name;
        socket.data.guestStatus = 'pending';
        if (!socket.data.podcastRooms.includes(cleanRoomId)) {
          socket.data.podcastRooms.push(cleanRoomId);
        }
        socket.join(`podcast:${cleanRoomId}`);
        socket.join(`guest:${guest.id}`);
        const pendingGuest = { ...(guest.get ? guest.get({ plain: true }) : guest), status: 'pending' };
        socket.emit('guest_status', pendingGuest);
        socket.emit('openconnect_mic_status', pendingGuest);
        podcastNamespace.to(`podcast:${cleanRoomId}:hosts`).emit('guest_request', pendingGuest);
      } catch (err) {
        socket.emit('podcast_error', { message: err.message || 'Could not join room' });
      }
    };

    // DEPRECATED — see block comment above
    socket.on('guest_request', handleGuestRequest);
    // DEPRECATED — openconnect alias for guest_request
    socket.on('openconnect_request_mic', handleGuestRequest);

    const handleHostChatMessage = ({ roomId, text, name } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanText = normalizeChatText(text);
      const room = getRoom(cleanRoomId);

      if (!cleanRoomId || !room.hosts.has(socket.id)) {
        socket.emit('chat_error', { message: 'Host chat requires an active host room' });
        return;
      }
      if (!cleanText || cleanText.length > CHAT_MESSAGE_LIMIT) {
        socket.emit('chat_error', { message: `Chat message must be 1-${CHAT_MESSAGE_LIMIT} characters` });
        return;
      }
      if (!canSendChat(socket)) {
        socket.emit('chat_error', { message: 'Please slow down before sending another chat message' });
        return;
      }

      emitChatMessage(cleanRoomId, createChatMessage({
        roomId: cleanRoomId,
        senderId: 'host',
        senderName: name || 'Operator',
        senderRole: 'host',
        text: cleanText,
      }));
    };

    socket.on('host_chat_message', handleHostChatMessage);
    socket.on('operator_chat_message', handleHostChatMessage);

    const handleGuestChatMessage = ({ roomId, guestId, text } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanGuestId = String(guestId || socket.data.guestId || '').trim();
      const cleanText = normalizeChatText(text);
      const room = getRoom(cleanRoomId);

      if (!cleanRoomId || !cleanGuestId || room.approvedGuests.get(cleanGuestId) !== socket.id) {
        socket.emit('chat_error', { message: 'Only approved guests can send chat messages' });
        return;
      }
      if (!cleanText || cleanText.length > CHAT_MESSAGE_LIMIT) {
        socket.emit('chat_error', { message: `Chat message must be 1-${CHAT_MESSAGE_LIMIT} characters` });
        return;
      }
      if (!canSendChat(socket)) {
        socket.emit('chat_error', { message: 'Please slow down before sending another chat message' });
        return;
      }

      emitChatMessage(cleanRoomId, createChatMessage({
        roomId: cleanRoomId,
        senderId: cleanGuestId,
        senderName: socket.data.guestName || 'Guest',
        senderRole: 'guest',
        text: cleanText,
      }));
    };

    socket.on('guest_chat_message', handleGuestChatMessage);
    // (openconnect_guest_chat_message alias registered in DEPRECATED block below)

    const handleOpenConnectChatMessage = ({ roomId, text } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanText = normalizeChatText(text);
      const room = getRoom(cleanRoomId);

      if (!cleanRoomId || !room.audience.has(socket.id)) {
        socket.emit('chat_error', { message: 'Join the live room before sending chat messages' });
        return;
      }
      if (!cleanText || cleanText.length > CHAT_MESSAGE_LIMIT) {
        socket.emit('chat_error', { message: `Chat message must be 1-${CHAT_MESSAGE_LIMIT} characters` });
        return;
      }
      if (!canSendChat(socket)) {
        socket.emit('chat_error', { message: 'Please slow down before sending another chat message' });
        return;
      }

      emitChatMessage(cleanRoomId, createChatMessage({
        roomId: cleanRoomId,
        senderId: socket.id,
        senderName: room.audienceNames.get(socket.id) || socket.data.listenerName || 'Listener',
        senderRole: 'listener',
        text: cleanText,
      }));
    };

    socket.on('listener_chat_message', handleOpenConnectChatMessage);
    // (openconnect_chat_message alias registered in DEPRECATED block below)

    const handleGuestResponse = async ({ guestId, action } = {}) => {
      // DEPRECATED — legacy approval flow. No current UI emits host_guest_response
      // or operator_guest_response. Remove after legacy routes are decommissioned.
      try {
        const hostRooms = (socket.data.podcastRooms || []).filter((roomId) => getRoom(roomId).hosts.has(socket.id));
        if (hostRooms.length === 0) {
          socket.emit('podcast_error', { message: 'Only the room host can approve guests' });
          return;
        }

        const guest = await podcastService.respondToGuest(guestId, action, { allowedRoomIds: hostRooms });
        await emitGuestChanged(guest.roomId, guest);
      } catch (err) {
        socket.emit('podcast_error', { message: err.message || 'Could not respond to guest' });
      }
    };

    // DEPRECATED — see legacy block comment above
    socket.on('host_guest_response', handleGuestResponse);
    // DEPRECATED — operator_guest_response alias
    socket.on('operator_guest_response', handleGuestResponse);

    socket.on('guest_mic_state', ({ roomId, guestId, muted, level } = {}) => {
      // DEPRECATED — guest_mic_state emitted by legacy GuestRoom.tsx (old approval flow).
      // GuestJoinPage uses guest_mic_toggle instead.
      const cleanRoomId = String(roomId || '').trim();
      if (!cleanRoomId || !guestId) return;
      podcastNamespace.to(`podcast:${cleanRoomId}:hosts`).emit('guest_mic_state', {
        roomId: cleanRoomId,
        guestId,
        muted: Boolean(muted),
        level: Math.max(0, Math.min(100, Number(level || 0))),
      });
    });

    socket.on('guest_leave', async () => {
      // DEPRECATED — guest_leave emitted by legacy GuestRoom.tsx.
      // GuestJoinPage uses guest_left (slot-aware) instead.
      await removeSocketFromRooms(socket);
      socket.disconnect(true);
    });

    socket.on('openconnect_leave', async () => {
      // DEPRECATED — openconnect_leave alias. Legacy GuestRoom.tsx path.
      await removeSocketFromRooms(socket);
      socket.disconnect(true);
    });

    // DEPRECATED — openconnect_chat_message alias. Legacy listener chat path.
    socket.on('openconnect_chat_message', handleOpenConnectChatMessage);
    // DEPRECATED — openconnect_guest_chat_message alias. Legacy guest chat path.
    socket.on('openconnect_guest_chat_message', handleGuestChatMessage);

    // -----------------------------------------------------------------------
    // Guest Link Manager socket events
    // -----------------------------------------------------------------------

    /**
     * guest_joined — emitted by the guest page immediately after a successful
     * POST /api/podcasts/guest-slots/join.  Registers the socket in the room
     * and forwards a guest_joined event to the operator UI.
     *
     * Payload: { roomId, slotId, guestName, guestId, guestToken }
     */
    socket.on('guest_joined', ({ roomId, slotId, guestName, guestId, guestToken } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId || !guestName) return;

      // Track this socket in the room so disconnect triggers cleanup
      if (!socket.data.podcastRooms.includes(cleanRoomId)) {
        socket.data.podcastRooms.push(cleanRoomId);
      }
      socket.data.guestId = guestId;
      socket.data.guestName = String(guestName).slice(0, 120);
      socket.data.guestSlotId = cleanSlotId;
      socket.data.guestToken = guestToken;

      socket.join(`podcast:${cleanRoomId}`);
      socket.join(`guest_slot:${cleanRoomId}:${cleanSlotId}`);

      const room = getRoom(cleanRoomId);
      // Register as approved so viewer count includes them
      if (guestId) {
        room.approvedGuests.set(String(guestId), socket.id);
        room.guestSockets.set(String(guestId), socket.id);
      }

      // Acknowledge to guest
      socket.emit('slot_confirmed', { roomId: cleanRoomId, slotId: cleanSlotId, guestName });

      // Notify operator UI
      podcastNamespace.to(`podcast:${cleanRoomId}:hosts`).emit('guest_joined', {
        roomId: cleanRoomId,
        slotId: cleanSlotId,
        guestName: socket.data.guestName,
        guestId,
        status: 'connected',
      });

      emitViewerCount(cleanRoomId).catch(() => {});
    });

    /**
     * guest_left — emitted by the guest page when the user clicks Leave or
     * closes the tab (beforeunload).  Cleans up the slot and tells the operator.
     *
     * Payload: { roomId, slotId, guestToken }
     */
    socket.on('guest_left', async ({ roomId, slotId, guestToken } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId) return;

      try {
        const podcastService = require('../services/podcast.service');
        if (guestToken) {
          await podcastService.leaveGuestSlot({ roomId: cleanRoomId, slotId: cleanSlotId, guestToken });
        }
      } catch (_) {
        // Already removed — safe to ignore
      }

      podcastNamespace.to(`podcast:${cleanRoomId}:hosts`).emit('guest_left', {
        roomId: cleanRoomId,
        slotId: cleanSlotId,
        guestName: null,
        status: 'empty',
      });

      emitSlotUpdated(cleanRoomId, { slotId: cleanSlotId, status: 'empty', guestName: null });
      await removeSocketFromRooms(socket);
      socket.disconnect(true);
    });

    // -----------------------------------------------------------------------
    // Guest Control Center — inbound socket events
    // -----------------------------------------------------------------------

    /**
     * guest_speaking — emitted continuously by the guest page based on
     * microphone activity (Web Audio API / VAD).
     * Operator UI uses this to show the 🟢 Speaking / ⚪ Silent indicator.
     * No DB write — purely real-time.
     *
     * Payload: { roomId, slotId, speaking: true|false }
     */
    socket.on('guest_speaking', ({ roomId, slotId, speaking } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId) return;

      podcastNamespace.to(`podcast:${cleanRoomId}:hosts`).emit('guest_speaking', {
        roomId: cleanRoomId,
        slotId: cleanSlotId,
        speaking: Boolean(speaking),
      });
    });

    /**
     * guest_mic_toggle — guest toggles their own mic on/off from the guest page.
     * Syncs the mic state to the operator UI so the card reflects the guest's
     * own action (separate from operator mute/unmute).
     *
     * Payload: { roomId, slotId, muted: true|false }
     */
    socket.on('guest_mic_toggle', ({ roomId, slotId, muted } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId) return;

      podcastNamespace.to(`podcast:${cleanRoomId}:hosts`).emit('guest_mic_toggle', {
        roomId: cleanRoomId,
        slotId: cleanSlotId,
        muted: Boolean(muted),
      });
    });

    // -----------------------------------------------------------------------
    // WebRTC signaling relay — Phase 3 (Host ↔ Guest audio)
    // Uses existing room structure. No new namespaces or servers.
    //
    //  webrtc_offer       : Guest → Server → podcast:roomId:hosts
    //  webrtc_answer      : Host  → Server → guest_slot:roomId:slotId
    //  webrtc_ice_candidate: Either → Server → the other party
    // -----------------------------------------------------------------------

    socket.on('webrtc_offer', ({ roomId, slotId, sdp } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId || !sdp) return;

      // Guest is sending an offer — forward to the host room
      podcastNamespace
        .to(`podcast:${cleanRoomId}:hosts`)
        .emit('webrtc_offer', { roomId: cleanRoomId, slotId: cleanSlotId, sdp });
    });

    socket.on('webrtc_answer', ({ roomId, slotId, sdp } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId || !sdp) return;

      // Host is sending an answer — forward to the specific guest slot
      podcastNamespace
        .to(`guest_slot:${cleanRoomId}:${cleanSlotId}`)
        .emit('webrtc_answer', { roomId: cleanRoomId, slotId: cleanSlotId, sdp });
    });

    socket.on('webrtc_ice_candidate', ({ roomId, slotId, candidate } = {}) => {
      const cleanRoomId = String(roomId || '').trim();
      const cleanSlotId = String(slotId || '').trim();
      if (!cleanRoomId || !cleanSlotId || !candidate) return;

      const room = getRoom(cleanRoomId);
      const isHost = room.hosts.has(socket.id);

      if (isHost) {
        // Host ICE → guest slot
        podcastNamespace
          .to(`guest_slot:${cleanRoomId}:${cleanSlotId}`)
          .emit('webrtc_ice_candidate', { roomId: cleanRoomId, slotId: cleanSlotId, candidate });
      } else {
        // Guest ICE → host room
        podcastNamespace
          .to(`podcast:${cleanRoomId}:hosts`)
          .emit('webrtc_ice_candidate', { roomId: cleanRoomId, slotId: cleanSlotId, candidate });
      }
    });

    socket.on('disconnect', () => {
      removeSocketFromRooms(socket).catch(() => {});
    });
  });
};

podcastSocket.emitGuestChanged = emitGuestChanged;
podcastSocket.emitViewerCount = emitViewerCount;
podcastSocket.emitSessionEnded = emitSessionEnded;
podcastSocket.emitSlotUpdated = emitSlotUpdated;
podcastSocket.emitGuestMuteChanged = emitGuestMuteChanged;
podcastSocket.emitGuestVolumeChanged = emitGuestVolumeChanged;
podcastSocket.emitGuestRemoved = emitGuestRemoved;
podcastSocket.getViewerCount = getViewerCount;

module.exports = podcastSocket;
