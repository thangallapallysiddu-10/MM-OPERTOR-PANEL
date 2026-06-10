/** Default RJ studio state aligned with OPERATOR_PANEL useAppStore / useMixer */

const DEFAULT_FX = { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 };
const DEFAULT_EQ = { low: 50, mid: 50, high: 50 };

const CHANNEL_DEFS = [
  { id: 1, name: 'CH1 · Track A', shortTitle: 'TRK A' },
  { id: 2, name: 'CH2 · Track B', shortTitle: 'TRK B' },
  { id: 3, name: 'CH3 · MIC 1', shortTitle: 'MIC 1' },
  { id: 4, name: 'CH4 · MIC 2', shortTitle: 'MIC 2' },
  { id: 5, name: 'CH5 · AUX', shortTitle: 'AUX' },
  { id: 6, name: 'CH6 · FX', shortTitle: 'FX' },
];



const DEFAULT_PLAYER_FX = {
  // Filters
  highPassFilter: 20, // Hz frequency (20-20000)
  lowPassFilter: 20000, // Hz frequency (20-20000)
  
  // EQ Bands (0-100, 50 is neutral)
  eqBass: 50, // Sub-bass and bass frequencies
  eqTreble: 50, // 8kHz-16kHz
  
  // Time-based effects
  echoDelay: 0, // milliseconds (0-2000)

};

const DEFAULT_DUAL_PLAYER = {
  playerATrack: null,
  playerBTrack: null,
  activePlayer: 'A',
  crossfadeValue: 50,
  isCrossfading: false,
  isPlayingA: false,
  isPlayingB: false,
  playerA: {
    track: null,
    volume: 75,
    fx: { ...DEFAULT_PLAYER_FX },
  },
  playerB: {
    track: null,
    volume: 75,
    fx: { ...DEFAULT_PLAYER_FX },
  },
};

const DEFAULT_STATS = {
  listeners: 0,
  likes: 0,
  subscribers: 0,
  followers: 0,
  shares: 0,
};

const DEFAULT_OPERATOR_PROFILE = {
  displayName: '',
  tagline: '',
  bio: '',
  location: '',
  email: '',
  avatarUrl: '',
  avatarInitials: 'RJ',
  genres: [],
  languages: ['English'],
  timezone: '',
  socialLinks: {
    instagram: '',
    youtube: '',
    twitter: '',
    spotify: '',
    website: '',
    facebook: '',
  },
  requirements: {
    microphone: true,
    headphones: true,
    mixer: false,
    stableInternet: true,
    quietRoom: true,
    backupPower: false,
  },
  studioSetupNotes: '',
  podcastFollowers: 0,
  bestLiveEvents: [],
};

const DEFAULT_MICS = [
  { id: 'mic1', name: 'PLAYER ONE', avatar: 'P1', isActive: false, isMuted: false, volume: 0 },
  { id: 'mic2', name: 'PLAYER TWO', avatar: 'P2', isActive: false, isMuted: false, volume: 0 },
];

const LIBRARY_CATALOG = [
  { title: 'STARGAZING', artist: 'Kygo', duration: '3:24', bpm: 120 },
  { title: 'SUNRISE', artist: 'RTPI', duration: '4:12', bpm: 132 },
  { title: 'MIDNIGHT ECHO', artist: 'RTPI', duration: '3:56', bpm: 128 },
  { title: 'EVENING VIBES', artist: 'Chillhop', duration: '4:05', bpm: 115 },
  { title: 'DEEP HOUSE', artist: 'DJ Snake', duration: '4:45', bpm: 126 },
  { title: 'TROPICAL', artist: 'Kygo', duration: '3:55', bpm: 118 },
];

const parseDurationSeconds = (duration) => {
  if (!duration || typeof duration !== 'string') return 180;
  const parts = duration.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 180;
};

module.exports = {
  DEFAULT_DUAL_PLAYER,
  DEFAULT_STATS,
  DEFAULT_OPERATOR_PROFILE,
  DEFAULT_MICS,
  DEFAULT_FX,
  DEFAULT_EQ,
  DEFAULT_PLAYER_FX,
  LIBRARY_CATALOG,

  parseDurationSeconds,
};
