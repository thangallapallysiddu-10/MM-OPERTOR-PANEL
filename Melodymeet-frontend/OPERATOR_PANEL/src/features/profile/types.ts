export interface SocialLinks {
  instagram: string;
  youtube: string;
  twitter: string;
  spotify: string;
  website: string;
  facebook: string;
}

export interface RjRequirements {
  microphone: boolean;
  headphones: boolean;
  mixer: boolean;
  stableInternet: boolean;
  quietRoom: boolean;
  backupPower: boolean;
}

export interface OperatorProfile {
  displayName: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  avatarUrl: string;
  avatarInitials: string;
  genres: string[];
  languages: string[];
  timezone: string;
  socialLinks: SocialLinks;
  requirements: RjRequirements;
  studioSetupNotes: string;
  podcastFollowers: number;
  bestLiveEvents: LiveEventHighlight[];
}

export interface LiveEventHighlight {
  id: string;
  title: string;
  date: string;
  peakListeners: number;
  durationMinutes?: number | null;
  type: 'rj' | 'podcast';
}

export interface ProfileMetrics {
  rjFollowers: number;
  rjListeners: number;
  rjLikes: number;
  rjSubscribers: number;
  rjShares: number;
  podcastFollowers: number;
  podcastEpisodes: number;
  podcastPublished: number;
  rjLiveSessions: number;
  podcastLiveSessions: number;
}

export interface ProfilePodcastSummary {
  id: string | number;
  title: string;
  status: string;
  duration?: string | null;
  coverArt?: string | null;
  createdAt?: string;
}

export interface OperatorProfileDashboard {
  streamId: string;
  profileName: string;
  currentMood: string;
  isLive: boolean;
  stats: {
    listeners: number;
    likes: number;
    subscribers: number;
    followers: number;
    shares: number;
  };
  operatorProfile: OperatorProfile;
  metrics: ProfileMetrics;
  bestLiveEvents: LiveEventHighlight[];
  recentPodcasts: ProfilePodcastSummary[];
  updatedAt?: string;
}
