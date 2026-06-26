// features/podcast/PodcastUpload.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useAppStore';

// Import sections
import PodcastAudioDeck from './sections/PodcastAudioDeck';
import { PodcastLiveChat } from './sections/PodcastLiveChat';
import PodcastPlaylistModal, { PodcastPlaylistTrack } from './sections/PodcastPlaylistModal';
import PlayerAudioFXPanel from './sections/PlayerAudioFXPanel';
import { PodcastStatsRow, PodcastActionButtons } from './sections/Podcastsession';
import EpisodeNotes from './sections/EpisodeNotes';
import RemoteGuestsPanel from './sections/RemoteGuestsPanel';

import { EpisodeManager } from './sections/EpisodeManager';
import { LiveSetupModal } from './modals/LiveSetupModal';

// Import modals
import NotificationsModal from '../../components/modals/NotificationsModal';
import SettingsModal from '../../components/modals/SettingsModal';
import PodcastProfileModal from './modals/PodcastProfileModal';

// Import hooks
import { useRecording } from './hooks/useRecording';
import { useLiveStream } from './hooks/useLiveStream';
import { usePodcastSocket } from './hooks/usePodcastSocket';
import { usePeerConnections } from './hooks/usePeerConnections';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// ─── Theme colors ──────────────────────────────────────────────────────────────
const lightTheme = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  accent: "#4F6AF0",
  accentPurple: "#7C3AED",
};

const darkTheme = {
  background: "#000000",
  surface: "#1E293B",
  card: "#1E293B",
  cardBorder: "#334155",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  accent: "#6B8EFF",
  accentPurple: "#7C3AED",
};

const lightGradients = {
  primary: ["#4F6AF0", "#6B8EFF"] as const,
};

const darkGradients = {
  primary: ["#4F6AF0", "#6B8EFF"] as const,
};

interface LocalFileItem {
  id: string;
  name: string;
  duration: string;
  uri?: string;
}

interface LiveStats {
  listeners: number;
  bitrate: number;
  storageGB: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'live' | 'song' | 'system' | 'report' | 'ban';
}

function SignalBars({ isLive, bars, colors }: { isLive: boolean; bars: number; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginLeft: 4 }}>
      {[1, 2, 3, 4].map(i => {
        const active = isLive && i <= bars;
        return (
          <View
            key={i}
            style={{
              width: 3,
              height: 4 + i * 3,
              borderRadius: 1,
              backgroundColor: active ? colors.success : colors.cardBorder,
            }}
          />
        );
      })}
    </View>
  );
}

function StatsBar({ isLive, stats, colors }: { isLive: boolean; stats: LiveStats; colors: any }) {
  const Sep = () => (
    <View style={{ width: 1, height: 14, backgroundColor: colors.cardBorder, marginHorizontal: 8 }} />
  );

  const LabelValue = ({
    label,
    value,
    valueColor,
    icon,
  }: {
    label: string;
    value: string;
    valueColor?: string;
    icon?: React.ReactNode;
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {icon}
      <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: valueColor ?? colors.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        paddingHorizontal: 14,
        paddingVertical: 9,
        marginTop: 8,
        marginBottom: 12,
        gap: 4,
      }}
    >
      {isLive && (
        <>
          <LabelValue
            label="Listeners"
            value={stats.listeners >= 1000 ? `${(stats.listeners / 1000).toFixed(1)}K` : `${stats.listeners}`}
            icon={<Feather name="users" size={13} color={colors.textSecondary} />}
          />
          <Sep />
          <LabelValue label="Bitrate" value={`${stats.bitrate} kbps`} />
          <Sep />
          <LabelValue label="Storage" value={`${stats.storageGB.toFixed(1)} GB`} />
          <Sep />
        </>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Status</Text>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isLive ? colors.success : colors.textMuted,
          }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: isLive ? colors.success : colors.textMuted,
          }}
        >
          {isLive ? 'Connected' : 'Server Offline'}
        </Text>
      </View>
      <SignalBars isLive={isLive} bars={4} colors={colors} />
    </View>
  );
}

export default function PodcastUpload({ navigation, view = 'studio' }: any) {
  const { user, logout } = useAuth();
  const { podcast, profileDarkMode, setProfileDarkMode, addPodcastEpisode, removePodcastEpisode } = useAppStore();

  const userName = user?.name || 'Operator';
  const userEmail = user?.email || 'operator@melodymeet.com';
  const userAvatar = userName?.charAt(0).toUpperCase() || 'O';

  // ─── Theme State ──────────────────────────────────────────────────────────
  const isDarkMode = profileDarkMode;
  const colors = isDarkMode ? darkTheme : lightTheme;
  const gradients = isDarkMode ? darkGradients : lightGradients;

  const [uploadedLocalFiles, setUploadedLocalFiles] = useState<LocalFileItem[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<PodcastPlaylistTrack[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);

  const handleAddLocalFile = (file: LocalFileItem) => setUploadedLocalFiles(p => [...p, file]);
  const handleAddTrack = (track: PodcastPlaylistTrack) => setPlaylistTracks(p => [...p, track]);
  const handleRemoveTrackOrFile = (id: number) => {
    setPlaylistTracks(p => p.filter(t => t.id !== id));
    setUploadedLocalFiles(p => p.filter(f => parseInt(f.id, 10) !== id));
    if (currentTrackId === id) setCurrentTrackId(null);
  };
  const handleClearAllTracks = () => {
    setPlaylistTracks([]);
    setUploadedLocalFiles([]);
    setCurrentTrackId(null);
  };

  const recordingHook = useRecording();
  const {
    isRecording,
    recordingSeconds,
    recordings,
    mics,
    toggleMute,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    deleteRecording,
  } = recordingHook;

  // ─── Live Stream Hook ──────────────────────────────────────────────────────
  const liveStreamHook = useLiveStream();
  const {
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
  } = liveStreamHook;

  const { applyVolume: peerApplyVolume, applyMute: peerApplyMute, closePeer } = usePeerConnections({
    isLive,
    roomLink,
    hostStream: (liveStreamHook as any).mediaStream ?? null,
  });

  // ─── Episode Manager State ──────────────────────────────────────────────
  const [showEpisodeManager, setShowEpisodeManager] = useState(false);

  const podcasts = podcast.podcastEpisodes || [];

  // ─── Episode Handlers ──────────────────────────────────────────────────
  const handlePublishEpisode = (episodeData: any) => {
    console.log('📢 Publishing episode:', episodeData);
    addPodcastEpisode(episodeData);
    Alert.alert('Success', 'Episode published successfully!');
    setShowEpisodeManager(false);
  };

  const handleSaveDraft = (episodeData: any) => {
    console.log('💾 Saving draft:', episodeData);
    addPodcastEpisode(episodeData);
    Alert.alert('Success', 'Draft saved successfully!');
    setShowEpisodeManager(false);
  };

  const handleDeleteEpisode = (id: number) => {
    Alert.alert(
      'Delete Episode',
      'Are you sure you want to delete this episode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removePodcastEpisode(id),
        },
      ]
    );
  };

  const { liveChatMessages, liveChatInput, setLiveChatInput, sendHostChatMessage, clearLiveChat } = usePodcastSocket({
    isLive,
    roomLink,
    userName,
  });

  const [liveStats, setLiveStats] = useState<LiveStats>({
    listeners: 2800,
    bitrate: 192,
    storageGB: 12.4,
  });

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        listeners: Math.max(0, prev.listeners + Math.floor(Math.random() * 21) - 10),
        bitrate: [128, 192, 256, 320][Math.floor(Math.random() * 4)],
        storageGB: Math.round((prev.storageGB + 0.1) * 10) / 10,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const formatLiveDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── Podcast Session State ──────────────────────────────────────────────────
  const [chapters, setChapters] = useState<{ time: string; label: string }[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"recording" | "paused" | "stopped" | "ready">("ready");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setElapsed((prev) => Math.min(prev + 1, 14400));
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (isRecording && recordingSeconds > 0) {
      setElapsed(recordingSeconds);
    }
  }, [recordingSeconds, isRecording]);

  const handleStartRecording = () => {
    setElapsed(0);
    setChapters([]);
    setSegments([]);
    setIsPaused(false);
    setSessionStatus("recording");
    startRecording();
  };

  const handlePauseResume = () => {
    if (isRecording) {
      setIsPaused(true);
      setSessionStatus("paused");
      pauseRecording();
    } else if (isPaused) {
      setIsPaused(false);
      setSessionStatus("recording");
      resumeRecording();
    }
  };

  const handleStop = () => {
    setIsPaused(false);
    setSessionStatus("stopped");
    stopRecording();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleSaveRecording = () => {
    if (elapsed === 0) return;
    const finalDuration = formatLiveDuration(elapsed);
    const mockSize = `${((elapsed * 320) / 8 / 1024).toFixed(1)} MB`;
    const finalRecording = {
      id: Date.now(),
      name: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}_${formatLiveDuration(elapsed).replace(/:/g, '')}`,
      duration: finalDuration,
      size: mockSize,
      chapters: [...chapters],
      segments: [...segments],
      timestamp: Date.now()
    };
    // Pass to your store if needed
    setElapsed(0);
    setChapters([]);
    setSegments([]);
    setIsPaused(false);
    setSessionStatus("ready");
  };

  const handleMarkSegment = () => {
    if (sessionStatus !== "recording" && sessionStatus !== "paused") return;
    const time = formatLiveDuration(elapsed);
    setSegments((prev) => [...prev, time]);
  };

  const handleAddChapter = () => {
    if (sessionStatus !== "recording" && sessionStatus !== "paused") return;
    const time = formatLiveDuration(elapsed);
    const label = `Chapter ${chapters.length + 1}`;
    setChapters((prev) => [...prev, { time, label }]);
  };

  // ─── Notifications State ──────────────────────────────────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([
    { id: '1', title: 'Live Stream Started', message: 'You started a live stream on Channel 1', time: '2 min ago', read: false, type: 'live' },
    { id: '2', title: 'New Listener Joined', message: 'MusicFan123 joined your live stream', time: '10 min ago', read: true, type: 'system' },
    { id: '3', title: 'Episode Published', message: 'Your podcast "Morning Beats" is live', time: '1 hour ago', read: false, type: 'system' },
  ]);
  const [unreadCount, setUnreadCount] = useState(notificationsList.filter(n => !n.read).length);

  // ─── Settings State ────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [streamQuality, setStreamQuality] = useState('Auto');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ─── Profile State ────────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);

  // ─── Notification Handlers ────────────────────────────────────────────
  const markAsRead = (id: string) => {
    setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotificationsList([]);
  };

  const addNotification = (notifTitle: string, message: string, type: NotificationItem['type']) => {
    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      title: notifTitle,
      message,
      time: 'Just now',
      read: false,
      type,
    };
    setNotificationsList((prev) => [newNotification, ...prev]);
  };

  // ─── Settings Handlers ────────────────────────────────────────────────
  const handleDarkModeChange = (value: boolean) => {
    setProfileDarkMode(value);
    addNotification('Theme Changed', `Switched to ${value ? 'dark' : 'light'} mode`, 'system');
  };

  const handleHelpSupport = () => {
    Alert.alert('Help & Support', 'Contact: support@melodymeet.com\n\nVersion: 1.0.0');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation?.replace('/(auth)/login');
          }
        }
      ]
    );
  };



  const C = colors;

  // ─── Render Episode Manager View ──────────────────────────────────────────
  if (view === 'manager') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}>
        <EpisodeManager
          visible={true}
          onClose={() => navigation?.navigate('Podcast')}
          recordings={recordings}
          podcasts={podcasts}
          onDeleteRecording={deleteRecording}
          onTrimRecording={(rec) => console.log('✂️ Trim recording:', rec)}
          onUseRecording={(rec) => console.log('📱 Use recording:', rec)}
          onDeletePodcast={handleDeleteEpisode}
          onPlayEpisode={(ep) => console.log('▶️ Play episode:', ep.title)}
          onPublishEpisode={handlePublishEpisode}
          onSaveDraft={handleSaveDraft}
          colors={colors}
          gradients={gradients}
          isDarkMode={isDarkMode}
        />
      </ScrollView>
    );
  }

  // ─── Render Studio View ──────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: Platform.OS === 'ios' ? 50 : 40 }}>
      <ScrollView
        style={{ paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 40 : 120 }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>Podcast Studio</Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                Live recording, guest connection, and studio controls
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => handleDarkModeChange(!profileDarkMode)}
                style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: isDarkMode ? "#334155" : "#E2E8F0", justifyContent: 'center', alignItems: 'center' }}
              >
                <Feather name={isDarkMode ? 'sun' : 'moon'} size={17} color={isDarkMode ? "#94A3B8" : "#475569"} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: isDarkMode ? "#334155" : "#E2E8F0", justifyContent: 'center', alignItems: 'center' }}
              >
                <Feather name="settings" size={17} color={isDarkMode ? "#94A3B8" : "#475569"} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowNotifications(true)}
                style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: isDarkMode ? "#334155" : "#E2E8F0", justifyContent: 'center', alignItems: 'center', position: 'relative' }}
              >
                <Feather name="bell" size={17} color={isDarkMode ? "#94A3B8" : "#475569"} />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: C.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowProfile(true)}
                style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: isDarkMode ? "#334155" : "#E2E8F0", justifyContent: 'center', alignItems: 'center' }}
              >
                <Feather name="user" size={17} color={isDarkMode ? "#94A3B8" : "#475569"} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: "#DC2626", justifyContent: 'center', alignItems: 'center' }}
              >
                <Feather name="log-out" size={17} color="#DC2626" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={isLive ? stopLiveStream : startLiveSetup}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: isLive ? C.danger : '#16A34A',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#FFF',
                  opacity: isLive ? 1 : 0.8,
                }} />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#FFF',
                }}>
                  {isLive ? 'STOP LIVE' : 'GO LIVE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Live Banner ─────────────────────────────────────────── */}
        {isLive && (
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignSelf: 'flex-start',
            gap: 10, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14,
            borderRadius: 99, backgroundColor: C.text,
          }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.background }}>ON AIR</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.background, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
              {formatLiveDuration(liveSeconds)}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.background }}>Listeners: {liveViewers}</Text>
            <TouchableOpacity onPress={shareLiveLink} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, backgroundColor: `${C.background}40` }}>
              <Feather name="share-2" size={14} color={C.background} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Split Grid Columns ──────────────────────────────────── */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 16 }}>

          {/* LEFT COLUMN */}
          <View style={{ flex: isMobile ? 1 : 2.5 }}>
            <View style={{ marginBottom: 16 }}>
              <PodcastStatsRow 
                isLive={isLive} 
                liveViewers={liveViewers} 
                status={sessionStatus} 
                elapsed={elapsed} 
              />
              <View style={{ marginTop: 16 }}>
                <PodcastAudioDeck />
              </View>
              <View style={{ marginTop: 16 }}>
                <RemoteGuestsPanel
                  roomId={roomLink ? roomLink.match(/roomId=([A-Z0-9]+)/i)?.[1] : undefined}
                  baseJoinUrl={
                    typeof window !== 'undefined' && window?.location?.origin
                      ? `${window.location.origin}/podcast/guest`
                      : 'http://localhost:8081/podcast/guest'
                  }
                  onGenerateLink={(seat, url) => console.log(`Generated link for ${seat.name}: ${url}`)}
                  onDisconnect={(seat) => console.log(`Disconnected ${seat.name}`)}
                  onCancelInvite={(seat) => console.log(`Cancelled invite for ${seat.name}`)}
                  onAddGuest={() => console.log('Add guest clicked')}
                />
              </View>
            </View>

          </View>

          {/* RIGHT COLUMN */}
          <View style={{
            flex: isMobile ? 1 : 1,
            maxWidth: isMobile ? '100%' : 360,
            gap: 16
          }}>
            <View>
              <PodcastLiveChat
                isLive={isLive}
                messages={liveChatMessages}
                value={liveChatInput}
                onChangeText={setLiveChatInput}
                onSend={sendHostChatMessage}
                onClearChat={clearLiveChat}
                colors={C}
              />
            </View>

            <View>
              <PodcastPlaylistModal
                playlist={playlistTracks}
                uploadedLocalFiles={uploadedLocalFiles}
                isDarkMode={isDarkMode}
                onAddLocalFile={handleAddLocalFile}
                onClearPlaylist={handleClearAllTracks}
                onRemoveSong={handleRemoveTrackOrFile}
                onAddTrack={handleAddTrack}
                onRemoveTrack={handleRemoveTrackOrFile}
                onUrlSubmit={() => { }}
                onPlayTrack={(track) => setCurrentTrackId(track.id)}
                currentlyPlayingTrackId={currentTrackId}
              />
            </View>

            <View>
              <EpisodeNotes />
            </View>

          </View>

        </View>

        {/* ── RECORDING ACTIONS (Full Width) ─────────────────────── */}
        <View style={{ width: '100%', marginBottom: 16 }}>
          <PodcastActionButtons 
            status={sessionStatus}
            handleStartRecording={handleStartRecording}
            handlePauseResume={handlePauseResume}
            handleStop={handleStop}
            handleSave={handleSaveRecording}
            handleMarkSegment={handleMarkSegment}
            handleAddChapter={handleAddChapter}
            segments={segments}
            chapters={chapters}
          />
        </View>

        {/* ── FULL WIDTH BOTTOM AREA (Audio FX Panel) ────────────── */}
        <View style={{ width: '100%', marginTop: 4 }}>
          <PlayerAudioFXPanel isDarkMode={isDarkMode} colors={C} isLive={isLive} />
        </View>



        {/* ─── LIVE SETUP MODAL ────────────────────────────────────── */}
        <LiveSetupModal
          visible={showLiveSetup}
          liveSetupStep={liveSetupStep}
          micTestComplete={micTestComplete}
          internetTestComplete={internetTestComplete}
          liveTitle={liveTitle}
          liveDescription={liveDescription}
          onTitleChange={setLiveTitle}
          onDescriptionChange={setLiveDescription}
          onTestMicrophone={testMicrophone}
          onTestInternet={testInternetSpeed}
          onProceedToReady={proceedToReady}
          onStartLive={startLiveStream}
          onBackToTest={() => setLiveSetupStep('test')}
          onClose={() => setShowLiveSetup(false)}
          colors={C}
        />

        {/* ─── NOTIFICATIONS MODAL ──────────────────────────────────── */}
        <NotificationsModal
          visible={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notificationsList}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAllNotifications}
          isDarkMode={isDarkMode}
        />

        {/* ─── SETTINGS MODAL ───────────────────────────────────────── */}
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          darkMode={isDarkMode}
          onDarkModeChange={handleDarkModeChange}
          notifications={notificationsEnabled}
          onNotificationsChange={setNotificationsEnabled}
          quality={streamQuality}
          onQualityChange={(value: string) => {
            setStreamQuality(value);
            addNotification('Stream Quality', `Changed to ${value} quality`, 'system');
          }}
          onHelpSupport={handleHelpSupport}
          isDarkMode={isDarkMode}
        />

        {/* ─── PROFILE MODAL ────────────────────────────────────────── */}
        <PodcastProfileModal
          visible={showProfile}
          onClose={() => setShowProfile(false)}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          isDarkMode={isDarkMode}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});