import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import {
  pickAndUploadLocalFile,
  buildTrackFromLocalFile,
  type UploadedLocalFile,
} from '../utils/localFileUpload';

type LocalFile = UploadedLocalFile;

interface SimplePlayer {
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  unload(): Promise<void>;
  setMuted(muted: boolean): void;
  onEnd(cb: () => void): void;
}

async function createPlayer(_uri: string, _muted: boolean): Promise<SimplePlayer> {
  let endCb: (() => void) | null = null;
  return {
    play: async () => {},
    pause: async () => {},
    stop: async () => { endCb = null; },
    unload: async () => { endCb = null; },
    setMuted: () => {},
    onEnd: (cb) => { endCb = cb; },
  };
}

interface LocalFilesUploaderProps {
  isDarkMode: boolean;
  colors: any;
  onPlayTrack?: (track: any) => void;
  onLoadToStandby?: (track: any, playerId: 'A' | 'B') => void;
  compact?: boolean;
}

export const LocalFilesUploader: React.FC<LocalFilesUploaderProps> = ({
  isDarkMode,
  colors,
  onPlayTrack,
  onLoadToStandby,
  compact = false,
}) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<SimplePlayer | null>(null);

  const { rjStudio, updateRjStudioState, clearLocalPlayback } = useAppStore();
  const localFiles = rjStudio.uploadedLocalFiles || [];
  const savedPlayback = rjStudio.localPlayback;

  useEffect(() => {
    playerRef.current?.setMuted(rjStudio.isLocalAudioMuted);
  }, [rjStudio.isLocalAudioMuted]);

  useEffect(() => {
    return () => {
      playerRef.current?.unload().catch(() => {});
    };
  }, []);

  const handleUploadFile = async () => {
    await pickAndUploadLocalFile();
  };

  const handlePlayFile = async (file: LocalFile) => {
    try {
      if (playerRef.current) {
        await playerRef.current.unload();
        playerRef.current = null;
      }

      const playbackPath = file.filePath || file.uri;
      const player = await createPlayer(playbackPath, rjStudio.isLocalAudioMuted);
      player.onEnd(() => {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        clearLocalPlayback();
        playerRef.current = null;
      });
      playerRef.current = player;
      setCurrentlyPlaying(file.id);
      setIsPlaying(true);

      const track = buildTrackFromLocalFile(file);
      onPlayTrack?.(track);

      updateRjStudioState({
          localPlayback: {
            isPlaying: true,
            currentTrack: track,
            currentFileUri: file.uri,
            currentFilePath: playbackPath,
            currentFileName: file.name,
            currentFileId: file.id,
            soundObject: null,
        },
      });
    } catch {
      Alert.alert('Error', 'Failed to play file');
    }
  };

  const handlePauseFile = async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
      setIsPlaying(false);
      updateRjStudioState({
        localPlayback: { ...savedPlayback, isPlaying: false, soundObject: null },
      });
    } else {
      Alert.alert('Error', 'No song is currently playing');
    }
  };

  const handleResumeFile = async () => {
    if (playerRef.current) {
      await playerRef.current.play();
      setIsPlaying(true);
      updateRjStudioState({
        localPlayback: { ...savedPlayback, isPlaying: true, soundObject: null },
      });
    } else {
      Alert.alert('Error', 'No song is currently paused');
    }
  };

  const handleStopFile = async () => {
    if (playerRef.current) {
      await playerRef.current.stop();
      await playerRef.current.unload();
      playerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentlyPlaying(null);
    clearLocalPlayback();
  };

  const handleDeleteFile = async (fileId: string) => {
    if (currentlyPlaying === fileId) {
      await handleStopFile();
    }

    const sid = rjBackend.getStudioId();
    const isServerId = fileId.includes('-');

    if (isServerId && sid) {
      try {
        await RjApi.deleteLocalFile(sid, fileId);
      } catch (err) {
        console.error('[DELETE LOCAL FILE] Backend delete FAILED â€” file WILL reappear on refresh:', err);
        throw err;
      }
    }

    const updatedFiles = localFiles.filter((f) => f.id !== fileId);
    updateRjStudioState({ uploadedLocalFiles: updatedFiles });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp3': return 'â™«';
      case 'wav': return 'ã€°';
      case 'm4a': return 'âŽ”';
      case 'aac': return 'Â§';
      case 'flac': return 'â—ˆ';
      default: return 'ðŸ“„';
    }
  };

  const renderFileItem = ({ item }: { item: LocalFile }) => {
    const isActive = currentlyPlaying === item.id;

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 6,
        borderRadius: 10,
        backgroundColor: isDarkMode ? (isActive ? '#1E3A8A30' : '#263347') : (isActive ? '#EEF2FF' : '#F8FAFC'),
        borderWidth: 1,
        borderColor: isActive ? '#4F6AF0' : (isDarkMode ? '#334155' : '#E2E8F0'),
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>{getFileIcon(item.name)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }} numberOfLines={1}>
              {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
            </Text>
            <Text style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8' }}>
              {item.size} â€¢ {item.duration}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
          {onLoadToStandby && (
            <>
              <TouchableOpacity
                onPress={async () => {
                  const sid = rjBackend.getStudioId();
                  const isUuid = item.id.includes('-');
                  if (rjBackend.isEnabled() && sid && isUuid) {
                    try {
                      await RjApi.loadLocalToStandby(sid, item.id, 'A');
                    } catch {}
                  }
                  onLoadToStandby(buildTrackFromLocalFile(item), 'A');
                }}
                style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' }}
              >
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#4F6AF0' }}>LOAD A</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const sid = rjBackend.getStudioId();
                  const isUuid = item.id.includes('-');
                  if (rjBackend.isEnabled() && sid && isUuid) {
                    try {
                      await RjApi.loadLocalToStandby(sid, item.id, 'B');
                    } catch {}
                  }
                  onLoadToStandby(buildTrackFromLocalFile(item), 'B');
                }}
                style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4' }}
              >
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#0D9488' }}>LOAD B</Text>
              </TouchableOpacity>
            </>
          )}
          {isActive && isPlaying ? (
            <>
              <TouchableOpacity onPress={() => { void handlePauseFile(); }} style={{ padding: 5 }}>
                <Feather name="pause" size={17} color="#D97706" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { void handleStopFile(); }} style={{ padding: 5 }}>
                <Feather name="square" size={17} color="#DC2626" />
              </TouchableOpacity>
            </>
          ) : isActive && !isPlaying ? (
            <>
              <TouchableOpacity onPress={() => { void handleResumeFile(); }} style={{ padding: 5 }}>
                <Feather name="play" size={17} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { void handleStopFile(); }} style={{ padding: 5 }}>
                <Feather name="square" size={17} color="#DC2626" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => { void handlePlayFile(item); }} style={{ padding: 5 }}>
              <Feather name="play" size={17} color="#4F6AF0" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => {
            void handleDeleteFile(item.id).catch((err) => {
              console.error('[LocalFilesUploader] Delete failed:', err);
              const current = useAppStore.getState().rjStudio.uploadedLocalFiles || [];
              const alreadyPresent = current.some((f) => f.id === item.id);
              if (!alreadyPresent) {
                updateRjStudioState({ uploadedLocalFiles: [...current, item] });
              }
            });
          }} style={{ padding: 5 }}>
            <Feather name="trash-2" size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';

  return (
    <View style={{ flex: 1, borderRadius: 14, padding: compact ? 10 : 14, backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor, minWidth: 150 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
            <Feather name="folder" size={15} color="#4F6AF0" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Local Files</Text>
        </View>
        <TouchableOpacity onPress={handleUploadFile} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#4F6AF0' }}>
          <Feather name="upload" size={12} color="#FFFFFF" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Upload</Text>
        </TouchableOpacity>
      </View>

      {localFiles.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 20, borderRadius: 10, backgroundColor: isDarkMode ? '#263347' : '#F8FAFC', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
          <Text style={{ fontSize: 28, color: isDarkMode ? '#64748B' : '#CBD5E1' }}>â™ª â™ª â™ª</Text>
          <Text style={{ fontSize: 11, marginTop: 6, fontWeight: '500', color: isDarkMode ? '#64748B' : '#94A3B8', textAlign: 'center' }}>No local files</Text>
          <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#475569' : '#CBD5E1', textAlign: 'center' }}>Upload Â· Play Â· or LOAD into dual player</Text>
        </View>
      ) : (
        <FlatList
          data={localFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderFileItem}
          scrollEnabled
          style={{ maxHeight: 180 }}
          showsVerticalScrollIndicator
          extraData={currentlyPlaying}
        />
      )}
    </View>
  );
};

export default LocalFilesUploader;
