const Joi = require('joi');
const { badRequest } = require('./errors');

const STREAM_QUALITIES = ['MAXIMUM', 'HIGH', 'BALANCED', 'LOSSLESS'];
const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'webm'];
const PODCAST_STATUSES = ['Published', 'Draft', 'Scheduled'];
const PODCAST_SOURCES = ['upload', 'recording', 'metadata', 'trimmed'];
const USER_ROLES = ['RJ', 'Podcast Host', 'Listener'];
const REACTION_TYPES = ['like', 'gift', 'sticker'];
const SONG_REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'played'];
const LIVE_SESSION_STATUSES = ['live', 'ended'];

const validate = (schema, payload) => {
  const { value, error } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const message = error.details
      .map((detail) => detail.message.replace(/"/g, ''))
      .join('; ');
    throw badRequest(message);
  }

  return value;
};

const operatorProfileSocialLinksSchema = Joi.object({
  instagram: Joi.string().trim().max(300).allow(''),
  youtube: Joi.string().trim().max(300).allow(''),
  twitter: Joi.string().trim().max(300).allow(''),
  spotify: Joi.string().trim().max(300).allow(''),
  website: Joi.string().trim().max(300).allow(''),
  facebook: Joi.string().trim().max(300).allow(''),
});

/** Empty string is allowed; non-empty must be a valid email */
const operatorProfileEmailSchema = Joi.string()
  .trim()
  .max(255)
  .allow('', null)
  .empty('')
  .custom((value, helpers) => {
    if (!value) return '';
    const check = Joi.string().email().validate(value);
    if (check.error) return helpers.error('any.invalid');
    return value;
  });

const schemas = {
  stream: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    description: Joi.string().trim().allow('', null).max(500).default('Custom Stream Channel'),
    isLive: Joi.boolean().default(false),
    viewers: Joi.number().integer().min(0).default(0),
    bitrate: Joi.number().integer().min(32).max(320).default(128),
    quality: Joi.string().valid(...STREAM_QUALITIES).default('BALANCED'),
  }),

  track: Joi.object({
    title: Joi.string().trim().min(1).max(160).required(),
    artist: Joi.string().trim().allow('', null).max(120).default('Unknown Artist'),
    fileUrl: Joi.string().trim().min(1).required(),
    fileSize: Joi.alternatives().try(
      Joi.string().trim().allow('', null),
      Joi.number().min(0)
    ),
    duration: Joi.string().trim().allow('', null),
    format: Joi.string().trim().lowercase().valid(...AUDIO_FORMATS).default('mp3'),
  }),

  podcast: Joi.object({
    title: Joi.string().trim().min(1).max(180).required(),
    description: Joi.string().trim().allow('', null).default(''),
    genre: Joi.string().trim().allow('', null).max(80),
    seasonNumber: Joi.number().integer().min(1).max(9999).allow(null),
    episodeNumber: Joi.number().integer().min(1).max(9999).allow(null),
    fileName: Joi.string().trim().allow('', null),
    storageKey: Joi.string().trim().allow('', null),
    fileUrl: Joi.string().trim().allow('', null),
    fileSize: Joi.alternatives().try(
      Joi.string().trim().allow('', null),
      Joi.number().min(0)
    ),
    fileSizeBytes: Joi.number().integer().min(0).max(500 * 1024 * 1024).allow(null),
    mimeType: Joi.string().trim().allow('', null).max(120),
    audioFormat: Joi.string().trim().lowercase().valid(...AUDIO_FORMATS).allow(null),
    duration: Joi.string().trim().allow('', null),
    durationSeconds: Joi.number().integer().min(0).max(24 * 60 * 60).allow(null),
    scheduleDate: Joi.string().trim().allow('', null),
    status: Joi.string().valid(...PODCAST_STATUSES).default('Draft'),
    host: Joi.string().trim().allow('', null).max(120).default('DJ MAVERICK'),
    coverArt: Joi.string().trim().allow('', null),
    source: Joi.string().valid(...PODCAST_SOURCES).default('metadata'),
    publishedAt: Joi.date().allow(null),
    trimRanges: Joi.array().items(
      Joi.object({
        start: Joi.number().min(0).max(100).required(),
        end: Joi.number().min(0).max(100).greater(Joi.ref('start')).required(),
      })
    ).default([]),
    metadata: Joi.object().unknown(true).default({}),
  }),

  podcastUpdate: Joi.object({
    title: Joi.string().trim().min(1).max(180),
    description: Joi.string().trim().allow('', null),
    genre: Joi.string().trim().allow('', null).max(80),
    seasonNumber: Joi.number().integer().min(1).max(9999).allow(null),
    episodeNumber: Joi.number().integer().min(1).max(9999).allow(null),
    fileName: Joi.string().trim().allow('', null),
    storageKey: Joi.string().trim().allow('', null),
    fileUrl: Joi.string().trim().allow('', null),
    fileSize: Joi.string().trim().allow('', null),
    fileSizeBytes: Joi.number().integer().min(0).max(500 * 1024 * 1024).allow(null),
    mimeType: Joi.string().trim().allow('', null).max(120),
    audioFormat: Joi.string().trim().lowercase().valid(...AUDIO_FORMATS).allow(null),
    duration: Joi.string().trim().allow('', null),
    durationSeconds: Joi.number().integer().min(0).max(24 * 60 * 60).allow(null),
    scheduleDate: Joi.string().trim().allow('', null),
    status: Joi.string().valid(...PODCAST_STATUSES),
    host: Joi.string().trim().allow('', null).max(120),
    coverArt: Joi.string().trim().allow('', null),
    source: Joi.string().valid(...PODCAST_SOURCES),
    publishedAt: Joi.date().allow(null),
    trimRanges: Joi.array().items(
      Joi.object({
        start: Joi.number().min(0).max(100).required(),
        end: Joi.number().min(0).max(100).greater(Joi.ref('start')).required(),
      })
    ),
    metadata: Joi.object().unknown(true),
  }).min(1),

  podcastQuery: Joi.object({
    status: Joi.string().valid(...PODCAST_STATUSES),
    host: Joi.string().trim().max(120),
    search: Joi.string().trim().max(180),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),

  podcastStatus: Joi.object({
    status: Joi.string().valid(...PODCAST_STATUSES).required(),
    scheduleDate: Joi.string().trim().allow('', null),
  }),

  podcastRecording: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    duration: Joi.string().trim().max(20).allow('', null),
    durationSeconds: Joi.number().integer().min(0).max(86400).allow(null),
    size: Joi.string().trim().max(50).allow('', null),
    fileSizeBytes: Joi.number().integer().min(0).allow(null),
    storageKey: Joi.string().trim().allow('', null),
    fileUrl: Joi.string().trim().allow('', null),
    mimeType: Joi.string().trim().max(120).allow('', null),
    source: Joi.string().valid('recording', 'trimmed').default('recording'),
    originalRecordingId: Joi.number().integer().min(1).allow(null),
    trimRanges: Joi.array().items(
      Joi.object({
        start: Joi.number().min(0).max(100).required(),
        end: Joi.number().min(0).max(100).greater(Joi.ref('start')).required(),
      })
    ).default([]),
    metadata: Joi.object().unknown(true).default({}),
  }),

  podcastRecordingVolume: Joi.object({
    volumeMultiplier: Joi.number().min(0).max(10).required(),
  }),

  podcastRecordingTrim: Joi.object({
    name: Joi.string().trim().min(1).max(255).allow('', null),
    trimRanges: Joi.array().items(
      Joi.object({
        start: Joi.number().min(0).max(100).required(),
        end: Joi.number().min(0).max(100).greater(Joi.ref('start')).required(),
      })
    ).default([]),
  }),

  podcastLiveStart: Joi.object({
    title: Joi.string().trim().min(1).max(180).required(),
    description: Joi.string().trim().max(1000).allow('', null).default(''),
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    roomLink: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('', null),
    host: Joi.string().trim().max(120).default('Operator'),
  }),

  podcastNotification: Joi.object({
    title: Joi.string().trim().min(1).max(180).required(),
    message: Joi.string().trim().max(1000).required(),
    type: Joi.string().valid('report', 'ban', 'follow', 'system', 'song').default('system'),
    category: Joi.string().valid('dashboard', 'profile', 'rj').default('dashboard'),
  }),

  podcastMicCreate: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    type: Joi.string().trim().max(50).default('condenser'),
    active: Joi.boolean().default(false),
    phantom: Joi.boolean().default(false),
    gain: Joi.number().integer().min(0).max(100).default(0),
    volume: Joi.number().integer().min(0).max(100).default(50),
    muted: Joi.boolean().default(false),
    icon: Joi.string().trim().max(50).default('mic'),
    level: Joi.number().integer().min(0).max(100).default(0),
  }),

  podcastMicUpdate: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    type: Joi.string().trim().max(50),
    active: Joi.boolean(),
    phantom: Joi.boolean(),
    gain: Joi.number().integer().min(0).max(100),
    volume: Joi.number().integer().min(0).max(100),
    muted: Joi.boolean(),
    icon: Joi.string().trim().max(50),
    level: Joi.number().integer().min(0).max(100),
  }),

  podcastLiveStop: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    peakViewers: Joi.number().integer().min(0).default(0),
    lastViewerCount: Joi.number().integer().min(0).default(0),
  }),

  podcastGuestJoin: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    name: Joi.string().trim().min(1).max(120).required(),
    device: Joi.string().trim().max(200).allow('', null).default('Unknown Device'),
  }),

  podcastGuestRespond: Joi.object({
    action: Joi.string().valid('approve', 'deny').required(),
  }),

  // Guest Link Manager — generate 4 shareable slot URLs for a room
  podcastGuestLinkGenerate: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    // Frontend base URL used to build the full join URL.
    // Falls back to FRONTEND_URL env var, then a relative path.
    baseUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('', null),
  }),

  // Guest Link Manager — guest submits their name and claims a slot
  podcastGuestSlotJoin: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    // mic2 | mic3 | mic4 | mic5  (mic1 is always the host)
    slotId: Joi.string().valid('mic2', 'mic3', 'mic4', 'mic5').required(),
    guestName: Joi.string().trim().min(1).max(120).required(),
    // Present when the guest refreshes — allows reclaiming their own slot
    guestToken: Joi.string().trim().max(200).allow('', null),
  }),

  // Guest Link Manager — guest or server releases a slot
  podcastGuestSlotLeave: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    slotId: Joi.string().valid('mic2', 'mic3', 'mic4', 'mic5').required(),
    guestToken: Joi.string().trim().max(200).required(),
  }),

  // Guest Control Center — operator mute/unmute a slot
  // body-only schema: roomId and slotId come from URL params, not body.
  podcastGuestSlotMuteBody: Joi.object({
    muted: Joi.boolean().required(),
  }),

  // Guest Control Center — full schema used for service-layer validation
  // (roomId + slotId are assembled by the controller from req.params)
  podcastGuestSlotMute: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    slotId: Joi.string().valid('mic2', 'mic3', 'mic4', 'mic5').required(),
    muted: Joi.boolean().required(),
  }),

  // Guest Control Center — operator sets volume on a slot (0–200)
  podcastGuestSlotVolume: Joi.object({
    roomId: Joi.string().trim().alphanum().min(4).max(120).required(),
    slotId: Joi.string().valid('mic2', 'mic3', 'mic4', 'mic5').required(),
    volume: Joi.number().integer().min(0).max(200).required(),
  }),

  user: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    email: Joi.string().trim().email().empty('').allow(null).default(null),
    avatar: Joi.string().trim().max(8).allow('', null),
    role: Joi.string().valid(...USER_ROLES).default('Listener'),
    followers: Joi.number().integer().min(0).default(0),
    isBanned: Joi.boolean().default(false),
    reports: Joi.number().integer().min(0).default(0),
    joinDate: Joi.date().iso().allow(null),
  }),

  userReport: Joi.object({
    reason: Joi.string().trim().max(500).allow('', null).default(null),
  }),

  chatMessage: Joi.object({
    studioId: Joi.string().trim().min(1).max(120).required(),
    username: Joi.string().trim().min(1).max(120).default('Guest'),
    text: Joi.string().trim().min(1).max(5000).required(),
    type: Joi.string().valid('message', 'system').default('message'),
    isPinned: Joi.boolean().default(false),
  }),

  streamReaction: Joi.object({
    studioId: Joi.string().trim().min(1).max(120).required(),
    username: Joi.string().trim().min(1).max(120).default('Guest'),
    type: Joi.string().valid(...REACTION_TYPES).required(),
    value: Joi.any().allow(null).default(null),
  }),

  songRequest: Joi.object({
    studioId: Joi.string().trim().min(1).max(120).required(),
    username: Joi.string().trim().min(1).max(120).default('Guest'),
    songTitle: Joi.string().trim().min(1).max(180).required(),
  }),

  songRequestVote: Joi.object({
    studioId: Joi.string().trim().min(1).max(120).required(),
    requestId: Joi.string().trim().guid().required(),
    username: Joi.string().trim().min(1).max(120).default('Guest'),
  }),

  songRequestStatus: Joi.object({
    studioId: Joi.string().trim().min(1).max(120).required(),
    requestId: Joi.string().trim().guid().required(),
    status: Joi.string().valid(...SONG_REQUEST_STATUSES).required(),
  }),

  liveSessionStart: Joi.object({
    streamId: Joi.string().trim().min(1).max(120).required(),
    streamName: Joi.string().trim().min(1).max(180).default('Stream'),
    viewerCount: Joi.number().integer().min(0).default(0),
  }),

  liveSessionEnd: Joi.object({
    streamId: Joi.string().trim().min(1).max(120).required(),
    viewerCount: Joi.number().integer().min(0).default(0),
  }),

  // User validation schemas
  userCreate: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    email: Joi.string().email().max(255).allow('', null),
    role: Joi.string().valid(...USER_ROLES).default('Listener'),
    profilePicture: Joi.string().trim().max(500).allow('', null),
  }),

  userUpdate: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    email: Joi.string().email().max(255).allow('', null),
    role: Joi.string().valid(...USER_ROLES),
    profilePicture: Joi.string().trim().max(500).allow('', null),
  }).min(1), // At least one field must be updated

  userReport: Joi.object({
    reason: Joi.string().trim().min(1).max(500).required(),
  }),

  rjStudioId: Joi.object({
    studioId: Joi.string().trim().min(1).max(120).required(),
  }),

  rjStudioStatePatch: Joi.object({
    profileName: Joi.string().trim().min(1).max(120),
    currentMood: Joi.string().trim().max(40),
    activeChannel: Joi.number().integer().min(1).max(6),
    dualPlayer: Joi.object({
      playerATrack: Joi.object().unknown(true).allow(null),
      playerBTrack: Joi.object().unknown(true).allow(null),
      activePlayer: Joi.string().valid('A', 'B'),
      crossfadeValue: Joi.number().integer().min(0).max(100),
      isCrossfading: Joi.boolean(),
      isPlayingA: Joi.boolean(),
      isPlayingB: Joi.boolean(),
    }),
    mixerChannels: Joi.array().items(Joi.object().unknown(true)).max(6),
    masterGain: Joi.number().integer().min(0).max(100),
    mixerCrossfader: Joi.number().integer().min(0).max(100),
    selectedFX: Joi.string().trim().max(80).allow(''),
    mics: Joi.array().items(Joi.object().unknown(true)).max(12),
    currentTrack: Joi.object().unknown(true).allow(null),
    liveTimerSeconds: Joi.number().integer().min(0),
    isTimerPaused: Joi.boolean(),
    announcement: Joi.object({
      visible: Joi.boolean(),
      message: Joi.string().trim().max(500).allow(''),
    }).allow(null),
    stats: Joi.object({
      listeners: Joi.number().integer().min(0),
      likes: Joi.number().integer().min(0),
      subscribers: Joi.number().integer().min(0),
      followers: Joi.number().integer().min(0),
      shares: Joi.number().integer().min(0),
    }),
    listenerHistory: Joi.array().items(Joi.number().integer().min(0)).max(100),
    activeListeners: Joi.number().integer().min(0),
  }).min(1),

  rjPlaylistItem: Joi.object({
    title: Joi.string().trim().min(1).max(180).required(),
    artist: Joi.string().trim().max(120).default('Unknown'),
    duration: Joi.string().trim().max(20).default('0:00'),
    bpm: Joi.number().integer().min(0).max(300).default(120),
    source: Joi.string().valid('library', 'local', 'track', 'custom').default('library'),
    trackId: Joi.string().trim().guid().allow(null),
    localFileId: Joi.string().trim().guid().allow(null),
    metadata: Joi.object().unknown(true).default({}),
  }),

  rjPlaylistReorder: Joi.object({
    orderedIds: Joi.array().items(Joi.string().trim().guid()).min(1).required(),
  }),

  rjPlaylistSession: Joi.object({
    durationMinutes: Joi.number().integer().min(1).max(480),
  }),

  rjDualPlayerAction: Joi.object({
    action: Joi.string().valid(
      'load_to_player',
      'load_standby',
      'play_standby',
      'crossfade_to_a',
      'crossfade_to_b',
      'set_crossfade',
      'pause_active',
      'stop_active',
      'stop_standby',
      'pause_standby',
      'library_next',
      'library_prev',
      'clear_all',
      'toggle_play',
      'clear_deck',
      'switch_a_to_b'
    ).required(),
    playerId: Joi.string().valid('A', 'B'),
    track: Joi.object().unknown(true),
    crossfadeValue: Joi.number().integer().min(0).max(100),
  }),

  rjMixerChannel: Joi.object({
    id: Joi.number().integer().min(1).max(6).required(),
    name: Joi.string().trim().max(120),
    volume: Joi.number().integer().min(0).max(100),
    gain: Joi.number().integer().min(0).max(100),
    isMuted: Joi.boolean(),
    isSolo: Joi.boolean(),
    isCue: Joi.boolean(),
    fx: Joi.array().items(Joi.string().max(80)).max(20),
    eq: Joi.object({
      low: Joi.number().min(0).max(100),
      mid: Joi.number().min(0).max(100),
      high: Joi.number().min(0).max(100),
    }),
  }),

  rjMixerPatch: Joi.object({
    channelId: Joi.number().integer().min(1).max(6),
    channels: Joi.array().items(Joi.object().unknown(true)).max(6),
    masterGain: Joi.number().integer().min(0).max(100),
    mixerCrossfader: Joi.number().integer().min(0).max(100),
    selectedFX: Joi.string().trim().max(80).allow(''),
    activeChannel: Joi.number().integer().min(1).max(6),
    playerFx: Joi.object({
      A: Joi.object({
        mute: Joi.boolean(),
        volume: Joi.number().integer().min(0).max(100),
        bass: Joi.number().integer().min(0).max(100),
        treble: Joi.number().integer().min(0).max(100),
        turbo: Joi.number().integer().min(0).max(100),
      }),
      B: Joi.object({
        mute: Joi.boolean(),
        volume: Joi.number().integer().min(0).max(100),
        bass: Joi.number().integer().min(0).max(100),
        treble: Joi.number().integer().min(0).max(100),
        turbo: Joi.number().integer().min(0).max(100),
      }),
    }),
  }).min(1),

  rjMicPatch: Joi.object({
    micId: Joi.string().trim().min(1).max(80).required(),
    isActive: Joi.boolean(),
    isMuted: Joi.boolean(),
    volume: Joi.number().integer().min(0).max(100),
    name: Joi.string().trim().min(1).max(120),
  }),

  rjMicCreate: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    avatar: Joi.string().trim().max(8).allow('', null),
  }),

  rjAnnouncement: Joi.object({
    message: Joi.string().trim().min(1).max(500).required(),
    visible: Joi.boolean().default(true),
  }),

  rjNotification: Joi.object({
    title: Joi.string().trim().min(1).max(180).required(),
    message: Joi.string().trim().min(1).max(2000).required(),
    type: Joi.string().valid('system', 'request', 'alert').default('system'),
  }),

  rjChatBan: Joi.object({
    username: Joi.string().trim().min(1).max(120).required(),
    reason: Joi.string().trim().max(500).allow('', null),
    mode: Joi.string().valid('cooldown', 'ban').default('cooldown'),
    cooldownMinutes: Joi.number().integer().min(5).max(10).default(5),
  }),

  rjChatPost: Joi.object({
    username: Joi.string().trim().min(1).max(120).default('RJ'),
    text: Joi.string().trim().min(1).max(5000).required(),
    type: Joi.string().valid('message', 'system').default('message'),
  }),

  rjChatGift: Joi.object({
    username: Joi.string().trim().min(1).max(120).default('RJ'),
    giftId: Joi.string().trim().min(1).max(80).required(),
    giftLabel: Joi.string().trim().max(120).allow('', null),
  }),

  rjChatEmoji: Joi.object({
    username: Joi.string().trim().min(1).max(120).default('RJ'),
    emojiId: Joi.string().trim().min(1).max(80).required(),
    emoji: Joi.string().trim().min(1).max(8).required(),
    label: Joi.string().trim().max(120).allow('', null),
  }),

  rjPinMessage: Joi.object({
    text: Joi.string().trim().min(1).max(5000).required(),
  }),

  rjStatsPatch: Joi.object({
    listeners: Joi.number().integer().min(0),
    likes: Joi.number().integer().min(0),
    subscribers: Joi.number().integer().min(0),
    followers: Joi.number().integer().min(0),
    shares: Joi.number().integer().min(0),
    increment: Joi.object({
      listeners: Joi.number().integer(),
      likes: Joi.number().integer(),
      subscribers: Joi.number().integer(),
      followers: Joi.number().integer(),
      shares: Joi.number().integer(),
    }),
  }).min(1),

  rjGoLive: Joi.object({
    streamName: Joi.string().trim().min(1).max(180).default('RJ Studio'),
    viewerCount: Joi.number().integer().min(0).default(0),
  }),

  rjStopLive: Joi.object({
    viewerCount: Joi.number().integer().min(0).default(0),
  }),

  operatorProfileSocialLinks: operatorProfileSocialLinksSchema,

  operatorProfileSave: Joi.object({
    displayName: Joi.string().trim().min(1).max(120).required(),
    tagline: Joi.string().trim().max(200).allow(''),
    bio: Joi.string().trim().max(2000).allow(''),
    location: Joi.string().trim().max(120).allow(''),
    email: operatorProfileEmailSchema,
    avatarUrl: Joi.string().trim().max(500).allow('', null),
    avatarInitials: Joi.string().trim().max(4).allow(''),
    currentMood: Joi.string().trim().max(40).allow(''),
    genres: Joi.array().items(Joi.string().trim().max(40)).max(12),
    languages: Joi.array().items(Joi.string().trim().max(40)).max(8),
    timezone: Joi.string().trim().max(80).allow(''),
    socialLinks: operatorProfileSocialLinksSchema,
    podcastFollowers: Joi.number().integer().min(0),
  }),

  operatorProfilePatch: Joi.object({
    displayName: Joi.string().trim().min(1).max(120),
    tagline: Joi.string().trim().max(200).allow(''),
    bio: Joi.string().trim().max(2000).allow(''),
    location: Joi.string().trim().max(120).allow(''),
    email: operatorProfileEmailSchema,
    avatarUrl: Joi.string().trim().max(500).allow('', null),
    avatarInitials: Joi.string().trim().max(4).allow(''),
    currentMood: Joi.string().trim().max(40),
    genres: Joi.array().items(Joi.string().trim().max(40)).max(12),
    languages: Joi.array().items(Joi.string().trim().max(40)).max(8),
    timezone: Joi.string().trim().max(80).allow(''),
    socialLinks: operatorProfileSocialLinksSchema,
    podcastFollowers: Joi.number().integer().min(0),
    bestLiveEvents: Joi.array().items(Joi.object({
      id: Joi.string().trim().max(80),
      title: Joi.string().trim().max(180).required(),
      date: Joi.alternatives().try(Joi.date(), Joi.string()),
      peakListeners: Joi.number().integer().min(0).default(0),
      durationMinutes: Joi.number().integer().min(0).allow(null),
      type: Joi.string().valid('rj', 'podcast').default('rj'),
    })).max(20),
    rjListeners: Joi.number().integer().min(0),
    rjLikes: Joi.number().integer().min(0),
    rjSubscribers: Joi.number().integer().min(0),
    rjFollowers: Joi.number().integer().min(0),
    rjShares: Joi.number().integer().min(0),
  }).min(1),

  rjOperatorProfilePatch: Joi.object({
    displayName: Joi.string().trim().max(120).allow(''),
    tagline: Joi.string().trim().max(200).allow(''),
    bio: Joi.string().trim().max(2000).allow(''),
    location: Joi.string().trim().max(120).allow(''),
    email: Joi.string().email().max(255).allow('', null),
    avatarUrl: Joi.string().trim().max(500).allow('', null),
    avatarInitials: Joi.string().trim().max(4).allow(''),
    genres: Joi.array().items(Joi.string().trim().max(40)).max(12),
    languages: Joi.array().items(Joi.string().trim().max(40)).max(8),
    timezone: Joi.string().trim().max(80).allow(''),
    socialLinks: Joi.object({
      instagram: Joi.string().trim().max(300).allow(''),
      youtube: Joi.string().trim().max(300).allow(''),
      twitter: Joi.string().trim().max(300).allow(''),
      spotify: Joi.string().trim().max(300).allow(''),
      website: Joi.string().trim().max(300).allow(''),
      facebook: Joi.string().trim().max(300).allow(''),
    }),
    requirements: Joi.object({
      microphone: Joi.boolean(),
      headphones: Joi.boolean(),
      mixer: Joi.boolean(),
      stableInternet: Joi.boolean(),
      quietRoom: Joi.boolean(),
      backupPower: Joi.boolean(),
    }),
    studioSetupNotes: Joi.string().trim().max(2000).allow(''),
    podcastFollowers: Joi.number().integer().min(0),
    bestLiveEvents: Joi.array().items(Joi.object({
      id: Joi.string().trim().max(80),
      title: Joi.string().trim().max(180).required(),
      date: Joi.alternatives().try(Joi.date(), Joi.string()),
      peakListeners: Joi.number().integer().min(0).default(0),
      durationMinutes: Joi.number().integer().min(0).allow(null),
      type: Joi.string().valid('rj', 'podcast').default('rj'),
    })).max(20),
  }).min(1),

  // Player Effects Schemas
  playerEffectUpdate: Joi.object({
    effectName: Joi.string().trim().valid(
      'highPassFilter', 'lowPassFilter',
      'eqBass', 'eqTreble',
      'echoDelay', 'echoWetDry', 'reverb', 'reverbDecay',
      'flanger', 'flangerRate', 'phaser', 'phaserRate'
    ).required(),
    value: Joi.number().required(),
  }).min(2),

  playerEffectsUpdate: Joi.object({
    highPassFilter: Joi.number().min(20).max(20000),
    lowPassFilter: Joi.number().min(20).max(20000),
    eqBass: Joi.number().min(0).max(100),
    eqTreble: Joi.number().min(0).max(100),
    echoDelay: Joi.number().min(0).max(2000),
    echoWetDry: Joi.number().min(0).max(100),
    reverb: Joi.number().min(0).max(100),
    reverbDecay: Joi.number().min(0.1).max(10),
    flanger: Joi.number().min(0).max(100),
    flangerRate: Joi.number().min(0.1).max(5),
    phaser: Joi.number().min(0).max(100),
    phaserRate: Joi.number().min(0.1).max(5),
  }).min(1),

  playerVolumeUpdate: Joi.object({
    volume: Joi.number().integer().min(0).max(100).required(),
  }),
};

module.exports = {
  AUDIO_FORMATS,
  LIVE_SESSION_STATUSES,
  PODCAST_STATUSES,
  PODCAST_SOURCES,
  REACTION_TYPES,
  SONG_REQUEST_STATUSES,
  STREAM_QUALITIES,
  USER_ROLES,
  schemas,
  validate,
};
