import { useAppStore } from '../../../store/useAppStore';
import type { RjStudioBundle } from '../../../services/api/rjApi';
import { RjApi } from '../../../services/api/rjApi';
import type { Message, PlaylistTrack } from '../types';
import { applyPlaylistStudioFields } from './mixerMapper';
import { audio } from '../../../services/audio';

const formatTime = (value: unknown) => {
  if (!value) return '';
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const mapChatMessage = (m: Record<string, unknown>, index: number): Message => ({
  id: typeof m.id === 'number' ? m.id : index,
  user: String(m.user ?? m.username ?? 'Guest'),
  text: String(m.text ?? ''),
  time: m.time ? String(m.time) : formatTime(m.createdAt),
  system: Boolean(m.system) || m.type === 'system',
  likeCount: Number(m.likeCount) || 0,
  isLiked: Boolean(m.isLiked),
  avatar: String((m.user ?? m.username ?? '?')).charAt(0).toUpperCase(),
  isVIP: Boolean(m.isVIP),
});

export async function hydrateRjStoreFromBundle(bundle: RjStudioBundle) {
  const studio = bundle.studio || {};
  const dual = (studio.dualPlayer as Record<string, unknown>) || {};

  const playlist: PlaylistTrack[] = (bundle.playlist || []).map((item, i) => ({
    id: i + 1,
    serverId: item.id ? String(item.id) : undefined,
    localFileId: item.localFileId ? String(item.localFileId) : undefined,
    title: String(item.title),
    artist: String(item.artist || 'Unknown'),
    duration: String(item.duration || '0:00'),
    bpm: Number(item.bpm) || 120,
  }));

  const localFiles = (bundle.localFiles || []).map((f) => ({
    id: String(f.id),
    name: String(f.name),
    uri: RjApi.getFileUrl(String(f.fileUrl)),
    size: String(f.fileSize || ''),
    duration: String(f.duration || '0:00'),
  }));

  const notifications = (bundle.notifications || []).map((n, i) => ({
    id: Date.now() + i,
    serverId: n.id ? String(n.id) : undefined,
    title: String(n.title),
    message: String(n.message),
    type: (n.type as 'system' | 'request' | 'alert') || 'system',
    read: Boolean(n.read),
    timestamp: n.createdAt ? new Date(n.createdAt as string) : new Date(),
  }));

  const chatMessages = (bundle.chat?.messages || []).map(mapChatMessage);
  const existingChatMessages = useAppStore.getState().rjStudio.chatMessages;
  const pinned = bundle.chat?.pinnedMessage
    ? mapChatMessage(bundle.chat.pinnedMessage as Record<string, unknown>, 0)
    : null;

  const rawA = dual.playerATrack as Record<string, unknown> | null | undefined;
  const rawB = dual.playerBTrack as Record<string, unknown> | null | undefined;
  
  // Requirement 3: Prevent UI from showing loaded unless deck actually has it loaded
  let deckAHasLoaded = false;
  let deckBHasLoaded = false;
  
  try {
    const snap = await audio.getPlaybackSnapshot();
    deckAHasLoaded = snap?.deckA?.isLoaded || false;
    deckBHasLoaded = snap?.deckB?.isLoaded || false;
  } catch {
    deckAHasLoaded = false;
    deckBHasLoaded = false;
  }

  // Preserve audioUrl from the existing store track — the backend never stores
  // local file:/// URIs, so a write-back from the server would silently strip
  // audioUrl and break loadSound on the next A→B (or B→A) transfer.
  const existingA = useAppStore.getState().rjStudio.playerATrack;
  const existingB = useAppStore.getState().rjStudio.playerBTrack;

  const mergeAudioUrl = (
    incoming: Record<string, unknown> | null | undefined,
    existing: { audioUrl?: string } | null | undefined
  ): Record<string, unknown> | null => {
    if (!incoming) return null;
    if (incoming.audioUrl) return incoming;
    if (existing?.audioUrl) return { ...incoming, audioUrl: existing.audioUrl };
    return incoming;
  };

  const playerATrack = (deckAHasLoaded && rawA && typeof rawA === 'object' && rawA.title)
    ? mergeAudioUrl(rawA, existingA) as never
    : null;
  const playerBTrack = (deckBHasLoaded && rawB && typeof rawB === 'object' && rawB.title)
    ? mergeAudioUrl(rawB, existingB) as never
    : null;

  useAppStore.getState().updateRjStudioState({
    playerATrack,
    playerBTrack,
    isPlayingA: Boolean(dual.isPlayingA),
    isPlayingB: Boolean(dual.isPlayingB),
    activePlayer: (dual.activePlayer as 'A' | 'B') || 'A',
    crossfadeValue: Number(dual.crossfadeValue) || 0,
    isCrossfading: Boolean(dual.isCrossfading),
    // Only restore currentTrack if a deck is actually loaded — prevents phantom
    // "Now Playing" songs appearing after restart when no audio is in any deck.
    currentTrack: (deckAHasLoaded || deckBHasLoaded)
      ? ((studio.currentTrack as never) ?? null)
      : null,
    playlist,
    isPlaylistActive: Boolean(studio.isPlaylistActive),
    isPlaylistPaused: Boolean(studio.isPlaylistPaused),
    playlistDuration: Number(studio.playlistDuration) || 60,
    playlistTimerRemaining: Number(studio.playlistTimerRemaining) || 0,
    playlistCurrentIndex: Number(studio.playlistCurrentIndex) || 0,
    playlistTrackElapsedMs: Number(studio.playlistTrackElapsedMs) || 0,
    playlistSession: (studio.playlistSession as never) ?? null,
    trackStats: (studio.trackStats as never) ?? {},
    rjMics: Array.isArray(studio.mics) ? (studio.mics as never) : undefined,
    rjStats: (studio.stats as never) || undefined,
    activeListeners: Number(studio.activeListeners) || 0,
    listenerHistory: Array.isArray(studio.listenerHistory)
      ? (studio.listenerHistory as number[])
      : undefined,
    liveTimerSeconds: (studio.isLive && studio.liveTimerStartedAt)
      ? Math.floor((Date.now() - new Date(studio.liveTimerStartedAt as string).getTime()) / 1000)
      : (Number(studio.liveTimerSeconds) || 0),
    isTimerPaused: Boolean(studio.isTimerPaused),
    chatMessages: chatMessages.length
      ? chatMessages
      : Array.isArray(existingChatMessages)
        ? existingChatMessages
        : [],
    pinnedMessage: pinned,
    bannedUsers: bundle.bannedUsers || [],
    uploadedLocalFiles: localFiles,
    rjNotifications: notifications,
  });
}

export function mapPlaylistItemFromApi(item: Record<string, unknown>, sortIndex?: number): PlaylistTrack {
  return {
    id: typeof sortIndex === 'number' ? sortIndex + 1 : Date.now(),
    serverId: item.id ? String(item.id) : undefined,
    localFileId: item.localFileId ? String(item.localFileId) : undefined,
    title: String(item.title),
    artist: String(item.artist || 'Unknown'),
    duration: String(item.duration || '0:00'),
    bpm: Number(item.bpm) || 120,
  };
}

export async function applyStudioRecordToStore(studio: Record<string, unknown>) {
  const dual = (studio.dualPlayer as Record<string, unknown>) || {};

  const rawA2 = dual.playerATrack as Record<string, unknown> | null | undefined;
  const rawB2 = dual.playerBTrack as Record<string, unknown> | null | undefined;

  let deckAHasLoaded2 = false;
  let deckBHasLoaded2 = false;

  try {
    const snap = await audio.getPlaybackSnapshot();
    deckAHasLoaded2 = snap?.deckA?.isLoaded || false;
    deckBHasLoaded2 = snap?.deckB?.isLoaded || false;
  } catch {
    deckAHasLoaded2 = false;
    deckBHasLoaded2 = false;
  }

  // Preserve audioUrl from the existing store track — the backend never stores
  // local file:/// URIs, so a write-back from the server would silently strip
  // audioUrl and break loadSound on the next A→B (or B→A) transfer.
  const existingA2 = useAppStore.getState().rjStudio.playerATrack;
  const existingB2 = useAppStore.getState().rjStudio.playerBTrack;

  const mergeAudioUrl2 = (
    incoming: Record<string, unknown> | null | undefined,
    existing: { audioUrl?: string } | null | undefined
  ): Record<string, unknown> | null => {
    if (!incoming) return null;
    if (incoming.audioUrl) return incoming;
    if (existing?.audioUrl) return { ...incoming, audioUrl: existing.audioUrl };
    return incoming;
  };

  useAppStore.getState().updateRjStudioState({
    playerATrack: (deckAHasLoaded2 && rawA2 && typeof rawA2 === 'object' && rawA2.title)
      ? mergeAudioUrl2(rawA2, existingA2) as never
      : null,
    playerBTrack: (deckBHasLoaded2 && rawB2 && typeof rawB2 === 'object' && rawB2.title)
      ? mergeAudioUrl2(rawB2, existingB2) as never
      : null,
    isPlayingA: Boolean(dual.isPlayingA),
    isPlayingB: Boolean(dual.isPlayingB),
    activePlayer: (dual.activePlayer as 'A' | 'B') || 'A',
    crossfadeValue: Number(dual.crossfadeValue) ?? 0,
    isCrossfading: Boolean(dual.isCrossfading),
    // Only restore currentTrack if a deck is actually loaded — prevents phantom
    // "Now Playing" songs appearing after restart when no audio is in any deck.
    currentTrack: (deckAHasLoaded2 || deckBHasLoaded2)
      ? ((studio.currentTrack as never) ?? null)
      : null,
    ...applyPlaylistStudioFields(studio),
    isPlaylistActive: Boolean(studio.isPlaylistActive),
    isPlaylistPaused: Boolean(studio.isPlaylistPaused),
    playlistDuration: Number(studio.playlistDuration) || 60,
    playlistTimerRemaining: Number(studio.playlistTimerRemaining) ?? 0,
    playlistCurrentIndex: Number(studio.playlistCurrentIndex) || 0,
    playlistTrackElapsedMs: Number(studio.playlistTrackElapsedMs) || 0,
    playlistSession: (studio.playlistSession as never) ?? null,
    trackStats: (studio.trackStats as never) ?? {},
    rjMics: Array.isArray(studio.mics) ? (studio.mics as never) : undefined,
    rjStats: (studio.stats as never) || undefined,
    activeListeners: Number(studio.activeListeners) || 0,
    listenerHistory: Array.isArray(studio.listenerHistory)
      ? (studio.listenerHistory as number[])
      : undefined,
    isTimerPaused: Boolean(studio.isTimerPaused),
  });
}
