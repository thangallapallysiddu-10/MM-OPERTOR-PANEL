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

  const saveTrim = () => {
    setTrimLoading(true);
    setTimeout(() => {
      setTrimSuccess(true);
      setTrimLoading(false);
      setTimeout(() => {
        setShowTrim(false);
        Alert.alert('Success', 'Trimmed successfully!');
      }, 1000);
    }, 1500);
  };

  const publishEpisode = () => {
    if (!title.trim()) return Alert.alert('Error', 'Enter an episode title');
    if (!fileName) return Alert.alert('Error', 'Select an audio file');

    setUploading(true);
    setProgress(0);

    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        const data = {
          id: Date.now(),
          title: title.trim(),
          description: description.trim() || 'No description',
          genre: genre || 'Other',
          seasonNumber: season ? Number(season) : null,
          episodeNumber: episodeNum ? Number(episodeNum) : null,
          coverArt: coverArt || null,
          fileName: fileName,
          fileSize: fileSize || '0 MB',
          schedule: schedule || 'Not scheduled',
          status: 'Published' as const,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }),
          uri: selectedUri,
        };
        try {
          onPublishEpisode(data);
          setUploading(false);
          resetForm();
          Alert.alert('Success!', 'Episode published!');
          onClose();
        } catch (error) {
          setUploading(false);
          Alert.alert('Error', 'Failed to publish');
        }
      }
    }, 200);
  };

  const saveDraft = () => {
    if (!title.trim()) return Alert.alert('Error', 'Enter an episode title');
    setUploading(true);
    setTimeout(() => {
      const data = {
        id: Date.now(),
        title: title.trim(),
        description: description.trim() || 'No description',
        genre: genre || 'Other',
        seasonNumber: season ? Number(season) : null,
        episodeNumber: episodeNum ? Number(episodeNum) : null,
        coverArt: coverArt || null,
        fileName: fileName || 'Draft',
        fileSize: fileSize || '0 MB',
        schedule: schedule || 'Not scheduled',
        status: 'Draft' as const,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        uri: selectedUri,
      };
      try {
        onSaveDraft(data);
        setUploading(false);
        resetForm();
        Alert.alert('Success!', 'Draft saved!');
        onClose();
      } catch (error) {
        setUploading(false);
        Alert.alert('Error', 'Failed to save draft');
      }
    }, 1000);
  };

  const isAudioSelected = fileName && fileName.trim().length > 0;

  if (!visible) return null;

  return (
    <>
      <View style={[styles.modal, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.title, { color: colors.text }]}>Episode Manager</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.split, { flexDirection: isMobile ? 'column' : 'row' }]}>
                {/* Left - Recordings */}
                <View style={[styles.left, { flex: isMobile ? 1 : 0.4 }]}>
                  <View style={[styles.panelHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Feather name="clock" size={16} color={colors.textSecondary} />
                    <Text style={[styles.panelTitle, { color: colors.text }]}>Recent Recordings</Text>
                    <Text style={[styles.count, { color: colors.textMuted }]}>{recordings.length}</Text>
                  </View>
                  <RecentRecordingsList
                    recordings={recordings}
                    onUseRecording={useRecording}
                    onTrimRecording={handleTrim}
                    onDeleteRecording={onDeleteRecording}
                    colors={colors}
                  />
                </View>

                {/* Right - Form */}
                <View style={[styles.right, { flex: isMobile ? 1 : 0.6 }]}>
                  <View style={[styles.panelHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Feather name="edit" size={16} color={colors.textSecondary} />
                    <Text style={[styles.panelTitle, { color: colors.text }]}>Episode Details</Text>
                  </View>

                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    {/* Thumbnail */}
                    <Text style={[styles.label, { color: colors.textMuted }]}>Thumbnail</Text>
                    <TouchableOpacity
                      onPress={pickCoverArt}
                      style={[styles.thumbBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                    >
                      {coverArt ? (
                        <Image source={{ uri: coverArt }} style={styles.thumbImage} />
                      ) : (
                        <View style={styles.thumbEmpty}>
                          <Feather name="image" size={28} color={colors.textSecondary} />
                          <Text style={[styles.placeholder, { color: colors.textMuted }]}>Tap to select</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {coverArt && (
                      <View style={styles.row}>
                        <TouchableOpacity onPress={pickCoverArt} style={[styles.btnSmall, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.btnSmallText, { color: colors.textSecondary }]}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCoverArt('')} style={[styles.btnSmall, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.btnSmallText, { color: colors.textMuted }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Audio File */}
                    <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>Audio File</Text>
                    <TouchableOpacity
                      onPress={pickAudioFile}
                      style={[styles.fileBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                    >
                      <Feather name="music" size={28} color={colors.textSecondary} />
                      <Text style={[styles.placeholder, { color: isAudioSelected ? colors.text : colors.textMuted }]}>
                        {fileName || 'Tap to select audio'}
                      </Text>
                      {isAudioSelected && fileSize && (
                        <Text style={[styles.fileSize, { color: colors.textMuted }]}>{fileSize}</Text>
                      )}
                    </TouchableOpacity>
                    {!isAudioSelected && (
                      <Text style={[styles.hint, { color: colors.textMuted }]}>MP3, WAV, M4A, AAC</Text>
                    )}
                    {isAudioSelected && (
                      <View style={styles.row}>
                        <TouchableOpacity onPress={pickAudioFile} style={[styles.btnSmall, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.btnSmallText, { color: colors.textSecondary }]}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setFileName(''); setFileSize(''); setSelectedUri(null); }} style={[styles.btnSmall, { borderColor: colors.cardBorder }]}>
                          <Text style={[styles.btnSmallText, { color: colors.textMuted }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Progress */}
                    {uploading && progress > 0 && progress < 100 && (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressRow}>
                          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Uploading...</Text>
                          <Text style={[styles.progressVal, { color: colors.textSecondary }]}>{progress}%</Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: colors.cardBorder }]}>
                          <LinearGradient
                            colors={gradients?.primary || [colors.text, colors.textSecondary]}
                            style={[styles.progressFill, { width: `${progress}%` }]}
                          />
                        </View>
                      </View>
                    )}

                    {/* Form Fields */}
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text, marginTop: 10 }]}
                      placeholder="Episode title"
                      placeholderTextColor={colors.textMuted}
                      value={title}
                      onChangeText={setTitle}
                    />

                    <View style={styles.row}>
                      <TextInput
                        style={[styles.input, styles.half, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                        placeholder="Season"
                        placeholderTextColor={colors.textMuted}
                        value={season}
                        onChangeText={(t) => setSeason(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                      <TextInput
                        style={[styles.input, styles.half, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                        placeholder="Episode #"
                        placeholderTextColor={colors.textMuted}
                        value={episodeNum}
                        onChangeText={(t) => setEpisodeNum(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    </View>

                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                      placeholder="Genre"
                      placeholderTextColor={colors.textMuted}
                      value={genre}
                      onChangeText={setGenre}
                    />

                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                      placeholder="Description"
                      placeholderTextColor={colors.textMuted}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                    />

                    {/* Schedule */}
                    <Text style={[styles.label, { color: colors.textMuted }]}>Schedule</Text>
                    {schedule ? (
                      <View style={[styles.scheduleBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <Feather name="calendar" size={14} color={colors.textSecondary} />
                        <Text style={[styles.scheduleText, { color: colors.textSecondary }]}>{schedule}</Text>
                        <TouchableOpacity onPress={() => setSchedule('')}>
                          <Feather name="x" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    
                    {/* CUSTOM DATE PICKER TRIGGER BUTTON */}
                    <TouchableOpacity
                      onPress={openCustomDatePicker}
                      style={[styles.scheduleBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    >
                      <Feather name="calendar" size={16} color={colors.text} />
                      <Text style={[styles.scheduleBtnText, { color: colors.text }]}>Select Date & Time</Text>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.actions}>
                      <TouchableOpacity
                        onPress={publishEpisode}
                        disabled={uploading || !isAudioSelected}
                        style={[styles.publishBtn, (uploading || !isAudioSelected) && styles.disabled]}
                      >
                        <LinearGradient colors={gradients?.primary || [colors.text, colors.textSecondary]} style={styles.gradient}>
                          <Text style={[styles.btnText, { color: colors.background }]}>
                            {uploading ? 'Publishing...' : 'Publish'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={saveDraft}
                        disabled={uploading || !isAudioSelected}
                        style={[styles.draftBtn, (uploading || !isAudioSelected) && styles.disabled, { borderColor: colors.cardBorder }]}
                      >
                        <Text style={[styles.btnText, { color: colors.text }]}>
                          {uploading ? 'Saving...' : 'Save Draft'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isAudioSelected && !uploading && (
                      <View style={styles.status}>
                        <Feather name="check-circle" size={14} color={colors.textSecondary} />
                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>Ready: {fileName}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Episodes List */}
              <View style={[styles.bottom, { borderTopColor: colors.cardBorder }]}>
                <View style={[styles.panelHeader, { borderBottomColor: colors.cardBorder }]}>
                  <Feather name="list" size={16} color={colors.textSecondary} />
                  <Text style={[styles.panelTitle, { color: colors.text }]}>Your Episodes</Text>
                  <Text style={[styles.count, { color: colors.textMuted }]}>{podcasts.length}</Text>
                </View>
                <View style={styles.episodesWrap}>
                  {podcasts.length === 0 ? (
                    <View style={styles.empty}>
                      <Feather name="music" size={32} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textMuted }]}>No episodes yet</Text>
                    </View>
                  ) : (
                    podcasts.map((p) => (
                      <View key={p.id} style={[styles.episodeItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <View style={styles.episodeInfo}>
                          <View style={[styles.epThumb, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                            <Feather name="mic" size={16} color={colors.textSecondary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.epTitle, { color: colors.text }]} numberOfLines={1}>{p.title}</Text>
                            <Text style={[styles.epMeta, { color: colors.textMuted }]}>{p.fileName}</Text>
                          </View>
                        </View>
                        <View style={styles.epActions}>
                          <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}>
                            <Text style={[styles.badgeText, { color: colors.success }]}>{p.status}</Text>
                          </View>
                          {onPlayEpisode && (
                            <TouchableOpacity onPress={() => onPlayEpisode?.(p)}>
                              <Feather name="play-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => onDeletePodcast(p.id as number)}>
                            <Feather name="trash-2" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
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
            <Text style={[styles.datePickerTitle, { color: colors.text }]}>Select Date & Time</Text>
            
            <View style={styles.datePickerRow}>
              {/* Month */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>Month</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedMonth(index)}
                      style={[
                        styles.datePickerItem,
                        selectedMonth === index && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        { color: selectedMonth === index ? '#FFF' : colors.text }
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>Day</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.datePickerItem,
                        selectedDay === day && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        { color: selectedDay === day ? '#FFF' : colors.text }
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>Year</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => setSelectedYear(year)}
                      style={[
                        styles.datePickerItem,
                        selectedYear === year && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        { color: selectedYear === year ? '#FFF' : colors.text }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Hour */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>Hour</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      onPress={() => setSelectedHour(hour)}
                      style={[
                        styles.datePickerItem,
                        selectedHour === hour && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        { color: selectedHour === hour ? '#FFF' : colors.text }
                      ]}>
                        {String(hour).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>Minute</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      onPress={() => setSelectedMinute(minute)}
                      style={[
                        styles.datePickerItem,
                        selectedMinute === minute && { backgroundColor: colors.accent }
                      ]}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        { color: selectedMinute === minute ? '#FFF' : colors.text }
                      ]}>
                        {String(minute).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                onPress={closeCustomDatePicker}
                style={[styles.datePickerCancel, { borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.datePickerCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDateSelection}
                style={[styles.datePickerConfirm, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modal: { borderRadius: 12, padding: 16, borderWidth: 1, width: '100%', minHeight: 400 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold' },
  split: { flex: 1, gap: 16 },
  left: { minHeight: 200 },
  right: { minHeight: 300 },
  bottom: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, marginBottom: 8 },
  panelTitle: { fontSize: 14, fontWeight: '600' },
  count: { fontSize: 11, marginLeft: 'auto' },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  label: { fontSize: 11, marginBottom: 4 },
  thumbBox: { borderWidth: 1, borderRadius: 10, height: 100, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  thumbEmpty: { alignItems: 'center', gap: 4 },
  fileBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  placeholder: { fontSize: 12, textAlign: 'center' },
  fileSize: { fontSize: 11, marginTop: 2 },
  hint: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 6, marginTop: 4, justifyContent: 'center' },
  btnSmall: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  btnSmallText: { fontSize: 11, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, marginBottom: 6 },
  half: { flex: 1 },
  textArea: { minHeight: 50, textAlignVertical: 'top' },
  scheduleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 },
  scheduleText: { fontSize: 11 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingVertical: 8 },
  scheduleBtnText: { fontSize: 12, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  publishBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  draftBtn: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  gradient: { paddingVertical: 8, alignItems: 'center' },
  btnText: { fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 },
  statusText: { fontSize: 10, fontWeight: '500' },
  progressWrap: { marginBottom: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  progressLabel: { fontSize: 11 },
  progressVal: { fontSize: 11, fontWeight: '500' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  episodesWrap: { maxHeight: 200 },
  empty: { padding: 16, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 12 },
  episodeItem: { borderRadius: 10, borderWidth: 1, padding: 8, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  episodeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  epThumb: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  epTitle: { fontSize: 12, fontWeight: '500' },
  epMeta: { fontSize: 9 },
  epActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 9, fontWeight: '500' },
  // Custom Date Picker Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  datePickerScroll: {
    maxHeight: 200,
    width: '100%',
  },
  datePickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 2,
  },
  datePickerItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default EpisodeManager;