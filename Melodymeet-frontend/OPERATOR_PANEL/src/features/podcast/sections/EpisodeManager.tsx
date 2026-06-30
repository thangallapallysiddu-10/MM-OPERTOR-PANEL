// features/podcast/sections/EpisodeManager.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Recording, Podcast } from '../types';
import { RecentRecordingsList } from './RecentRecordingsList';
import { TrimModal } from './TrimModal';
import { PodcastApi } from '../../../services/api/operatorApi';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface EpisodeManagerProps {
  visible: boolean;
  onClose: () => void;
  recordings: Recording[];
  podcasts: Podcast[];
  onDeleteRecording: (id: number) => void;
  onTrimRecording: (recording: Recording) => void;
  onUseRecording: (recording: Recording) => void;
  onDeletePodcast: (id: number) => void;
  onPlayEpisode?: (podcast: Podcast) => void;
  onPublishEpisode: (episodeData: any) => void;
  onSaveDraft: (episodeData: any) => void;
  colors: any;
  gradients?: any;
  isDarkMode: boolean;
}

export const EpisodeManager: React.FC<EpisodeManagerProps> = ({
  visible,
  onClose,
  recordings,
  podcasts,
  onDeleteRecording,
  onTrimRecording,
  onUseRecording,
  onDeletePodcast,
  onPlayEpisode,
  onPublishEpisode,
  onSaveDraft,
  colors,
  gradients,
  isDarkMode,
}) => {
  // ─── STATE ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [season, setSeason] = useState('');
  const [episodeNum, setEpisodeNum] = useState('');
  const [coverArt, setCoverArt] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [schedule, setSchedule] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  // ─── CUSTOM DATE PICKER STATE ──────────────────────────────────────────
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());

  // ─── Trim Modal ──────────────────────────────────────────────────────
  const [showTrim, setShowTrim] = useState(false);
  const [trimRecording, setTrimRecording] = useState<Recording | null>(null);
  const [trimRanges, setTrimRanges] = useState<any[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [trimName, setTrimName] = useState('');
  const [trimSuccess, setTrimSuccess] = useState(false);
  const [trimPlaying, setTrimPlaying] = useState(false);
  const [trimTab, setTrimTab] = useState<'simple' | 'advanced'>('simple');
  const [waveform, setWaveform] = useState<number[]>([]);
  const [trimLoading, setTrimLoading] = useState(false);

  // ─── EFFECTS ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      resetForm();
      setWaveform(Array.from({ length: 60 }, () => Math.random() * 60 + 20));
    }
  }, [visible]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGenre('');
    setSeason('');
    setEpisodeNum('');
    setCoverArt('');
    setFileName('');
    setFileSize('');
    setSchedule('');
    setUploading(false);
    setProgress(0);
    setSelectedUri(null);
    // Reset date picker values
    const now = new Date();
    setSelectedDay(now.getDate());
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    setSelectedHour(now.getHours());
    setSelectedMinute(now.getMinutes());
  };

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const pickCoverArt = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission Denied', 'Please grant library access.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) setCoverArt(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const pickedName = asset.name || 'Local Audio File';
        setFileName(pickedName);
        
        if (!title) {
          setTitle(pickedName.replace(/\.[^/.]+$/, ''));
        }

        if (asset.size) {
          const mb = asset.size / (1024 * 1024);
          setFileSize(mb >= 1 ? `${mb.toFixed(1)} MB` : `${(asset.size / 1024).toFixed(1)} KB`);
        } else {
          setFileSize('Unknown Size');
        }
        setSelectedUri(asset.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  // ─── CUSTOM DATE PICKER HANDLERS ────────────────────────────────────────
  const openCustomDatePicker = () => {
    setShowCustomDatePicker(true);
  };

  const confirmDateSelection = () => {
    // Create date from selected values
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute);
    
    // Format the date
    const formatted = selectedDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    setSchedule(formatted);
    setShowCustomDatePicker(false);
    console.log('✅ Date selected:', formatted);
  };

  const closeCustomDatePicker = () => {
    setShowCustomDatePicker(false);
  };

  // Helper functions for date picker
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateNumberArray = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = generateNumberArray(1, 31);
  const years = generateNumberArray(2020, 2030);
  const hours = generateNumberArray(0, 23);
  const minutes = generateNumberArray(0, 59);

  const useRecording = (recording: Recording) => {
    setFileName(recording.name);
    setFileSize(recording.size || '5 MB');
    setTitle(recording.name.replace(/\.[^/.]+$/, ''));
    setSelectedUri(recording.uri ?? null);
    onUseRecording(recording);
  };

  const handleTrim = (recording: Recording) => {
    setTrimRecording(recording);
    setTrimName(recording.name.replace('.mp3', '_trimmed'));
    setTrimRanges([]);
    setTrimStart(0);
    setTrimEnd(100);
    setTrimSuccess(false);
    setTrimPlaying(false);
    setShowTrim(true);
    onTrimRecording(recording);
  };

  const saveTrim = async () => {
    if (!trimRecording) return;
    setTrimLoading(true);
    try {
      await PodcastApi.trimRecording(trimRecording.id, {
        name: trimName,
        trimRanges: trimTab === 'simple' ? [{ start: trimStart, end: trimEnd }] : trimRanges,
      });
      setTrimSuccess(true);
      setTimeout(() => {
        setShowTrim(false);
        Alert.alert('Success', 'Trimmed successfully!');
      }, 1000);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to trim recording.');
    } finally {
      setTrimLoading(false);
    }
  };

  const publishEpisode = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Enter an episode title');
    if (!fileName) return Alert.alert('Error', 'Select an audio file');

    setUploading(true);
    setProgress(0);

    try {
      const isLocalFile = selectedUri && (selectedUri.startsWith('file://') || selectedUri.startsWith('/') || selectedUri.startsWith('content://') || selectedUri.startsWith('ph://'));
      
      const episodeData: any = {
        title: title.trim(),
        description: description.trim(),
        genre: genre || 'Other',
        seasonNumber: season ? Number(season) : null,
        episodeNumber: episodeNum ? Number(episodeNum) : null,
        status: 'Published' as const,
        scheduleDate: schedule || null,
      };

      if (isLocalFile) {
        const formData = new FormData();
        formData.append('file', {
          uri: selectedUri,
          name: fileName,
          type: 'audio/mpeg',
        } as any);
        
        if (coverArt) {
          formData.append('coverArt', {
            uri: coverArt,
            name: 'cover.jpg',
            type: 'image/jpeg',
          } as any);
        }
        
        Object.keys(episodeData).forEach(key => {
          if (episodeData[key] !== null && episodeData[key] !== undefined) {
            formData.append(key, String(episodeData[key]));
          }
        });

        await onPublishEpisode({ formData, isLocal: true, onProgress: (pct: number) => setProgress(pct) });
      } else {
        let remoteCoverUrl = coverArt;
        if (coverArt && (coverArt.startsWith('file://') || coverArt.startsWith('/') || coverArt.startsWith('content://') || coverArt.startsWith('ph://'))) {
          const coverFormData = new FormData();
          coverFormData.append('coverArt', {
            uri: coverArt,
            name: 'cover.jpg',
            type: 'image/jpeg',
          } as any);
          const uploadRes = await PodcastApi.uploadCoverArt(coverFormData);
          remoteCoverUrl = uploadRes.coverArt;
        }

        const payload = {
          ...episodeData,
          fileUrl: selectedUri,
          fileName: fileName,
          fileSize: fileSize,
          coverArt: remoteCoverUrl,
          source: 'recording',
        };

        await onPublishEpisode({ payload, isLocal: false });
      }

      setUploading(false);
      resetForm();
      Alert.alert('Success!', 'Episode published successfully!');
      onClose();
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Error', error?.message || 'Failed to publish episode');
    }
  };

  const saveDraft = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Enter an episode title');
    setUploading(true);
    setProgress(0);

    try {
      const isLocalFile = selectedUri && (selectedUri.startsWith('file://') || selectedUri.startsWith('/') || selectedUri.startsWith('content://') || selectedUri.startsWith('ph://'));
      
      const episodeData: any = {
        title: title.trim(),
        description: description.trim(),
        genre: genre || 'Other',
        seasonNumber: season ? Number(season) : null,
        episodeNumber: episodeNum ? Number(episodeNum) : null,
        status: 'Draft' as const,
        scheduleDate: null,
      };

      if (isLocalFile) {
        const formData = new FormData();
        formData.append('file', {
          uri: selectedUri,
          name: fileName,
          type: 'audio/mpeg',
        } as any);
        
        if (coverArt) {
          formData.append('coverArt', {
            uri: coverArt,
            name: 'cover.jpg',
            type: 'image/jpeg',
          } as any);
        }
        
        Object.keys(episodeData).forEach(key => {
          if (episodeData[key] !== null && episodeData[key] !== undefined) {
            formData.append(key, String(episodeData[key]));
          }
        });

        await onSaveDraft({ formData, isLocal: true, onProgress: (pct: number) => setProgress(pct) });
      } else {
        let remoteCoverUrl = coverArt;
        if (coverArt && (coverArt.startsWith('file://') || coverArt.startsWith('/') || coverArt.startsWith('content://') || coverArt.startsWith('ph://'))) {
          const coverFormData = new FormData();
          coverFormData.append('coverArt', {
            uri: coverArt,
            name: 'cover.jpg',
            type: 'image/jpeg',
          } as any);
          const uploadRes = await PodcastApi.uploadCoverArt(coverFormData);
          remoteCoverUrl = uploadRes.coverArt;
        }

        const payload = {
          ...episodeData,
          fileUrl: selectedUri,
          fileName: fileName,
          fileSize: fileSize,
          coverArt: remoteCoverUrl,
          source: selectedUri ? 'recording' : 'metadata',
        };

        await onSaveDraft({ payload, isLocal: false });
      }

      setUploading(false);
      resetForm();
      Alert.alert('Success!', 'Draft saved successfully!');
      onClose();
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Error', error?.message || 'Failed to save draft');
    }
  };

  const isAudioSelected = fileName && fileName.trim().length > 0;

  if (!visible) return null;

  return (
    <>
      <View style={[styles.panelContainer, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.titleIconBg}>
              <Feather name="layers" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Episode Manager</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <Feather name="x" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.split, { flexDirection: isMobile ? 'column' : 'row' }]}>
            
            {/* Left Column - Recent Recordings */}
            <View style={[styles.left, { flex: isMobile ? 1 : 0.4 }]}>
              <View style={[styles.panelHeader, { borderBottomColor: colors.cardBorder }]}>
                <View style={styles.sectionTitleRow}>
                  <Feather name="clock" size={14} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.text }]}>Recent Recordings</Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: `${colors.accent}12` }]}>
                  <Text style={[styles.badgePillText, { color: colors.accent }]}>{recordings.length}</Text>
                </View>
              </View>
              <RecentRecordingsList
                recordings={recordings}
                onUseRecording={useRecording}
                onTrimRecording={handleTrim}
                onDeleteRecording={onDeleteRecording}
                colors={colors}
              />
            </View>

            {/* Right Column - Form */}
            <View style={[styles.right, { flex: isMobile ? 1 : 0.6 }]}>
              <View style={[styles.panelHeader, { borderBottomColor: colors.cardBorder }]}>
                <View style={styles.sectionTitleRow}>
                  <Feather name="edit-3" size={14} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.text }]}>Episode Details</Text>
                </View>
              </View>

              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                
                {/* Media Row: Thumbnail and Audio File side-by-side */}
                <View style={styles.mediaUploadRow}>
                  
                  {/* Thumbnail Box */}
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cover Artwork</Text>
                    <TouchableOpacity
                      onPress={pickCoverArt}
                      style={[
                        styles.thumbBox, 
                        { borderColor: colors.cardBorder, backgroundColor: colors.surface },
                        coverArt && styles.mediaBoxActive
                      ]}
                    >
                      {coverArt ? (
                        <Image source={{ uri: coverArt }} style={styles.thumbImage} />
                      ) : (
                        <View style={styles.mediaEmptyState}>
                          <Feather name="image" size={24} color={colors.textMuted} />
                          <Text style={[styles.mediaPlaceholder, { color: colors.textMuted }]}>Select Cover</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {coverArt ? (
                      <View style={styles.smallActionsRow}>
                        <TouchableOpacity onPress={pickCoverArt} style={[styles.smallBtn, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.smallBtnText, { color: colors.textSecondary }]}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCoverArt('')} style={[styles.smallBtn, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  {/* Audio File Box */}
                  <View style={{ flex: 1.2, gap: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Audio Source</Text>
                    <TouchableOpacity
                      onPress={pickAudioFile}
                      style={[
                        styles.fileBox, 
                        { borderColor: colors.cardBorder, backgroundColor: colors.surface },
                        isAudioSelected && styles.mediaBoxActiveSuccess
                      ]}
                    >
                      {isAudioSelected ? (
                        <View style={styles.mediaSelectedState}>
                          <View style={styles.successCheckIcon}>
                            <Feather name="check" size={14} color="#10B981" />
                          </View>
                          <Text style={[styles.fileSelectedName, { color: colors.text }]} numberOfLines={1}>
                            {fileName}
                          </Text>
                          {fileSize ? (
                            <Text style={[styles.fileSelectedSize, { color: colors.textMuted }]}>{fileSize}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.mediaEmptyState}>
                          <Feather name="music" size={24} color={colors.textMuted} />
                          <Text style={[styles.mediaPlaceholder, { color: colors.textMuted }]}>Select Audio Source</Text>
                          <Text style={styles.mediaHint}>MP3, WAV, M4A, AAC</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {isAudioSelected ? (
                      <View style={styles.smallActionsRow}>
                        <TouchableOpacity onPress={pickAudioFile} style={[styles.smallBtn, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.smallBtnText, { color: colors.textSecondary }]}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setFileName(''); setFileSize(''); setSelectedUri(null); }} style={[styles.smallBtn, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                </View>

                {/* Progress bar for upload */}
                {uploading && progress > 0 && progress < 100 ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressText, { color: colors.textMuted }]}>Uploading file to host servers...</Text>
                      <Text style={[styles.progressPercent, { color: colors.accent }]}>{progress}%</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: colors.surface }]}>
                      <LinearGradient
                        colors={gradients?.primary || ['#4F6AF0', '#6B8EFF']}
                        style={[styles.progressBarFill, { width: `${progress}%` }]}
                      />
                    </View>
                  </View>
                ) : null}

                {/* Form Fields */}
                <View style={{ marginTop: 6, gap: 12 }}>
                  
                  {/* Title input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Episode Title</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                      placeholder="Enter a descriptive title for this episode"
                      placeholderTextColor={colors.textMuted}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  {/* Season, Episode, Genre grid */}
                  <View style={styles.formRowGrid}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Season</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                        placeholder="e.g. 1"
                        placeholderTextColor={colors.textMuted}
                        value={season}
                        onChangeText={(t) => setSeason(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Episode #</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                        placeholder="e.g. 12"
                        placeholderTextColor={colors.textMuted}
                        value={episodeNum}
                        onChangeText={(t) => setEpisodeNum(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={{ flex: 1.5, gap: 6 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Genre</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                        placeholder="e.g. Talk Show"
                        placeholderTextColor={colors.textMuted}
                        value={genre}
                        onChangeText={setGenre}
                      />
                    </View>
                  </View>

                  {/* Description input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Episode Description</Text>
                    <TextInput
                      style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                      placeholder="Provide summaries, topics discussed, links, or guest details..."
                      placeholderTextColor={colors.textMuted}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Schedule */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Release Schedule</Text>
                    {schedule ? (
                      <View style={[styles.scheduleBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <Feather name="calendar" size={13} color={colors.accent} />
                        <Text style={[styles.scheduleText, { color: colors.text }]}>{schedule}</Text>
                        <TouchableOpacity onPress={() => setSchedule('')} style={styles.removeScheduleBtn}>
                          <Feather name="x" size={12} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={openCustomDatePicker}
                        style={[styles.scheduleBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                      >
                        <Feather name="clock" size={13} color={colors.textMuted} />
                        <Text style={[styles.scheduleBtnText, { color: colors.textSecondary }]}>Configure release date & time</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                </View>

                {/* Form Action buttons */}
                <View style={styles.formActionsRow}>
                  <TouchableOpacity
                    onPress={publishEpisode}
                    disabled={uploading || !isAudioSelected}
                    style={[styles.publishSubmitBtn, (uploading || !isAudioSelected) && styles.disabled]}
                  >
                    <LinearGradient colors={gradients?.primary || ['#4F6AF0', '#6B8EFF']} style={styles.gradientSubmit}>
                      <Feather name="globe" size={14} color="#FFFFFF" />
                      <Text style={styles.btnSubmitText}>
                        {uploading ? 'Publishing...' : 'Publish Episode'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveDraft}
                    disabled={uploading || !isAudioSelected}
                    style={[
                      styles.draftSubmitBtn, 
                      (uploading || !isAudioSelected) && styles.disabled, 
                      { borderColor: colors.cardBorder, backgroundColor: colors.surface }
                    ]}
                  >
                    <Feather name="file-text" size={14} color={colors.text} />
                    <Text style={[styles.btnDraftText, { color: colors.text }]}>
                      {uploading ? 'Saving...' : 'Save Draft'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isAudioSelected && !uploading ? (
                  <View style={styles.statusSuccessRow}>
                    <Feather name="check" size={12} color="#10B981" />
                    <Text style={styles.statusSuccessText}>Media Attached: {fileName}</Text>
                  </View>
                ) : null}

              </View>
            </View>

          </View>

          {/* Bottom Row - Your Episodes */}
          <View style={[styles.bottomSection, { borderTopColor: colors.cardBorder }]}>
            <View style={[styles.panelHeader, { borderBottomColor: colors.cardBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Feather name="list" size={14} color={colors.accent} />
                <Text style={[styles.panelTitle, { color: colors.text }]}>Your Episodes</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: `${colors.accent}12` }]}>
                <Text style={[styles.badgePillText, { color: colors.accent }]}>{podcasts.length}</Text>
              </View>
            </View>

            <View style={styles.episodesGridWrap}>
              {podcasts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBg}>
                    <Feather name="layers" size={26} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyText, { color: colors.text }]}>No episodes yet</Text>
                  <Text style={[styles.emptySubText, { color: colors.textMuted }]}>Episodes you publish or save as drafts will appear here</Text>
                </View>
              ) : (
                <View style={styles.episodesGrid}>
                  {podcasts.map((p) => {
                    const isDraft = p.status === 'Draft';
                    return (
                      <View key={p.id} style={[styles.episodeCardItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <View style={styles.episodeCardLeft}>
                          <View style={[styles.epArtworkBg, { backgroundColor: colors.surface }]}>
                            {p.coverArt ? (
                              <Image source={{ uri: p.coverArt }} style={styles.epArtworkImage} />
                            ) : (
                              <Feather name="mic" size={16} color={colors.accent} />
                            )}
                          </View>
                          <View style={styles.epCardMeta}>
                            <Text style={[styles.epCardTitle, { color: colors.text }]} numberOfLines={1}>{p.title}</Text>
                            <Text style={[styles.epCardFileName, { color: colors.textMuted }]} numberOfLines={1}>{p.fileName}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.episodeCardRight}>
                          <View style={[
                            styles.statusBadge, 
                            { 
                              backgroundColor: isDraft ? 'rgba(217, 119, 6, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                              borderColor: isDraft ? 'rgba(217, 119, 6, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                            }
                          ]}>
                            <Text style={[styles.statusBadgeText, { color: isDraft ? colors.warning : colors.success }]}>
                              {p.status}
                            </Text>
                          </View>

                          <View style={styles.actionButtonsRow}>
                            {onPlayEpisode && (
                              <TouchableOpacity onPress={() => onPlayEpisode?.(p)} style={styles.actionIconBtn}>
                                <Feather name="play-circle" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => onDeletePodcast(p.id as number)} style={styles.actionIconBtn}>
                              <Feather name="trash-2" size={15} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      </View>

      {/* ─── CUSTOM DATE PICKER MODAL ────────────────────────────────────── */}
      <Modal
        visible={showCustomDatePicker}
        transparent
        animationType="fade"
        onRequestClose={closeCustomDatePicker}
      >
        <View style={styles.datePickerOverlay}>
          <View style={[styles.datePickerContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.datePickerTitle, { color: colors.text }]}>Select Release Schedule</Text>
            
            <View style={styles.datePickerSelectorGrid}>
              
              {/* Month */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>Month</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedMonth(index)}
                      style={[
                        styles.pickerRowItem,
                        selectedMonth === index && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.pickerRowItemText,
                        { color: selectedMonth === index ? '#FFF' : colors.text }
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>Day</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.pickerRowItem,
                        selectedDay === day && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.pickerRowItemText,
                        { color: selectedDay === day ? '#FFF' : colors.text }
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>Year</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => setSelectedYear(year)}
                      style={[
                        styles.pickerRowItem,
                        selectedYear === year && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.pickerRowItemText,
                        { color: selectedYear === year ? '#FFF' : colors.text }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Hour */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>Hour</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator={false}>
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      onPress={() => setSelectedHour(hour)}
                      style={[
                        styles.pickerRowItem,
                        selectedHour === hour && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.pickerRowItemText,
                        { color: selectedHour === hour ? '#FFF' : colors.text }
                      ]}>
                        {String(hour).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>Minute</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator={false}>
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      onPress={() => setSelectedMinute(minute)}
                      style={[
                        styles.pickerRowItem,
                        selectedMinute === minute && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.pickerRowItemText,
                        { color: selectedMinute === minute ? '#FFF' : colors.text }
                      ]}>
                        {String(minute).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

            </View>

            <View style={styles.pickerActionsRow}>
              <TouchableOpacity onPress={closeCustomDatePicker} style={[styles.pickerCancelBtn, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.pickerCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDateSelection}
                style={[styles.pickerConfirmBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.pickerConfirmBtnText}>Confirm Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trim Modal */}
      <TrimModal
        visible={showTrim}
        currentRecording={trimRecording}
        trimRanges={trimRanges}
        currentRangeStart={trimStart}
        currentRangeEnd={trimEnd}
        trimFileName={trimName}
        trimPreviewDuration="00:00"
        trimSaveSuccess={trimSuccess}
        previewPlaying={trimPlaying}
        activeTrimTab={trimTab}
        waveformData={waveform}
        loading={trimLoading}
        onClose={() => setShowTrim(false)}
        onRangeStartChange={setTrimStart}
        onRangeEndChange={setTrimEnd}
        onAddTrimRange={() => {
          if (trimStart >= trimEnd) return Alert.alert('Invalid', 'Start must be less than end');
          setTrimRanges([...trimRanges, { start: trimStart, end: trimEnd }]);
          setTrimStart(0);
          setTrimEnd(100);
        }}
        onRemoveTrimRange={(i) => setTrimRanges(trimRanges.filter((_, idx) => idx !== i))}
        onClearAllRanges={() => setTrimRanges([])}
        onTrimFileNameChange={setTrimName}
        onPreview={() => setTrimPlaying(!trimPlaying)}
        onSave={saveTrim}
        onTabChange={setTrimTab}
        colors={colors}
      />
    </>
  );
};

const styles = StyleSheet.create({
  panelContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    width: '100%',
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  titleIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#4F6AF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  split: {
    flex: 1,
    gap: 20,
  },
  left: {
    minHeight: 250,
  },
  right: {
    minHeight: 350,
  },
  bottomSection: {
    borderTopWidth: 1,
    paddingTop: 20,
    marginTop: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  mediaUploadRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  thumbBox: {
    borderWidth: 1,
    borderRadius: 12,
    height: 94,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaBoxActive: {
    borderColor: '#4F6AF0',
  },
  mediaBoxActiveSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
    borderStyle: 'solid',
  },
  mediaEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
  },
  mediaPlaceholder: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  mediaHint: {
    fontSize: 8.5,
    color: '#64748B',
  },
  fileBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSelectedState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
  },
  successCheckIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  fileSelectedName: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  fileSelectedSize: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  smallActionsRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
  },
  smallBtn: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 4,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
  },
  formRowGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  formTextArea: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  removeScheduleBtn: {
    padding: 2,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
  },
  scheduleBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  publishSubmitBtn: {
    flex: 1.2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  draftSubmitBtn: {
    flex: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 10,
  },
  gradientSubmit: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnSubmitText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDraftText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  statusSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  statusSuccessText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  episodesGridWrap: {
    minHeight: 120,
  },
  episodeCardItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  episodeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  epArtworkBg: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  epArtworkImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  epCardMeta: {
    flex: 1,
    gap: 2,
  },
  epCardTitle: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  epCardFileName: {
    fontSize: 10,
  },
  episodeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default EpisodeManager;