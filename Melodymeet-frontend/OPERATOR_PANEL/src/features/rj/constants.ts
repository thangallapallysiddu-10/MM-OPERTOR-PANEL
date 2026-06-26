import { Track, PlaylistTrack, RJProfile } from './types';

export const songData = {
  "STARGAZING": { listeners: 342, likes: 128, subscribers: 89, followers: 234, shares: 45, mood: "chill" },
  "SUNRISE": { listeners: 256, likes: 95, subscribers: 67, followers: 178, shares: 32, mood: "energetic" },
  "MIDNIGHT ECHO": { listeners: 423, likes: 189, subscribers: 124, followers: 345, shares: 67, mood: "dark" },
  "EVENING VIBES": { listeners: 189, likes: 67, subscribers: 45, followers: 123, shares: 23, mood: "calm" },
  "DEEP HOUSE": { listeners: 567, likes: 234, subscribers: 156, followers: 456, shares: 89, mood: "high energy" },
  "TROPICAL": { listeners: 298, likes: 112, subscribers: 78, followers: 234, shares: 45, mood: "relaxed" },
};

export const trackLibrary: Track[] = [
  { id: 1, title: "STARGAZING", artist: "Kygo", bpm: 120, beatIntensity: 65, duration: "3:24", channel: 1, shortTitle: "STARGAZ", gain: 75, eq: { low: 65, mid: 50, high: 55 }, fx: { echo: 20, flanger: 0, loop: 0, reverse: 0, hotCue: 0 } },
  { id: 2, title: "SUNRISE", artist: "RTPI", bpm: 132, beatIntensity: 85, duration: "4:12", channel: 2, shortTitle: "SUNRISE", gain: 68, eq: { low: 55, mid: 65, high: 70 }, fx: { echo: 10, flanger: 25, loop: 0, reverse: 0, hotCue: 0 } },
  { id: 3, title: "MIDNIGHT ECHO", artist: "RTPI", bpm: 128, beatIntensity: 75, duration: "3:56", channel: 3, shortTitle: "MIDNIGH", gain: 72, eq: { low: 70, mid: 60, high: 45 }, fx: { echo: 30, flanger: 15, loop: 10, reverse: 0, hotCue: 0 } },
  { id: 4, title: "EVENING VIBES", artist: "Chillhop", bpm: 115, beatIntensity: 45, duration: "4:05", channel: 4, shortTitle: "EVENING", gain: 55, eq: { low: 45, mid: 55, high: 60 }, fx: { echo: 40, flanger: 0, loop: 20, reverse: 0, hotCue: 0 } },
  { id: 5, title: "DEEP HOUSE", artist: "DJ Snake", bpm: 126, beatIntensity: 88, duration: "4:45", channel: 5, shortTitle: "DEEP", gain: 80, eq: { low: 70, mid: 55, high: 65 }, fx: { echo: 15, flanger: 30, loop: 5, reverse: 0, hotCue: 0 } },
  { id: 6, title: "TROPICAL", artist: "Kygo", bpm: 118, beatIntensity: 55, duration: "3:55", channel: 6, shortTitle: "TROPIC", gain: 65, eq: { low: 50, mid: 60, high: 70 }, fx: { echo: 25, flanger: 10, loop: 15, reverse: 0, hotCue: 0 } }
];

export const availableSongs: PlaylistTrack[] = [
  { id: 101, title: "STARGAZING", artist: "Kygo", duration: "3:24", bpm: 120 },
  { id: 102, title: "SUNRISE", artist: "RTPI", duration: "4:12", bpm: 132 },
  { id: 103, title: "MIDNIGHT ECHO", artist: "RTPI", duration: "3:56", bpm: 128 },
  { id: 104, title: "EVENING VIBES", artist: "Chillhop", duration: "4:05", bpm: 115 },
  { id: 105, title: "DEEP HOUSE", artist: "DJ Snake", duration: "4:45", bpm: 126 },
  { id: 106, title: "TROPICAL", artist: "Kygo", duration: "3:55", bpm: 118 },
];
 
export const emojiCategories = {
  smileys: ["😊", "😂", "🥰", "😍", "🔥", "❤️", "🎉", "👏", "🙌", "💯"],
  music: ["🎵", "🎶", "🎧", "🎤", "🎸", "🥁", "🎹", "🎺", "🎻", "🪘"],
  reactions: ["👍", "👎", "❤️", "💔", "✨", "⭐", "🌟", "💫", "⚡", "💥"],
  hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💗"],
  fire: ["🔥", "💥", "⚡", "✨", "⭐", "🌟", "💫", "💢", "💨", "🌀"],
};

export const stickerSets = [
  { id: 1, emoji: "🎉", name: "Party" },
  { id: 2, emoji: "🎈", name: "Balloon" },
  { id: 3, emoji: "🎀", name: "Ribbon" },
  { id: 4, emoji: "💎", name: "Diamond" },
  { id: 5, emoji: "🌟", name: "Star" },
  { id: 6, emoji: "💥", name: "Explosion" },
  { id: 7, emoji: "⚡", name: "Lightning" },
  { id: 8, emoji: "💫", name: "Sparkle" },
];

export const gifts = ["🎁", "🎉", "🎈", "🎀", "💎", "🌟", "❤️", "🔥"];

export const rjProfile: RJProfile = {
  name: "DJ MAVERICK",
  avatar: "DJ",
  followers: "12.5K",
  likes: "8.7K",
  joinRate: "+24",
  leaveRate: "-8",
  isOnline: true
};

export const fxOptions: string[] = ["Echo", "Flanger", "Loop", "Reverse", "Hot Cue"];