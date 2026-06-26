import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { PlaylistTrack } from '../../types';

// ─── TYPES ───────────────────────────────────────────────────────────────────

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
  uri?: string;
  filePath?: string;
}

interface PlaylistModalProps {
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
  isListening: boolean;
  onListenToggle: () => void;
  isSongInPlaylist: (title: string, artist: string) => boolean;
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
  onPlayTrack?: (track: PlaylistTrack) => void;
  onLoadToStandby?: (track: PlaylistTrack) => void;
  onAddTrack?: (track: PlaylistTrack) => void;
  onRemoveTrack?: (id: number) => void;
  onShuffle?: () => void;
  onLoop?: () => void;
  onCue?: () => void;
  onUrlSubmit?: (url: string) => void;
  currentlyPlayingTrackId?: number | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const THUMB_COLORS = [
  '#FF6B35', '#6C63FF', '#0f3460', '#e94560', '#0d7377',
  '#b5179e', '#f72585', '#4361ee', '#3a0ca3', '#7209b7',
];

// YouTube API Key - You need to get this from Google Cloud Console
// Get it from: https://console.cloud.google.com/apis/library/youtube.googleapis.com
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE'; // Replace with your actual API key

// Extract YouTube Video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
    /(?:youtube\.com\/v\/)([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube video metadata
async function fetchYouTubeMetadata(url: string): Promise<{ title: string; artist: string; duration: string; thumbnail: string } | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
    // Fallback when API key is not configured
    return {
      title: `YouTube Video`,
      artist: 'YouTube',
      duration: '--:--',
      thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    };
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const title = item.snippet.title;
      const artist = item.snippet.channelTitle;
      
      // Convert ISO 8601 duration to MM:SS
      let duration = item.contentDetails.duration;
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match?.[1] || '0');
      const minutes = parseInt(match?.[2] || '0');
      const seconds = parseInt(match?.[3] || '0');
      let durationStr = '';
      if (hours > 0) {
        durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      
      return {
        title,
        artist,
        duration: durationStr,
        thumbnail: item.snippet.thumbnails.default.url,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}

// Parse URL and fetch metadata
async function parseUrlTrack(url: string): Promise<{ title: string; artist: string; platform: string; duration: string; thumbnail: string }> {
  const u = url.toLowerCase();

  if (u.includes('youtube.com') || u.includes('youtu.be')) {
    const metadata = await fetchYouTubeMetadata(url);
    if (metadata) {
      return {
        title: metadata.title,
        artist: metadata.artist,
        platform: 'youtube',
        duration: metadata.duration,
        thumbnail: metadata.thumbnail,
      };
    }
    const videoId = extractYouTubeId(url);
    return {
      title: videoId ? `YouTube Video` : 'YouTube Track',
      artist: 'YouTube',
      platform: 'youtube',
      duration: '--:--',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : '',
    };
  }
  
  if (u.includes('spotify.com')) {
    const match = url.match(/spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
    const type = match ? match[1] : 'track';
    const id = match ? match[2].substring(0, 8) : '';
    return {
      title: id ? `Spotify ${type} · ${id}` : 'Spotify Track',
      artist: 'Spotify',
      platform: 'spotify',
      duration: '--:--',
      thumbnail: '',
    };
  }
  
  if (u.includes('soundcloud.com')) {
    const match = url.match(/soundcloud\.com\/([^/]+)\/([^/?]+)/);
    const artist = match ? match[1] : 'SoundCloud';
    const slug = match ? match[2].replace(/-/g, ' ') : 'Track';
    return {
      title: slug.replace(/\b\w/g, (c) => c.toUpperCase()),
      artist,
      platform: 'soundcloud',
      duration: '--:--',
      thumbnail: '',
    };
  }
  
  const filename = url.split('/').pop()?.split('?')[0] ?? 'Online Track';
  return {
    title: decodeURIComponent(filename).replace(/\.[^.]+$/, ''),
    artist: 'Online',
    platform: 'online',
    duration: '--:--',
    thumbnail: '',
  };
}

// Platform icon letter + colour
function platformBadge(platform: string): { letter: string; color: string } {
  switch (platform) {
    case 'youtube':    return { letter: 'YT', color: '#FF0000' };
    case 'spotify':    return { letter: 'SP', color: '#1DB954' };
    case 'soundcloud': return { letter: 'SC', color: '#FF5500' };
    default:           return { letter: '♪',  color: '#4F6AF0' };
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  playlist,
  uploadedLocalFiles,
  isPlaylistActive,
  isPlaylistPaused,
  isDarkMode,
  onAddLocalFile,
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
  onPlayTrack,
  onLoadToStandby,
  onAddTrack,
  onRemoveTrack,
  onShuffle,
  onLoop,
  onCue,
  onUrlSubmit,
  currentlyPlayingTrackId,
  isSongInPlaylist,
}) => {

  // ─── LOCAL STATE ───────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  // ─── THEME ─────────────────────────────────────────────────────
  const bg = '#0D1117';
  const surface = '#161B22';
  const border = '#21262D';
  const textPrimary = '#F0F6FC';
  const textMuted = '#8B949E';
  const accent = '#4F6AF0';
  const accentBorder = '#6E40C9';
  const green = '#22C55E';
  const red = '#EF4444';

  // ─── UNIFIED TRACK LIST ────────────────────────────────────────
  const allTracks = useMemo<PlaylistTrack[]>(() => {
    const localTracks: PlaylistTrack[] = uploadedLocalFiles.map((file, idx) => ({
      id: parseInt(file.id, 10) || Date.now() + idx,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local File',
      bpm: 120,
      duration: file.duration,
      isLocal: true,
      uri: file.uri,
      filePath: file.filePath,
    } as PlaylistTrack));
    return [...playlist, ...localTracks];
  }, [playlist, uploadedLocalFiles]);

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTracks;
    return allTracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    );
  }, [allTracks, search]);

  const isEmpty = allTracks.length === 0;

  // ─── UPLOAD ────────────────────────────────────────────────────
  const handleUploadFile = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const file = result.assets[0];
        const pickedPath = (file.file as (File & { path?: string; webkitRelativePath?: string }) | undefined)?.path
          || (file.file as (File & { path?: string; webkitRelativePath?: string }) | undefined)?.webkitRelativePath
          || file.uri;
        onAddLocalFile({
          id: Date.now().toString(),
          name: file.name,
          duration: '03:00',
          uri: file.uri,
          filePath: pickedPath,
        });
      }
    } catch {
      Alert.alert('Upload Failed', 'Could not read the selected file.');
    } finally {
      setUploading(false);
    }
  };

  // ─── URL SUBMIT WITH METADATA FETCHING ─────────────────────────
  const handleUrlSubmit = async () => {
    const url = songUrl.trim();
    if (!url) return;

    setFetchingMetadata(true);
    
    try {
      // Parse URL and fetch metadata (especially for YouTube)
      const { title, artist, platform, duration, thumbnail } = await parseUrlTrack(url);

      const newTrack: PlaylistTrack = {
        id: Date.now(),
        title,
        artist,
        bpm: 120,
        duration: duration,
        url,
        platform,
        artworkUrl: thumbnail,
      } as PlaylistTrack;

      onAddTrack?.(newTrack);
      onUrlSubmit?.(url);

      setSongUrl('');
      setShowUrlInput(false);
    } catch (error) {
      console.error('Error adding URL:', error);
      Alert.alert('Error', 'Failed to add track from URL');
    } finally {
      setFetchingMetadata(false);
    }
  };

  // ─── LOAD TO STANDBY ───────────────────────────────────────────
  const handleLoad = (track: PlaylistTrack) => {
    onLoadToStandby?.(track);
  };

  // ─── REMOVE ────────────────────────────────────────────────────
  const handleRemove = (id: number) => {
    onRemoveSong(id);
    onRemoveTrack?.(id);
  };

  // ─── SHUFFLE ───────────────────────────────────────────────────
  const handleShuffle = () => {
    if (isEmpty) return;
    onShuffle?.();
  };

  // ─── LOOP ──────────────────────────────────────────────────────
  const handleLoop = () => {
    setLoopEnabled((p) => !p);
    onLoop?.();
  };

  // ─── CLEAR ─────────────────────────────────────────────────────
  const handleClearConfirm = () => {
    onClearPlaylist();
    setShowClearConfirm(false);
  };

  // ─── THUMB ─────────────────────────────────────────────────────
  const TrackThumb = ({
    track,
    index,
    size = 40,
  }: {
    track: PlaylistTrack;
    index: number;
    size?: number;
  }) => {
    const color = THUMB_COLORS[index % THUMB_COLORS.length];
    const plat = (track as any).platform as string | undefined;
    const artworkUrl = (track as any).artworkUrl as string | undefined;
    const badge = plat ? platformBadge(plat) : null;

    if (artworkUrl) {
      return (
        <View style={{
          width: size, height: size, borderRadius: 6, overflow: 'hidden',
          backgroundColor: color,
        }}>
          <img src={artworkUrl} style={{ width: size, height: size, objectFit: 'cover' }} alt="" />
        </View>
      );
    }

    return (
      <View style={{
        width: size, height: size, borderRadius: 6,
        backgroundColor: color, alignItems: 'center', justifyContent: 'center',
      }}>
        {badge ? (
          <Text style={{ fontSize: size * 0.28, fontWeight: '800', color: '#FFF' }}>{badge.letter}</Text>
        ) : (
          <Feather name="music" size={size * 0.42} color="rgba(255,255,255,0.8)" />
        )}
      </View>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden', marginTop: 16 }}>

      {/* HEADER */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, letterSpacing: 0.4 }}>PLAYLIST</Text>
        <Text style={{ fontSize: 13, color: textMuted }}>{allTracks.length} {allTracks.length === 1 ? 'Track' : 'Tracks'}</Text>
      </View>

      {/* SEARCH + UPLOAD + ADD */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>

        {/* Search bar */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: surface, borderRadius: 8, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Feather name="search" size={13} color={textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 12, color: textPrimary, paddingVertical: 0 }}
            placeholder="Search playlist..."
            placeholderTextColor={textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={12} color={textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Upload */}
        <TouchableOpacity
          onPress={handleUploadFile}
          disabled={uploading}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: accentBorder, opacity: uploading ? 0.5 : 1 }}
        >
          {uploading
            ? <ActivityIndicator size="small" color={accentBorder} />
            : <>
                <Feather name="upload-cloud" size={13} color={accentBorder} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: accentBorder }}>Upload</Text>
              </>
          }
        </TouchableOpacity>

        {/* Add URL */}
        <TouchableOpacity
          onPress={() => { setShowUrlInput(true); setShowClearConfirm(false); }}
          style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="plus" size={16} color={textMuted} />
        </TouchableOpacity>
      </View>

      {/* URL INPUT PANEL */}
      {showUrlInput && (
        <View style={{ marginHorizontal: 12, marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: surface, borderWidth: 1, borderColor: border, gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted }}>
            Paste a YouTube, Spotify or SoundCloud URL
          </Text>
          <TextInput
            value={songUrl}
            onChangeText={setSongUrl}
            placeholder="https://..."
            placeholderTextColor={textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleUrlSubmit}
            style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, backgroundColor: bg, borderWidth: 1, borderColor: border, color: textPrimary }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleUrlSubmit}
              disabled={fetchingMetadata}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: accent, alignItems: 'center', opacity: fetchingMetadata ? 0.7 : 1 }}
            >
              {fetchingMetadata ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Add to Playlist</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setSongUrl(''); setShowUrlInput(false); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: border, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* INLINE CLEAR CONFIRM */}
      {showClearConfirm && (
        <View style={{ marginHorizontal: 12, marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: '#2A1111', borderWidth: 1, borderColor: red, gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: red }}>
            Remove all {allTracks.length} track{allTracks.length !== 1 ? 's' : ''}?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleClearConfirm}
              style={{ flex: 1, paddingVertical: 7, borderRadius: 6, backgroundColor: red, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowClearConfirm(false)}
              style={{ flex: 1, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: border, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TRACK LIST */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
        {filteredTracks.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Feather name="music" size={28} color={textMuted} />
            <Text style={{ fontSize: 12, color: textMuted }}>
              {isEmpty ? 'No tracks yet' : 'No results for "' + search + '"'}
            </Text>
            {isEmpty && (
              <Text style={{ fontSize: 10, color: textMuted }}>Upload a file or paste a URL to get started</Text>
            )}
          </View>
        ) : (
          filteredTracks.map((item, index) => {
            const isNowPlaying = currentlyPlayingTrackId === item.id;

            return (
              <View
                key={`${item.id}-${index}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: isNowPlaying ? 'rgba(34,197,94,0.07)' : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                }}
              >
                {/* Index */}
                <Text style={{ fontSize: 12, color: textMuted, width: 22, textAlign: 'center' }}>
                  {isNowPlaying
                    ? <Feather name="volume-2" size={12} color={green} />
                    : index + 1}
                </Text>

                {/* Thumb */}
                <TrackThumb track={item} index={index} size={40} />

                {/* Info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: isNowPlaying ? green : textPrimary }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: textMuted }} numberOfLines={1}>
                    {item.artist}{item.bpm ? ` · ${item.bpm} BPM` : ''}
                  </Text>
                </View>

                {/* Duration */}
                {item.duration && item.duration !== '--:--' ? (
                  <Text style={{ fontSize: 11, color: textMuted, width: 40, textAlign: 'right' }}>{item.duration}</Text>
                ) : null}

                {/* NOW PLAYING or LOAD */}
                {isNowPlaying ? (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: green, backgroundColor: 'rgba(34,197,94,0.12)' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: green, letterSpacing: 0.5 }}>NOW PLAYING</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleLoad(item)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#1E2440', borderWidth: 1, borderColor: accent }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>LOAD</Text>
                  </TouchableOpacity>
                )}

                {/* Remove X */}
                <TouchableOpacity
                  onPress={() => handleRemove(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={14} color={red} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: border }}>

        {/* SHUFFLE */}
        <TouchableOpacity
          onPress={handleShuffle}
          disabled={isEmpty}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
            borderColor: border, backgroundColor: surface,
            opacity: isEmpty ? 0.35 : 1,
          }}
        >
          <Feather name="shuffle" size={13} color={textMuted} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted }}>Shuffle</Text>
        </TouchableOpacity>

        {/* LOOP */}
        <TouchableOpacity
          onPress={handleLoop}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
            borderColor: loopEnabled ? green : border,
            backgroundColor: loopEnabled ? 'rgba(34,197,94,0.10)' : surface,
          }}
        >
          <Feather name="repeat" size={13} color={loopEnabled ? green : textMuted} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: loopEnabled ? green : textMuted }}>Loop</Text>
        </TouchableOpacity>

        {/* CLEAR */}
        <TouchableOpacity
          onPress={() => { if (!isEmpty) setShowClearConfirm(true); }}
          disabled={isEmpty}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
            borderColor: isEmpty ? border : red,
            backgroundColor: showClearConfirm ? 'rgba(239,68,68,0.12)' : 'transparent',
            opacity: isEmpty ? 0.35 : 1,
          }}
        >
          <Feather name="trash-2" size={13} color={isEmpty ? textMuted : red} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: isEmpty ? textMuted : red }}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PlaylistModal;
