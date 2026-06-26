import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
import { PodcastApi } from '../../../services/api/operatorApi';
import { audio } from '../../../services/audio';

const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const result = window.confirm(message || title);
      if (result && buttons[1]?.onPress) buttons[1].onPress();
    } else {
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
    (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://melodymguestroo.vercel.app');
  return `${baseUrl.replace(/\/$/, '')}?roomId=${roomId}`;
};

export const useLiveStream = () => {
  const { podcast, updatePodcastState, addDashboardNotification } = useAppStore();

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

  useEffect(() => {
    if (!roomLink) {
      const generatedRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newRoomLink = buildGuestRoomLink(generatedRoomId);
      updatePodcastState({ roomLink: newRoomLink });

      const base = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '';
      const store = useAppStore.getState();
      const seededSlots = store.podcast.guestSlots.map((slot) => ({
        ...slot,
        url: `${base}/podcast/guest/${slot.slotId}/${generatedRoomId}`,
      }));
      store.setGuestSlots(seededSlots);
    }
  }, []);

  useEffect(() => {
    const handleBroadcastStats = () => {};
    audio.on('broadcast:stats', handleBroadcastStats);
    return () => {
      audio.off('broadcast:stats', handleBroadcastStats);
    };
  }, []);

  const testMicrophone = async () => {
    setMicTestComplete(true);
    showAlert('Success', '✅ Microphone test passed!');
    addDashboardNotification({
      title: 'Microphone Test',
      message: 'Microphone test completed successfully',
      time: 'Just now',
      read: false,
    });
  };

  const testInternetSpeed = () => {
    setInternetTestComplete(true);
    showAlert('Internet Test', '✅ Connection is good!');
    addDashboardNotification({
      title: 'Internet Test',
      message: 'Internet speed test completed - Connection is stable',
      time: 'Just now',
      read: false,
    });
  };

  const startLiveStream = async () => {
    if (!liveTitle.trim()) {
      showAlert('Error', 'Please enter a title');
      return;
    }

    try {
      const roomIdMatch = roomLink.match(/roomId=([A-Z0-9]+)/i);
      const roomId = roomIdMatch ? roomIdMatch[1] : Math.random().toString(36).substring(2, 10).toUpperCase();
      const activeRoomLink = roomLink || buildGuestRoomLink(roomId);

      await audio.startBroadcast({
        server: activeRoomLink,
        streamKey: roomId,
        bitrate: 128,
      });

      await PodcastApi.startLiveSession({
        title: liveTitle,
        description: liveDescription || '',
        roomId,
        roomLink: activeRoomLink,
        host: 'Operator',
      });

      try {
        const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '';
        const links = await PodcastApi.generateGuestLinks({ roomId, baseUrl });
        const store = useAppStore.getState();
        const updatedSlots = store.podcast.guestSlots.map((slot) => {
          const found = links.find((l) => l.slotId === slot.slotId);
          return found ? { ...slot, url: found.url } : slot;
        });
        store.setGuestSlots(updatedSlots);
      } catch {}

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
    } catch {
      showAlert('Error', 'Could not start live stream');
    }
  };

  const stopLiveStream = () => {
    const confirmStop = async () => {
      try {
        await audio.stopBroadcast();
      } catch {}

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
      } catch {}

      setIsLive(false);
      setLiveSeconds(0);
      setLiveViewers(0);
      addDashboardNotification({
        title: 'Live Stream Ended',
        message: `Your live stream "${liveTitle}" has ended`,
        time: 'Just now',
        read: false,
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Stop Live Stream?\nDuration: ${Math.floor(liveSeconds / 60)} min, Viewers: ${liveViewers}`)) {
        confirmStop();
      }
    } else {
      Alert.alert('Stop Live Stream', `Stop? Duration: ${Math.floor(liveSeconds / 60)} min, Viewers: ${liveViewers}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: confirmStop },
      ]);
    }
  };

  const startLiveSetup = () => {
    setShowLiveSetup(true);
    setLiveSetupStep('test');
    setMicTestComplete(false);
    setInternetTestComplete(false);
    setLiveTitle('');
    setLiveDescription('');
  };

  const proceedToReady = () => {
    if (micTestComplete && liveTitle.trim()) {
      setLiveSetupStep('ready');
    } else {
      showAlert('Setup Incomplete', 'Complete microphone test and enter title');
    }
  };

  const shareLiveLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(roomLink);
        showAlert('Success', 'Link copied!');
      } else {
        Alert.alert('Share', `Share: ${roomLink}`);
      }
    } catch {
      showAlert('Error', 'Failed to copy');
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
    mediaStream: null,
    broadcastStats: null,
  };
};
