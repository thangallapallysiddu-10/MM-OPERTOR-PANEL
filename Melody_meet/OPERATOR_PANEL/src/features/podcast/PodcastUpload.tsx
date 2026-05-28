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
import { io as socketIo } from 'socket.io-client';
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
import { PodcastApi, getFileUrl } from '../../services/api/operatorApi';


// Import sections
import { RecordingStudio } from './sections/RecordingStudio';
import { EpisodeDetails } from './sections/EpisodeDetails';
import { EpisodesList } from './sections/EpisodesList';
import { GuestPanel } from './sections/GuestPanel';
import { MusicPlayer } from './sections/MusicPlayer';

// Import modals
import { LiveSetupModal } from './modals/LiveSetupModal';
import { TrimModal } from './modals/TrimModal';

// Import types
import { Podcast, Recording, TrimRange } from './types';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const API_BASE =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');
const SOCKET_SERVER_URL = API_BASE.replace(/\/api$/, '');

// Notification type
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'live' | 'song' | 'system' | 'report' | 'ban';
}

// Theme colors - Black/White/Gray only
const lightTheme = {
  background: "#F5F5F5",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E0E0E0",
  text: "#000000",
  textSecondary: "#666666",
  textMuted: "#999999",
  success: "#000000",
  warning: "#666666",
  accent: "#333333",
};

const darkTheme = {
  background: "#121212",
  surface: "#1E1E1E",
  card: "#1E1E1E",
  cardBorder: "#333333",
  text: "#FFFFFF",
  textSecondary: "#CCCCCC",
  textMuted: "#888888",
  success: "#FFFFFF",
  warning: "#CCCCCC",
  accent: "#999999",
};

const lightGradients = {
  primary: ["#000000", "#333333"] as const,
};

const darkGradients = {
  primary: ["#FFFFFF", "#CCCCCC"] as const,
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
    setRecordings,
    lastRecording,
    showAfterRecordingOptions,
    mics,
    activeMic,
    selectMic,
    toggleMute,
    startRecording,
    stopRecording,
    useRecording: useRecordingFn,
    deleteRecording,
    setShowAfterRecordingOptions,
    addGuestMic,
    removeGuestMic,
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
  const setPodcasts = (fn: any) => {
    // Handle if needed - use addPodcastEpisode/removePodcastEpisode instead
  };

  // Local UI state (not persisted)
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<any>(null);
  
  // Episode playback state
  const [playingEpisodeId, setPlayingEpisodeId] = useState<number | string | null>(null);
  const episodeAudioRef = useRef<any>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<number | null>(null);
  const recordingAudioRef = useRef<any>(null);
  const podcastSocketRef = useRef<any>(null);

  // ===== GUEST STATE (from store) =====
  const guestRequests = podcast.guestRequests;
  const setGuestRequests = (fn: any) => {
    // Use store actions instead
  };
  const approvedGuests = podcast.approvedGuests;
  const setApprovedGuests = (fn: any) => {
    // Use store actions instead
  };
  const showGuestPanel = podcast.showGuestPanel;
  const setShowGuestPanel = (value: boolean) => updatePodcastState({ showGuestPanel: value });
  const showMusicPlayer = podcast.showMusicPlayer;
  const setShowMusicPlayer = (value: boolean) => updatePodcastState({ showMusicPlayer: value });

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

  // ===== MUSIC PLAYER STATE (from store) =====
  const currentMusic = podcast.currentMusic;
  const setCurrentMusic = (value: any) => updatePodcastState({ currentMusic: value });
  const isMusicPlaying = podcast.isMusicPlaying;
  const setIsMusicPlaying = (value: boolean) => updatePodcastState({ isMusicPlaying: value });
  const musicLink = podcast.musicLink;
  const setMusicLink = (value: string) => updatePodcastState({ musicLink: value });
  const [loadingMusic, setLoadingMusic] = useState(false);

  // ===== SETTINGS STATE (from store) =====
  const notificationsEnabled = true; 
  const [streamQuality, setStreamQuality] = useState('Auto');
  const setNotificationsEnabled = (value: boolean) => {};
  const autoSave = true;
  const setAutoSave = (value: boolean) => {};

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

  // Load episodes and mics from backend on mount
  useEffect(() => {
    PodcastApi.getAll()
      .then((eps) => {
        if (eps && eps.length > 0) {
          // Merge backend episodes into local store (backend is source of truth)
          eps.forEach((ep: any) => {
            const local = {
              id: ep.id,
              title: ep.title,
              description: ep.description || '',
              genre: ep.genre || '',
              seasonNumber: ep.seasonNumber ?? null,
              episodeNumber: ep.episodeNumber ?? null,
              coverArt: ep.coverArt || null,
              fileName: ep.fileName || '',
              fileSize: ep.fileSize || '',
              schedule: ep.scheduleDate || 'Not scheduled',
              status: ep.status,
              date: ep.date || new Date(ep.createdAt).toLocaleDateString(),
            };
            // Only add if not already in store (avoid duplicates on hot reload)
            const exists = podcast.podcastEpisodes.find((e: any) => e.id === local.id);
            if (!exists) addPodcastEpisode(local);
          });
        }
      })
      .catch(() => { /* offline — use local store */ });

    PodcastApi.getMics()
      .then((backendMics) => {
        if (backendMics && backendMics.length > 0) {
          const { setMics } = useAppStore.getState();
          setMics(backendMics);
        }
      })
      .catch(() => { /* offline - use local mics */ });

    PodcastApi.getRecordings()
      .then((backendRecordings) => {
        if (backendRecordings) {
          const { setRecordings } = useAppStore.getState();
          const mapped = backendRecordings.map((r: any) => ({
            id: r.id,
            name: r.name,
            duration: r.duration,
            size: r.size || 'Unknown',
            uri: r.fileUrl,
          }));
          setRecordings(mapped);
        }
      })
      .catch(() => { /* offline - ignore */ });
  }, []);

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

  useEffect(() => {
    if (!isLive || !roomLink) {
      podcastSocketRef.current?.disconnect();
      podcastSocketRef.current = null;
      updatePodcastState({ guestRequests: [], approvedGuests: [] });
      return;
    }

    const roomIdMatch = roomLink.match(/roomId=([A-Z0-9]+)/i);
    const roomId = roomIdMatch ? roomIdMatch[1] : null;
    if (!roomId) return;

    const syncGuests = (guests: any[]) => {
      updatePodcastState({
        guestRequests: guests
          .filter((guest) => guest.status === 'pending')
          .map((guest) => ({
            id: String(guest.id),
            name: guest.name,
            device: guest.device || 'Unknown Device',
            status: 'pending' as const,
          })),
        approvedGuests: guests
          .filter((guest) => guest.status === 'approved')
          .map((guest) => ({
            id: String(guest.id),
            name: guest.name,
            device: guest.device || 'Unknown Device',
            status: 'approved' as const,
          })),
      });
    };

    const upsertGuest = (guest: any) => {
      const state = useAppStore.getState().podcast;
      const normalizedGuest = {
        id: String(guest.id),
        name: guest.name,
        device: guest.device || 'Unknown Device',
        status: guest.status,
      };

      updatePodcastState({
        guestRequests:
          guest.status === 'pending'
            ? [normalizedGuest, ...state.guestRequests.filter((item: any) => item.id !== normalizedGuest.id)]
            : state.guestRequests.filter((item: any) => item.id !== normalizedGuest.id),
        approvedGuests:
          guest.status === 'approved'
            ? [normalizedGuest, ...state.approvedGuests.filter((item: any) => item.id !== normalizedGuest.id)]
            : state.approvedGuests.filter((item: any) => item.id !== normalizedGuest.id),
      });
    };

    const socket = socketIo(`${SOCKET_SERVER_URL}/podcast`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    podcastSocketRef.current = socket;
    socket.on('connect', () => socket.emit('host_join', { roomId }));
    socket.on('room_snapshot', (snapshot: any) => {
      syncGuests(snapshot.guests || []);
      updatePodcastState({ liveViewers: snapshot.viewerCount || 0 });
    });
    socket.on('guest_request', (guest: any) => {
      upsertGuest(guest);
      addNotification('Guest Request', `${guest.name} wants to join as a guest`, 'system');
    });
    socket.on('guest_update', upsertGuest);
    socket.on('viewer_count', ({ viewerCount }: any) => {
      updatePodcastState({ liveViewers: Number(viewerCount || 0) });
    });
    socket.on('live_ended', () => {
      updatePodcastState({
        isLive: false,
        liveSeconds: 0,
        liveViewers: 0,
        guestRequests: [],
        approvedGuests: [],
      });
    });

    const guestPoll = setInterval(async () => {
      try {
        syncGuests(await PodcastApi.getGuests(roomId));
      } catch (_) {}
    }, 10000);

    return () => {
      clearInterval(guestPoll);
      socket.disconnect();
      if (podcastSocketRef.current === socket) podcastSocketRef.current = null;
    };
  }, [isLive, roomLink]);
  // Add notification helper
  const addNotification = (title: string, message: string, type: NotificationItem['type']) => {
    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      title,
      message,
      time: 'Just now',
      read: false,
      type,
    };
    setNotificationsList(prev => [newNotification, ...prev]);
    
    // Also add to dashboard notifications if needed
    addDashboardNotification({
      title,
      message,
      time: 'Just now',
      read: false,
    });
  };

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
  console.log("Opening trim modal for:", recording.name);let durationSeconds = 0;
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

  // YouTube music extraction
  const extractYouTubeMusic = async () => {
    if (!musicLink.trim()) {
      Alert.alert("Error", "Please paste a YouTube link");
      return;
    }
    
    setLoadingMusic(true);
    
    setTimeout(() => {
      let videoId = '';
      const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&]+)/,
        /(?:youtu\.be\/)([^?]+)/,
        /(?:youtube\.com\/embed\/)([^?]+)/
      ];
      for (const pattern of patterns) {
        const match = musicLink.match(pattern);
        if (match) {
          videoId = match[1];
          break;
        }
      }
      
      if (videoId) {
        setCurrentMusic({
          id: videoId,
          title: `YouTube Track`,
          artist: "YouTube",
          thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
          url: musicLink,
          videoId: videoId,
        });
        addNotification('Music Added', 'YouTube track added to player', 'song');
        Alert.alert("Success", "Music loaded! Click play to start.");
      } else {
        Alert.alert("Error", "Could not extract video ID. Please check the link.");
      }
      setLoadingMusic(false);
    }, 1500);
  };

  const playMusic = () => {
    if (currentMusic) {
      setIsMusicPlaying(true);
      addNotification('Music Playing', `Now playing: ${currentMusic.title}`, 'song');
    }
  };

  const pauseMusic = () => {
    setIsMusicPlaying(false);
  };

  // Guest management functions — optimistic UI + backend sync
  const approveGuest = async (id: string) => {
    const request = guestRequests.find(r => r.id === id);
    if (!request) return;
    // Optimistic update
    updatePodcastState({
      approvedGuests: [...approvedGuests, { ...request, status: 'approved' }],
      guestRequests: guestRequests.filter(r => r.id !== id),
    });
    addGuestMic({ id: request.id, name: request.name });
    addNotification('Guest Approved', `${request.name} can now speak`, 'system');
    // Backend sync
    try {
      await PodcastApi.respondToGuest(request.id, 'approve');
    } catch (_) { /* offline — local state already updated */ }
  };

  const denyGuest = async (id: string) => {
    const request = guestRequests.find(r => r.id === id);
    if (!request) return;
    // Optimistic update
    updatePodcastState({
      guestRequests: guestRequests.filter(r => r.id !== id),
    });
    addNotification('Guest Denied', `${request.name} request denied`, 'system');
    // Backend sync
    try {
      await PodcastApi.respondToGuest(request.id, 'deny');
    } catch (_) { /* offline — local state already updated */ }
  };

  const removeGuest = async (id: string) => {
    const guest = approvedGuests.find(g => g.id === id);
    if (!guest) return;
    // Optimistic update
    updatePodcastState({
      approvedGuests: approvedGuests.filter(g => g.id !== id),
    });
    removeGuestMic(id);
    addNotification('Guest Removed', `${guest.name} removed from session`, 'system');
    // Backend sync
    try {
      await PodcastApi.removeGuest(guest.id);
    } catch (_) { /* offline — local state already updated */ }
  };

  const toggleGuestMic = (guestId: string) => {
    const guestMic = useAppStore.getState().podcast.mics.find((mic: any) => mic.guestId === guestId);
    if (guestMic) toggleMute(guestMic.id);
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
      <ScrollView 
        className="px-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: Platform.OS === 'web' ? 40 : 120,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-semibold" style={{ color: colors.text }}>Podcast studio</Text>
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
        <View className="w-16 h-[2px] mt-2 rounded-sm" style={{ backgroundColor: colors.text }} />
        
        {isLive && (
          <View className="flex-row flex-wrap items-center self-start gap-3 px-4 py-3 mt-4 rounded-full" style={{ backgroundColor: colors.text }}>
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.background }} />
            <Text className="text-[15px] font-bold" style={{ color: colors.background }}>LIVE</Text>
            <Text className="text-[15px] font-mono font-semibold" style={{ color: colors.background }}>{formatLiveDuration(liveSeconds)}</Text>
            <Text className="text-[14px] font-semibold" style={{ color: colors.background }}>Viewers {liveViewers}</Text>
            
            <TouchableOpacity onPress={shareLiveLink} className="px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.background}30` }}>
              <Feather name="share-2" size={15} color={colors.background} />
            </TouchableOpacity>
            
          </View>
        )}
        
        {/* Two Column Layout */}
        <View className={`${isMobile ? 'flex-col' : 'flex-row gap-4'} mb-6`}>
          <View className={`${isMobile ? 'w-full' : 'flex-1'} gap-4`}>
            <RecordingStudio
              mics={mics}
              activeMic={activeMic}
              isRecording={isRecording}
              recordingSeconds={recordingSeconds}
              showAfterRecordingOptions={showAfterRecordingOptions}
              lastRecording={lastRecording}
              recordings={recordings}
              isLive={isLive}
              onSelectMic={selectMic}
              onToggleMute={toggleMute}
              onStartRecording={startRecording}
               onTrimRecording={(recording) => openTrimModal(recording)}
              onStopRecording={stopRecording}
              onPlayRecording={handlePlayRecording}
              playingRecordingId={playingRecordingId}
              onUseRecording={(recording) => {
                setFileName(recording.name);
                setFileSize(recording.size);
                setSelectedFile({ 
                  name: recording.name, 
                  size: recording.size, 
                  uri: recording.uri 
                });
                if (!title) {
                  let cleanTitle = recording.name.replace('.mp3', '').replace('_trimmed', '').replace('recording_', '');
                  setTitle(cleanTitle);
                }
                setShowAfterRecordingOptions(false);
                addNotification('Recording Used', `"${recording.name}" selected for episode`, 'system');
              }}
              onDeleteRecording={deleteRecording}
              onStartLive={startLiveSetup}
              onEndLive={stopLiveStream}
              colors={colors}
              gradients={gradients}
            />

            <GuestPanel
              roomLink={roomLink}
              guestRequests={guestRequests}
              approvedGuests={approvedGuests}
              liveViewers={liveViewers}
              isLive={isLive}
              showGuestPanel={showGuestPanel}
              onTogglePanel={() => setShowGuestPanel(!showGuestPanel)}
              onCopyLink={handleCopyLink}
              onShareLink={shareLiveLink}
              onApproveGuest={approveGuest}
              onDenyGuest={denyGuest}
              onRemoveGuest={removeGuest}
              onToggleGuestMic={toggleGuestMic}
              colors={colors}
            />
<MusicPlayer
  showMusicPlayer={showMusicPlayer}
  onTogglePlayer={() => setShowMusicPlayer(!showMusicPlayer)}
  colors={colors}
/>
          </View>

          {/* RIGHT COLUMN */}
          <View className={`${isMobile ? 'w-full' : 'flex-1'} gap-4`}>
            <EpisodeDetails
              title={title}
              description={description}
              genre={genre}
              seasonNumber={seasonNumber}
              episodeNumber={episodeNumber}
              coverArt={coverArt}
              fileName={fileName}
              fileSize={fileSize}
              uploading={uploading}
              progress={progress}
              scheduleDisplay={scheduleDisplay}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onGenreChange={setGenre}
              onSeasonNumberChange={setSeasonNumber}
              onEpisodeNumberChange={setEpisodeNumber}
              onPickCoverArt={pickCoverArt}
              onResetCoverArt={resetCoverArt}
              onPickFile={pickAudioFile}
              onResetFile={resetFileSelection}
              onOpenCalendar={() => setShowCalendar(true)}
              onClearSchedule={clearSchedule}
              onPublish={() => saveEpisode(scheduleDisplay ? "Scheduled" : "Published")}
              onSaveDraft={() => saveEpisode("Draft")}
              colors={colors}
              gradients={gradients}
            />

            <EpisodesList
              podcasts={podcasts}
              onDeletePodcast={async (id: number) => {
                removePodcastEpisode(id);
                try {
                  await PodcastApi.delete(id);
                } catch (_) {}
              }}
              onPlayEpisode={handlePlayEpisode}
              colors={colors}
            />
          </View>
        </View>
      </ScrollView>

      {/* Now Playing Banner for Episodes */}
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

      {/* Modals */}
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
    console.log('Quality changed to:', value); // For debugging
  }}
  onHelpSupport={handleHelpSupport}
  isDarkMode={isDarkMode}
/>

      {/* Live Setup Modal */}
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

      {/* Trim Modal */}
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

      {/* Calendar Modal */}
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

