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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useOperator } from '../../context/OperatorContext';
import { useAuth } from '../../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../store/useAppStore';

// Import modals
import NotificationsModal from '../../components/modals/NotificationsModal';
import PodcastProfileModal from './modals/PodcastProfileModal';
import SettingsModal from '../../components/modals/SettingsModal';

// Import hooks
import { useRecording } from './hooks/useRecording';
import { useLiveStream } from './hooks/useLiveStream';
import { usePodcastBootstrap } from './hooks/usePodcastBootstrap';
import { usePodcastSocket } from './hooks/usePodcastSocket';
import { usePeerConnections } from './hooks/usePeerConnections';
import { PodcastApi, getFileUrl } from '../../services/api/operatorApi';


// Import sections
import { EpisodeDetails } from './sections/EpisodeDetails';
import { EpisodesList } from './sections/EpisodesList';
import { MusicPlayer } from './sections/MusicPlayer';
import { PodcastLiveChat } from './sections/PodcastLiveChat';
import EpisodeHub from './EpisodeHub';
import { PodcastAudioDeck } from './sections/PodcastAudioDeck';
import { PodcastAnalytics } from './sections/PodcastAnalytics';

// Import modals
import { LiveSetupModal } from './modals/LiveSetupModal';
import { TrimModal } from './modals/TrimModal';

// Import types
import { Podcast, Recording } from './types';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// Notification type
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'live' | 'song' | 'system' | 'report' | 'ban';
}

// ─── Theme colors aligned with MelodyMeet design system ──────────────────────
const lightTheme = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  success: "#059669",
  warning: "#D97706",
  accent: "#4F6AF0",
};

const darkTheme = {
  background: "#0F172A",
  surface: "#1E293B",
  card: "#1E293B",
  cardBorder: "#334155",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  success: "#10B981",
  warning: "#F59E0B",
  accent: "#6B8EFF",
};

const lightGradients = {
  primary: ["#4F6AF0", "#6B8EFF"] as const,
};

const darkGradients = {
  primary: ["#4F6AF0", "#6B8EFF"] as const,
};

export default function PodcastUpload({ navigation }: any) {
  const { addPodcast } = useOperator();
  const { logout, user } = useAuth();
  
  // ===== ZUSTAND STORE =====
  const {
    // Podcast state
    podcast,
    updatePodcastState,
    addPodcastEpisode,
    removePodcastEpisode,
    addRecording,
    updateRecording,
    removeRecording,
    clearRecordings,
    addTrimRange,
    removeTrimRange,
    clearTrimRanges,
    // Profile state (for dark mode sync)
    profileDarkMode,
    setProfileDarkMode,
    // Dashboard state (for notifications sync)
    addDashboardNotification,
  } = useAppStore();

  // Local UI state (doesn't need persistence)
  const [isDarkMode, setIsDarkMode] = useState(profileDarkMode);
  const colors = isDarkMode ? darkTheme : lightTheme;
  const gradients = isDarkMode ? darkGradients : lightGradients;

  // User info
  const userName = user?.name || 'Operator';
  const userEmail = user?.email || 'operator@melodymeet.com';
  const userAvatar = userName?.charAt(0).toUpperCase() || 'O';

  // Recording hook (now uses store internally)
  const recordingHook = useRecording();
  const {
    isRecording,
    recordingSeconds,
    recordings,
    mics,
    toggleMute,
    startRecording,
    stopRecording,
    deleteRecording,
  } = recordingHook;

  // Live stream hook
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

  usePodcastBootstrap();

  // Phase 3 — WebRTC peer connections (host ↔ guests).
  // Manages one RTCPeerConnection per connected guest slot.
  // Reads pendingWebRtcSignal from store (set by usePodcastSocket).
  // hostStream is the operator's mic MediaStream from useLiveStream.
  // On mobile or when audio is unavailable, hostStream is null — hook is a no-op.
  const { applyVolume: peerApplyVolume, applyMute: peerApplyMute, closePeer } = usePeerConnections({
    isLive,
    roomLink,
    hostStream: (liveStreamHook as any).mediaStream ?? null,
  });

  // ===== EPISODE FORM STATE (from store) =====
  const title = podcast.episodeTitle;
  const setTitle = (value: string) => updatePodcastState({ episodeTitle: value });
  
  const description = podcast.episodeDescription;
  const setDescription = (value: string) => updatePodcastState({ episodeDescription: value });

  const genre = podcast.episodeGenre;
  const setGenre = (value: string) => updatePodcastState({ episodeGenre: value });

  const seasonNumber = podcast.episodeSeasonNumber;
  const setSeasonNumber = (value: string) => updatePodcastState({ episodeSeasonNumber: value });

  const episodeNumber = podcast.episodeNumber;
  const setEpisodeNumber = (value: string) => updatePodcastState({ episodeNumber: value });

  const coverArt = podcast.episodeCoverArt;
  const setCoverArt = (value: string) => updatePodcastState({ episodeCoverArt: value });
  
  const fileName = podcast.episodeFileName;
  const setFileName = (value: string) => updatePodcastState({ episodeFileName: value });
  
  const fileSize = podcast.episodeFileSize;
  const setFileSize = (value: string) => updatePodcastState({ episodeFileSize: value });
  
  const scheduleDisplay = podcast.episodeScheduleDisplay;
  const setScheduleDisplay = (value: string) => updatePodcastState({ episodeScheduleDisplay: value });
  
  const podcasts = podcast.podcastEpisodes;

  // Local UI state (not persisted)
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<any>(null);
  
  // Episode Hub navigation
  const [showEpisodeHub, setShowEpisodeHub] = useState(false);
  
  // Episode playback state
  const [playingEpisodeId, setPlayingEpisodeId] = useState<number | string | null>(null);
  const episodeAudioRef = useRef<any>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<number | null>(null);
  const recordingAudioRef = useRef<any>(null);

  // ===== TRIM STATE (from store) =====
  const trimModalVisible = podcast.trimModalVisible;
  const setTrimModalVisible = (value: boolean) => updatePodcastState({ trimModalVisible: value });
  const currentRecording = podcast.currentRecordingForTrim;
  const setCurrentRecording = (value: Recording | null) => updatePodcastState({ currentRecordingForTrim: value });
  const trimRanges = podcast.trimRanges;
  const setTrimRanges = (fn: any) => {
    // Use addTrimRange/removeTrimRange instead
  };
  const currentRangeStart = podcast.currentRangeStart;
  const setCurrentRangeStart = (value: number) => updatePodcastState({ currentRangeStart: value });
  const currentRangeEnd = podcast.currentRangeEnd;
  const setCurrentRangeEnd = (value: number) => updatePodcastState({ currentRangeEnd: value });
  const trimFileName = podcast.trimFileName;
  const setTrimFileName = (value: string) => updatePodcastState({ trimFileName: value });
  const trimPreviewDuration = podcast.trimPreviewDuration;
  const setTrimPreviewDuration = (value: string) => updatePodcastState({ trimPreviewDuration: value });
  const trimSaveSuccess = podcast.trimSaveSuccess;
  const setTrimSaveSuccess = (value: boolean) => updatePodcastState({ trimSaveSuccess: value });
  const previewPlaying = podcast.previewPlaying;
  const setPreviewPlaying = (value: boolean) => updatePodcastState({ previewPlaying: value });
  // Ref to the HTML5/Expo Audio instance used for trim preview
  const audioPreviewRef = useRef<any>(null);
  const previewIntervalRef = useRef<any>(null);
  const activeTrimTab = podcast.activeTrimTab;
  const setActiveTrimTab = (value: 'simple' | 'advanced') => updatePodcastState({ activeTrimTab: value });
  const waveformData = podcast.waveformData;
  const setWaveformData = (value: number[]) => updatePodcastState({ waveformData: value });
  const originalDurationSecs = podcast.originalDurationSecs;
  const setOriginalDurationSecs = (value: number) => updatePodcastState({ originalDurationSecs: value });
  const recordingToTrim = podcast.currentRecordingForTrim;
  const setRecordingToTrim = (value: Recording | null) => updatePodcastState({ currentRecordingForTrim: value });

  // ===== SETTINGS STATE =====
  const [streamQuality, setStreamQuality] = useState('Auto');
  // notificationsEnabled — hardcoded true; wired to SettingsModal prop.
  // Not a useState because no actual notification toggle logic exists yet.
  // TODO (review): wire to a real preference or remove if SettingsModal drops the prop.
  const notificationsEnabled = true;
  const setNotificationsEnabled = (_: boolean) => {};

  // ===== NOTIFICATIONS STATE =====
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([
    { id: '1', title: 'Live Stream Started', message: 'You started a live stream on Channel 1', time: '2 min ago', read: false, type: 'live' },
    { id: '2', title: 'Song Changed', message: 'Now Playing: STARGAZING - Kygo', time: '5 min ago', read: false, type: 'song' },
    { id: '3', title: 'New Listener Joined', message: 'MusicFan123 joined your live stream', time: '10 min ago', read: true, type: 'system' },
    { id: '4', title: 'Episode Published', message: 'Your podcast "Morning Beats" is live', time: '1 hour ago', read: false, type: 'system' },
  ]);
  const [unreadCount, setUnreadCount] = useState(notificationsList.filter(n => !n.read).length);

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
    addDashboardNotification({
      title: notifTitle,
      message,
      time: 'Just now',
      read: false,
    });
  };

  const {
    liveChatMessages,
    liveChatInput,
    setLiveChatInput,
    sendHostChatMessage,
  } = usePodcastSocket({
    isLive,
    roomLink,
    userName,
  });

  // ===== CALENDAR STATE =====
  const showCalendar = podcast.showCalendar;
  const setShowCalendar = (value: boolean) => updatePodcastState({ showCalendar: value });
  const selectedDay = podcast.selectedDay;
  const setSelectedDay = (value: number | null) => updatePodcastState({ selectedDay: value });
  const selectedHour = podcast.selectedHour;
  const setSelectedHour = (value: string | null) => updatePodcastState({ selectedHour: value });
  const selectedMinute = podcast.selectedMinute;
  const setSelectedMinute = (value: string | null) => updatePodcastState({ selectedMinute: value });
  const calendarMonth = podcast.calendarMonth;
  const setCalendarMonth = (value: Date) => updatePodcastState({ calendarMonth: value });
  
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Sync dark mode with store
  useEffect(() => {
    setIsDarkMode(profileDarkMode);
  }, [profileDarkMode]);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notificationsList.filter(n => !n.read).length);
  }, [notificationsList]);

  // Generate waveform for trim modal
  useEffect(() => {
    const randomWaveform = Array.from({ length: 60 }, () => Math.floor(Math.random() * 60) + 20);
    setWaveformData(randomWaveform);
  }, [trimModalVisible]);

  // Cleanup audio preview on modal close
  useEffect(() => {
    if (!trimModalVisible) {
      stopPreview();
    }
  }, [trimModalVisible]);

  useEffect(() => {
  if (originalDurationSecs > 0) {
    let totalRemoved = 0;
    trimRanges.forEach(range => {
      totalRemoved += (range.end - range.start);
    });
    const keptPercentage = Math.max(0, 100 - totalRemoved);
    const newDurationSeconds = (keptPercentage / 100) * originalDurationSecs;
    const mins = Math.floor(newDurationSeconds / 60);
    const secs = Math.floor(newDurationSeconds % 60);
    setTrimPreviewDuration(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
  }
}, [trimRanges, originalDurationSecs]);

  // Notification handlers
  const markAsRead = (id: string) => {
    setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotificationsList([]);
  };

  // Settings handlers
  const handleDarkModeChange = (value: boolean) => {
    setIsDarkMode(value);
    setProfileDarkMode(value);
    addNotification('Theme Changed', `Switched to ${value ? 'dark' : 'light'} mode`, 'system');
  };

  const handleHelpSupport = () => {
    Alert.alert('Help & Support', 'Contact: support@melodymeet.com\n\nVersion: 1.0.0');
  };

  // handleLogout — REVIEW REQUIRED
  // Defined here but PodcastProfileModal does not currently expose an onLogout prop.
  // Keep until profile modal is updated to include a logout button, or remove if confirmed unused.
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

  // Save episode to podcasts
  const saveEpisode = async (statusType: string) => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an episode title");
      return false;
    }
    if (!fileName) {
      Alert.alert("Error", "Please select an audio file");
      return false;
    }
    
    try {
      // Check if selectedFile is a server recording or a local file
      const isRemoteRecording = Boolean(selectedFile?.uri && selectedFile.uri.startsWith('/uploads/'));
      
      let createdPodcast: any = null;
      let uploadedCoverArt: string | null = coverArt || null;

      const appendCoverArt = (formData: FormData) => {
        if (selectedCoverFile) {
          if (Platform.OS === 'web' && typeof File !== 'undefined' && selectedCoverFile instanceof File) {
            formData.append('coverArt', selectedCoverFile);
          } else {
            formData.append('coverArt', {
              uri: selectedCoverFile.uri,
              name: selectedCoverFile.name || selectedCoverFile.fileName || 'episode-cover.jpg',
              type: selectedCoverFile.mimeType || selectedCoverFile.type || 'image/jpeg',
            } as any);
          }
        } else if (uploadedCoverArt) {
          formData.append('coverArt', uploadedCoverArt);
        }
      };

      const uploadCoverForMetadata = async () => {
        if (!selectedCoverFile) return uploadedCoverArt;

        const coverFormData = new FormData();
        appendCoverArt(coverFormData);
        const uploaded = await PodcastApi.uploadCoverArt(coverFormData);
        uploadedCoverArt = uploaded.coverArt;
        return uploadedCoverArt;
      };

      if (selectedFile && !isRemoteRecording) {
        // Local file: use FormData upload
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description || '');
        if (genre) formData.append('genre', genre);
        if (seasonNumber) formData.append('seasonNumber', seasonNumber);
        if (episodeNumber) formData.append('episodeNumber', episodeNumber);
        formData.append('status', statusType);
        if (scheduleDisplay) formData.append('scheduleDate', scheduleDisplay);
        
        // Append file
        if (Platform.OS === 'web' && typeof File !== 'undefined' && selectedFile instanceof File) {
          formData.append('file', selectedFile);
        } else {
          const fileObj = {
            uri: selectedFile.uri,
            name: fileName,
            type: selectedFile.mimeType || 'audio/mpeg'
          };
          formData.append('file', fileObj as any);
        }
        appendCoverArt(formData);
        
        createdPodcast = await PodcastApi.upload(formData);
      } else {
        uploadedCoverArt = await uploadCoverForMetadata();
        // Server recording or text-only podcast: create metadata directly
        createdPodcast = await PodcastApi.create({
          title,
          description,
          genre,
          seasonNumber: seasonNumber ? Number(seasonNumber) : null,
          episodeNumber: episodeNumber ? Number(episodeNumber) : null,
          status: statusType as any,
          scheduleDate: scheduleDisplay || null,
          fileName: fileName,
          fileUrl: selectedFile?.uri,
          fileSize: fileSize || undefined,
          coverArt: uploadedCoverArt || undefined,
          source: isRemoteRecording ? 'recording' : 'metadata'
        });
      }
      
      // Use backend data if available, fallback to local state
      const newPodcast: Podcast = {
        id: createdPodcast?.id || Date.now(),
        title: createdPodcast?.title || title,
        description: createdPodcast?.description || description,
        genre: createdPodcast?.genre || genre,
        seasonNumber: createdPodcast?.seasonNumber ?? (seasonNumber ? Number(seasonNumber) : null),
        episodeNumber: createdPodcast?.episodeNumber ?? (episodeNumber ? Number(episodeNumber) : null),
        coverArt: createdPodcast?.coverArt || uploadedCoverArt || null,
        fileName: createdPodcast?.fileName || fileName,
        fileUrl: createdPodcast?.fileUrl || selectedFile?.uri,
        fileSize: createdPodcast?.fileSize || fileSize,
        schedule: createdPodcast?.scheduleDate || scheduleDisplay || "Not scheduled",
        status: createdPodcast?.status || statusType as any,
        date: createdPodcast?.date || new Date().toLocaleDateString(),
      };
      
      addPodcastEpisode(newPodcast);
      
      if (addPodcast) {
        addPodcast(newPodcast);
      }
      
      addNotification('Episode Published', `"${title}" has been ${statusType === 'Draft' ? 'saved as draft' : 'published'}`, 'system');
      
      // Reset form
      setTitle("");
      setDescription("");
      setGenre("");
      setSeasonNumber("");
      setEpisodeNumber("");
      setCoverArt("");
      setFileName("");
      setFileSize("");
      setScheduleDisplay("");
      setSelectedFile(null);
      setSelectedCoverFile(null);
      
      Alert.alert("Success", `Episode ${statusType === "Draft" ? "saved as draft" : "published"} successfully!`);
      return true;
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save podcast to backend");
      return false;
    }
  };

  // File picking
  const pickAudioFile = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/mpeg,audio/wav,audio/x-m4a,audio/aac';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          setSelectedFile(file);
          setFileName(file.name);
          const fileSizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : '0';
          setFileSize(`${fileSizeMB} MB`);
          addNotification('File Selected', `${file.name} selected for upload`, 'system');
        }
      };
      input.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const file = result.assets[0];
          setSelectedFile(file);
          setFileName(file.name);
          const fileSizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : '0';
          setFileSize(`${fileSizeMB} MB`);
          addNotification('File Selected', `${file.name} selected for upload`, 'system');
        }
      } catch (err) {
        Alert.alert("Error", "Failed to pick file");
      }
    }
  };

  const resetFileSelection = () => {
    setSelectedFile(null);
    setFileName('');
    setFileSize('');
  };

  const pickCoverArt = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setSelectedCoverFile(file);
          setCoverArt(URL.createObjectURL(file));
          addNotification('Thumbnail Selected', `${file.name} selected for this episode`, 'system');
        }
      };
      input.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedCoverFile({
          uri: asset.uri,
          name: asset.fileName || `episode-cover-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        setCoverArt(asset.uri);
        addNotification('Thumbnail Selected', 'Thumbnail selected for this episode', 'system');
      }
    } catch (_) {
      Alert.alert("Error", "Failed to pick thumbnail");
    }
  };

  const resetCoverArt = () => {
    setSelectedCoverFile(null);
    setCoverArt('');
  };

  // ===== TRIM PREVIEW =====
  const stopPreview = () => {
    setPreviewPlaying(false);
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    if (Platform.OS === 'web') {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    }
  };

  const previewTrim = () => {
    if (!currentRecording?.uri) {
      Alert.alert('No Audio', 'This recording has no audio file URL to preview.');
      return;
    }

    stopPreview(); // Stop any existing preview first
    setPreviewPlaying(true);

    if (Platform.OS === 'web') {
      // Web: use HTML5 Audio with timeupdate to skip removed segments
      const resolvedUri = getFileUrl(currentRecording.uri);
      const audio = new Audio(resolvedUri);
      audioPreviewRef.current = audio;

      const totalDur = originalDurationSecs || 1;

      // Build removal time ranges in seconds from percentage-based trimRanges
      const removalRanges =
        activeTrimTab === 'simple'
          ? // Simple trim: everything OUTSIDE [start%, end%] is removed
            [
              ...(currentRangeStart > 0 ? [{ start: 0, end: (currentRangeStart / 100) * totalDur }] : []),
              ...(currentRangeEnd < 100 ? [{ start: (currentRangeEnd / 100) * totalDur, end: totalDur }] : []),
            ]
          : // Advanced: explicitly listed removal ranges
            trimRanges.map((r) => ({
              start: (r.start / 100) * totalDur,
              end: (r.end / 100) * totalDur,
            }));

      audio.ontimeupdate = () => {
        const t = audio.currentTime;
        for (const range of removalRanges) {
          if (t >= range.start && t < range.end) {
            // Jump to end of removed section
            audio.currentTime = range.end;
            break;
          }
        }
      };

      audio.onended = () => stopPreview();
      audio.onerror = () => {
        stopPreview();
        Alert.alert('Preview Error', 'Could not load audio for preview.');
      };

      audio.play().catch(() => {
        stopPreview();
        Alert.alert('Preview Error', 'Browser blocked audio playback. Click the page first.');
      });
    } else {
      // Mobile: Use Expo Audio
      import('expo-av').then(({ Audio: ExpoAudio }) => {
        const resolvedUri = getFileUrl(currentRecording.uri);
        ExpoAudio.Sound.createAsync({ uri: resolvedUri })
          .then(({ sound }) => {
            audioPreviewRef.current = sound;
            const totalDur = originalDurationSecs || 1;

            const removalRanges =
              activeTrimTab === 'simple'
                ? [
                    ...(currentRangeStart > 0 ? [{ start: 0, end: (currentRangeStart / 100) * totalDur }] : []),
                    ...(currentRangeEnd < 100 ? [{ start: (currentRangeEnd / 100) * totalDur, end: totalDur }] : []),
                  ]
                : trimRanges.map((r) => ({
                    start: (r.start / 100) * totalDur,
                    end: (r.end / 100) * totalDur,
                  }));

            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (!status.isLoaded) return;
              if (status.didJustFinish) {
                stopPreview();
                sound.unloadAsync();
                return;
              }
              const currentSec = status.positionMillis / 1000;
              for (const range of removalRanges) {
                if (currentSec >= range.start && currentSec < range.end) {
                  sound.setPositionAsync(range.end * 1000);
                  break;
                }
              }
            });

            sound.playAsync();
          })
          .catch(() => {
            stopPreview();
            Alert.alert('Preview Error', 'Could not load audio for preview.');
          });
      });
    }
  };



  // Episode Playback
  const stopRecordingPlayback = async () => {
    if (!recordingAudioRef.current) return;

    try {
      if (Platform.OS === 'web') {
        recordingAudioRef.current.pause();
      } else {
        await recordingAudioRef.current.stopAsync();
        await recordingAudioRef.current.unloadAsync();
      }
    } catch (_) {}

    recordingAudioRef.current = null;
    setPlayingRecordingId(null);
  };

  const handlePlayRecording = async (recording: Recording) => {
    if (!recording.uri) {
      Alert.alert('Error', 'No audio file found for this recording');
      return;
    }

    if (playingRecordingId === recording.id) {
      await stopRecordingPlayback();
      return;
    }

    await stopRecordingPlayback();

    if (episodeAudioRef.current) {
      try {
        if (Platform.OS === 'web') {
          episodeAudioRef.current.pause();
        } else {
          await episodeAudioRef.current.stopAsync();
          await episodeAudioRef.current.unloadAsync();
        }
      } catch (_) {}
      episodeAudioRef.current = null;
      setPlayingEpisodeId(null);
    }

    setPlayingRecordingId(recording.id);
    const resolvedUri = getFileUrl(recording.uri);

    if (Platform.OS === 'web') {
      const audio = new Audio(resolvedUri);
      recordingAudioRef.current = audio;
      audio.onended = () => {
        recordingAudioRef.current = null;
        setPlayingRecordingId(null);
      };
      audio.onerror = () => {
        recordingAudioRef.current = null;
        setPlayingRecordingId(null);
        Alert.alert('Error', 'Failed to play recording audio');
      };
      audio.play().catch(() => {
        recordingAudioRef.current = null;
        setPlayingRecordingId(null);
        Alert.alert('Error', 'Browser blocked audio playback');
      });
    } else {
      import('expo-av').then(({ Audio: ExpoAudio }) => {
        ExpoAudio.Sound.createAsync({ uri: resolvedUri })
          .then(({ sound }) => {
            recordingAudioRef.current = sound;
            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded && status.didJustFinish) {
                recordingAudioRef.current = null;
                setPlayingRecordingId(null);
                sound.unloadAsync();
              }
            });
            sound.playAsync();
          })
          .catch(() => {
            recordingAudioRef.current = null;
            setPlayingRecordingId(null);
            Alert.alert('Error', 'Failed to play recording audio');
          });
      });
    }
  };

  const handlePlayEpisode = (episode: Podcast) => {
    if (!episode.fileUrl) {
      Alert.alert('Error', 'No audio file found for this episode');
      return;
    }

    if (playingEpisodeId === episode.id) {
      // Toggle pause/stop if clicking play on the same episode
      if (episodeAudioRef.current) {
        if (Platform.OS === 'web') {
          episodeAudioRef.current.pause();
        } else {
          episodeAudioRef.current.stopAsync();
          episodeAudioRef.current.unloadAsync();
        }
        episodeAudioRef.current = null;
      }
      setPlayingEpisodeId(null);
      return;
    }

    stopRecordingPlayback();

    // Stop any currently playing episode
    if (episodeAudioRef.current) {
      if (Platform.OS === 'web') {
        episodeAudioRef.current.pause();
      } else {
        episodeAudioRef.current.stopAsync();
        episodeAudioRef.current.unloadAsync();
      }
      episodeAudioRef.current = null;
    }

    setPlayingEpisodeId(episode.id);
    const resolvedUri = getFileUrl(episode.fileUrl);

    if (Platform.OS === 'web') {
      const audio = new Audio(resolvedUri);
      episodeAudioRef.current = audio;
      audio.onended = () => setPlayingEpisodeId(null);
      audio.onerror = () => {
        setPlayingEpisodeId(null);
        Alert.alert('Error', 'Failed to play episode audio');
      };
      audio.play().catch(() => {
        setPlayingEpisodeId(null);
        Alert.alert('Error', 'Browser blocked audio playback');
      });
    } else {
      import('expo-av').then(({ Audio: ExpoAudio }) => {
        ExpoAudio.Sound.createAsync({ uri: resolvedUri })
          .then(({ sound }) => {
            episodeAudioRef.current = sound;
            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded && status.didJustFinish) {
                setPlayingEpisodeId(null);
                sound.unloadAsync();
              }
            });
            sound.playAsync();
          })
          .catch(() => {
            setPlayingEpisodeId(null);
            Alert.alert('Error', 'Failed to play episode audio');
          });
      });
    }
  };

const openTrimModal = (recording: Recording) => {
  let durationSeconds = 0;
  const parts = recording.duration.split(':');
  
  if (parts.length === 2) {
    // MM:SS format
    durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    // HH:MM:SS format
    durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  
  setOriginalDurationSecs(durationSeconds);
  setCurrentRecording(recording);
  setRecordingToTrim(recording);
  setTrimFileName(recording.name.replace('.mp3', '_trimmed'));
  clearTrimRanges();
  setCurrentRangeStart(0);
  setCurrentRangeEnd(100);
  setTrimSaveSuccess(false);
  setTrimModalVisible(true);
};
  const addTrimRangeHandler = () => {
    if (currentRangeStart >= currentRangeEnd) {
      Alert.alert("Invalid Range", "Start must be less than end");
      return;
    }
    const overlapping = trimRanges.some(range => 
      (currentRangeStart >= range.start && currentRangeStart <= range.end) ||
      (currentRangeEnd >= range.start && currentRangeEnd <= range.end)
    );
    if (overlapping) {
      Alert.alert("Overlap", "This range overlaps with an existing removal section");
      return;
    }
    addTrimRange({ start: currentRangeStart, end: currentRangeEnd });
    setCurrentRangeStart(0);
    setCurrentRangeEnd(100);
  };

  const removeTrimRangeHandler = (index: number) => {
    removeTrimRange(index);
  };

  const clearAllRangesHandler = () => {
    clearTrimRanges();
  };

  const saveTrimmedRecording = async () => {
  if (!recordingToTrim) return;

  // Calculate percentages locally first (for UI preview)
  let totalRemoved = 0;
  trimRanges.forEach(range => { totalRemoved += (range.end - range.start); });
  const keptPercentage = Math.max(0, 100 - totalRemoved);
  const newDurationSeconds = (keptPercentage / 100) * originalDurationSecs;
  const mins = Math.floor(newDurationSeconds / 60);
  const secs = Math.floor(newDurationSeconds % 60);
  const newDuration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const originalSizeMB = parseFloat(recordingToTrim.size) || 5;
  const newSizeMB = ((keptPercentage / 100) * originalSizeMB).toFixed(1);

  // Optimistic: add locally immediately
  let localId = Date.now();
  const newRecording: Recording = {
    id: localId,
    name: `${trimFileName}.mp3`,
    duration: newDuration,
    size: `${newSizeMB} MB`,
    uri: recordingToTrim.uri,
  };
  addRecording(newRecording);
  setTrimSaveSuccess(true);
  addNotification('Audio Trimmed', `"${trimFileName}.mp3" saved (${newDuration})`, 'system');

  // Persist to backend
  try {
    const backendId = typeof recordingToTrim.id === 'number' ? recordingToTrim.id : null;
    if (backendId && trimRanges.length > 0) {
      await PodcastApi.trimRecording(backendId, {
        name: `${trimFileName}.mp3`,
        trimRanges,
      });
    }
  } catch (_) {
    // Backend unavailable — local recording was already added above
  }

  setTimeout(() => {
    setTrimSaveSuccess(false);
    setTrimModalVisible(false);
    Alert.alert('Success', `Recording trimmed to ${newDuration}!`);
  }, 1500);
};

  const handleCopyLink = () => {
    Alert.alert("Success", "Link copied to clipboard!");
    addNotification('Link Copied', 'Room link copied to clipboard', 'system');
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const changeMonth = (increment: number) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCalendarMonth(newMonth);
  };
  const formatMonthYear = (date: Date) => date.toLocaleString("default", { month: "long", year: "numeric" });
  const handleDateSelect = (day: number) => setSelectedDay(day);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(
        <TouchableOpacity
          key={`day-${i}`}
          style={[styles.calendarDay, selectedDay === i && { backgroundColor: colors.text }]}
          onPress={() => handleDateSelect(i)}
        >
          <Text style={[styles.calendarDayText, { color: selectedDay === i ? colors.background : colors.text }]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return days;
  };

  const confirmSchedule = () => {
    if (selectedDay !== null && selectedHour !== null && selectedMinute !== null) {
      const hour = parseInt(selectedHour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const day = selectedDay.toString().padStart(2, "0");
      const month = (calendarMonth.getMonth() + 1).toString().padStart(2, "0");
      const year = calendarMonth.getFullYear();
      const newSchedule = `${day}/${month}/${year} at ${hour12}:${selectedMinute} ${ampm}`;
      setScheduleDisplay(newSchedule);
      setShowCalendar(false);
      addNotification('Schedule Set', `Episode scheduled for ${newSchedule}`, 'system');
    } else {
      Alert.alert("Incomplete", "Please select both date and time");
    }
  };

  const clearSchedule = () => {
    setScheduleDisplay("");
    setSelectedDay(null);
    setSelectedHour(null);
    setSelectedMinute(null);
  };

  const setToday = () => {
    const today = new Date();
    setCalendarMonth(today);
    setSelectedDay(today.getDate());
    setSelectedHour(today.getHours().toString().padStart(2, "0"));
    setSelectedMinute(today.getMinutes().toString().padStart(2, "0"));
  };

  const formatLiveDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 50 : 40 }}>
      {/* ── Episode Hub overlay ────────────────────────────── */}
      {showEpisodeHub && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }}>
          <EpisodeHub onBack={() => setShowEpisodeHub(false)} />
        </View>
      )}
      <ScrollView 
        className="px-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: Platform.OS === 'web' ? 40 : 120,
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-semibold" style={{ color: colors.text }}>Podcast Studio</Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => setShowSettings(true)} className="p-2">
              <Feather name="settings" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNotifications(true)} className="relative p-2">
              <Feather name="bell" size={22} color={colors.text} />
              {unreadCount > 0 && (
                <View className="absolute top-0 right-0 items-center justify-center h-4 px-1 rounded-full min-w-4" style={{ backgroundColor: colors.text }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.background }}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfile(true)} className="p-2">
              <Feather name="user" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View className="w-16 h-[2px] mt-2 rounded-sm mb-4" style={{ backgroundColor: colors.text }} />

        {/* ── Live Banner ─────────────────────────────────────── */}
        {isLive && (
          <View className="flex-row flex-wrap items-center self-start gap-3 px-4 py-3 mb-4 rounded-full" style={{ backgroundColor: colors.text }}>
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.background }} />
            <Text className="text-[15px] font-bold" style={{ color: colors.background }}>LIVE</Text>
            <Text className="text-[15px] font-mono font-semibold" style={{ color: colors.background }}>{formatLiveDuration(liveSeconds)}</Text>
            <Text className="text-[14px] font-semibold" style={{ color: colors.background }}>Viewers {liveViewers}</Text>
            <TouchableOpacity onPress={shareLiveLink} className="px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.background}30` }}>
              <Feather name="share-2" size={15} color={colors.background} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 1 — PODCAST AUDIO DECK (always visible)
            HOST + MIC 2–5 in one row · compact control bar
        ══════════════════════════════════════════════════════ */}
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
            <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#4F6AF0' }} />
            <Feather name="mic" size={14} color={colors.textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.text }}>
              Podcast Audio Deck
            </Text>
            {isLive && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#059669' }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>LIVE</Text>
              </View>
            )}
          </View>
          <View style={{ padding: 14 }}>
            <PodcastAudioDeck
              mics={mics}
              guestSlots={podcast.guestSlots}
              roomLink={roomLink}
              isRecording={isRecording}
              recordingSeconds={recordingSeconds}
              liveViewers={liveViewers}
              isLive={isLive}
              onToggleMute={toggleMute}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onStartLive={startLiveSetup}
              onEndLive={stopLiveStream}
              colors={colors}
              gradients={gradients}
              onPeerMute={peerApplyMute}
              onPeerVolume={peerApplyVolume}
              onPeerRemove={closePeer}
            />
          </View>
          {isLive && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <PodcastAnalytics
                isLive={isLive}
                liveSeconds={liveSeconds}
                liveViewers={liveViewers}
                guestSlots={podcast.guestSlots}
                hostMicMuted={podcast.mics.find(m => m.id === 1)?.muted ?? true}
                colors={colors}
              />
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════
            ROW: GREEN ROOM CHAT
        ══════════════════════════════════════════════════════ */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 12 }}>

          {/* GREEN ROOM CHAT — full width */}
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
              <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#8B5CF6' }} />
              <Feather name="message-circle" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.text }}>
                Green Room Chat
              </Text>
            </View>
            <PodcastLiveChat
              isLive={isLive}
              messages={liveChatMessages}
              value={liveChatInput}
              onChangeText={setLiveChatInput}
              onSend={sendHostChatMessage}
              colors={colors}
            />
          </View>

        </View>{/* end Green Room Chat row */}

        {/* ══════════════════════════════════════════════════════
            ROW: SECTION 4 — SOUND BED  |  SECTION 5 — EPISODE HUB CARD
            Both always visible. Two columns on desktop, stacked on mobile.
        ══════════════════════════════════════════════════════ */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 12 }}>

          {/* SECTION 4 — PODCAST SOUND BED */}
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
              <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#F59E0B' }} />
              <Feather name="music" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.text }}>
                Podcast Sound Bed
              </Text>
              {podcast.isMusicPlaying && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#D97706' }} />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#D97706' }}>PLAYING</Text>
                </View>
              )}
            </View>
            <MusicPlayer
              showMusicPlayer={true}
              onTogglePlayer={() => {}}
              colors={colors}
            />
          </View>

          {/* SECTION 5 — EPISODE HUB CARD */}
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
              <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#EC4899' }} />
              <Feather name="archive" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.text }}>
                Episode Hub
              </Text>
            </View>
            <View style={{ padding: 20, alignItems: 'center', gap: 16 }}>
              {/* Episode count */}
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <View style={{ flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{podcasts.length}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Total</Text>
                </View>
                <View style={{ flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#059669' }}>
                    {podcasts.filter((p: any) => p.status === 'Published').length}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Published</Text>
                </View>
                <View style={{ flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#D97706' }}>
                    {podcasts.filter((p: any) => p.status === 'Draft').length}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Drafts</Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Upload, edit, and publish your podcast episodes.
              </Text>

              {/* Open Episode Hub button */}
              <TouchableOpacity
                onPress={() => setShowEpisodeHub(true)}
                style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#EC4899', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}
                >
                  <Feather name="external-link" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Open Episode Hub</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Now Playing Banner ──────────────────────────────── */}
      {playingEpisodeId && (
        <View style={{
          position: 'absolute',
          bottom: Platform.OS === 'web' ? 20 : 100,
          left: 20,
          right: 20,
          backgroundColor: colors.text,
          padding: 16,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 6
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Feather name="headphones" size={24} color={colors.background} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.background, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>Now Playing</Text>
              <Text style={{ color: colors.background, fontSize: 14 }} numberOfLines={1}>
                {podcasts.find((p: any) => p.id === playingEpisodeId)?.title || 'Episode'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handlePlayEpisode({ id: playingEpisodeId } as any)} style={{ padding: 8 }}>
            <Feather name="square" size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modals (unchanged) ──────────────────────────────── */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notificationsList}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAllNotifications}
        isDarkMode={isDarkMode}
      />

      <PodcastProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        isDarkMode={isDarkMode}
      />

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
        colors={colors}
      />

      <TrimModal
        visible={trimModalVisible}
        currentRecording={currentRecording}
        trimRanges={trimRanges}
        currentRangeStart={currentRangeStart}
        currentRangeEnd={currentRangeEnd}
        trimFileName={trimFileName}
        trimPreviewDuration={trimPreviewDuration}
        trimSaveSuccess={trimSaveSuccess}
        previewPlaying={previewPlaying}
        activeTrimTab={activeTrimTab}
        waveformData={waveformData}
        originalDurationSecs={originalDurationSecs}
        onClose={() => { stopPreview(); setTrimModalVisible(false); }}
        onRangeStartChange={setCurrentRangeStart}
        onRangeEndChange={setCurrentRangeEnd}
        onAddTrimRange={addTrimRangeHandler}
        onRemoveTrimRange={removeTrimRangeHandler}
        onClearAllRanges={clearAllRangesHandler}
        onTrimFileNameChange={setTrimFileName}
        onPreview={() => previewPlaying ? stopPreview() : previewTrim()}
        onSave={saveTrimmedRecording}
        onTabChange={(tab) => { stopPreview(); setActiveTrimTab(tab); }}
        colors={colors}
      />

      {/* Calendar Modal (unchanged) */}
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <View className="items-center justify-center flex-1 bg-black/80">
          <View className="rounded-2xl p-5 w-[90%] max-w-[400px]" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold" style={{ color: colors.text }}>Select Schedule</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center justify-between mb-5">
              <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2">
                <Feather name="chevron-left" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text className="text-base font-semibold" style={{ color: colors.text }}>{formatMonthYear(calendarMonth)}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
                <Feather name="chevron-right" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-around mb-4">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <Text key={day} className="text-[12px] w-10 text-center font-semibold" style={{ color: colors.textMuted }}>{day}</Text>
              ))}
            </View>
            <View className="flex-row flex-wrap mb-4">{renderCalendar()}</View>
            <View className="mb-4">
              <Text className="mb-3 text-sm font-semibold" style={{ color: colors.text }}>Select Time</Text>
              <View className="flex-row items-center gap-3 mb-3">
                <Text className="text-sm font-medium w-14" style={{ color: colors.textMuted }}>Hour</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pr-4">
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      className="px-4 py-2 border rounded-xl"
                      style={selectedHour === hour ? { backgroundColor: colors.text, borderColor: colors.text } : { borderColor: colors.cardBorder }}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text className="text-sm font-semibold" style={{ color: selectedHour === hour ? colors.background : colors.text }}>{hour}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View className="flex-row items-center gap-3 mb-3">
                <Text className="text-sm font-medium w-14" style={{ color: colors.textMuted }}>Minute</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pr-4">
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      className="px-4 py-2 border rounded-xl"
                      style={selectedMinute === minute ? { backgroundColor: colors.text, borderColor: colors.text } : { borderColor: colors.cardBorder }}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text className="text-sm font-semibold" style={{ color: selectedMinute === minute ? colors.background : colors.text }}>{minute}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View className="flex-row justify-end gap-3 mt-4">
              <TouchableOpacity onPress={clearSchedule} className="px-5 py-3 border rounded-lg" style={{ borderColor: colors.cardBorder }}>
                <Text className="text-sm font-medium" style={{ color: colors.textMuted }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setToday} className="px-5 py-3 border rounded-lg" style={{ borderColor: colors.cardBorder }}>
                <Text className="text-sm font-medium" style={{ color: colors.textMuted }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmSchedule} className="overflow-hidden rounded-lg">
                <LinearGradient colors={gradients.primary} className="items-center px-5 py-3">
                  <Text className="text-sm font-medium" style={{ color: colors.background }}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarDay: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, marginVertical: 2 },
  calendarDayEmpty: { width: "14.28%", aspectRatio: 1 },
  calendarDayText: { fontSize: 14 },
});

