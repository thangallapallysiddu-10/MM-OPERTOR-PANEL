import type { RjStudioBundle } from '../../../services/api/rjApi';

type MixerChannel = {
  id: number;
  name: string;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  isCue: boolean;
  fx: string[];
};

/** Ensure mixer channels from API are valid for Zustand (6 ch, fx string[]). */
export function mapMixerChannelsFromApi(channels: unknown): MixerChannel[] | undefined {
  if (!Array.isArray(channels) || channels.length === 0) return undefined;

  const mapped = channels.slice(0, 6).map((raw, idx) => {
    const ch = raw as Record<string, unknown>;
    const id = typeof ch.id === 'number' ? ch.id : idx + 1;
    let fx: string[] = [];
    if (Array.isArray(ch.fx)) {
      fx = ch.fx.filter((f): f is string => typeof f === 'string');
    } else if (ch.fx && typeof ch.fx === 'object') {
      Object.entries(ch.fx as Record<string, number>).forEach(([key, val]) => {
        if (typeof val === 'number' && val > 0) fx.push(`${key}:${val}`);
      });
    }
    if (!fx.length && Array.isArray(ch.fxList)) {
      fx = (ch.fxList as string[]).slice(0, 2);
    }
    return {
      id,
      name: String(ch.name || `CH${id}`),
      volume: Number(ch.volume ?? ch.gain) || 70,
      isMuted: Boolean(ch.isMuted),
      isSolo: Boolean(ch.isSolo),
      isCue: Boolean(ch.isCue),
      fx,
    };
  });

  while (mapped.length < 6) {
    const id = mapped.length + 1;
    mapped.push({
      id,
      name: `CH${id}`,
      volume: 70,
      isMuted: false,
      isSolo: false,
      isCue: false,
      fx: ['echo'],
    });
  }
  return mapped;
}

export function applyPlaylistStudioFields(studio: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if (studio.isPlaylistActive !== undefined) patch.isPlaylistActive = studio.isPlaylistActive;
  if (studio.isPlaylistPaused !== undefined) patch.isPlaylistPaused = studio.isPlaylistPaused;
  if (studio.playlistDuration !== undefined) patch.playlistDuration = studio.playlistDuration;
  if (studio.playlistTimerRemaining !== undefined) {
    patch.playlistTimerRemaining = studio.playlistTimerRemaining;
  }
  if (studio.currentTrack) patch.currentTrack = studio.currentTrack;
  return patch;
}
