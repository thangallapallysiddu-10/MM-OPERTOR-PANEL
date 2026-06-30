import React, { useState, useEffect, useRef } from 'react';
import { 
  View, ScrollView, Platform, TouchableOpacity, Text, 
  StyleSheet, KeyboardAvoidingView, useWindowDimensions 
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOperator } from '../../context/OperatorContext';
import { useAppStore } from '../../store/useAppStore';

import { ProfileModal } from './components/modals/ProfileModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { ScheduleModal } from './components/modals/ScheduleModal';

import { Track, Message } from './types';
import { lightTheme, darkTheme } from './themes';
import { rjProfile, songData } from './constants';

import { useTimer } from './hooks/useTimer';
import { useStats } from './hooks/useStats';
import { useNotifications } from './hooks/useNotifications';
import { usePlayer } from './hooks/usePlayer';
import { useRjSessionPersistence } from './hooks/useRjSessionPersistence';
import { useMicSystem } from './hooks/useMicSystem';
import { usePlaylist } from './hooks/usePlaylist';
import { usePlaylistPlayer } from './hooks/usePlaylistPlayer';
import { useChat } from './hooks/useChat';
import { useRjSync } from './hooks/useRjSync';
import { RjApi } from '../../services/api/rjApi';
import { syncDualPlayer } from './services/rjApiSync';
import { rjBackend } from './services/rjBackend';
import { chatSocket } from '../../services/socketService';
import { RjSetupModal } from './components/modals/RjSetupModal';
import { audio } from '../../services/audio';

// Schedule Event Interface
interface ScheduledEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  duration: number;
  isActive: boolean;
  notificationSent: boolean;
}

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const isNative = isIOS || isAndroid;

const RJStudio = ({ navigation }: any) => {
  const { isLive, toggleLive, setCurrentTrack, activeChannel, setActiveChannel, activeStreamId, streams, listeners } = useOperator();
  const studioId = activeStreamId ?? streams[0]?.id ?? null;
  const { backendOnline, ready: rjSyncReady } = useRjSync(studioId, isLive);

  useEffect(() => {
    if (!backendOnline || !studioId) return;
    void RjApi.syncListeners(studioId, listeners).catch(() => {});
  }, [listeners, backendOnline, studioId]);
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
 
  const { profileDarkMode, setProfileDarkMode, rjStudio } = useAppStore();
  const isDarkMode = profileDarkMode;
  const colors = isDarkMode ? darkTheme : lightTheme;
  const setIsDarkMode = setProfileDarkMode;

  const [localCurrentTrack, setLocalCurrentTrack] = useState<Track | null>(null);
  
  const [currentMood, setCurrentMood] = useState<string>("chill");
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const keyboardOpenRef = useRef(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showRjSetupModal, setShowRjSetupModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = localStorage.getItem('scheduledEvents');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  // Sync scheduledEvents with localStorage on Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      localStorage.setItem('scheduledEvents', JSON.stringify(scheduledEvents));
    }
  }, [scheduledEvents]);
  
  const { user } = useAuth();



  // Handle scheduling event
  const handleScheduleEvent = (event: ScheduledEvent) => {
    setScheduledEvents(prev => [...prev, event]);
    
    // Send notification to users via API
    if (event.notificationSent && studioId) {
      RjApi.createNotification(studioId, {
        title: `📅 Upcoming Live Show: ${event.title}`,
        message: `${user?.name || rjProfile.name} will go live at ${formatEventTime(event.date)} for ${event.duration} minutes`,
        type: 'system'
      }).catch(() => {});
    }
    
    notifications.addNotification(
      'system',
      `📅 Live show scheduled: "${event.title}" at ${formatEventTime(event.date)}`
    );

    // Auto-open Setup Modal and go live/online directly!
    setShowScheduleModal(false);
    setShowRjSetupModal(true);
    if (!isLive) {
      const selectedMic = rjStudio.rjMics.find((mic: any) => mic.isActive) ?? rjStudio.rjMics[0];
      void audio.enableMicrophone((selectedMic as any)?.input || '').catch(() => {});
      toggleLive();
    }
  };

  // Synchronize scheduledEvents across local storage updates
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleStorageChange = () => {
      const saved = localStorage.getItem('scheduledEvents');
      if (saved) {
        try {
          setScheduledEvents(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen for auto-start live stream requests
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const checkAutoStart = () => {
      const autoStart = localStorage.getItem('autoStartLive');
      if (autoStart === 'true') {
        localStorage.removeItem('autoStartLive');
        setShowRjSetupModal(true);
        if (!isLive) {
          const selectedMic = rjStudio.rjMics.find((mic: any) => mic.isActive) ?? rjStudio.rjMics[0];
          void audio.enableMicrophone((selectedMic as any)?.input || '').catch(() => {});
          toggleLive();
        }
      }
    };

    checkAutoStart();
    const interval = setInterval(checkAutoStart, 1000);
    return () => clearInterval(interval);
  }, [isLive, toggleLive, rjStudio.rjMics]);

  // Handle cancel event
  const handleCancelEvent = (eventId: string) => {
    const event = scheduledEvents.find(e => e.id === eventId);
    setScheduledEvents(prev => prev.filter(e => e.id !== eventId));
    
    if (event && studioId) {
      RjApi.createNotification(studioId, {
        title: `❌ Live Show Cancelled: ${event.title}`,
        message: `Sorry, the scheduled live show has been cancelled.`,
        type: 'alert'
      }).catch(() => {});
      
      notifications.addNotification(
        'alert', 
        `❌ Live show cancelled: "${event.title}"`
      );
    }
  };

  const formatEventTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLocalFilePlayTrack = (track: Track) => {
    setLocalCurrentTrack(track);
    setCurrentTrack(track);
    notifications.addNotification("system", `🎵 Now playing local file: ${track.title}`);
  };

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      const savedTrack = state.rjStudio.localPlayback?.currentTrack;
      if (savedTrack && savedTrack !== localCurrentTrack) {
        setLocalCurrentTrack(savedTrack);
        setCurrentTrack(savedTrack);
      }
    });
    
    return () => unsubscribe();
  }, []);
 
  useEffect(() => {
    if (localCurrentTrack) {
      const trackMood = songData[localCurrentTrack.title as keyof typeof songData]?.mood || "chill";
      setCurrentMood(trackMood);
    } else {
      setCurrentMood("chill");
    }
  }, [localCurrentTrack]);

  useEffect(() => {
    if (localCurrentTrack) {
      setActiveChannel(localCurrentTrack.channel);
    }
  }, [localCurrentTrack]);

  // Active channel removed from mixer sync

  const timer = useTimer(isLive);
  const stats = useStats(localCurrentTrack?.title || "No Song");
  const notifications = useNotifications();
  const player = usePlayer({ 
    setCurrentTrack: (track: Track | null) => {
      if (track) {
        setCurrentTrack(track);
      }
    },
    setLocalCurrentTrack: (track: Track | null) => {
      if (track) {
        setLocalCurrentTrack(track);
      }
    },
    addNotification: notifications.addNotification 
  });
  const micSystem = useMicSystem(notifications.addNotification);
  const playlistPlayer = usePlaylistPlayer();
  const playlist = usePlaylist({ 
    player: playlistPlayer,
    setCurrentTrack, 
    setLocalCurrentTrack, 
    addNotification: notifications.addNotification 
  });

  // ── Listen Music state — lives here, passed down to modal ────────────────
  const [isListening, setIsListening] = useState(false);

  const handleListenToggle = () => {
    const next = !isListening;
    setIsListening(next);
    playlistPlayer.setMuted(!next);
  };
  
  useRjSessionPersistence();
  const chat = useChat(notifications.addNotification);

  useEffect(() => {
    chat.injectDemoMessages();
  }, []);

  const handleGoLive = () => {
    setShowRjSetupModal(true);
  };

  const handleToggleLiveFromModal = () => {
    if (isLive) {
      void audio.disableMicrophone().catch(() => {});
      toggleLive();
      setShowRjSetupModal(false);
    } else {
      const selectedMic = rjStudio.rjMics.find((mic: any) => mic.isActive) ?? rjStudio.rjMics[0];
      void audio.enableMicrophone((selectedMic as any)?.input || '').catch(() => {});
      toggleLive();
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingBottom: isNative ? 140 : 100,
      paddingTop: Platform.OS === 'ios' ? 50 : 40,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 14,
      padding: 14,
      borderRadius: 14,
      flexWrap: 'wrap' as const,
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    headerLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: isDarkMode ? '#1E1B4B' : '#EEF2FF',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: isDarkMode ? '#A78BFA' : '#4F6AF0',
    },
    nameText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      letterSpacing: -0.3,
    },
    statusText: {
      fontSize: 11,
      marginTop: 2,
      color: colors.textSecondary,
    },
    statPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.boxBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statValue: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
    },
    menuButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.boxBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    menuButtonText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    goLiveButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 25,
      marginBottom: 14,
      backgroundColor: '#059669',
      alignSelf: 'center',
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      width: '20%',
    },
    goLiveButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    rjSetupButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      minWidth: 140,
      backgroundColor: '#4F6AF0',
      shadowColor: '#4F6AF0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    rjSetupButtonText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    announcementBanner: {
      marginBottom: 12,
      padding: 10,
      borderRadius: 10,
      alignItems: 'center' as const,
      backgroundColor: isDarkMode ? '#1E3A8A' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#2D4A9A' : '#C7D2FE',
    },
    announcementText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: isDarkMode ? '#6B8EFF' : '#4F6AF0',
    },
    liveBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#DC2626',
    },
    liveText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#DC2626',
      letterSpacing: 0.5,
    },
    notificationIconContainer: {
      position: 'relative' as const,
    },
    notificationBadge: {
      position: 'absolute' as const,
      top: -6,
      right: -8,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 4,
      backgroundColor: '#4F6AF0',
    },
    notificationBadgeText: {
      fontSize: 9,
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={isIOS ? 'padding' : isAndroid ? 'height' : undefined}
        keyboardVerticalOffset={isIOS ? 90 : isAndroid ? 0 : 0}
        enabled={isNative}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEnabled={!keyboardOpenRef.current}
          removeClippedSubviews={false}
        >
          {/* HEADER */}
          <View className={`px-5 pt-8 pb-4 border-b ${isDarkMode ? 'border-[#1B2234]' : 'border-[#E2E8F0]'}`}>
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 pr-2">
                <Text className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>RJ Studio</Text>
              </View>
            </View>
            
            {/* Underline */}
            <View className="w-16 h-[2px] mt-2 rounded-sm" style={{ backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }} />
          </View>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'DJ'}</Text>
                {rjProfile.isOnline && (
                  <View style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFFFFF' }} />
                )}
              </View>
              <View>
                <Text style={styles.nameText}>{user?.name || rjProfile.name}</Text>
                <Text style={styles.statusText}>
                  LIVE STUDIO • {localCurrentTrack?.bpm || 0} BPM
                  {backendOnline ? ' • ☁️ synced' : rjSyncReady ? ' • local' : ''}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={styles.statPill}>
                <Ionicons name="people" size={14} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={styles.statValue}>{stats.rjStats.listeners}</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="heart" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.likes}</Text>
              </View>
              <View style={styles.statPill}>
                <MaterialIcons name="subscriptions" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.subscribers}</Text>
              </View>
              <View style={styles.statPill}>
                <Feather name="users" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.followers}</Text>
              </View>
              <View style={styles.statPill}>
                <Feather name="share-2" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.shares}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowRjSetupModal(true)} style={styles.rjSetupButton}>
                <MaterialIcons name="tune" size={20} color="#FFFFFF" />
                <Text style={styles.rjSetupButtonText}>RJ Setup</Text>
              </TouchableOpacity>
              
              
              
              <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={styles.menuButton}>
                <Feather name={isDarkMode ? "sun" : "moon"} size={16} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={styles.menuButtonText}>Theme</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.menuButton}>
                <Feather name="user" size={16} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={styles.menuButtonText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.menuButton}>
                <Feather name="settings" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.menuButtonText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowNotificationsModal(true)} style={[styles.menuButton, { position: 'relative' }]}>
                <View style={styles.notificationIconContainer}>
                  <Feather name="bell" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  {notifications.unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuButtonText}>Alerts</Text>
              </TouchableOpacity>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
          </View>

          {!isLive && (
  <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 14 }}>
    <TouchableOpacity onPress={handleGoLive} style={styles.goLiveButton}>
      <MaterialIcons name="live-tv" size={24} color="#FFFFFF" />
      <Text style={styles.goLiveButtonText}>Ready for Live</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      onPress={() => setShowScheduleModal(true)} 
      style={[styles.goLiveButton, { backgroundColor: '#8B5CF6', width: 'auto', paddingHorizontal: 24 }]}
    >
      <Feather name="calendar" size={20} color="#FFFFFF" />
      <Text style={styles.goLiveButtonText}>Schedule</Text>
    </TouchableOpacity>
  </View>
)}

          {showAnnouncement && (
            <View style={styles.announcementBanner}>
              <Text style={styles.announcementText}>{announcementMessage}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <ProfileModal 
        visible={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        isDarkMode={isDarkMode}
        colors={colors}
        user={user} 
      />
      
      <SettingsModal 
        visible={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        isDarkMode={isDarkMode}
        colors={colors}                         
        onToggleDarkMode={setIsDarkMode}
      />

      <NotificationsModal 
        visible={showNotificationsModal} 
        onClose={() => setShowNotificationsModal(false)} 
        isDarkMode={isDarkMode}
        colors={colors}                          
        notifications={notifications.notifications}
        unreadCount={notifications.unreadCount}
        onMarkAsRead={notifications.markNotificationAsRead}
        onMarkAllAsRead={notifications.markAllNotificationsAsRead}
      />

      {/* SCHEDULE MODAL - ADDED */}
      <ScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        isDarkMode={isDarkMode}
        colors={colors}
        onScheduleEvent={handleScheduleEvent}
        scheduledEvents={scheduledEvents}
        onCancelEvent={handleCancelEvent}
        rjName={user?.name || rjProfile.name}
      />

      <RjSetupModal
        visible={showRjSetupModal}
        isDarkMode={isDarkMode}
        isMobile={isMobile}
        colors={colors}
        isLive={isLive}
        activeChannel={activeChannel}
        studioId={studioId != null ? String(studioId) : null}
        timerFormatted={timer.formatTime()}
        timerIsPaused={timer.isPaused}
        onClose={() => setShowRjSetupModal(false)}
        onToggleLive={handleToggleLiveFromModal}
        onToggleTimerPause={() => timer.setIsPaused(!timer.isPaused)}
        onPlayLocalTrack={handleLocalFilePlayTrack}
        onLoadLocalToStandby={(track, playerId) => {
          if (!track || !track.title) {
            console.error(`[LOAD ${playerId}] Invalid track object:`, track);
            return;
          }

          if (playerId === 'A') player.setPlayerA(track);
          if (playerId === 'B') player.setPlayerB(track);

          void syncDualPlayer('load_to_player', { track, playerId });
        }}
        playerA={player.playerA}
        playerB={player.playerB}
        isPlayingA={player.isPlayingA}
        isPlayingB={player.isPlayingB}
        isLocalAudioMuted={rjStudio.isLocalAudioMuted}
        onToggleLocalAudioMuted={() => {
          useAppStore.getState().updateRjStudioState({ isLocalAudioMuted: !rjStudio.isLocalAudioMuted });
        }}
        activePlayer={player.activePlayer}
        crossfadeValue={player.crossfadeValue}
        isCrossfading={player.isCrossfading}
        onCrossfade={player.animateCrossfade}
        onPlayUrlInPlayer={(playerId) => player.playStandbyTrack(playerId)}
        onPauseActive={player.pauseActiveTrack}
        onTogglePlayActive={player.togglePlayActive}
        onStopActive={player.stopActiveTrack}
        onSwitchAtoB={player.switchAtoB}
        onClearDeck={player.clearDeck}
        onPauseStandby={player.pauseStandby}
        onStopStandby={player.stopStandby}
        allMics={micSystem.allMics}
        availableDevices={micSystem.availableDevices}
        onToggleMicActive={micSystem.toggleMicActive}
        onToggleMicMute={micSystem.toggleMicMute}
        onRemoveMic={micSystem.removeExtraMic}
        onUpdateMicDevice={micSystem.updateMicDevice}
        onAddMic={async (name: string) => {
          micSystem.setNewMicName(name);
          return micSystem.addNewMic();
        }}
        nowPlaying={{
          localCurrentTrack,
          currentMood,
          playlistLength: playlist.playlist.length,
          isPlaylistActive: playlist.isPlaylistActive,
          onOpenPlaylist: () => playlist.setShowPlaylistModal(true),
        }}
        playlist={{
          showPlaylistModal: playlist.showPlaylistModal,
          playlist: playlist.playlist.map((track) => ({
            ...track,
            bpm: track.bpm || 0,
          })),
          uploadedLocalFiles: (playlist.uploadedLocalFiles || []).map((file) => ({
            id: file.id,
            name: file.name,
            duration: file.duration,
          })),
          playlistDuration: playlist.playlistDuration,
          customDuration: playlist.customDuration,
          timerRemaining: playlist.timerRemaining,
          isPlaylistActive: playlist.isPlaylistActive,
          isPlaylistPaused: playlist.isPlaylistPaused,
          monitorData: playlist.monitorData,
          currentPlaylistIndex: playlist.currentPlaylistIndex,
          isSongInPlaylist: playlist.isSongInPlaylist,
          isListening,
          onListenToggle: handleListenToggle,
          onClosePlaylist: () => playlist.setShowPlaylistModal(false),
          onAddLocalFile: playlist.addLocalFileToPlaylist,
          onUploadAndAddLocalFile: playlist.uploadAndAddLocalFile,
          onClearPlaylist: playlist.clearPlaylist,
          onRemoveSong: playlist.removeFromPlaylist,
          onPausePlaylist: playlist.pausePlaylist,
          onResumePlaylist: playlist.resumePlaylist,
          onStopPlaylist: playlist.stopPlaylist,
          onSkipToNext: playlist.skipToNext,
          onStartPlaylist: playlist.startPlaylist,
          onSetDuration: (dur) => {
            playlist.setPlaylistDuration(dur);
            playlist.setCustomDuration('');
          },
          onSetCustomDuration: playlist.handleSetCustomDuration,
          formatTimer: playlist.formatTimer,
        }}
        chat={{
          chatMessages: chat.messages,
          filteredChatMessages: chat.filteredMessages,
          chatNewMessage: chat.newMessage,
          chatReplyTo: chat.replyTo,
          bannedUsers: chat.bannedUsers,
          showBanList: chat.showBanList,
          showEmojiPicker: chat.showEmojiPicker,
          activeEmojiCategory: chat.activeEmojiCategory,
          flatListRef: chat.flatListRef,
          isAtBottom: chat.isAtBottom,
          typingUsers: chat.typingUsers,
          pinnedMessage: chat.pinnedMessage,
          onSendChatMessage: chat.handleSendMessage,
          onChatMessageChange: chat.setNewMessage,
          onLikeChatMessage: chat.handleLikeMessage,
          onReplyChat: chat.handleReply,
          onShareMessage: () => {},
          onBanUser: chat.banUser,
          onRestrictUser: chat.restrictUser,
          onUnbanUser: chat.unbanUser,
          onClearChat: chat.clearChat,
          onPinMessage: chat.pinMessage,
          onToggleEmojiPicker: () => chat.setShowEmojiPicker(!chat.showEmojiPicker),
          onAddEmoji: chat.addEmoji,
          onSetActiveEmojiCategory: chat.setActiveEmojiCategory,
          onCancelReply: () => chat.setReplyTo(null),
          onOpenGiftModal: () => chat.setShowGiftModal(true),
          onOpenStickerModal: () => chat.setShowStickerModal(true),
          onToggleBanList: () => chat.setShowBanList(!chat.showBanList),
          onChatScroll: chat.handleScroll,
        }}
        giftSticker={{
          showGiftModal: chat.showGiftModal,
          showStickerModal: chat.showStickerModal,
          onCloseGiftModal: () => chat.setShowGiftModal(false),
          onCloseStickerModal: () => chat.setShowStickerModal(false),
          onSendGift: (gift) => {
            const text = `${gift.emoji} Sent ${gift.label} to everyone!`;
            const sid = studioId ? String(studioId) : rjBackend.getStudioId();
            if (rjBackend.isEnabled() && sid) {
              chatSocket.sendGift(sid, gift.id, 'RJ');
              void RjApi.sendGift(sid, { username: 'RJ', giftId: gift.id, giftLabel: gift.label }).catch(() => {});
            }
            const giftMsg: Message = {
              id: Date.now(),
              user: 'RJ',
              text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              system: false,
              likeCount: 0,
              isLiked: false,
              avatar: 'R',
              isVIP: true,
              giftAmount: 1,
            };
            chat.setMessages((prev: Message[]) => [...prev, giftMsg]);
            notifications.addNotification('system', `🎁 RJ sent ${gift.label} to everyone!`);
            setTimeout(() => chat.flatListRef.current?.scrollToEnd({ animated: true }), 100);
          },
          onSendSticker: (sticker) => {
            const text = sticker.emoji.repeat(3);
            const sid = studioId ? String(studioId) : rjBackend.getStudioId();
            if (rjBackend.isEnabled() && sid) {
              chatSocket.sendSticker(sid, sticker.name, 'RJ');
              void RjApi.sendEmoji(sid, {
                username: 'RJ',
                emojiId: sticker.name.toLowerCase().replace(/\s+/g, '-'),
                emoji: sticker.emoji,
                label: sticker.name,
              }).catch(() => {});
            }
            const stickerMsg: Message = {
              id: Date.now(),
              user: 'RJ',
              text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              system: false,
              likeCount: 0,
              isLiked: false,
              avatar: 'R',
              isVIP: true,
            };
            chat.setMessages((prev: Message[]) => [...prev, stickerMsg]);
            notifications.addNotification('system', `🎨 RJ sent a ${sticker.name} sticker!`);
            setTimeout(() => chat.flatListRef.current?.scrollToEnd({ animated: true }), 100);
          },
        }}
      />
    </View>
  );
};

export default RJStudio;
