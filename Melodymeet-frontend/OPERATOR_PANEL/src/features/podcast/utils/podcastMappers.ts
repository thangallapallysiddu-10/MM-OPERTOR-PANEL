import { getFileUrl } from '../../../services/api/operatorApi';
import type { Podcast as ApiPodcast } from '../../../services/api/operatorApi';
import type { Podcast, Recording } from '../types';

export function extractRoomId(roomLink: string): string | null {
  const match = roomLink.match(/roomId=([A-Z0-9]+)/i);
  return match ? match[1] : null;
}

export function mapEpisodeFromApi(ep: ApiPodcast | Record<string, unknown>): Podcast {
  const row = ep as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    genre: row.genre ? String(row.genre) : '',
    seasonNumber: row.seasonNumber != null ? Number(row.seasonNumber) : null,
    episodeNumber: row.episodeNumber != null ? Number(row.episodeNumber) : null,
    coverArt: row.coverArt ? String(row.coverArt) : null,
    fileName: String(row.fileName || ''),
    fileUrl: row.fileUrl ? getFileUrl(String(row.fileUrl)) : undefined,
    fileSize: String(row.fileSize || ''),
    schedule: row.scheduleDate
      ? String(row.scheduleDate)
      : row.schedule
        ? String(row.schedule)
        : 'Not scheduled',
    status: String(row.status || 'Draft'),
    date: row.date
      ? String(row.date)
      : row.createdAt
        ? new Date(String(row.createdAt)).toLocaleDateString()
        : new Date().toLocaleDateString(),
  };
}

export function mapRecordingFromApi(r: Record<string, unknown>): Recording {
  return {
    id: Number(r.id),
    name: String(r.name || 'Recording'),
    duration: String(r.duration || '0:00'),
    size: String(r.size || r.fileSize || 'Unknown'),
    uri: r.fileUrl ? getFileUrl(String(r.fileUrl)) : undefined,
  };
}
