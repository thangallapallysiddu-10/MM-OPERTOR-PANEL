// src/features/rj/components/LocalFilesUploader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useAppStore } from '../../../store/useAppStore';

interface LocalFile {
  id: string;
  name: string;
  uri: string;
  size: string;
  duration: string;
}

interface LocalFilesUploaderProps {
  isDarkMode: boolean;
  colors: any;
  onPlayTrack?: (track: any) => void;
}

export const LocalFilesUploader: React.FC<LocalFilesUploaderProps> = ({
  isDarkMode,
  colors,
  onPlayTrack,
}) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const { rjStudio, updateRjStudioState, clearLocalPlayback } = useAppStore();
  const localFiles = rjStudio.uploadedLocalFiles || [];
  const savedPlayback = rjStudio.localPlayback;

  // Enable background playback once
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // RESTORE from store when component mounts (after navigation)
  useEffect(() => {
    const restorePlayback = async () => {
      if (savedPlayback?.isPlaying && savedPlayback.currentFileId) {
        setCurrentlyPlaying(savedPlayback.currentFileId);
        setIsPlaying(true);
        
        if (savedPlayback.currentTrack && onPlayTrack) {
          onPlayTrack(savedPlayback.currentTrack);
        }
        
        // If we have a saved sound object, use it
        if (savedPlayback.soundObject) {
          soundRef.current = savedPlayback.soundObject;
        }
      }
    };
    
    restorePlayback();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAudioDuration = async (uri: string): Promise<string> => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      const durationSecs = status.isLoaded && status.durationMillis ? status.durationMillis / 1000 : 0;
      await sound.unloadAsync();
      const minutes = Math.floor(durationSecs / 60);
      const seconds = Math.floor(durationSecs % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      return '0:00';
    }
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac', 'audio/flac'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      
      if (asset.size && asset.size > 500 * 1024 * 1024) {
        Alert.alert('Error', 'File size exceeds 500MB limit');
        return;
      }

      const duration = await getAudioDuration(asset.uri);

      const newFile: LocalFile = {
        id: Date.now().toString(),
        name: asset.name,
        uri: asset.uri,
        size: formatFileSize(asset.size || 0),
        duration: duration,
      };

      updateRjStudioState({
        uploadedLocalFiles: [...localFiles, newFile]
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const handlePlayFile = async (file: LocalFile) => {
    try {
      // Stop any existing playback
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true }
      );
      
      soundRef.current = sound;
      setCurrentlyPlaying(file.id);
      setIsPlaying(true);
      
      const title = file.name.replace(/\.[^/.]+$/, "");
      const track = {
        id: Date.now(),
        title: title,
        artist: "Local File",
        duration: file.duration,
        bpm: 120,
        channel: 1,
        beatIntensity: 70,
        shortTitle: title.substring(0, 12),
        gain: 70,
        eq: { low: 50, mid: 50, high: 50 },
        fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
      };
      
      if (onPlayTrack) onPlayTrack(track);
      
      // Save to store with sound object for persistence
      updateRjStudioState({
        localPlayback: {
          isPlaying: true,
          currentTrack: track,
          currentFileUri: file.uri,
          currentFileName: file.name,
          currentFileId: file.id,
          soundObject: sound,  // Save sound object!
        }
      });
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentlyPlaying(null);
          clearLocalPlayback();
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to play file');
    }
  };

  // PAUSE BUTTON - Uses sound from ref or from store
  const handlePauseFile = async () => {
    // Try to get sound from ref first, then from store
    let sound = soundRef.current;
    if (!sound && savedPlayback?.soundObject) {
      sound = savedPlayback.soundObject;
      soundRef.current = sound;
    }
    
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      updateRjStudioState({
        localPlayback: {
          ...savedPlayback,
          isPlaying: false,
          soundObject: sound,
        }
      });
    } else {
      Alert.alert('Error', 'No song is currently playing');
    }
  };

  // RESUME BUTTON
  const handleResumeFile = async () => {
    let sound = soundRef.current;
    if (!sound && savedPlayback?.soundObject) {
      sound = savedPlayback.soundObject;
      soundRef.current = sound;
    }
    
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      updateRjStudioState({
        localPlayback: {
          ...savedPlayback,
          isPlaying: true,
          soundObject: sound,
        }
      });
    } else {
      Alert.alert('Error', 'No song is currently paused');
    }
  };

  // STOP BUTTON
  const handleStopFile = async () => {
    let sound = soundRef.current;
    if (!sound && savedPlayback?.soundObject) {
      sound = savedPlayback.soundObject;
      soundRef.current = sound;
    }
    
    if (sound) {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      clearLocalPlayback();
      soundRef.current = null;
    }
  };
  
  const handleDeleteFile = async (fileId: string, fileUri: string) => {
    if (currentlyPlaying === fileId) {
      let sound = soundRef.current;
      if (!sound && savedPlayback?.soundObject) {
        sound = savedPlayback.soundObject;
      }
      
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      clearLocalPlayback();
    }
    
    // Remove from store
    const updatedFiles = localFiles.filter(f => f.id !== fileId);
    updateRjStudioState({
      uploadedLocalFiles: updatedFiles
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp3': return '♫';
      case 'wav': return '〰';
      case 'm4a': return '⎔';
      case 'aac': return '§';
      case 'flac': return '◈';
      default: return '📄';
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
        backgroundColor: isDarkMode 
          ? (isActive ? '#374151' : '#1F2937')
          : (isActive ? '#E5E7EB' : '#F9FAFB'),
        borderWidth: 1,
        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>{getFileIcon(item.name)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }} numberOfLines={1}>
              {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
            </Text>
            <Text style={{ fontSize: 10, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
              {item.size} • {item.duration}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isActive && isPlaying ? (
            <>
              <TouchableOpacity onPress={handlePauseFile} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22, color: isDarkMode ? "#FFFFFF" : "#000000" }}>⏸</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStopFile} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22, color: "#EF4444" }}>⏹</Text>
              </TouchableOpacity>
            </>
          ) : isActive && !isPlaying ? (
            <>
              <TouchableOpacity onPress={handleResumeFile} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22, color: isDarkMode ? "#FFFFFF" : "#000000" }}>►</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStopFile} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22, color: "#EF4444" }}>⏹</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => handlePlayFile(item)} style={{ padding: 6 }}>
              <Text style={{ fontSize: 22, color: isDarkMode ? "#FFFFFF" : "#000000" }}>►</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={() => handleDeleteFile(item.id, item.uri)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 20, color: "#EF4444" }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{
      flex: 1,
      borderRadius: 12,
      padding: 12,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
      minWidth: 150,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
          📄 LOCAL FILES
        </Text>
        <TouchableOpacity 
          onPress={handleUploadFile}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 16,
            backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
          }}
        >
          <Feather name="upload" size={12} color={isDarkMode ? "#000000" : "#FFFFFF"} />
          <Text style={{ fontSize: 10, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>
            Upload
          </Text>
        </TouchableOpacity>
      </View>

      {localFiles.length === 0 ? (
        <View style={{
          alignItems: 'center',
          paddingVertical: 20,
          borderRadius: 10,
          backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
        }}>
          <Text style={{ fontSize: 32, color: isDarkMode ? "#6B7280" : "#9CA3AF" }}>♪ ♪ ♪</Text>
          <Text style={{ fontSize: 10, marginTop: 6, color: isDarkMode ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
            No local files
          </Text>
          <Text style={{ fontSize: 9, marginTop: 2, color: isDarkMode ? '#6B7280' : '#9CA3AF', textAlign: 'center' }}>
            Click Upload to add
          </Text>
        </View>
      ) : (
        <FlatList
          data={localFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderFileItem}
          scrollEnabled={true}
          style={{ maxHeight: 180 }}
          showsVerticalScrollIndicator={true}
          extraData={currentlyPlaying}
        />
      )}
    </View>
  );
};

export default LocalFilesUploader;