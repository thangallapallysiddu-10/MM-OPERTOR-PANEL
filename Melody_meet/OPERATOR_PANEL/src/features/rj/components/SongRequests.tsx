import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Request } from '../types';

interface SongRequestsProps {
  requests: Request[];
  newRequest: string;
  songUrl: string;
  showSongUrlInput: boolean;
  isDarkMode: boolean;
  colors: any;
  onNewRequestChange: (text: string) => void;
  onSendRequest: () => void;
  onVoteRequest: (id: number) => void;
  onPlayRequest: (req: Request) => void;
  onUrlChange: (text: string) => void;
  onUrlSubmit: () => void;
  onToggleUrlInput: () => void;
  onCancelUrlInput: () => void;
}

export const SongRequests: React.FC<SongRequestsProps> = ({
  requests,
  newRequest,
  songUrl,
  showSongUrlInput,
  isDarkMode,
  colors,
  onNewRequestChange,
  onSendRequest,
  onVoteRequest,
  onPlayRequest,
  onUrlChange,
  onUrlSubmit,
  onToggleUrlInput,
  onCancelUrlInput,
}) => {
  const pendingRequests = requests.filter(req => !req.played).sort((a, b) => b.id - a.id);

  return (
    <View style={{
      borderRadius: 12,
      padding: 14,
      marginTop: 14,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    }}>
      <Text style={{
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 12,
        color: isDarkMode ? '#FFFFFF' : '#000000',
      }}>🎵 Song Requests & URL</Text>
      
      {/* URL Section */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Feather name="link" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Paste URL to Play</Text>
        </View>
        {!showSongUrlInput ? (
          <TouchableOpacity 
            onPress={onToggleUrlInput} 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
            }}
          >
            <Feather name="music" size={14} color={isDarkMode ? "#FFFFFF" : "#000000"} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Enter Song URL</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 10 }}>
            <TextInput 
              value={songUrl} 
              onChangeText={onUrlChange} 
              placeholder="Paste YouTube, Spotify URL..." 
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"} 
              style={{
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 13,
                backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                borderWidth: 1,
                borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}
              autoFocus 
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                onPress={onUrlSubmit} 
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }}
              >
                <Feather name="check" size={14} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Load URL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={onCancelUrlInput} 
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }}
              >
                <Feather name="x" size={14} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      <View style={{ height: 1, marginVertical: 12, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }} />
      
      {/* Requests Section */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Feather name="mic" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Request a Song</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TextInput 
            value={newRequest} 
            onChangeText={onNewRequestChange} 
            placeholder="Request song by name... " 
            style={{
              flex: 1,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 12,
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderWidth: 1,
              borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}
            placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"} 
          />
          <TouchableOpacity 
            onPress={onSendRequest} 
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Send</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={{
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 8,
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
        }}>Pending Requests ({pendingRequests.length})</Text>
        
        <View style={{ gap: 8, maxHeight: 200 }}>
          {pendingRequests.map(req => (
            <View key={req.id} style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: 10,
              padding: 10,
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderWidth: 1,
              borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }} numberOfLines={1}>{req.song}</Text>
                <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Requested by: {req.user} • {req.time}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity 
                  onPress={() => onVoteRequest(req.id)} 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                    backgroundColor: req.hasVoted 
                      ? (isDarkMode ? '#4B5563' : '#D1D5DB')
                      : (isDarkMode ? '#374151' : '#E5E7EB'),
                  }}
                  disabled={req.hasVoted}
                >
                  <Ionicons name="arrow-up" size={14} color={req.hasVoted ? (isDarkMode ? "#9CA3AF" : "#6B7280") : (isDarkMode ? "#FFFFFF" : "#000000")} />
                  <Text style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: req.hasVoted ? (isDarkMode ? '#9CA3AF' : '#6B7280') : (isDarkMode ? '#FFFFFF' : '#000000'),
                  }}>{req.votes}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => onPlayRequest(req)} 
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Play Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pendingRequests.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
              <Feather name="music" size={24} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
              <Text style={{ textAlign: 'center', fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>No pending requests</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};