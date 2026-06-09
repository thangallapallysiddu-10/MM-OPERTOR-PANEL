import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
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
      borderRadius: 14, padding: 14, marginTop: 14,
      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
      borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>
        🎵 SONG REQUESTS & URL
      </Text>

      {/* URL Section */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Feather name="link" size={13} color={isDarkMode ? '#94A3B8' : '#475569'} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Paste URL to Play</Text>
        </View>
        {!showSongUrlInput ? (
          <TouchableOpacity
            onPress={onToggleUrlInput}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 10, borderRadius: 10,
              backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
              borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
            }}
          >
            <Feather name="music" size={13} color={isDarkMode ? '#94A3B8' : '#475569'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#94A3B8' : '#475569' }}>Enter Song URL</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 8 }}>
            <TextInput
              value={songUrl}
              onChangeText={onUrlChange}
              placeholder="Paste YouTube, Spotify URL..."
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              style={{
                borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 13,
                backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
                borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                color: isDarkMode ? '#F1F5F9' : '#0F172A',
              }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={onUrlSubmit}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#4F6AF0' }}
              >
                <Feather name="check" size={13} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>Load URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onCancelUrlInput}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0' }}
              >
                <Feather name="x" size={13} color={isDarkMode ? '#94A3B8' : '#475569'} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 1, marginVertical: 12, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }} />

      {/* Requests Section */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Feather name="mic" size={13} color={isDarkMode ? '#94A3B8' : '#475569'} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Request a Song</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TextInput
            value={newRequest}
            onChangeText={onNewRequestChange}
            placeholder="Request song by name..."
            style={{
              flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12,
              backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
              borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
              color: isDarkMode ? '#F1F5F9' : '#0F172A',
            }}
            placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
          />
          <TouchableOpacity
            onPress={onSendRequest}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', backgroundColor: '#4F6AF0' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Send</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, fontWeight: '600', marginBottom: 8, color: isDarkMode ? '#64748B' : '#94A3B8' }}>
          Pending Requests ({pendingRequests.length})
        </Text>

        <ScrollView
          style={{ maxHeight: 280, borderRadius: 10 }}
          showsVerticalScrollIndicator
          scrollEventThrottle={16}
          contentContainerStyle={{ gap: 7, paddingRight: 4 }}
        >
          {pendingRequests.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="music" size={20} color={isDarkMode ? '#64748B' : '#94A3B8'} />
              </View>
              <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '500', color: isDarkMode ? '#64748B' : '#94A3B8' }}>No pending requests</Text>
            </View>
          ) : (
            pendingRequests.map(req => (
              <View key={req.id} style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                borderRadius: 10, padding: 10,
                backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
                borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A' }} numberOfLines={1}>
                    {req.song}
                  </Text>
                  <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#64748B' : '#94A3B8' }}>
                    {req.user} · {req.time}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <TouchableOpacity
                    onPress={() => onVoteRequest(req.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
                      backgroundColor: req.hasVoted
                        ? (isDarkMode ? '#334155' : '#E2E8F0')
                        : '#EEF2FF',
                      borderWidth: 1,
                      borderColor: req.hasVoted ? (isDarkMode ? '#334155' : '#E2E8F0') : '#C7D2FE',
                    }}
                    disabled={req.hasVoted}
                  >
                    <Ionicons name="arrow-up" size={13}
                      color={req.hasVoted ? (isDarkMode ? '#64748B' : '#94A3B8') : '#4F6AF0'} />
                    <Text style={{
                      fontSize: 11, fontWeight: '700',
                      color: req.hasVoted ? (isDarkMode ? '#64748B' : '#94A3B8') : '#4F6AF0',
                    }}>{req.votes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onPlayRequest(req)}
                    style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, backgroundColor: '#059669' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Play Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};