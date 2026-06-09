export interface PlaylistTrack {
  id: number;
  serverId?: string;
  localFileId?: string;
  title: string;
  artist: string;
  duration: string;
  bpm: number;
  channel?: number;
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  beatIntensity: number;
  duration: string;
  channel: number;
  audioUrl?: string;
  artwork?: string;
  shortTitle: string;
  gain: number;
  eq: { low: number; mid: number; high: number };
  fx: { echo: number; flanger: number; loop: number; reverse: number; hotCue: number };
}

export interface ChannelConfig {
  track: Track;
  gain: number;
  low: number;
  mid: number;
  high: number;
  fx: { echo: number; flanger: number; loop: number; reverse: number; hotCue: number };
  muted: boolean;
  solo: boolean;
  cue: boolean;
}

export interface Request {
  id: number;
  user: string;
  song: string;
  time: string;
  played: boolean;
  votes: number;
  hasVoted: boolean;
}

export interface Message {
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
}

export interface MicUser {
  id: string;
  name: string;
  avatar: string;
  isActive: boolean;
  isMuted: boolean;
  volume: number;
}

export interface NotificationItem {
  id: number;
  type: "request" | "system" | "alert";
  message: string;
  time: string;
  read: boolean;
}

export interface RJProfile {
  name: string;
  avatar: string;
  followers: string;
  likes: string;
  joinRate: string;
  leaveRate: string;
  isOnline: boolean;
}

export interface RJStats {
  listeners: number;
  likes: number;
  subscribers: number;
  followers: number;
  shares: number;
}
