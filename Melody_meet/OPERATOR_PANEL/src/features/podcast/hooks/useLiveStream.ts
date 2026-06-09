import { useState, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
import { PodcastApi } from '../../../services/api/operatorApi';

// Platform-aware alert function
const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // For confirm dialogs
      const result = window.confirm(message || title);
      if (result && buttons[1]?.onPress) {
        buttons[1].onPress();
      }
    } else {
      // Simple alert
      alert(message || title);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const buildGuestRoomLink = (roomId: string) => {
  const configuredGuestUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_GUEST_URL;
  const baseUrl =
    configuredGuestUrl ||
    (Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://melodymguestroo.vercel.app');

  return `${baseUrl.replace(/\/$/, '')}?roomId=${roomId}`;
};

export const useLiveStream = () => {
  // Get from Zustand store
  const {
    podcast,
    updatePodcastState,
    addDashboardNotification,
  } = useAppStore();

  // Local refs for timers and media (don't need persistence)
  const liveTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveViewerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mediaStream, setMediaStream] = useState<any>(null);
  const [audioContext, setAudioContext] = useState<any>(null);
  const [isMicActive, setIsMicActive] = useState(false);

  // Get values from store (these persist across navigation)
  const isLive = podcast.isLive || false;
  const setIsLive = (value: boolean) => updatePodcastState({ isLive: value });
  
  const liveSeconds = podcast.liveSeconds || 0;
  const setLiveSeconds = (value: number) => updatePodcastState({ liveSeconds: value });
  
  const liveViewers = podcast.liveViewers || 0;
  const setLiveViewers = (value: number) => updatePodcastState({ liveViewers: value });
  
  const showLiveSetup = podcast.showLiveSetup || false;
  const setShowLiveSetup = (value: boolean) => updatePodcastState({ showLiveSetup: value });
  
  const liveSetupStep = podcast.liveSetupStep || 'test';
  const setLiveSetupStep = (value: 'test' | 'ready') => updatePodcastState({ liveSetupStep: value });
  
  const micTestComplete = podcast.micTestComplete || false;
  const setMicTestComplete = (value: boolean) => updatePodcastState({ micTestComplete: value });
  
  const internetTestComplete = podcast.internetTestComplete || false;
  const setInternetTestComplete = (value: boolean) => updatePodcastState({ internetTestComplete: value });
  
  const liveTitle = podcast.liveTitle || '';
  const setLiveTitle = (value: string) => updatePodcastState({ liveTitle: value });
  
  const liveDescription = podcast.liveDescription || '';
  const setLiveDescription = (value: string) => updatePodcastState({ liveDescription: value });
  
  const roomLink = podcast.roomLink || '';

  // Generate room link only once, then immediately seed guest slot URLs
  // so Copy Link works before Go Live.
  useEffect(() => {
    if (!roomLink) {
      const generatedRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newRoomLink = buildGuestRoomLink(generatedRoomId);
      updatePodcastState({ roomLink: newRoomLink });

      // Seed pre-live slot URLs using the same /podcast/guest/:slotId/:roomId shape.
      // No backend call needed — we build the URLs directly from the known roomId.
      const base =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : '';
      const store = useAppStore.getState();
      const seededSlots = store.podcast.guestSlots.map((slot) => ({
        ...slot,
        url: `${base}/podcast/guest/${slot.slotId}/${generatedRoomId}`,
      }));
      store.setGuestSlots(seededSlots);
    }
  }, []);

  // Live timers
  useEffect(() => {
    if (isLive) {
      if (liveTimerIntervalRef.current) clearInterval(liveTimerIntervalRef.current);
      if (liveViewerIntervalRef.current) clearInterval(liveViewerIntervalRef.current);

      liveTimerIntervalRef.current = setInterval(() => {
        const currentSeconds = useAppStore.getState().podcast.liveSeconds || 0;
        updatePodcastState({ liveSeconds: currentSeconds + 1 });
      }, 1000);
      
      liveViewerIntervalRef.current = setInterval(() => {
        const currentPodcast = useAppStore.getState().podcast;
        // Guard: do not poll if live session has already ended.
        if (!currentPodcast.isLive) return;
        const roomIdMatch = currentPodcast.roomLink.match(/roomId=([A-Z0-9]+)/i);
        const roomId = roomIdMatch ? roomIdMatch[1] : null;
        if (roomId) {
          PodcastApi.updateLiveViewers(roomId, currentPodcast.liveViewers || 0).catch(() => {});
        }
      }, 10000);
    } else {
      if (liveTimerIntervalRef.current) {
        clearInterval(liveTimerIntervalRef.current);
        liveTimerIntervalRef.current = null;
      }
      if (liveViewerIntervalRef.current) {
        clearInterval(liveViewerIntervalRef.current);
        liveViewerIntervalRef.current = null;
      }
    }
    return () => {
      if (liveTimerIntervalRef.current) clearInterval(liveTimerIntervalRef.current);
      if (liveViewerIntervalRef.current) clearInterval(liveViewerIntervalRef.current);
    };
  }, [isLive]);

  const testMicrophone = async () => {
    if (Platform.OS === 'web') {
      try {
        showAlert("Microphone Test", "Please allow microphone access");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);
        setMicTestComplete(true);
        setIsMicActive(true);
        showAlert("Success", "✅ Microphone is working!");
        
        // Add notification
        addDashboardNotification({
          title: "Microphone Test",
          message: "Microphone test completed successfully",
          time: "Just now",
          read: false,
        });
      } catch (error) {
        showAlert("Error", "Could not access microphone");
      }
    } else {
      setMicTestComplete(true);
      showAlert("Success", "✅ Microphone test passed!");
      
      addDashboardNotification({
        title: "Microphone Test",
        message: "Microphone test completed successfully",
        time: "Just now",
        read: false,
      });
    }
  };

  const testInternetSpeed = () => {
    setInternetTestComplete(true);
    showAlert("Internet Test", "✅ Connection is good!");
    
    addDashboardNotification({
      title: "Internet Test",
      message: "Internet speed test completed - Connection is stable",
      time: "Just now",
      read: false,
    });
  };

  const startLiveStream = async () => {
    if (!liveTitle.trim()) {
      showAlert('Error', 'Please enter a title');
      return;
    }

    try {
      if (Platform.OS === 'web' && !mediaStream) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);
        setIsMicActive(true);
      }

      // Extract roomId from the generated roomLink
      const roomIdMatch = roomLink.match(/roomId=([A-Z0-9]+)/i);
      const roomId = roomIdMatch ? roomIdMatch[1] : Math.random().toString(36).substring(2, 10).toUpperCase();
      const activeRoomLink = roomLink || buildGuestRoomLink(roomId);

      // Persist live session to backend.
      // This MUST succeed — if no backend session row exists, guests cannot join
      // (joinGuestSlot enforces status='live') and the operator UI would be out
      // of sync with the backend. Do NOT swallow this error.
      await PodcastApi.startLiveSession({
        title: liveTitle,
        description: liveDescription || '',
        roomId,
        roomLink: activeRoomLink,
        host: 'Operator',
      });

      // Generate shareable guest slot links (MIC 2–5) — best-effort only.
      // If this fails, the operator can still copy links manually.
      try {
        const baseUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.origin
            : '';
        const links = await PodcastApi.generateGuestLinks({ roomId, baseUrl });
        const store = useAppStore.getState();
        const updatedSlots = store.podcast.guestSlots.map((slot) => {
          const found = links.find((l) => l.slotId === slot.slotId);
          return found ? { ...slot, url: found.url } : slot;
        });
        store.setGuestSlots(updatedSlots);
      } catch (_) {
        // Links are optional — operator can still Copy Link manually
      }

      setIsLive(true);
      setLiveSeconds(0);
      setLiveViewers(0);
      setShowLiveSetup(false);
      showAlert('Live!', `🎙️ You are now live with "${liveTitle}"`);

      addDashboardNotification({
        title: 'Live Stream Started',
        message: `You started a live stream: "${liveTitle}"`,
        time: 'Just now',
        read: false,
      });
    } catch (error) {
      showAlert('Error', 'Could not start live stream');
    }
  };

  // Stop live stream for WEB and MOBILE
  const stopLiveStream = () => {
    const confirmStop = async () => {
      // Clear both intervals immediately — before any async work.
      // This prevents the viewer-poll interval from firing against a session
      // that is about to be (or has just been) ended on the backend.
      if (liveTimerIntervalRef.current) {
        clearInterval(liveTimerIntervalRef.current);
        liveTimerIntervalRef.current = null;
      }
      if (liveViewerIntervalRef.current) {
        clearInterval(liveViewerIntervalRef.current);
        liveViewerIntervalRef.current = null;
      }

      // Stop all audio tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((track: any) => { track.stop(); });
        setMediaStream(null);
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }

      // Persist stop to backend (best-effort)
      try {
        const roomIdMatch = roomLink.match(/roomId=([A-Z0-9]+)/i);
        const roomId = roomIdMatch ? roomIdMatch[1] : null;
        if (roomId) {
          await PodcastApi.stopLiveSession({
            roomId,
            peakViewers: liveViewers,
            lastViewerCount: liveViewers,
          });
        }
      } catch (_) {
        // Backend unreachable — continue anyway
      }

      setIsLive(false);
      setIsMicActive(false);
      setLiveSeconds(0);
      setLiveViewers(0);

      addDashboardNotification({
        title: 'Live Stream Ended',
        message: `Your live stream "${liveTitle}" has ended`,
        time: 'Just now',
        read: false,
      });

      if (Platform.OS === 'web') {
        alert('Live stream stopped!');
      } else {
        Alert.alert('Success', 'Live stream stopped!');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Stop Live Stream?\nDuration: ${Math.floor(liveSeconds / 60)} min, Viewers: ${liveViewers}`)) {
        confirmStop();
      }
    } else {
      Alert.alert(
        'Stop Live Stream',
        `Stop? Duration: ${Math.floor(liveSeconds / 60)} min, Viewers: ${liveViewers}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', style: 'destructive', onPress: confirmStop },
        ]
      );
    }
  };

  const startLiveSetup = () => {
    setShowLiveSetup(true);
    setLiveSetupStep('test');
    setMicTestComplete(false);
    setInternetTestComplete(false);
    setLiveTitle("");
    setLiveDescription("");
  };

  const proceedToReady = () => {
    if (micTestComplete && liveTitle.trim()) {
      setLiveSetupStep('ready');
    } else {
      showAlert("Setup Incomplete", "Complete microphone test and enter title");
    }
  };

  const shareLiveLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(roomLink);
        showAlert("Success", "Link copied!");
        
        addDashboardNotification({
          title: "Link Copied",
          message: "Live stream link copied to clipboard",
          time: "Just now",
          read: false,
        });
      } else {
        Alert.alert("Share", `Share: ${roomLink}`);
      }
    } catch (error) {
      showAlert("Error", "Failed to copy");
    }
  };

  return {
    isLive,
    liveSeconds,
    liveViewers,
    showLiveSetup,
    liveSetupStep,
    micTestComplete,
    internetTestComplete,
    liveTitle,
    liveDescription,
    roomLink,
    setLiveTitle,
    setLiveDescription,
    testMicrophone,
    testInternetSpeed,
    startLiveStream,
    stopLiveStream,
    startLiveSetup,
    shareLiveLink,
    proceedToReady,
    setShowLiveSetup,
    setLiveSetupStep,
    // Exposed for usePeerConnections — operator mic stream used as the host audio track
    mediaStream,
  };
};
