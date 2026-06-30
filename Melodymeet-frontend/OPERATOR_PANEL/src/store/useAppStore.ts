import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  role: 'RJ' | 'Podcast Host' | 'Listener';
  avatar: string;
  avatarImage?: string;
  followers: number;
  isBanned: boolean;
  reports: number;
  joinDate?: string;
  bio?: string;
  email?: string;
  location?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'report' | 'ban' | 'follow' | 'system';
  read: boolean;
  timestamp: Date;
  userName?: string;
}

interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface Recording {
  id: number;
  name: string;
  duration: string;
  size: string;
  uri?: string;
}

interface PodcastEpisode {
  id: number;
  title: string;
  description: string;
  genre?: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  coverArt?: string | null;
  fileName: string;
  fileSize: string;
  schedule: string;
  status: string;
  date: string;
}

interface Mic {
  id: number;
  name: string;
  type: string;
  active: boolean;
  phantom: boolean;
  gain: number;
  volume: number;
  muted: boolean;
  icon: string;
  level?: number;
  isGuest?: boolean;
  guestId?: string;
}

export interface GuestSlot {
  slotId: 'mic2' | 'mic3' | 'mic4' | 'mic5';
  label: string;
  status: 'empty' | 'connected';
  guestName: string | null;
  guestId: number | null;
  url?: string;
  micMuted?: boolean;        // operator-set mute (persisted to DB)
  volume?: number;           // operator-set volume 0–200 (persisted to DB)
  guestSelfMuted?: boolean;  // guest's own mic toggle (transient, socket only)
  // Analytics — Phase 1: speaking time
  isSpeaking?: boolean;             // real-time speaking state from guest_speaking event
  speakingSeconds?: number;         // accumulated speaking time this session
  speakingStartedAt?: number | null; // Date.now() when speaking started, null when silent
  // Analytics — Phase 2: mic health
  micHealth?: 'connected' | 'disconnected' | 'reconnecting';
  // Analytics — Phase 3: connection quality (WebRTC stats)
  connectionQuality?: 'excellent' | 'good' | 'poor' | null;
  rtt?: number | null;          // round-trip time ms
  packetLoss?: number | null;   // 0–100 percent
  jitter?: number | null;       // ms
}

interface TrimRange {
  start: number;
  end: number;
}

interface Message {
  id: number;
  user: string;
  text: string;
  time: string;
  system: boolean;
  likeCount?: number;
  isLiked?: boolean;
  avatar?: string;
  isVIP?: boolean;
  isNew?: boolean;
  isPinned?: boolean;
  giftAmount?: number;
  replyTo?: string;
}

interface RjNotification {
  id: number;
  title: string;
  message: string;
  type: 'request' | 'system' | 'alert';
  read: boolean;
  timestamp: Date;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  bpm: number;
  channel: number;
  audioUrl?: string;
  artwork?: string;
  beatIntensity: number;
  shortTitle: string;
  gain: number;
  eq: {
    low: number;
    mid: number;
    high: number;
  };
  fx: {
    echo: number;
    flanger: number;
    loop: number;
    reverse: number;
    hotCue: number;
  };
}

interface PlaylistTrack {
  id: number;
  serverId?: string;
  localFileId?: string;
  title: string;
  artist: string;
  duration: string;
  bpm: number;
  channel?: number;
}

interface RjMicUser {
  id: string;
  name: string;
  avatar: string;
  isActive: boolean;
  isMuted: boolean;
  volume: number;
  isGuest?: boolean;
  guestId?: string;
}

interface LocalFilePlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentFileUri: string | null;
  currentFilePath: string | null;
  currentFileName: string | null;
  currentFileId: string | null;
  soundObject: any;
}
  

interface LocalFile {
  id: string;
  name: string;
  uri: string;
  filePath?: string;
  size: string;
  duration: string;
}

interface PodcastState {
  episodeTitle: string;
  episodeDescription: string;
  episodeGenre: string;
  episodeSeasonNumber: string;
  episodeNumber: string;
  episodeCoverArt: string;
  episodeFileName: string;
  episodeFileSize: string;
  episodeScheduleDisplay: string;
  podcastEpisodes: PodcastEpisode[];
  recordings: Recording[];
  isRecording: boolean;
  recordingSeconds: number;
  showAfterRecordingOptions: boolean;
  lastRecording: Recording | null;
  mics: Mic[];
  activeMicId: number | null;
  currentMusic: any;
  isMusicPlaying: boolean;
  musicLink: string;
  guestSlots: GuestSlot[];
  trimModalVisible: boolean;
  currentRecordingForTrim: Recording | null;
  trimRanges: TrimRange[];
  currentRangeStart: number;
  currentRangeEnd: number;
  trimFileName: string;
  trimPreviewDuration: string;
  trimSaveSuccess: boolean;
  previewPlaying: boolean;
  activeTrimTab: 'simple' | 'advanced';
  waveformData: number[];
  originalDurationSecs: number;
  showCalendar: boolean;
  selectedDay: number | null;
  selectedHour: string | null;
  selectedMinute: string | null;
  calendarMonth: Date;
  isLive: boolean;
  liveSeconds: number;
  liveViewers: number;
  showLiveSetup: boolean;
  liveSetupStep: 'test' | 'ready';
  micTestComplete: boolean;
  internetTestComplete: boolean;
  liveTitle: string;
  liveDescription: string;
  roomLink: string;
  // WebRTC signaling relay — set by usePodcastSocket when a signaling message
  // arrives from a guest. usePeerConnections reads this reactively.
  // Shape: { type: 'offer'|'answer'|'ice', slotId, sdp?, candidate? }
  pendingWebRtcSignal: Record<string, any> | null;
}

interface RjStudioState {
  chatMessages: Message[];
  bannedUsers: string[];
  uploadedLocalFiles: LocalFile[];
  showBanList: boolean;
  pinnedMessage: Message | null;
  showGiftModal: boolean;
  showStickerModal: boolean;
  currentTrack: Track | null;
  currentTrackId: number | null;
  playerATrack: Track | null;
  playerBTrack: Track | null;
  isPlayingA: boolean;
  isPlayingB: boolean;
  wasPlayingA?: boolean;
  wasPlayingB?: boolean;
  activePlayer: 'A' | 'B' | null;
  crossfadeValue: number;
  isCrossfading: boolean;
  playlist: PlaylistTrack[];
  isPlaylistActive: boolean;
  playlistDuration: number;
  isPlaylistPaused: boolean;
  playlistTimerRemaining: number;
  playlistCurrentIndex: number;
  playlistTrackElapsedMs: number;
  playlistSession: {
    startedAt: string | null;
    stoppedAt: string | null;
    totalRuntime: number;
    tracksPlayed: number;
    pausedAt: string | null;
    accumulatedMs: number;
  } | null;
  trackStats: Record<string, { playCount: number; lastPlayedAt: string }>;
  showPlaylistModal: boolean;
  songRequests: Array<{
    id: number;
    user: string;
    song: string;
    time: string;
    played: boolean;
    votes: number;
    hasVoted: boolean;
  }>;

  rjMics: RjMicUser[];
  showAddMicModal: boolean;
  newMicName: string;
  activeListeners: number;
  listenerHistory: number[];
  rjStats: {
    listeners: number;
    likes: number;
    subscribers: number;
    followers: number;
    shares: number;
  };
  isTimerPaused: boolean;
  liveTimerSeconds: number;
  rjNotifications: RjNotification[];
  localPlayback: LocalFilePlaybackState;
  isLocalAudioMuted: boolean;
  speakRequests: Array<{
    id: string;
    userName: string;
    timestamp: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
}

interface AppState {
  rjs: User[];
  hosts: User[];
  recentMembers: User[];
  profileNotifications: Notification[];
  profileDarkMode: boolean;
  profileShowBannedUsers: boolean;
  dashboardDarkMode: boolean;
  dashboardNotificationsEnabled: boolean;
  dashboardStreamQuality: string;
  dashboardNotifications: DashboardNotification[];
  dashboardSearchQuery: string;
  podcast: PodcastState;
  rjStudio: RjStudioState;
  setRjs: (rjs: User[]) => void;
  updateRjsUser: (id: number, data: Partial<User>) => void;
  setHosts: (hosts: User[]) => void;
  updateHostsUser: (id: number, data: Partial<User>) => void;
  setRecentMembers: (recentMembers: User[]) => void;
  updateRecentMember: (id: number, data: Partial<User>) => void;
  addProfileNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markProfileNotificationRead: (id: number) => void;
  markAllProfileNotificationsRead: () => void;
  setProfileDarkMode: (value: boolean) => void;
  setProfileShowBannedUsers: (value: boolean) => void;
  resetProfile: () => void;
  setDashboardDarkMode: (value: boolean) => void;
  setDashboardNotificationsEnabled: (value: boolean) => void;
  setDashboardStreamQuality: (value: string) => void;
  setDashboardSearchQuery: (value: string) => void;
  addDashboardNotification: (notification: Omit<DashboardNotification, 'id'>) => void;
  markDashboardNotificationRead: (id: number) => void;
  markAllDashboardNotificationsRead: () => void;
  resetDashboard: () => void;
  updatePodcastState: (data: Partial<PodcastState>) => void;
  addPodcastEpisode: (episode: PodcastEpisode) => void;
  removePodcastEpisode: (id: number) => void;
  addRecording: (recording: Recording) => void;
  updateRecording: (id: number, data: Partial<Recording>) => void;
  removeRecording: (id: number) => void;
  clearRecordings: () => void;
  setRecordings: (recordings: Recording[]) => void;
  setMics: (mics: Mic[]) => void;
  updateMic: (id: number, data: Partial<Mic>) => void;
  toggleMicMute: (id: number) => void;
  setActiveMic: (id: number) => void;
  setGuestSlots: (slots: GuestSlot[]) => void;
  updateGuestSlot: (slotId: string, data: Partial<GuestSlot>) => void;
  addTrimRange: (range: TrimRange) => void;
  removeTrimRange: (index: number) => void;
  clearTrimRanges: () => void;
  resetPodcastState: () => void;
  updateRjStudioState: (data: Partial<RjStudioState>) => void;
  addRjNotification: (notification: Omit<RjNotification, 'id' | 'timestamp'>) => void;
  markRjNotificationRead: (id: number) => void;
  markAllRjNotificationsRead: () => void;
  resetRjStudio: () => void;
  resetAll: () => void;
  setLocalPlaybackTrack: (track: Track | null, uri: string | null, fileName: string | null) => void;
  clearLocalPlayback: () => void;
}

const initialLocalPlaybackState: LocalFilePlaybackState = {
  isPlaying: false,
  currentTrack: null,
  currentFileUri: null,
  currentFilePath: null,
  currentFileName: null,
  currentFileId: null,
  soundObject: null,
};

const initialRjStudioState: RjStudioState = {
  chatMessages: [
    { id: 1, user: "MusicFan123", text: "This mix is fire! 🔥", time: "12:34", system: false, likeCount: 3, isLiked: false, avatar: "M", isVIP: false },
    { id: 2, user: "ChillVibes", text: "What BPM is this?", time: "12:35", system: false, likeCount: 1, isLiked: false, avatar: "C", isVIP: false },
    { id: 3, user: "BeatLover", text: "DJ killin it tonight!", time: "12:36", system: false, likeCount: 5, isLiked: false, avatar: "B", isVIP: true },
    { id: 4, user: "NightOwl", text: "Love the bass drop", time: "12:37", system: false, likeCount: 2, isLiked: false, avatar: "N", isVIP: false },
    { id: 5, user: "RJ", text: "@NightOwl thanks broo", time: "12:38", system: false, likeCount: 8, isLiked: false, avatar: "R", isVIP: true },
    { id: 6, user: "SYSTEM", text: "Listener joined the chat (342)", time: "17:58", system: true },
  ],
  bannedUsers: [],
  showBanList: false,
  pinnedMessage: null,
  showGiftModal: false,
  showStickerModal: false,
  currentTrack: null,
  currentTrackId: null,
  playerATrack: null,
  playerBTrack: null,
  isPlayingA: false,
  isPlayingB: false,
  activePlayer: null,
  crossfadeValue: 50,
  isCrossfading: false,
  playlist: [],
  isPlaylistActive: false,
  isPlaylistPaused: false,
  playlistDuration: 60,
  playlistTimerRemaining: 0,
  playlistCurrentIndex: 0,
  playlistTrackElapsedMs: 0,
  playlistSession: null,
  trackStats: {},
  showPlaylistModal: false,
  songRequests: [],

  rjMics: [
    { id: 'mic1', name: 'PLAYER ONE', avatar: 'P1', isActive: false, isMuted: true, volume: 0, input: 'Input 1' },
    { id: 'mic2', name: 'PLAYER TWO', avatar: 'P2', isActive: false, isMuted: true, volume: 0, input: 'Input 2' },
    { id: 'mic3', name: 'Riya', avatar: 'R', isActive: false, isMuted: true, volume: 0, input: 'Input 3' },
    { id: 'mic4', name: 'Arjun', avatar: 'A', isActive: false, isMuted: true, volume: 0, input: 'Input 4' },
    { id: 'mic5', name: 'Live Caller', avatar: 'LC', isActive: false, isMuted: true, volume: 0, input: 'Call In 1' },
  ],
  showAddMicModal: false,
  newMicName: "",
  activeListeners: 342,
  listenerHistory: [320, 335, 328, 342, 356, 348, 362, 351, 345, 338],
  rjStats: {
    listeners: 342,
    likes: 2847,
    subscribers: 12500,
    followers: 18750,
    shares: 892,
  },
  isTimerPaused: false,
  liveTimerSeconds: 0,
  rjNotifications: [
    { id: 1, title: "System", message: "Welcome to RJ Studio!", type: "system", read: false, timestamp: new Date() },
    { id: 2, title: "New Request", message: "New song request: Midnight Dreams", type: "request", read: false, timestamp: new Date() },
  ],
  localPlayback: initialLocalPlaybackState,
  uploadedLocalFiles: [],
  isLocalAudioMuted: false,
  speakRequests: [
    { id: 'speak_1', userName: 'Anjali', timestamp: '16:40', status: 'pending' },
    { id: 'speak_2', userName: 'Vikram', timestamp: '16:42', status: 'pending' },
  ],
};

const initialPodcastState: PodcastState = {
  episodeTitle: '',
  episodeDescription: '',
  episodeGenre: '',
  episodeSeasonNumber: '',
  episodeNumber: '',
  episodeCoverArt: '',
  episodeFileName: '',
  episodeFileSize: '',
  episodeScheduleDisplay: '',
  podcastEpisodes: [],
  recordings: [],
  isRecording: false,
  recordingSeconds: 0,
  showAfterRecordingOptions: false,
  lastRecording: null,
  mics: [
    { id: 1, name: 'MIC 1', type: 'STUDIO', active: true, phantom: true, gain: 60, volume: 75, muted: true, icon: '🎙️', level: 0 },
    { id: 2, name: 'MIC 2', type: 'DYNAMIC', active: false, phantom: false, gain: 45, volume: 70, muted: true, icon: '🎤', level: 0 },
    { id: 3, name: 'MIC 3', type: 'RIBBON', active: false, phantom: true, gain: 55, volume: 65, muted: true, icon: '🎚️', level: 0 },
    { id: 4, name: 'MIC 4', type: 'WIRELESS', active: false, phantom: false, gain: 50, volume: 60, muted: true, icon: '📻', level: 0 },
    { id: 5, name: 'MIC 5', type: 'LAVALIER', active: false, phantom: false, gain: 40, volume: 55, muted: true, icon: 'mic', level: 45 },
  ],
  activeMicId: 1,
  currentMusic: null,
  isMusicPlaying: false,
  musicLink: '',
  guestSlots: [
    { slotId: 'mic2', label: 'MIC 2', status: 'empty', guestName: null, guestId: null },
    { slotId: 'mic3', label: 'MIC 3', status: 'empty', guestName: null, guestId: null },
    { slotId: 'mic4', label: 'MIC 4', status: 'empty', guestName: null, guestId: null },
    { slotId: 'mic5', label: 'MIC 5', status: 'empty', guestName: null, guestId: null },
  ],
  trimModalVisible: false,
  currentRecordingForTrim: null,
  trimRanges: [],
  currentRangeStart: 0,
  currentRangeEnd: 100,
  trimFileName: '',
  trimPreviewDuration: '0:00',
  trimSaveSuccess: false,
  previewPlaying: false,
  activeTrimTab: 'simple',
  waveformData: [],
  originalDurationSecs: 0,
  showCalendar: false,
  selectedDay: null,
  selectedHour: null,
  selectedMinute: null,
  calendarMonth: new Date(),
  isLive: false,
  liveSeconds: 0,
  liveViewers: 0,
  showLiveSetup: false,
  liveSetupStep: 'test',
  micTestComplete: false,
  internetTestComplete: false,
  liveTitle: '',
  liveDescription: '',
  roomLink: '',
  pendingWebRtcSignal: null,
};

const initialRjs: User[] = [
  { id: 1, name: 'Mamatha', role: 'RJ', avatar: 'MA', followers: 12500, isBanned: false, reports: 0, joinDate: '2024-01-15', bio: 'Passionate RJ and music lover', email: 'mamatha@melodymeet.com', location: 'Hyderabad, India' },
  { id: 2, name: 'DJ Maverick', role: 'RJ', avatar: 'DJ', followers: 8900, isBanned: false, reports: 1, joinDate: '2024-01-20', bio: 'Electronic music producer', email: 'dj@example.com', location: 'LA, USA' },
  { id: 3, name: 'DJ Snake', role: 'RJ', avatar: 'DS', followers: 15600, isBanned: false, reports: 0, joinDate: '2024-02-01', bio: 'French DJ and producer', email: 'snake@example.com', location: 'Paris, France' },
  { id: 4, name: 'Kygo', role: 'RJ', avatar: 'KG', followers: 23400, isBanned: false, reports: 0, joinDate: '2024-02-10', bio: 'Tropical house producer', email: 'kygo@example.com', location: 'Norway' },
  { id: 5, name: 'Martin Garrix', role: 'RJ', avatar: 'MG', followers: 18900, isBanned: false, reports: 0, joinDate: '2024-02-15', bio: 'Progressive house DJ', email: 'martin@example.com', location: 'Netherlands' },
];

const initialHosts: User[] = [
  { id: 6, name: 'Sarah Johnson', role: 'Podcast Host', avatar: 'SJ', followers: 5600, isBanned: false, reports: 0, joinDate: '2024-01-18', bio: 'Tech podcast host', email: 'sarah@example.com', location: 'NY, USA' },
  { id: 7, name: 'Mike Ross', role: 'Podcast Host', avatar: 'MR', followers: 4300, isBanned: false, reports: 1, joinDate: '2024-01-25', bio: 'Business talks', email: 'mike@example.com', location: 'Chicago, USA' },
  { id: 8, name: 'Emma Watson', role: 'Podcast Host', avatar: 'EW', followers: 7800, isBanned: false, reports: 0, joinDate: '2024-02-05', bio: 'Book reviews', email: 'emma@example.com', location: 'London, UK' },
  { id: 9, name: 'Joe Rogan', role: 'Podcast Host', avatar: 'JR', followers: 34500, isBanned: false, reports: 0, joinDate: '2024-02-12', bio: 'Comedy and interviews', email: 'joe@example.com', location: 'Texas, USA' },
];

const initialRecentMembers: User[] = [
  { id: 10, name: 'ChillVibes', role: 'Listener', avatar: 'CV', followers: 0, isBanned: false, reports: 0, joinDate: '2 days ago', bio: 'Music lover', email: 'chill@example.com', location: 'Online' },
  { id: 11, name: 'NightOwl', role: 'Listener', avatar: 'NO', followers: 0, isBanned: false, reports: 0, joinDate: '3 days ago', bio: 'Late night listener', email: 'night@example.com', location: 'Online' },
  { id: 12, name: 'BeatLover', role: 'Listener', avatar: 'BL', followers: 0, isBanned: false, reports: 0, joinDate: '5 days ago', bio: 'Beats enthusiast', email: 'beat@example.com', location: 'Online' },
  { id: 13, name: 'MusicFan', role: 'Listener', avatar: 'MF', followers: 0, isBanned: false, reports: 0, joinDate: '1 week ago', bio: 'Fan of good music', email: 'fan@example.com', location: 'Online' },
  { id: 14, name: 'Pranu', role: 'Listener', avatar: 'PR', followers: 0, isBanned: false, reports: 0, joinDate: '2 weeks ago', bio: 'Regular listener', email: 'pranu@example.com', location: 'Online' },
  { id: 15, name: 'Ruchi22', role: 'Listener', avatar: 'RU', followers: 0, isBanned: false, reports: 0, joinDate: '3 weeks ago', bio: 'Music enthusiast', email: 'ruchi@example.com', location: 'Online' },
];

const initialProfileNotifications: Notification[] = [
  { id: 1, title: 'Welcome!', message: 'Welcome to the operator panel', type: 'system', read: false, timestamp: new Date() },
];

const initialDashboardNotifications: DashboardNotification[] = [
  { id: 1, title: "Live Stream Started", message: "You started a live stream on Channel 1", time: "2 min ago", read: false },
  { id: 2, title: "Song Changed", message: "Now Playing: STARGAZING - Kygo", time: "5 min ago", read: false },
  { id: 3, title: "New Listener Joined", message: "MusicFan123 joined your live stream", time: "10 min ago", read: true },
  { id: 4, title: "Song Request", message: "New song request: Midnight Echo", time: "15 min ago", read: true },
  { id: 5, title: "User Reported", message: "A user has been reported for inappropriate behavior", time: "20 min ago", read: false },
];

export const useAppStore = create<AppState>((set) => ({
  rjs: initialRjs,
  hosts: initialHosts,
  recentMembers: initialRecentMembers,
  profileNotifications: initialProfileNotifications,
  profileDarkMode: false,
  profileShowBannedUsers: false,
  dashboardDarkMode: false,
  dashboardNotificationsEnabled: true,
  dashboardStreamQuality: 'Auto',
  dashboardNotifications: initialDashboardNotifications,
  dashboardSearchQuery: '',
  podcast: initialPodcastState,
  rjStudio: initialRjStudioState,
  
  setRjs: (rjs) => set({ rjs }),
  
  updateRjsUser: (id, data) => set((state) => ({
    rjs: state.rjs.map(user => user.id === id ? { ...user, ...data } : user)
  })),
  
  setHosts: (hosts) => set({ hosts }),
  
  updateHostsUser: (id, data) => set((state) => ({
    hosts: state.hosts.map(user => user.id === id ? { ...user, ...data } : user)
  })),
  
  setRecentMembers: (recentMembers) => set({ recentMembers }),
  
  updateRecentMember: (id, data) => set((state) => ({
    recentMembers: state.recentMembers.map(user => user.id === id ? { ...user, ...data } : user)
  })),
  
  addProfileNotification: (notification) => set((state) => ({
    profileNotifications: [
      { ...notification, id: Date.now(), timestamp: new Date() },
      ...state.profileNotifications
    ]
  })),
  
  markProfileNotificationRead: (id) => set((state) => ({
    profileNotifications: state.profileNotifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
  })),
  
  markAllProfileNotificationsRead: () => set((state) => ({
    profileNotifications: state.profileNotifications.map(n => ({ ...n, read: true }))
  })),
  
  setProfileDarkMode: (profileDarkMode) => set({ profileDarkMode, dashboardDarkMode: profileDarkMode }),
  
  setProfileShowBannedUsers: (profileShowBannedUsers) => set({ profileShowBannedUsers }),
  
  resetProfile: () => set({
    rjs: initialRjs,
    hosts: initialHosts,
    recentMembers: initialRecentMembers,
    profileNotifications: initialProfileNotifications,
    profileDarkMode: false,
    dashboardDarkMode: false,
    profileShowBannedUsers: false,
  }),
  
  setDashboardDarkMode: (dashboardDarkMode) => set({ dashboardDarkMode, profileDarkMode: dashboardDarkMode }),
  
  setDashboardNotificationsEnabled: (dashboardNotificationsEnabled) => set({ dashboardNotificationsEnabled }),
  
  setDashboardStreamQuality: (dashboardStreamQuality) => set({ dashboardStreamQuality }),
  
  setDashboardSearchQuery: (dashboardSearchQuery) => set({ dashboardSearchQuery }),
  
  addDashboardNotification: (notification) => set((state) => ({
    dashboardNotifications: [
      { ...notification, id: Date.now() },
      ...state.dashboardNotifications
    ]
  })),
  
  markDashboardNotificationRead: (id) => set((state) => ({
    dashboardNotifications: state.dashboardNotifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
  })),
  
  markAllDashboardNotificationsRead: () => set((state) => ({
    dashboardNotifications: state.dashboardNotifications.map(n => ({ ...n, read: true }))
  })),
  
  resetDashboard: () => set({
    dashboardDarkMode: false,
    dashboardNotificationsEnabled: true,
    dashboardStreamQuality: 'Auto',
    dashboardNotifications: initialDashboardNotifications,
    dashboardSearchQuery: '',
  }),
  
  updatePodcastState: (data) => set((state) => ({
    podcast: { ...state.podcast, ...data }
  })),
  
  addPodcastEpisode: (episode) => set((state) => ({
    podcast: {
      ...state.podcast,
      podcastEpisodes: [episode, ...state.podcast.podcastEpisodes]
    }
  })),
  
  removePodcastEpisode: (id) => set((state) => ({
    podcast: {
      ...state.podcast,
      podcastEpisodes: state.podcast.podcastEpisodes.filter(e => e.id !== id)
    }
  })),
  
  addRecording: (recording) => set((state) => ({
    podcast: {
      ...state.podcast,
      recordings: [recording, ...state.podcast.recordings],
      lastRecording: recording,
      showAfterRecordingOptions: true,
      isRecording: false,
      recordingSeconds: 0,
    }
  })),
  
  updateRecording: (id, data) => set((state) => ({
    podcast: {
      ...state.podcast,
      recordings: state.podcast.recordings.map(r => r.id === id ? { ...r, ...data } : r)
    }
  })),
  
  removeRecording: (id) => set((state) => ({
    podcast: {
      ...state.podcast,
      recordings: state.podcast.recordings.filter(r => r.id !== id)
    }
  })),
  
  clearRecordings: () => set((state) => ({
    podcast: { ...state.podcast, recordings: [] }
  })),

  setRecordings: (recordings) => set((state) => ({
    podcast: { ...state.podcast, recordings }
  })),
  
  setMics: (mics) => set((state) => ({
    podcast: { ...state.podcast, mics }
  })),

  updateMic: (id, data) => {
    // Optimistic UI update
    set((state) => ({
      podcast: {
        ...state.podcast,
        mics: state.podcast.mics.map(m => m.id === id ? { ...m, ...data } : m)
      }
    }));
    
    // Sync to backend, but ignore 'level' property which updates 10x a second for UI
    const syncData = { ...data };
    delete syncData.level;
    
    if (Object.keys(syncData).length > 0) {
      // Use a global timeout map to debounce API calls per-mic (prevents volume slider spam)
      const globalState = globalThis as any;
      if (!globalState.micDebounceTimers) globalState.micDebounceTimers = {};
      
      if (globalState.micDebounceTimers[id]) {
        clearTimeout(globalState.micDebounceTimers[id]);
      }
      
      globalState.micDebounceTimers[id] = setTimeout(() => {
        import('../services/api/operatorApi').then(({ PodcastApi }) => {
          // Send the LATEST state of this mic to ensure no partial updates are lost
          const currentState = useAppStore.getState().podcast.mics.find(m => m.id === id);
          if (currentState) {
            const finalSyncData = { ...currentState };
            delete (finalSyncData as any).level;
            PodcastApi.updateMic(id, finalSyncData).catch(console.error);
          }
        });
      }, 500); // 500ms debounce
    }
  },
  
  toggleMicMute: (id) => {
    let newMuted = false;
    set((state) => ({
      podcast: {
        ...state.podcast,
        mics: state.podcast.mics.map(m => {
          if (m.id === id) {
            newMuted = !m.muted;
            return { ...m, muted: newMuted };
          }
          return m;
        })
      }
    }));
    import('../services/api/operatorApi').then(({ PodcastApi }) => {
      PodcastApi.updateMic(id, { muted: newMuted }).catch(console.error);
    });
  },
  
  setActiveMic: (id) => {
    set((state) => ({
      podcast: {
        ...state.podcast,
        mics: state.podcast.mics.map(m => ({ ...m, active: m.id === id })),
        activeMicId: id
      }
    }));
    // Update active status for all mics
    import('../services/api/operatorApi').then(({ PodcastApi }) => {
      // Set the active one to true, others to false
      // For simplicity, we just update the specific one. 
      // But properly we should fetch the state or do a bulk update.
      PodcastApi.updateMic(id, { active: true }).catch(console.error);
    });
  },

  setGuestSlots: (guestSlots) => set((state) => ({
    podcast: { ...state.podcast, guestSlots }
  })),

  updateGuestSlot: (slotId, data) => set((state) => ({
    podcast: {
      ...state.podcast,
      guestSlots: state.podcast.guestSlots.map(s =>
        s.slotId === slotId ? { ...s, ...data } : s
      ),
    },
  })),
  
  addTrimRange: (range) => set((state) => ({
    podcast: {
      ...state.podcast,
      trimRanges: [...state.podcast.trimRanges, range]
    }
  })),
  
  removeTrimRange: (index) => set((state) => ({
    podcast: {
      ...state.podcast,
      trimRanges: state.podcast.trimRanges.filter((_, i) => i !== index)
    }
  })),
  
  clearTrimRanges: () => set((state) => ({
    podcast: {
      ...state.podcast,
      trimRanges: []
    }
  })),
  
  resetPodcastState: () => set({ podcast: initialPodcastState }),
  
  updateRjStudioState: (data) => set((state) => ({
    rjStudio: { ...state.rjStudio, ...data }
  })),
  
  addRjNotification: (notification) => set((state) => ({
    rjStudio: {
      ...state.rjStudio,
      rjNotifications: [
        { ...notification, id: Date.now(), timestamp: new Date(), read: false },
        ...state.rjStudio.rjNotifications
      ].slice(0, 100)
    }
  })),
  
  markRjNotificationRead: (id) => set((state) => ({
    rjStudio: {
      ...state.rjStudio,
      rjNotifications: state.rjStudio.rjNotifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    }
  })),
  
  markAllRjNotificationsRead: () => set((state) => ({
    rjStudio: {
      ...state.rjStudio,
      rjNotifications: state.rjStudio.rjNotifications.map(n => ({ ...n, read: true }))
    }
  })),
  
  setLocalPlaybackTrack: (track, uri, fileName) => set((state) => ({
    rjStudio: {
      ...state.rjStudio,
      localPlayback: {
        isPlaying: track !== null,
        currentTrack: track,
        currentFileUri: uri,
        currentFilePath: uri,
        currentFileName: fileName,
        currentFileId: null,
        soundObject: null, 
      }
    }
  })),
  
  clearLocalPlayback: () => set((state) => ({
    rjStudio: {
      ...state.rjStudio,
      localPlayback: initialLocalPlaybackState
    }
  })),
  
  resetRjStudio: () => set({ rjStudio: initialRjStudioState }),
  
  resetAll: () => set({
    rjs: initialRjs,
    hosts: initialHosts,
    recentMembers: initialRecentMembers,
    profileNotifications: initialProfileNotifications,
    profileDarkMode: false,
    profileShowBannedUsers: false,
    dashboardDarkMode: false,
    dashboardNotificationsEnabled: true,
    dashboardStreamQuality: 'Auto',
    dashboardNotifications: initialDashboardNotifications,
    dashboardSearchQuery: '',
    podcast: initialPodcastState,
    rjStudio: initialRjStudioState,
  }),
}));
