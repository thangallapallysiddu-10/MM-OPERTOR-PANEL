import { useEffect } from 'react';
import { PodcastApi } from '../../../services/api/operatorApi';
import { useAppStore } from '../../../store/useAppStore';
import { mapEpisodeFromApi, mapRecordingFromApi } from '../utils/podcastMappers';

/** Load episodes, mics, and recordings from API on mount. */
export function usePodcastBootstrap() {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [episodes, mics, recordings] = await Promise.all([
          PodcastApi.getAll(),
          PodcastApi.getMics(),
          PodcastApi.getRecordings(),
        ]);
        if (cancelled) return;

        const store = useAppStore.getState();
        if (episodes?.length) {
          const mapped = episodes.map((ep) => mapEpisodeFromApi(ep));
          const existing = store.podcast.podcastEpisodes || [];
          const byId = new Map(existing.map((e) => [e.id, e]));
          mapped.forEach((ep) => byId.set(ep.id, ep));
          store.updatePodcastState({ podcastEpisodes: Array.from(byId.values()) });
        }

        if (mics?.length) {
          store.setMics(mics);
        }

        if (recordings) {
          store.setRecordings(recordings.map((r) => mapRecordingFromApi(r as Record<string, unknown>)));
        }
      } catch {
        /* offline — keep local Zustand state */
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);
}
