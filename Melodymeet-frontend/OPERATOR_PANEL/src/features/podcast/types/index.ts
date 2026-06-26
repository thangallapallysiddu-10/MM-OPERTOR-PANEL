

export interface Podcast {
  id: number;
  title: string;
  description: string;
  genre?: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  coverArt?: string | null;
  fileName: string;
  fileUrl?: string;
  fileSize: string;
  schedule: string;
  status: string;
  date: string;
}

export interface Recording {
  id: number;
  name: string;
  duration: string;
  size: string;
  uri?: string;
}

export interface Mic {
  id: number;
  name: string;
  type: string;
  active: boolean;
  phantom: boolean;
  gain: number;
  volume: number;
  level?: number;
  muted: boolean;
  icon: string;
  isGuest?: boolean;
  guestId?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
  videoId: string;
  isPlaying?: boolean;
  currentTime?: number;
}

export interface TrimRange {
  start: number;
  end: number;
}
