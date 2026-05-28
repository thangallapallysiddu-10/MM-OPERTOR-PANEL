// src/features/rj/components/NowPlaying.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Track } from '../types';

interface NowPlayingProps {
  track: Track;
  mood: string;
  isDarkMode: boolean;
  colors: any;
  playlistLength: number;
  isPlaylistActive: boolean;
  onOpenPlaylist: () => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({
  track,
  mood,
  isDarkMode,
  colors,
  playlistLength,
  isPlaylistActive,
  onOpenPlaylist,
}) => {
  const hasValidTrack = track && track.title && track.title !== "" && track.title !== "0:00";
  
  const getMoodIcon = () => {
    if (!hasValidTrack) return "🎵";
    switch(mood) {
      case "chill": return "😎";
      case "energetic": return "⚡";
      case "dark": return "🌙";
      case "calm": return "🌸";
      case "high energy": return "🔥";
      case "relaxed": return "🌊";
      default: return "🎵";
    }
  };

  const getMoodColor = () => {
    if (!hasValidTrack) return colors.textMuted;
    switch(mood) {
      case "chill": return colors.textSecondary;
      case "energetic": return colors.textSecondary;
      case "dark": return colors.textMuted;
      case "calm": return colors.textSecondary;
      case "high energy": return colors.text;
      case "relaxed": return colors.textSecondary;
      default: return colors.primary;
    }
  };

  if (!hasValidTrack) {
    return (
      <View style={{
        flex: 1,
        borderRadius: 12,
        padding: 10,
        minWidth: 150,
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Feather name="music" size={24} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
        <Text style={{ fontSize: 12, marginTop: 6, color: isDarkMode ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
          No song playing
        </Text>
        <Text style={{ fontSize: 10, marginTop: 4, color: isDarkMode ? '#6B7280' : '#9CA3AF', textAlign: 'center' }}>
          Request a song or play from library
        </Text>
        <TouchableOpacity 
          onPress={onOpenPlaylist} 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, marginTop: 10, borderWidth: 1, borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}
        >
          <Feather name="list" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={{ fontSize: 10, fontWeight: '500', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Playlist ({playlistLength})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{
      flex: 1,
      borderRadius: 12,
      padding: 10,
      minWidth: 150,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    }}>
      <Text style={{ fontSize: 9, marginBottom: 6, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
        NOW PLAYING
      </Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ fontSize: 11, marginTop: 2, color: isDarkMode ? '#9CA3AF' : '#6B7280' }} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 16, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
            <Text style={{ fontSize: 10 }}>{getMoodIcon()}</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: getMoodColor() }}>{track.bpm} BPM</Text>
          </View>
          <Text style={{ fontSize: 10, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{track.duration}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={onOpenPlaylist} 
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 5, borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}
      >
        <Feather name="list" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
        <Text style={{ fontSize: 10, fontWeight: '500', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Playlist ({playlistLength})</Text>
        {isPlaylistActive && <View style={{ width: 6, height: 6, borderRadius: 3, marginLeft: 4, backgroundColor: isDarkMode ? '#9CA3AF' : '#6B7280' }} />}
      </TouchableOpacity>
    </View>
  );
};

export default NowPlaying;