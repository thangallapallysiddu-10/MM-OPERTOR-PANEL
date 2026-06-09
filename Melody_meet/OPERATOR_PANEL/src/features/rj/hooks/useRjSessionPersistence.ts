import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { audioEngineManager } from '../../../services/audioEngine/core/AudioEngineManager';
import { sessionManager, RjSessionData } from '../services/SessionProvider';
import { useOperator } from '../../../context/OperatorContext';

export const useRjSessionPersistence = () => {
  const { activeStreamId, streams } = useOperator();
  // Fallback to the first stream if no stream is active, same as index.tsx does
  const studioId = String(activeStreamId ?? streams[0]?.id ?? '');
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const isHydrated = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>('');

  // 1. Initial Restoration Flow
  useEffect(() => {
    if (!studioId || isHydrated.current) return;

    const applyHardFallback = async () => {
      try {
        // 1. Check store to see if tracks were loaded before this reset
        //    (e.g. the user had tracks on-screen when they refreshed)
        const storeState = useAppStore.getState().rjStudio;
        const hadActiveSession = Boolean(storeState.playerATrack || storeState.playerBTrack);

        // 2. Clear Runtime Deck State
        const deckA = audioEngineManager.getDeck('A');
        const deckB = audioEngineManager.getDeck('B');
        deckA.unloadTrack();
        deckB.unloadTrack();
        
        // 3. Clear App Store — including localPlayback so the Now Playing
        //    display never shows a stale track from a previous session.
        updateRjStudioState({
          playerATrack: null,
          playerBTrack: null,
          isPlayingA: false,
          isPlayingB: false,
          wasPlayingA: false,
          wasPlayingB: false,
          currentTrack: null,
          localPlayback: {
            isPlaying: false,
            currentTrack: null,
            currentFileUri: null,
            currentFileName: null,
            currentFileId: null,
            soundObject: null,
          } as any,
        });

        // 4. Overwrite Backend & LocalStorage with Empty Session.
        // Use the dedicated 'clear_all' dual-player action so the DB column
        // is atomically reset to DEFAULT_DUAL_PLAYER on the backend side.
        // Also wipe the localStorage key so there is no stale fallback.
        try {
          const { RjApi } = await import('../../../services/api/rjApi');
          const { rjBackend } = await import('../services/rjBackend');
          const sid = studioId || rjBackend.getStudioId();
          if (sid) {
            await RjApi.dualPlayerAction(sid, { action: 'clear_all' });
          }
        } catch {
          /* backend may be offline — localStorage clear below is the fallback */
        }
        // Always clear localStorage regardless of backend availability
        try {
          const prefix = 'rj_session_state_';
          // Clear both with and without studioId suffix to catch any stale keys
          localStorage.removeItem(`${prefix}${studioId}`);
          // Also sweep any other rj_session_state_* keys left over from previous sessions
          Object.keys(localStorage)
            .filter((k) => k.startsWith(prefix))
            .forEach((k) => localStorage.removeItem(k));
        } catch {
          /* localStorage may not be available on native */
        }

        // 5. Notify User ONLY if they actually lost a session due to refresh
        if (hadActiveSession) {
          import('react-native').then(({ Alert }) => {
            Alert.alert('Session Reset', 'Session expired. Please reload tracks.');
          });
        }
      } catch (err) {
        console.error('Failed to apply RJ session fallback', err);
      } finally {
        isHydrated.current = true;
      }
    };

    applyHardFallback();
  }, [studioId, updateRjStudioState]);

  // 2. Build Session Data — tracks are intentionally excluded.
  // Local file:/// URIs are meaningless after a page reload; the audio engine
  // will have no audio loaded. Only FX state is worth persisting.
  const buildSessionData = (): RjSessionData => {
    const deckA = audioEngineManager.getDeck('A');
    const deckB = audioEngineManager.getDeck('B');

    const stateA = deckA.getState();
    const stateB = deckB.getState();

    return {
      version: 1,
      savedAt: Date.now(),
      playerA: {
        track: null,
        audioUrl: null,
        volume: 75,
        fx: stateA.fx,
        playbackPosition: 0,
        isLoaded: false,
        wasPlaying: false,
      },
      playerB: {
        track: null,
        audioUrl: null,
        volume: 75,
        fx: stateB.fx,
        playbackPosition: 0,
        isLoaded: false,
        wasPlaying: false,
      },
    };
  };

  // 3. Save Logic
  const saveSession = (immediate = false) => {
    if (!studioId || !isHydrated.current) return;

    const data = buildSessionData();
    const serialized = JSON.stringify(data);

    // Prevent redundant saves
    if (serialized === lastSavedStateRef.current && !immediate) return;

    if (immediate) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      sessionManager.saveSession(studioId, data);
      lastSavedStateRef.current = serialized;
    } else {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        sessionManager.saveSession(studioId, data);
        lastSavedStateRef.current = serialized;
      }, 1000);
    }
  };

  // 4. Watch for State Changes
  const trackAId = rjStudio.playerATrack?.id;
  const trackBId = rjStudio.playerBTrack?.id;

  useEffect(() => {
    if (!isHydrated.current) return;
    saveSession(true); // Immediate save on track change
  }, [trackAId, trackBId]);

  // Subscribe to FX changes
  useEffect(() => {
    const handleFxUpdated = () => saveSession(false); // Debounced save on FX change
    
    audioEngineManager.getDeck('A').events.on('fxUpdated', handleFxUpdated);
    audioEngineManager.getDeck('B').events.on('fxUpdated', handleFxUpdated);

    return () => {
      audioEngineManager.getDeck('A').events.off('fxUpdated', handleFxUpdated);
      audioEngineManager.getDeck('B').events.off('fxUpdated', handleFxUpdated);
    };
  }, []);

  // 5. Position Interval Save
  useEffect(() => {
    if (!isHydrated.current || !studioId) return;

    positionIntervalRef.current = setInterval(() => {
      // Only save position if actively playing to avoid spam
      if (rjStudio.isPlayingA || rjStudio.isPlayingB) {
        saveSession(false);
      }
    }, 5000);

    return () => {
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);
    };
  }, [rjStudio.isPlayingA, rjStudio.isPlayingB, studioId]);
};
