import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface SongRequest {
  id: string;
  userName: string;
  songName: string;
  artistName: string;
  timestamp: string;
  status: 'pending' | 'held' | 'playing' | 'rejected';
}

interface SongRequestsProps {
  requests: SongRequest[];
  onPlayNext: (request: SongRequest) => void;
  onHold: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isDarkMode: boolean;
  colors: any;
  currentPlayingSong?: {
    title: string;
    artist: string;
  } | null;
}

// Distinct avatar background colors per user (cycles)
const AVATAR_COLORS = [
  '#4F6AF0', // blue
  '#22C55E', // green
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#F97316', // orange
];

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export const SongRequests: React.FC<SongRequestsProps> = ({
  requests,
  onPlayNext,
  onHold,
  onReject,
  isDarkMode,
  colors,
  currentPlayingSong,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Dark-first palette matching the screenshot ──
  const bg        = '#0D1117';
  const surface   = '#161B22';
  const border    = '#21262D';
  const textPrimary = '#F0F6FC';
  const textMuted   = '#8B949E';

  // Bottom bar button colors
  const playBg    = '#14532D';
  const playText  = '#22C55E';
  const holdBg    = '#292524';
  const holdText  = '#F59E0B';
  const rejectBg  = '#1C1917';
  const rejectText = '#EF4444';

  const activeRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending' || r.status === 'held'),
    [requests],
  );

  // Selected request (for bottom bar actions)
  const selectedRequest = useMemo(
    () => activeRequests.find((r) => r.id === selectedId) ?? activeRequests[0] ?? null,
    [activeRequests, selectedId],
  );

  const formatTime = (ts: string) => {
    if (/^\d{1,2}:\d{2}$/.test(ts)) return ts;
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // FIXED: Reject handler - directly removes without alert
  const handleReject = (request: SongRequest) => {
    // Directly call onReject to remove the request
    onReject(request.id);
    
    // Clear selected ID if the rejected request was selected
    if (selectedId === request.id) {
      setSelectedId(null);
    }
  };

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, letterSpacing: 0.4 }}>
          REQUEST QUEUE
        </Text>
        <Text style={{ fontSize: 13, color: textMuted }}>
          {activeRequests.length} {activeRequests.length === 1 ? 'Request' : 'Requests'}
        </Text>
      </View>

      {/* ── Request rows ── */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
        {activeRequests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
            <Feather name="inbox" size={32} color={textMuted} />
            <Text style={{ fontSize: 13, color: textMuted }}>No pending requests</Text>
          </View>
        ) : (
          activeRequests.map((request, index) => {
            const isSelected = selectedId === request.id || (!selectedId && index === 0);
            const isHeld = request.status === 'held';
            const isNowPlaying = currentPlayingSong?.title === request.songName;
            const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];

            return (
              <TouchableOpacity
                key={request.id}
                onPress={() => setSelectedId(request.id)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  backgroundColor:
                    isSelected
                      ? '#1C2333'
                      : isHeld
                      ? '#1A1500'
                      : 'transparent',
                }}
              >
                {/* Colored avatar circle */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: avatarBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                    {getInitial(request.userName)}
                  </Text>
                </View>

                {/* Name + Song */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                    {request.userName}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: textMuted, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {request.songName} – {request.artistName}
                  </Text>
                </View>

                {/* Status badges and timestamp */}
                <View style={{ alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  {isNowPlaying && (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: '#22C55E',
                        borderRadius: 5,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#22C55E' }}>
                        PLAYING
                      </Text>
                    </View>
                  )}
                  {isHeld && !isNowPlaying && (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        borderRadius: 5,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#F59E0B' }}>
                        HELD
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 12, color: textMuted, fontVariant: ['tabular-nums'] }}>
                    {formatTime(request.timestamp)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── Bottom Action Bar ── */}
      {activeRequests.length > 0 && selectedRequest && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 12,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          {/* ▶ Play Next */}
          <TouchableOpacity
            onPress={() => onPlayNext(selectedRequest)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: playBg,
              borderWidth: 1,
              borderColor: '#166534',
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: 5,
                borderBottomWidth: 5,
                borderLeftWidth: 9,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: playText,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: playText }}>
              Play Next
            </Text>
          </TouchableOpacity>

          {/* ⏭ Hold */}
          <TouchableOpacity
            onPress={() => onHold(selectedRequest.id)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: holdBg,
              borderWidth: 1,
              borderColor: '#44403C',
            }}
          >
            <Feather name="skip-forward" size={14} color={holdText} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: holdText }}>
              Hold
            </Text>
          </TouchableOpacity>

          {/* ✕ Reject - DIRECT REMOVAL (no alert) */}
          <TouchableOpacity
            onPress={() => handleReject(selectedRequest)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: rejectBg,
              borderWidth: 1,
              borderColor: '#292524',
            }}
          >
            <Feather name="x" size={14} color={rejectText} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: rejectText }}>
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default SongRequests;