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
        flex: 1, borderRadius: 14, padding: 14, minWidth: 150,
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
      }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
          <Feather name="music" size={20} color={isDarkMode ? '#64748B' : '#94A3B8'} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#94A3B8' : '#475569', textAlign: 'center' }}>
          No song playing
        </Text>
        <Text style={{ fontSize: 10, marginTop: 3, color: isDarkMode ? '#64748B' : '#94A3B8', textAlign: 'center' }}>
          Open playlist to add songs
        </Text>
        <TouchableOpacity
          onPress={onOpenPlaylist}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0', backgroundColor: isDarkMode ? '#263347' : '#F8FAFC' }}
        >
          <Feather name="list" size={12} color={isDarkMode ? '#94A3B8' : '#475569'} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>Playlist ({playlistLength})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{
      flex: 1, borderRadius: 14, padding: 12, minWidth: 150,
      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
      borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
    }}>
      <Text style={{ fontSize: 9, fontWeight: '600', marginBottom: 6, letterSpacing: 0.6, color: isDarkMode ? '#64748B' : '#94A3B8' }}>
        NOW PLAYING
      </Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A', letterSpacing: -0.2 }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ fontSize: 11, marginTop: 2, color: isDarkMode ? '#64748B' : '#94A3B8' }} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9' }}>
            <Text style={{ fontSize: 10 }}>{getMoodIcon()}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: isDarkMode ? '#94A3B8' : '#475569' }}>{track.bpm} BPM</Text>
          </View>
          <Text style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{track.duration}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        onPress={onOpenPlaylist}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0', backgroundColor: isDarkMode ? '#263347' : '#F8FAFC' }}
      >
        <Feather name="list" size={12} color={isDarkMode ? '#94A3B8' : '#475569'} />
        <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>Playlist ({playlistLength})</Text>
        {isPlaylistActive && <View style={{ width: 6, height: 6, borderRadius: 3, marginLeft: 2, backgroundColor: '#059669' }} />}
      </TouchableOpacity>
    </View>
  );
};

export default NowPlaying;