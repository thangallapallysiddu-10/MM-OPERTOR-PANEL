import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { PlaylistTrack } from '../../types';

interface PlaylistModalProps {
  visible: boolean;
  playlist: PlaylistTrack[];
  availableSongs: PlaylistTrack[];
  playlistDuration: number;
  customDuration: string;
  timerRemaining: number;
  isPlaylistActive: boolean;
  isPlaylistPaused: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
  onAddSong: (song: PlaylistTrack) => void;
  onRemoveSong: (id: number) => void;
  onStartPlaylist: () => void;
  onPausePlaylist: () => void;
  onResumePlaylist: () => void;
  onStopPlaylist: () => void;
  onSetDuration: (duration: number) => void;
  onSetCustomDuration: (value: string) => void;
  formatTimer: (minutes: number) => string;
}

const CustomDurationInput = ({ onSet, isDarkMode }: { onSet: (value: string) => void; isDarkMode: boolean }) => {
  const [localValue, setLocalValue] = useState("");
  
  const handleSet = () => {
    if (localValue.trim()) {
      onSet(localValue);
      setLocalValue("");
    }
  };
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 }}>
      <TextInput
        style={{
          flex: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
          backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
          borderWidth: 1,
          borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
          color: isDarkMode ? '#FFFFFF' : '#000000',
        }}
        placeholder="Enter minutes (1-480)"
        placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
        value={localValue}
        onChangeText={setLocalValue}
        keyboardType="numeric"
      />
      <TouchableOpacity 
        onPress={handleSet} 
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
      >
        <Feather name="check" size={14} color={isDarkMode ? "#000000" : "#FFFFFF"} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>Set</Text>
      </TouchableOpacity>
    </View>
  );
};

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  visible,
  playlist,
  availableSongs,
  playlistDuration,
  customDuration,
  timerRemaining,
  isPlaylistActive,
  isPlaylistPaused,
  isDarkMode,
  colors,
  onClose,
  onAddSong,
  onRemoveSong,
  onStartPlaylist,
  onPausePlaylist,
  onResumePlaylist,
  onStopPlaylist,
  onSetDuration,
  onSetCustomDuration,
  formatTimer,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%',
          maxWidth: 420,
          maxHeight: '85%',
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>🎵 Playlist Manager</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          
          {/* Scrollable Content */}
          <ScrollView showsVerticalScrollIndicator={true}>
            {/* Add Songs Section */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: isDarkMode ? '#FFFFFF' : '#000000' }}>Add Songs to Playlist:</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={availableSongs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => onAddSong(item)}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      marginRight: 8,
                      minWidth: 130,
                      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{item.title}</Text>
                    <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{item.artist}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <Text style={{ fontSize: 10, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{item.duration}</Text>
                      <Feather name="plus-circle" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
            
            <View style={{ height: 1, marginVertical: 12, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }} />
            
            {/* Duration Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: isDarkMode ? '#FFFFFF' : '#000000' }}>Select Duration:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {[30, 60, 90, 120].map(dur => (
                  <TouchableOpacity
                    key={dur}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: playlistDuration === dur && !customDuration 
                        ? (isDarkMode ? '#FFFFFF' : '#000000')
                        : (isDarkMode ? '#374151' : '#F3F4F6'),
                    }}
                    onPress={() => onSetDuration(dur)}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: playlistDuration === dur && !customDuration 
                        ? (isDarkMode ? '#000000' : '#FFFFFF')
                        : (isDarkMode ? '#FFFFFF' : '#000000'),
                    }}>{dur} min</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: isDarkMode ? '#FFFFFF' : '#000000' }}>Custom Duration:</Text>
              <CustomDurationInput onSet={onSetCustomDuration} isDarkMode={isDarkMode} />
              {customDuration && (
                <Text style={{ fontSize: 11, marginTop: 6, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>✓ Custom: {customDuration} mins set</Text>
              )}
            </View>
            
            {/* Playlist Songs */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: isDarkMode ? '#FFFFFF' : '#000000' }}>Playlist Songs ({playlist.length}):</Text>
              <FlatList
                data={playlist}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 6,
                    backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', width: 30, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{item.title}</Text>
                      <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{item.artist}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onRemoveSong(item.id)} style={{ padding: 6 }}>
                      <Feather name="trash-2" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={() => (
                  <View style={{ alignItems: 'center', gap: 8, paddingVertical: 30 }}>
                    <Feather name="music" size={32} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>No songs in playlist</Text>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Tap on songs above to add to playlist</Text>
                  </View>
                )}
              />
            </View>
          </ScrollView>
          
          {/* PAUSE & STOP BUTTONS - Black & White Theme Based */}
          {isPlaylistActive && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
              
              {/* PAUSE / RESUME BUTTON */}
              <TouchableOpacity
                onPress={isPlaylistPaused ? onResumePlaylist : onPausePlaylist}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Feather 
                  name={isPlaylistPaused ? "play" : "pause"} 
                  size={18} 
                  color={isDarkMode ? '#000000' : '#FFFFFF'} 
                />
                <Text style={{ 
                  color: isDarkMode ? '#000000' : '#FFFFFF', 
                  fontWeight: '600', 
                  fontSize: 14 
                }}>
                  {isPlaylistPaused ? 'RESUME' : 'PAUSE'}
                </Text>
              </TouchableOpacity>
              
              {/* STOP BUTTON */}
              <TouchableOpacity
                onPress={onStopPlaylist}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#374151' : '#D1D5DB',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Feather 
                  name="square" 
                  size={18} 
                  color={isDarkMode ? '#FFFFFF' : '#000000'} 
                />
                <Text style={{ 
                  color: isDarkMode ? '#FFFFFF' : '#000000', 
                  fontWeight: '600', 
                  fontSize: 14 
                }}>
                  STOP
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Button - Fixed at bottom */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4, paddingTop: 12, borderTopWidth: isPlaylistActive ? 0 : 1, borderTopColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
            <TouchableOpacity 
              onPress={onStartPlaylist} 
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
            >
              <Feather name="play" size={18} color={isDarkMode ? "#000000" : "#FFFFFF"} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>Start Playlist</Text>
            </TouchableOpacity>
            {isPlaylistActive && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                <Ionicons name="timer" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={{ fontSize: 12, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{formatTimer(timerRemaining)} left</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};