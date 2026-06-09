import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { PlaylistTrack } from '../../types';

// ─── Monitor data shape ────────────────────────────────────────────────────
export interface PlaylistMonitorData {
  currentTrackTitle: string;
  currentTrackArtist: string;
  trackPosition: string;
  trackDuration: string;
  sessionRuntime: string;
  sessionTarget: string;
  tracksPlayed: number;
  remainingTracks: number;
  playlistStatus: 'Playing' | 'Paused' | 'Stopped';
  totalTracks: number;
  currentTrackAudioUrl?: string | null;
}

interface LocalFileItem {
  id: string;
  name: string;
  duration: string;
}

// Props: only what the modal actually uses
interface PlaylistModalProps {
  visible: boolean;
  playlist: PlaylistTrack[];
  uploadedLocalFiles: LocalFileItem[];
  playlistDuration: number;
  customDuration: string;
  timerRemaining: number;
  isPlaylistActive: boolean;
  isPlaylistPaused: boolean;
  isDarkMode: boolean;
  colors: any;
  monitorData?: PlaylistMonitorData;
  currentPlaylistIndex?: number;
  /** Whether the operator is currently listening (Listen Music ON) */
  isListening: boolean;
  /** Toggle Listen Music — only mutes/unmutes, never changes playlist state */
  onListenToggle: () => void;
  isSongInPlaylist: (title: string, artist: string) => boolean;
  onClose: () => void;
  onAddLocalFile: (file: LocalFileItem) => void;
  onUploadAndAddLocalFile?: () => unknown | Promise<unknown>;
  onClearPlaylist: () => void;
  onRemoveSong: (id: number) => void;
  onStartPlaylist: () => void;
  onPausePlaylist: () => void;
  onResumePlaylist: () => void;
  onStopPlaylist: () => void;
  onSkipToNext: () => void | Promise<void>;
  onSetDuration: (duration: number) => void;
  onSetCustomDuration: (value: string) => void;
  formatTimer: (minutes: number) => string;
}

// ─── isWeb detection — kept only for PlaylistPreviewPlayer (isolated preview)
// NOTE: PlaylistPreviewPlayer has been REMOVED. The Listen button now calls
// onListenToggle() which mutes/unmutes the already-playing PlaylistPlayer.
// No second audio instance is created.

// ─── Compact status bar ───────────────────────────────────────────────────
const PlaylistStatusBar = ({
  monitorData,
  isDarkMode,
  textPrimary,
  textMuted,
  border,
  accent,
  isListening,
  onListenToggle,
}: {
  monitorData: PlaylistMonitorData;
  isDarkMode: boolean;
  textPrimary: string;
  textMuted: string;
  border: string;
  accent: string;
  isListening: boolean;
  onListenToggle: () => void;
}) => {
  const statusColor = {
    Playing: '#22C55E',
    Paused: '#F59E0B',
    Stopped: isDarkMode ? '#6B7280' : '#9CA3AF',
  }[monitorData.playlistStatus];

  // Only show Listen button when playlist is active (playing or paused)
  const showListen = monitorData.playlistStatus !== 'Stopped';

  return (
    <View
      style={{
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {/* Status dot + label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
            {monitorData.playlistStatus}
          </Text>
        </View>

        <Text style={{ fontSize: 11, color: isDarkMode ? '#374151' : '#D1D5DB' }}>|</Text>

        {/* Track name */}
        <Text
          style={{ fontSize: 11, fontWeight: '600', color: textPrimary, flexShrink: 1, maxWidth: 160 }}
          numberOfLines={1}
        >
          {monitorData.currentTrackTitle}
        </Text>

        <Text style={{ fontSize: 11, color: isDarkMode ? '#374151' : '#D1D5DB' }}>|</Text>

        {/* Position */}
        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: textMuted }}>
          {monitorData.trackPosition}/{monitorData.trackDuration}
        </Text>

        <Text style={{ fontSize: 11, color: isDarkMode ? '#374151' : '#D1D5DB' }}>|</Text>

        {/* Counts + runtime */}
        <Text style={{ fontSize: 11, color: textMuted }}>
          ✓{monitorData.tracksPlayed} · ↓{monitorData.remainingTracks} · {monitorData.sessionRuntime}
        </Text>

        {/* Listen Music toggle — pushed to right.
            ONLY mutes/unmutes the already-playing PlaylistPlayer.
            Does NOT start a new audio instance.
            Does NOT change playlist state. */}
        {showListen && (
          <TouchableOpacity
            onPress={onListenToggle}
            style={{
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: isListening
                ? '#22C55E'
                : isDarkMode ? '#1F2937' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isListening ? '#22C55E' : '#22C55E',
            }}
          >
            <Ionicons
              name={isListening ? 'headset' : 'headset-outline'}
              size={13}
              color={isListening ? '#FFFFFF' : '#22C55E'}
            />
            <Text style={{ fontSize: 10, fontWeight: '700', color: isListening ? '#FFFFFF' : '#22C55E' }}>
              {isListening ? 'Listening' : 'Listen'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Custom duration input ─────────────────────────────────────────────────
const CustomDurationInput = ({
  onSet,
  isDarkMode,
  textPrimary,
  border,
  accent,
}: {
  onSet: (value: string) => void;
  isDarkMode: boolean;
  textPrimary: string;
  border: string;
  accent: string;
}) => {
  const [localValue, setLocalValue] = useState('');
  const handleSet = () => {
    if (localValue.trim()) { onSet(localValue); setLocalValue(''); }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        style={{
          flex: 1,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 7,
          fontSize: 13,
          backgroundColor: isDarkMode ? '#243044' : '#F8FAFC',
          borderWidth: 1,
          borderColor: border,
          color: textPrimary,
        }}
        placeholder="Custom minutes (1-480)"
        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
        value={localValue}
        onChangeText={setLocalValue}
        keyboardType="numeric"
      />
      <TouchableOpacity
        onPress={handleSet}
        style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: accent }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Set</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Playlist Modal ───────────────────────────────────────────────────
export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  visible,
  playlist,
  uploadedLocalFiles,
  playlistDuration,
  customDuration,
  timerRemaining,
  isPlaylistActive,
  isPlaylistPaused,
  isDarkMode,
  onClose,
  isSongInPlaylist,
  onAddLocalFile,
  onUploadAndAddLocalFile,
  onClearPlaylist,
  onRemoveSong,
  onStartPlaylist,
  onPausePlaylist,
  onResumePlaylist,
  onStopPlaylist,
  onSkipToNext,
  onSetDuration,
  onSetCustomDuration,
  formatTimer,
  monitorData,
  currentPlaylistIndex = 0,
  isListening,
  onListenToggle,
}) => {
  const [search, setSearch] = useState('');

  const cardBg    = isDarkMode ? '#1A2332' : '#FFFFFF';
  const border    = isDarkMode ? '#2D3A4F' : '#E2E8F0';
  const textPrimary = isDarkMode ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDarkMode ? '#94A3B8' : '#64748B';
  const accent      = isDarkMode ? '#38BDF8' : '#0284C7';

  const filteredLocal = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uploadedLocalFiles;
    return uploadedLocalFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [uploadedLocalFiles, search]);

  const renderLocalCard = (file: LocalFileItem) => {
    const title = file.name.replace(/\.[^/.]+$/, '');
    const added = isSongInPlaylist(title, 'Local File');
    return (
      <TouchableOpacity
        key={`local-${file.id}`}
        onPress={() => !added && onAddLocalFile(file)}
        disabled={added}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 10,
          marginRight: 8,
          minWidth: 130,
          backgroundColor: added
            ? isDarkMode ? '#0F172A' : '#F1F5F9'
            : isDarkMode ? '#1E3A2F' : '#ECFDF5',
          borderWidth: 1,
          borderColor: added ? border : '#10B981',
          opacity: added ? 0.65 : 1,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontSize: 10, color: textMuted }}>{file.duration}</Text>
          <Feather
            name={added ? 'check-circle' : 'plus-circle'}
            size={14}
            color={added ? textMuted : '#10B981'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View
          style={{
            maxHeight: '92%',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          {/* ── Header ── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>Playlist</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
                {playlist.length} track{playlist.length !== 1 ? 's' : ''} queued
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Feather name="x" size={22} color={textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── Compact status bar ── */}
          {monitorData && (
            <PlaylistStatusBar
              monitorData={monitorData}
              isDarkMode={isDarkMode}
              textPrimary={textPrimary}
              textMuted={textMuted}
              border={border}
              accent={accent}
              isListening={isListening}
              onListenToggle={onListenToggle}
            />
          )}

          {/* ── Search ── */}
          <TextInput
            style={{
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 13,
              marginBottom: 12,
              backgroundColor: isDarkMode ? '#243044' : '#F1F5F9',
              borderWidth: 1,
              borderColor: border,
              color: textPrimary,
            }}
            placeholder="Search tracks..."
            placeholderTextColor={textMuted}
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>

            {/* ── Music Library (local uploaded files) ── */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>Music Library</Text>
                {onUploadAndAddLocalFile && (
                  <TouchableOpacity
                    onPress={() => void onUploadAndAddLocalFile()}
                    style={{ paddingVertical: 3, paddingHorizontal: 8 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: accent }}>+ Upload</Text>
                  </TouchableOpacity>
                )}
              </View>

              {uploadedLocalFiles.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 16,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Feather name="upload-cloud" size={22} color={textMuted} />
                  <Text style={{ fontSize: 12, color: textMuted, textAlign: 'center' }}>
                    Upload MP3, WAV, M4A or FLAC to build your library
                  </Text>
                  {onUploadAndAddLocalFile && (
                    <TouchableOpacity
                      onPress={() => void onUploadAndAddLocalFile()}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: accent,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Upload & add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingRight: 6 }}
                >
                  {filteredLocal.length > 0
                    ? filteredLocal.map(renderLocalCard)
                    : <Text style={{ fontSize: 12, color: textMuted, paddingVertical: 10 }}>No matching tracks</Text>
                  }
                </ScrollView>
              )}
            </View>

            <View style={{ height: 1, marginVertical: 10, backgroundColor: border }} />

            {/* ── Session duration ── */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 8, color: textPrimary }}>
                Session duration
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {[30, 60, 90, 120].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    onPress={() => onSetDuration(dur)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor:
                        playlistDuration === dur && !customDuration
                          ? accent
                          : isDarkMode ? '#243044' : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: playlistDuration === dur && !customDuration ? '#FFFFFF' : textPrimary,
                      }}
                    >
                      {dur}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <CustomDurationInput
                onSet={onSetCustomDuration}
                isDarkMode={isDarkMode}
                textPrimary={textPrimary}
                border={border}
                accent={accent}
              />
              <Text style={{ fontSize: 10, marginTop: 5, color: textMuted }}>
                {customDuration
                  ? `Custom: ${customDuration} min`
                  : playlistDuration > 0
                    ? `Selected: ${playlistDuration} min`
                    : 'Default: 60 min'}
              </Text>
            </View>

            <View style={{ height: 1, marginVertical: 10, backgroundColor: border }} />

            {/* ── Playlist Queue ── */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>
                  Queue ({playlist.length})
                </Text>
                {playlist.length > 0 && (
                  <TouchableOpacity onPress={onClearPlaylist}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>

              {playlist.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
                  <Feather name="music" size={28} color={textMuted} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: textMuted }}>No tracks added yet</Text>
                  <Text style={{ fontSize: 11, color: textMuted, textAlign: 'center' }}>
                    Upload tracks above or tap + to add
                  </Text>
                </View>
              ) : (
                <>
                  {!isPlaylistActive && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        marginBottom: 8,
                        backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: border,
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={accent} />
                      <Text style={{ fontSize: 11, color: textMuted }}>Playlist ready to start</Text>
                    </View>
                  )}

                  {playlist.map((item, index) => {
                    const isActive = isPlaylistActive && index === currentPlaylistIndex;
                    return (
                      <View
                        key={`pl-${item.id}-${index}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 9,
                          borderRadius: 10,
                          marginBottom: 6,
                          backgroundColor: isActive
                            ? isDarkMode ? '#0C2340' : '#EFF6FF'
                            : isDarkMode ? '#1E2D3D' : '#F8FAFC',
                          borderWidth: isActive ? 1.5 : 1,
                          borderColor: isActive ? accent : border,
                        }}
                      >
                        {isActive ? (
                          <View style={{ width: 22, alignItems: 'center' }}>
                            <Feather name="play" size={12} color={accent} />
                          </View>
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: '600', width: 22, color: textMuted, textAlign: 'center' }}>
                            {index + 1}
                          </Text>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 13, fontWeight: isActive ? '700' : '500', color: isActive ? accent : textPrimary }}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text style={{ fontSize: 10, color: textMuted }}>
                            {item.artist} · {item.duration}
                          </Text>
                        </View>
                        {isActive && (
                          <View style={{
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            borderRadius: 5,
                            backgroundColor: isDarkMode ? '#1E3A5F' : '#DBEAFE',
                          }}>
                            <Text style={{ fontSize: 8, fontWeight: '700', color: accent }}>NOW</Text>
                          </View>
                        )}
                        <TouchableOpacity onPress={() => onRemoveSong(item.id)} style={{ padding: 6 }}>
                          <Feather name="trash-2" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>

          {/* ── Active controls: PAUSE/RESUME · STOP · NEXT ── */}
          {isPlaylistActive && (
            <View
              style={{
                gap: 8,
                marginBottom: 8,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name="timer-outline" size={12} color={textMuted} />
                <Text style={{ fontSize: 11, color: textMuted }}>
                  Remaining:{' '}
                  <Text style={{ fontWeight: '600', color: textPrimary }}>{formatTimer(timerRemaining)}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* PAUSE / RESUME — single responsibility: pause or resume only */}
                <TouchableOpacity
                  onPress={isPlaylistPaused ? onResumePlaylist : onPausePlaylist}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 10,
                    backgroundColor: accent,
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Feather name={isPlaylistPaused ? 'play' : 'pause'} size={15} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
                    {isPlaylistPaused ? 'RESUME' : 'PAUSE'}
                  </Text>
                </TouchableOpacity>

                {/* STOP — single responsibility: stop playlist only */}
                <TouchableOpacity
                  onPress={onStopPlaylist}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 10,
                    backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Feather name="square" size={15} color={textPrimary} />
                  <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 13 }}>STOP</Text>
                </TouchableOpacity>

                {/* NEXT — single responsibility: advance queue only */}
                <TouchableOpacity
                  onPress={() => { void onSkipToNext(); }}
                  disabled={(monitorData?.remainingTracks ?? 0) === 0}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 10,
                    backgroundColor: isDarkMode ? '#1E3A5F' : '#EFF6FF',
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                    borderWidth: 1,
                    borderColor: (monitorData?.remainingTracks ?? 0) === 0 ? border : accent,
                    opacity: (monitorData?.remainingTracks ?? 0) === 0 ? 0.4 : 1,
                  }}
                >
                  <Feather
                    name="skip-forward"
                    size={15}
                    color={(monitorData?.remainingTracks ?? 0) === 0 ? textMuted : accent}
                  />
                  <Text style={{
                    fontWeight: '600', fontSize: 13,
                    color: (monitorData?.remainingTracks ?? 0) === 0 ? textMuted : accent,
                  }}>
                    NEXT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── START — only shown when not active; only starts playlist ── */}
          {!isPlaylistActive && (
            <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: border }}>
              <TouchableOpacity
                onPress={onStartPlaylist}
                disabled={playlist.length === 0}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, paddingVertical: 13, borderRadius: 12,
                  backgroundColor: playlist.length === 0
                    ? isDarkMode ? '#334155' : '#CBD5E1'
                    : accent,
                }}
              >
                <Feather name="play" size={17} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Start Playlist</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
