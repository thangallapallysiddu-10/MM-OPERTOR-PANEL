import { useCallback, useRef } from 'react';
import { audio } from '../../../services/audio';

export type SoloSource = 
  | { type: 'deck'; deckId: 'A' | 'B' }
  | { type: 'microphone'; index: number };

/**
 * Centralized Solo Manager
 * 
 * Enforces exclusive solo behavior:
 * - Only ONE source can be soloed at a time
 * - Soloing a new source automatically unsolos the previous source
 * - Clicking the same solo button again clears solo
 * 
 * Usage:
 *   const soloManager = useSoloManager();
 *   soloManager.toggleSolo({ type: 'deck', deckId: 'A' });
 *   soloManager.toggleSolo({ type: 'microphone', index: 0 });
 */
export function useSoloManager() {
  const activeSoloRef = useRef<SoloSource | null>(null);

  const toggleSolo = useCallback(async (source: SoloSource) => {
    console.log('[SOLO MANAGER] toggleSolo called', { source, activeSolo: activeSoloRef.current });

    const currentSolo = activeSoloRef.current;

    // Check if we're toggling the same source
    const isSameSource = 
      currentSolo !== null &&
      currentSolo.type === source.type &&
      (currentSolo.type === 'deck' 
        ? (currentSolo as Extract<SoloSource, { type: 'deck' }>).deckId === (source as Extract<SoloSource, { type: 'deck' }>).deckId
        : (currentSolo as Extract<SoloSource, { type: 'microphone' }>).index === (source as Extract<SoloSource, { type: 'microphone' }>).index
      );

    if (isSameSource) {
      // Unsolo the current source
      console.log('[SOLO MANAGER] Unsoloing current source', currentSolo);
      
      if (currentSolo.type === 'deck') {
        await audio.soloDeck(currentSolo.deckId, false);
      } else {
        await audio.soloMicrophoneByIndex(currentSolo.index, false);
      }
      
      activeSoloRef.current = null;
      console.log('[SOLO MANAGER] Solo cleared');
      return;
    }

    // Unsolo previous source if it exists
    if (currentSolo !== null) {
      console.log('[SOLO MANAGER] Unsoloing previous source', currentSolo);
      
      if (currentSolo.type === 'deck') {
        await audio.soloDeck(currentSolo.deckId, false);
      } else {
        await audio.soloMicrophoneByIndex(currentSolo.index, false);
      }
    }

    // Solo the new source
    console.log('[SOLO MANAGER] Soloing new source', source);
    
    if (source.type === 'deck') {
      await audio.soloDeck(source.deckId, true);
    } else {
      await audio.soloMicrophoneByIndex(source.index, true);
    }
    
    activeSoloRef.current = source;
    console.log('[SOLO MANAGER] Solo activated', source);
  }, []);

  const clearSolo = useCallback(async () => {
    const currentSolo = activeSoloRef.current;
    
    if (currentSolo === null) {
      return;
    }

    console.log('[SOLO MANAGER] clearSolo called', currentSolo);
    
    if (currentSolo.type === 'deck') {
      await audio.soloDeck(currentSolo.deckId, false);
    } else {
      await audio.soloMicrophoneByIndex(currentSolo.index, false);
    }
    
    activeSoloRef.current = null;
    console.log('[SOLO MANAGER] Solo cleared');
  }, []);

  const getActiveSolo = useCallback((): SoloSource | null => {
    return activeSoloRef.current;
  }, []);

  const isSoloed = useCallback((source: SoloSource): boolean => {
    const currentSolo = activeSoloRef.current;
    
    if (currentSolo === null) {
      return false;
    }
    
    if (currentSolo.type !== source.type) {
      return false;
    }
    
    if (currentSolo.type === 'deck') {
      return (currentSolo as Extract<SoloSource, { type: 'deck' }>).deckId === (source as Extract<SoloSource, { type: 'deck' }>).deckId;
    } else {
      return (currentSolo as Extract<SoloSource, { type: 'microphone' }>).index === (source as Extract<SoloSource, { type: 'microphone' }>).index;
    }
  }, []);

  return {
    toggleSolo,
    clearSolo,
    getActiveSolo,
    isSoloed,
  };
}
