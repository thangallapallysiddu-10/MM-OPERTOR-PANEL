// EpisodeHub.tsx — Page 2: Episode Management
// Purpose: Content Management only. No live production features.
// Contains: Episode Details form, Recent Recordings list (read-only), Episodes list

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../store/useAppStore';
import { useOperator } from '../../context/OperatorContext';
import { PodcastApi, getFileUrl } from '../../services/api/operatorApi';

import { EpisodeDetails } from './sections/EpisodeDetails';
import { EpisodesList } from './sections/EpisodesList';
import { TrimModal } from './modals/TrimModal';

import { Podcast, Recording } from './types';

const { width } = require('react-native').Dimensions.get('window');
const isMobile = width < 768;

const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  success: '#059669',
  warning: '#D97706',
  accent: '#4F6AF0',
};

const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  cardBorder: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  accent: '#6B8EFF',
};

const lightGradients = { primary: ['#4F6AF0', '#6B8EFF'] as const };
const darkGradients  = { primary: ['#4F6AF0', '#6B8EFF'] as const };

interface EpisodeHubProps {
  onBack: () => void;
}

export default function EpisodeHub({ onBack }: EpisodeHubProps) {
  const { addPodcast } = useOperator();

  // ── Delete confirmation state (replaces Alert.alert — RN Web Alert uses
  //    window.confirm() which is synchronous/blocking and causes multiple
  //    onPress events to fire across all list rows) ──────────────────────
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const {
    podcast,
    updatePodcastState,
    addPodcastEpisode,
    removePodcastEpisode,
    profileDarkMode,
    addRecording,
    removeRecording,
    addTrimRange,
    removeTrimRange,
    clearTrimRanges,
  } = useAppStore();

  // Select recordings directly so Zustand re-renders this component
  // whenever recordings changes — independent of the broader podcast object.
  const recordings = useAppStore((s) => s.podcast.recordings) as Recording[];

  const isDarkMode  = profileDarkMode;
  const colors      = isDarkMode ? darkTheme : lightTheme;
  const gradients   = isDarkMode ? darkGradients : lightGradients;

  // Bootstrap runs in PodcastUpload (parent). Do NOT call it here —
  // doing so overwrites the store on every EpisodeHub mount, undoing local deletes.

  // ── Episode form state (shared with Studio via store) ───────────────────
  const title           = podcast.episodeTitle;
  const description     = podcast.episodeDescription;
  const genre           = podcast.episodeGenre;
  const seasonNumber    = podcast.episodeSeasonNumber;
  const episodeNumber   = podcast.episodeNumber;
  const coverArt        = podcast.episodeCoverArt;
  const fileName        = podcast.episodeFileName;
  const fileSize        = podcast.episodeFileSize;
  const scheduleDisplay = podcast.episodeScheduleDisplay;
  const podcasts        = podcast.podcastEpisodes;
  // NOTE: recordings is selected directly via useAppStore selector above — do not re-declare here.

  const setTitle           = (v: string) => updatePodcastState({ episodeTitle: v });
  const setDescription     = (v: string) => updatePodcastState({ episodeDescription: v });
  const setGenre           = (v: string) => updatePodcastState({ episodeGenre: v });
  const setSeasonNumber    = (v: string) => updatePodcastState({ episodeSeasonNumber: v });
  const setEpisodeNumber   = (v: string) => updatePodcastState({ episodeNumber: v });
  const setCoverArt        = (v: string) => updatePodcastState({ episodeCoverArt: v });
  const setFileName        = (v: string) => updatePodcastState({ episodeFileName: v });
  const setFileSize        = (v: string) => updatePodcastState({ episodeFileSize: v });
  const setScheduleDisplay = (v: string) => updatePodcastState({ episodeScheduleDisplay: v });

  // ── Local UI state ──────────────────────────────────────────────────────
  const [uploading, setUploading]                 = useState(false);
  const [progress]                                = useState(0);
  const [selectedFile, setSelectedFile]           = useState<any>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<any>(null);
  const [playingEpisodeId, setPlayingEpisodeId]   = useState<number | string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<number | null>(null);
  const episodeAudioRef   = useRef<any>(null);
  const recordingAudioRef = useRef<any>(null);

  // ── Calendar state ──────────────────────────────────────────────────────
  const showCalendar   = podcast.showCalendar;
  const selectedDay    = podcast.selectedDay;
  const selectedHour   = podcast.selectedHour;
  const selectedMinute = podcast.selectedMinute;
  const calendarMonth  = podcast.calendarMonth;
  const setShowCalendar   = (v: boolean)       => updatePodcastState({ showCalendar: v });
  const setSelectedDay    = (v: number | null) => updatePodcastState({ selectedDay: v });
  const setSelectedHour   = (v: string | null) => updatePodcastState({ selectedHour: v });
  const setSelectedMinute = (v: string | null) => updatePodcastState({ selectedMinute: v });
  const setCalendarMonth  = (v: Date)          => updatePodcastState({ calendarMonth: v });

  const hours   = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // ── Trim state (shared with Studio via store) ────────────────────────────
  const trimModalVisible     = podcast.trimModalVisible;
  const currentRecording     = podcast.currentRecordingForTrim;
  const trimRanges           = podcast.trimRanges;
  const currentRangeStart    = podcast.currentRangeStart;
  const currentRangeEnd      = podcast.currentRangeEnd;
  const trimFileName         = podcast.trimFileName;
  const trimPreviewDuration  = podcast.trimPreviewDuration;
  const trimSaveSuccess      = podcast.trimSaveSuccess;
  const previewPlaying       = podcast.previewPlaying;
  const activeTrimTab        = podcast.activeTrimTab;
  const waveformData         = podcast.waveformData;
  const originalDurationSecs = podcast.originalDurationSecs;
  const recordingToTrim      = podcast.currentRecordingForTrim;

  const setTrimModalVisible    = (v: boolean)           => updatePodcastState({ trimModalVisible: v });
  const setCurrentRecording    = (v: Recording | null)  => updatePodcastState({ currentRecordingForTrim: v });
  const setRecordingToTrim     = (v: Recording | null)  => updatePodcastState({ currentRecordingForTrim: v });
  const setCurrentRangeStart   = (v: number)            => updatePodcastState({ currentRangeStart: v });
  const setCurrentRangeEnd     = (v: number)            => updatePodcastState({ currentRangeEnd: v });
  const setTrimFileName        = (v: string)            => updatePodcastState({ trimFileName: v });
  const setTrimSaveSuccess     = (v: boolean)           => updatePodcastState({ trimSaveSuccess: v });
  const setPreviewPlaying      = (v: boolean)           => updatePodcastState({ previewPlaying: v });
  const setActiveTrimTab       = (v: 'simple'|'advanced') => updatePodcastState({ activeTrimTab: v });
  const setOriginalDurationSecs = (v: number)           => updatePodcastState({ originalDurationSecs: v });
  const setWaveformData        = (v: number[])          => updatePodcastState({ waveformData: v });

  // ── File pickers ────────────────────────────────────────────────────────
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
          setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
        }
      };
      input.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
        if (!result.canceled && result.assets?.[0]) {
          const file = result.assets[0];
          setSelectedFile(file);
          setFileName(file.name);
          setFileSize(`${(file.size ? file.size / (1024 * 1024) : 0).toFixed(2)} MB`);
        }
      } catch { Alert.alert('Error', 'Failed to pick file'); }
    }
  };

  const pickCoverArt = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) { setSelectedCoverFile(file); setCoverArt(URL.createObjectURL(file)); }
      };
      input.click();
    } else {
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
            name: asset.fileName || `cover-${Date.now()}.jpg`,
            mimeType: asset.mimeType || 'image/jpeg',
          });
          setCoverArt(asset.uri);
        }
      } catch { Alert.alert('Error', 'Failed to pick thumbnail'); }
    }
  };

  const resetFileSelection = () => { setSelectedFile(null); setFileName(''); setFileSize(''); };
  const resetCoverArt      = () => { setSelectedCoverFile(null); setCoverArt(''); };

  // ── Trim waveform — regenerate when modal opens ─────────────────────────
  React.useEffect(() => {
    if (trimModalVisible) {
      setWaveformData(Array.from({ length: 60 }, () => Math.floor(Math.random() * 60) + 20));
    }
  }, [trimModalVisible]);

  // ── Trim duration preview ────────────────────────────────────────────────
  React.useEffect(() => {
    if (originalDurationSecs > 0) {
      let totalRemoved = 0;
      trimRanges.forEach(r => { totalRemoved += (r.end - r.start); });
      const kept = Math.max(0, 100 - totalRemoved);
      const secs = Math.round((kept / 100) * originalDurationSecs);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      updatePodcastState({ trimPreviewDuration: `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` });
    }
  }, [trimRanges, originalDurationSecs]);

  // ── Open trim modal ──────────────────────────────────────────────────────
  const openTrimModal = (recording: Recording) => {
    let durationSeconds = 0;
    const parts = (recording.duration || '0:00').split(':');
    if (parts.length === 2) {
      durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    setOriginalDurationSecs(durationSeconds);
    setCurrentRecording(recording);
    setRecordingToTrim(recording);
    setTrimFileName(recording.name.replace('.mp3', '_trimmed').replace(/\.[^.]+$/, '_trimmed'));
    clearTrimRanges();
    setCurrentRangeStart(0);
    setCurrentRangeEnd(100);
    setTrimSaveSuccess(false);
    setTrimModalVisible(true);
  };

  // ── Trim range handlers ──────────────────────────────────────────────────
  const addTrimRangeHandler = () => {
    if (currentRangeStart >= currentRangeEnd) {
      Alert.alert('Invalid Range', 'Start must be less than end');
      return;
    }
    const overlapping = trimRanges.some(r =>
      (currentRangeStart >= r.start && currentRangeStart <= r.end) ||
      (currentRangeEnd   >= r.start && currentRangeEnd   <= r.end)
    );
    if (overlapping) {
      Alert.alert('Overlap', 'This range overlaps with an existing removal section');
      return;
    }
    addTrimRange({ start: currentRangeStart, end: currentRangeEnd });
    setCurrentRangeStart(0);
    setCurrentRangeEnd(100);
  };

  // ── Save trimmed recording (Phase 2: capture backend response → update URI) ──
  const saveTrimmedRecording = async () => {
    if (!recordingToTrim) return;

    // Compute expected values locally for optimistic UI
    let totalRemoved = 0;
    trimRanges.forEach(r => { totalRemoved += (r.end - r.start); });
    const keptPct         = Math.max(0, 100 - totalRemoved);
    const newDurSecs      = (keptPct / 100) * originalDurationSecs;
    const mins            = Math.floor(newDurSecs / 60);
    const secs            = Math.floor(newDurSecs % 60);
    const newDuration     = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    const origSizeMB      = parseFloat(recordingToTrim.size) || 5;
    const newSizeMB       = ((keptPct / 100) * origSizeMB).toFixed(1);
    const optimisticId    = Date.now();

    // Add optimistic local entry immediately so UI feels instant
    const optimisticEntry: Recording = {
      id:       optimisticId,
      name:     `${trimFileName}.mp3`,
      duration: newDuration,
      size:     `${newSizeMB} MB`,
      uri:      recordingToTrim.uri, // stale — will be updated below
    };
    addRecording(optimisticEntry);
    setTrimSaveSuccess(true);

    // Persist to backend — PHASE 2 FIX: capture response and patch local entry
    try {
      const backendId = typeof recordingToTrim.id === 'number' ? recordingToTrim.id : null;
      if (backendId) {
        const saved = await PodcastApi.trimRecording(backendId, {
          name:       `${trimFileName}.mp3`,
          trimRanges: trimRanges.length > 0 ? trimRanges : [],
        });
        // Replace the optimistic entry with real backend data
        if (saved) {
          const store = require('../../store/useAppStore').useAppStore.getState();
          store.updateRecording(optimisticId, {
            id:       saved.id       ?? optimisticId,
            name:     saved.name     ?? optimisticEntry.name,
            duration: saved.duration ?? newDuration,
            size:     saved.size     ?? optimisticEntry.size,
            uri:      saved.fileUrl  ?? optimisticEntry.uri, // ← real trimmed file URL
          });
        }
      }
    } catch (_) {
      // Backend unavailable — keep optimistic entry with original URI
    }

    setTimeout(() => {
      setTrimSaveSuccess(false);
      setTrimModalVisible(false);
      Alert.alert('Saved', `"${trimFileName}.mp3" trimmed to ${newDuration}`);
    }, 1500);
  };

  // ── Save episode ────────────────────────────────────────────────────────
  const saveEpisode = async (statusType: string) => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter an episode title'); return false; }
    if (!fileName)     { Alert.alert('Error', 'Please select an audio file');   return false; }

    try {
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
              name: selectedCoverFile.name || 'cover.jpg',
              type: selectedCoverFile.mimeType || 'image/jpeg',
            } as any);
          }
        } else if (uploadedCoverArt) {
          formData.append('coverArt', uploadedCoverArt);
        }
      };

      if (selectedFile && !isRemoteRecording) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description || '');
        if (genre) formData.append('genre', genre);
        if (seasonNumber) formData.append('seasonNumber', seasonNumber);
        if (episodeNumber) formData.append('episodeNumber', episodeNumber);
        formData.append('status', statusType);
        if (scheduleDisplay) formData.append('scheduleDate', scheduleDisplay);
        if (Platform.OS === 'web' && typeof File !== 'undefined' && selectedFile instanceof File) {
          formData.append('file', selectedFile);
        } else {
          formData.append('file', { uri: selectedFile.uri, name: fileName, type: selectedFile.mimeType || 'audio/mpeg' } as any);
        }
        appendCoverArt(formData);
        createdPodcast = await PodcastApi.upload(formData);
      } else {
        if (selectedCoverFile) {
          const coverFD = new FormData();
          appendCoverArt(coverFD);
          const uploaded = await PodcastApi.uploadCoverArt(coverFD);
          uploadedCoverArt = uploaded.coverArt;
        }
        createdPodcast = await PodcastApi.create({
          title, description, genre,
          seasonNumber: seasonNumber ? Number(seasonNumber) : null,
          episodeNumber: episodeNumber ? Number(episodeNumber) : null,
          status: statusType as any,
          scheduleDate: scheduleDisplay || null,
          fileName, fileUrl: selectedFile?.uri, fileSize: fileSize || undefined,
          coverArt: uploadedCoverArt || undefined,
          source: isRemoteRecording ? 'recording' : 'metadata',
        });
      }

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
        schedule: createdPodcast?.scheduleDate || scheduleDisplay || 'Not scheduled',
        status: createdPodcast?.status || statusType as any,
        date: createdPodcast?.date || new Date().toLocaleDateString(),
      };

      addPodcastEpisode(newPodcast);
      if (addPodcast) addPodcast(newPodcast);

      setTitle(''); setDescription(''); setGenre(''); setSeasonNumber('');
      setEpisodeNumber(''); setCoverArt(''); setFileName(''); setFileSize('');
      setScheduleDisplay(''); setSelectedFile(null); setSelectedCoverFile(null);

      Alert.alert('Success', `Episode ${statusType === 'Draft' ? 'saved as draft' : 'published'} successfully!`);
      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save episode');
      return false;
    }
  };

  // ── Recording playback (read-only — play/stop only, no mic controls) ────
  const stopRecordingPlayback = async () => {
    if (!recordingAudioRef.current) return;
    try {
      if (Platform.OS === 'web') recordingAudioRef.current.pause();
      else { await recordingAudioRef.current.stopAsync(); await recordingAudioRef.current.unloadAsync(); }
    } catch {}
    recordingAudioRef.current = null;
    setPlayingRecordingId(null);
  };

  const handlePlayRecording = async (recording: Recording) => {
    if (!recording.uri) { Alert.alert('Error', 'No audio file found'); return; }
    if (playingRecordingId === recording.id) { await stopRecordingPlayback(); return; }
    await stopRecordingPlayback();
    setPlayingRecordingId(recording.id);
    const uri = getFileUrl(recording.uri);
    if (Platform.OS === 'web') {
      const audio = new Audio(uri);
      recordingAudioRef.current = audio;
      audio.onended = () => { recordingAudioRef.current = null; setPlayingRecordingId(null); };
      audio.play().catch(() => setPlayingRecordingId(null));
    } else {
      import('expo-av').then(({ Audio: ExpoAudio }) => {
        ExpoAudio.Sound.createAsync({ uri }).then(({ sound }) => {
          recordingAudioRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.isLoaded && s.didJustFinish) { setPlayingRecordingId(null); sound.unloadAsync(); }
          });
          sound.playAsync();
        }).catch(() => setPlayingRecordingId(null));
      });
    }
  };

  // ── Episode playback ────────────────────────────────────────────────────
  const handlePlayEpisode = (episode: Podcast) => {
    if (!episode.fileUrl) { Alert.alert('Error', 'No audio file found'); return; }
    if (playingEpisodeId === episode.id) {
      if (episodeAudioRef.current) {
        if (Platform.OS === 'web') episodeAudioRef.current.pause();
        else { episodeAudioRef.current.stopAsync(); episodeAudioRef.current.unloadAsync(); }
        episodeAudioRef.current = null;
      }
      setPlayingEpisodeId(null);
      return;
    }
    if (episodeAudioRef.current) {
      if (Platform.OS === 'web') episodeAudioRef.current.pause();
      else { episodeAudioRef.current.stopAsync(); episodeAudioRef.current.unloadAsync(); }
      episodeAudioRef.current = null;
    }
    setPlayingEpisodeId(episode.id);
    const uri = getFileUrl(episode.fileUrl);
    if (Platform.OS === 'web') {
      const audio = new Audio(uri);
      episodeAudioRef.current = audio;
      audio.onended = () => setPlayingEpisodeId(null);
      audio.play().catch(() => setPlayingEpisodeId(null));
    } else {
      import('expo-av').then(({ Audio: ExpoAudio }) => {
        ExpoAudio.Sound.createAsync({ uri }).then(({ sound }) => {
          episodeAudioRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.isLoaded && s.didJustFinish) { setPlayingEpisodeId(null); sound.unloadAsync(); }
          });
          sound.playAsync();
        }).catch(() => setPlayingEpisodeId(null));
      });
    }
  };

  // ── Calendar helpers ────────────────────────────────────────────────────
  const getDaysInMonth    = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const changeMonth       = (n: number) => { const m = new Date(calendarMonth); m.setMonth(m.getMonth() + n); setCalendarMonth(m); };
  const formatMonthYear   = (d: Date)   => d.toLocaleString('default', { month: 'long', year: 'numeric' });

  const confirmSchedule = () => {
    if (selectedDay !== null && selectedHour !== null && selectedMinute !== null) {
      const hour = parseInt(selectedHour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12  = hour % 12 || 12;
      const day   = selectedDay.toString().padStart(2, '0');
      const month = (calendarMonth.getMonth() + 1).toString().padStart(2, '0');
      setScheduleDisplay(`${day}/${month}/${calendarMonth.getFullYear()} at ${h12}:${selectedMinute} ${ampm}`);
      setShowCalendar(false);
    } else {
      Alert.alert('Incomplete', 'Please select date and time');
    }
  };

  const clearSchedule = () => {
    setScheduleDisplay(''); setSelectedDay(null); setSelectedHour(null); setSelectedMinute(null);
  };

  const setToday = () => {
    const t = new Date();
    setCalendarMonth(t);
    setSelectedDay(t.getDate());
    setSelectedHour(t.getHours().toString().padStart(2, '0'));
    setSelectedMinute(t.getMinutes().toString().padStart(2, '0'));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay    = getFirstDayOfMonth(calendarMonth);
    const days: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) days.push(<View key={`e-${i}`} style={styles.calDay0} />);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(
        <TouchableOpacity
          key={`d-${i}`}
          style={[styles.calDay, selectedDay === i && { backgroundColor: colors.text }]}
          onPress={() => setSelectedDay(i)}
        >
          <Text style={[styles.calDayText, { color: selectedDay === i ? colors.background : colors.text }]}>{i}</Text>
        </TouchableOpacity>
      );
    }
    return days;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 50 : 40 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 40 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <TouchableOpacity
            onPress={onBack}
            style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: colors.text }}>Episode Hub</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>Upload · Manage · Publish</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{podcasts.length} episodes</Text>
          </View>
        </View>
        <View style={{ width: 64, height: 2, borderRadius: 2, backgroundColor: colors.text, marginBottom: 20 }} />

        {/* ── Two-column layout ────────────────────────────────── */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>

          {/* LEFT — Recent Recordings (read-only) + Episode Details form */}
          <View style={{ flex: 1, gap: 16 }}>

            {/* RECENT RECORDINGS — read-only list, no mic/record controls */}
            <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
                <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: '#4F6AF0' }} />
                <Feather name="film" size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.text }}>
                  Recent Recordings
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 'auto' }}>
                  {recordings.length} total
                </Text>
              </View>

              <View style={{ padding: 14 }}>
                {recordings.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                    <Feather name="mic-off" size={28} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>No recordings yet</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>
                      Record in Podcast Studio, then use them here
                    </Text>
                  </View>
                ) : (
                  recordings.map((item) => (
                    <View
                      key={item.id}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface, marginBottom: 8, gap: 10 }}
                    >
                      {/* Icon */}
                      <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18 }}>🎵</Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{item.duration} · {item.size}</Text>
                      </View>

                      {/* Play button */}
                      <TouchableOpacity
                        onPress={() => handlePlayRecording(item)}
                        style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                        accessibilityLabel={playingRecordingId === item.id ? 'Stop recording' : 'Play recording'}
                      >
                        <Feather
                          name={playingRecordingId === item.id ? 'square' : 'play'}
                          size={14}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>

                      {/* Delete button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setPendingDeleteId(item.id)}
                        style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#EF444430', backgroundColor: '#EF444408', alignItems: 'center', justifyContent: 'center' }}
                        accessibilityLabel="Delete recording"
                      >
                        <Feather name="trash-2" size={14} color="#EF4444" />
                      </TouchableOpacity>

                      {/* Trim button */}
                      <TouchableOpacity
                        onPress={() => openTrimModal(item)}
                        style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B30', backgroundColor: '#F59E0B08', alignItems: 'center', justifyContent: 'center' }}
                        accessibilityLabel="Trim recording"
                      >
                        <Feather name="scissors" size={14} color="#F59E0B" />
                      </TouchableOpacity>

                      {/* Use button — populates the Episode Details form */}
                      <TouchableOpacity
                        onPress={() => {
                          setFileName(item.name);
                          setFileSize(item.size);
                          setSelectedFile({ name: item.name, size: item.size, uri: item.uri });
                          if (!title) {
                            setTitle(item.name.replace('.mp3', '').replace('_trimmed', '').replace('recording_', ''));
                          }
                        }}
                        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.text }}
                        accessibilityLabel="Use recording for episode"
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.background }}>Use</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* EPISODE DETAILS FORM */}
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
              onPublish={() => saveEpisode(scheduleDisplay ? 'Scheduled' : 'Published')}
              onSaveDraft={() => saveEpisode('Draft')}
              colors={colors}
              gradients={gradients}
            />
          </View>

          {/* RIGHT — Published / Draft Episodes list */}
          <View style={{ flex: 1 }}>
            <EpisodesList
              podcasts={podcasts}
              onDeletePodcast={async (id: number) => {
                removePodcastEpisode(id);
                try { await PodcastApi.delete(id); } catch {}
              }}
              onPlayEpisode={handlePlayEpisode}
              colors={colors}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Now Playing Banner ──────────────────────────────── */}
      {playingEpisodeId && (
        <View style={{ position: 'absolute', bottom: Platform.OS === 'web' ? 20 : 100, left: 20, right: 20, backgroundColor: colors.text, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 6 }}>
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

      {/* ── Delete Confirmation Modal ───────────────────────── */}
      <Modal visible={pendingDeleteId !== null} transparent animationType="fade" onRequestClose={() => setPendingDeleteId(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 300, backgroundColor: colors.card, borderRadius: 14, padding: 24, borderWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Delete Recording</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 24 }}>This recording will be permanently deleted.</Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setPendingDeleteId(null)}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const id = pendingDeleteId!;
                  setPendingDeleteId(null);
                  if (playingRecordingId === id) await stopRecordingPlayback();
                  removeRecording(id);
                  try {
                    await PodcastApi.deleteRecording(id);
                  } catch (err: any) {
                    console.error('DELETE RECORDING FAILED', err?.response?.status, err?.response?.data, err?.message);
                  }
                }}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: '#EF4444' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Trim Modal ──────────────────────────────────────── */}
      <TrimModal
        visible={trimModalVisible}
        currentRecording={currentRecording}
        trimRanges={trimRanges}
        currentRangeStart={currentRangeStart}
        currentRangeEnd={currentRangeEnd}
        trimFileName={trimFileName}
        trimPreviewDuration={podcast.trimPreviewDuration}
        trimSaveSuccess={trimSaveSuccess}
        previewPlaying={previewPlaying}
        activeTrimTab={activeTrimTab}
        waveformData={waveformData}
        originalDurationSecs={originalDurationSecs}
        onClose={() => {
          setPreviewPlaying(false);
          setTrimModalVisible(false);
        }}
        onRangeStartChange={setCurrentRangeStart}
        onRangeEndChange={setCurrentRangeEnd}
        onAddTrimRange={addTrimRangeHandler}
        onRemoveTrimRange={(i) => removeTrimRange(i)}
        onClearAllRanges={() => clearTrimRanges()}
        onTrimFileNameChange={setTrimFileName}
        onPreview={() => {
          // Preview plays the recording locally in the browser — same logic as PodcastUpload
          if (previewPlaying) {
            setPreviewPlaying(false);
            return;
          }
          if (!currentRecording?.uri) {
            Alert.alert('No Audio', 'This recording has no audio file to preview.');
            return;
          }
          setPreviewPlaying(true);
          if (Platform.OS === 'web') {
            const resolvedUri = getFileUrl(currentRecording.uri);
            const audio = new Audio(resolvedUri);
            const totalDur = originalDurationSecs || 1;
            const removalRanges = activeTrimTab === 'simple'
              ? [
                  ...(currentRangeStart > 0 ? [{ start: 0, end: (currentRangeStart / 100) * totalDur }] : []),
                  ...(currentRangeEnd < 100  ? [{ start: (currentRangeEnd  / 100) * totalDur, end: totalDur }] : []),
                ]
              : trimRanges.map(r => ({ start: (r.start / 100) * totalDur, end: (r.end / 100) * totalDur }));
            audio.ontimeupdate = () => {
              for (const range of removalRanges) {
                if (audio.currentTime >= range.start && audio.currentTime < range.end) {
                  audio.currentTime = range.end;
                  break;
                }
              }
            };
            audio.onended = () => setPreviewPlaying(false);
            audio.onerror = () => { setPreviewPlaying(false); Alert.alert('Preview Error', 'Could not load audio.'); };
            audio.play().catch(() => { setPreviewPlaying(false); Alert.alert('Preview Error', 'Browser blocked audio playback.'); });
          }
        }}
        onSave={saveTrimmedRecording}
        onTabChange={(tab) => { setPreviewPlaying(false); setActiveTrimTab(tab); }}
        colors={colors}
      />

      {/* ── Calendar Modal ──────────────────────────────────── */}
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', maxWidth: 400, backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.cardBorder }}>
            {/* Month nav */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Select Schedule</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 8 }}><Feather name="chevron-left" size={20} color={colors.text} /></TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{formatMonthYear(calendarMonth)}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 8 }}><Feather name="chevron-right" size={20} color={colors.text} /></TouchableOpacity>
            </View>
            {/* Day headers */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={{ fontSize: 11, width: 36, textAlign: 'center', fontWeight: '600', color: colors.textMuted }}>{d}</Text>
              ))}
            </View>
            {/* Days grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>{renderCalendar()}</View>
            {/* Hour picker */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Select Time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, width: 44 }}>Hour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {hours.map(h => (
                  <TouchableOpacity key={h} onPress={() => setSelectedHour(h)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginRight: 5, borderColor: selectedHour === h ? colors.text : colors.cardBorder, backgroundColor: selectedHour === h ? colors.text : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedHour === h ? colors.background : colors.text }}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Minute picker */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, width: 44 }}>Min</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {minutes.map(m => (
                  <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginRight: 5, borderColor: selectedMinute === m ? colors.text : colors.cardBorder, backgroundColor: selectedMinute === m ? colors.text : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedMinute === m ? colors.background : colors.text }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={clearSchedule} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setToday} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmSchedule} style={{ overflow: 'hidden', borderRadius: 8 }}>
                <LinearGradient colors={gradients.primary} style={{ paddingHorizontal: 18, paddingVertical: 9 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>OK</Text>
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
  calDay:  { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginVertical: 2 },
  calDay0: { width: '14.28%', aspectRatio: 1 },
  calDayText: { fontSize: 14 },
});
