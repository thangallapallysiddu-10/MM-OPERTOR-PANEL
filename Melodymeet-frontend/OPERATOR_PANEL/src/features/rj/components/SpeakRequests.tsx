import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface SpeakRequest {
  id: string;
  userName: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface SpeakRequestsProps {
  requests: SpeakRequest[];
  onAccept: (request: SpeakRequest) => void;
  onReject: (request: SpeakRequest) => void;
  isDarkMode: boolean;
  colors: any;
}

const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // purple
];

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export const SpeakRequests: React.FC<SpeakRequestsProps> = ({
  requests,
  onAccept,
  onReject,
  isDarkMode,
  colors,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bg        = '#0D1117';
  const surface   = '#161B22';
  const border    = '#21262D';
  const textPrimary = '#F0F6FC';
  const textMuted   = '#8B949E';

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests],
  );

  const allActiveRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending' || r.status === 'accepted'),
    [requests],
  );

  const selectedRequest = useMemo(
    () => allActiveRequests.find((r) => r.id === selectedId) ?? allActiveRequests[0] ?? null,
    [allActiveRequests, selectedId],
  );

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
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="mic" size={16} color="#3B82F6" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, letterSpacing: 0.4 }}>
            SPEAK REQUESTS
          </Text>
          {pendingRequests.length > 0 && (
            <View
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 1,
                marginLeft: 4,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>
                {pendingRequests.length}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: textMuted }}>
          {allActiveRequests.length} Active
        </Text>
      </View>

      {/* List of requests */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
        {allActiveRequests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Feather name="message-square" size={28} color={textMuted} />
            <Text style={{ fontSize: 13, color: textMuted }}>No active speak requests</Text>
          </View>
        ) : (
          allActiveRequests.map((request, index) => {
            const isSelected = selectedId === request.id || (!selectedId && index === 0);
            const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const isAccepted = request.status === 'accepted';

            return (
              <TouchableOpacity
                key={request.id}
                onPress={() => setSelectedId(request.id)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: isSelected ? '#1C2333' : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                }}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: avatarBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                    {getInitial(request.userName)}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                    {request.userName}
                  </Text>
                  <Text style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
                    wants to speak live
                  </Text>
                </View>

                {/* Right side status / timestamp */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: textMuted }}>
                    {request.timestamp}
                  </Text>
                  {isAccepted ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 1,
                        borderColor: '#10B981',
                        borderRadius: 5,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#10B981' }}>
                        ON AIR
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        borderRadius: 5,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#F59E0B' }}>
                        PENDING
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Action Bar for selected request */}
      {allActiveRequests.length > 0 && selectedRequest && selectedRequest.status === 'pending' && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 12,
            backgroundColor: surface,
          }}
        >
          {/* Accept Button */}
          <TouchableOpacity
            onPress={() => onAccept(selectedRequest)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: '#065F46',
              borderWidth: 1,
              borderColor: '#047857',
            }}
          >
            <Feather name="check" size={14} color="#10B981" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
              Accept
            </Text>
          </TouchableOpacity>

          {/* Reject Button */}
          <TouchableOpacity
            onPress={() => onReject(selectedRequest)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: '#7F1D1D',
              borderWidth: 1,
              borderColor: '#991B1B',
            }}
          >
            <Feather name="x" size={14} color="#EF4444" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default SpeakRequests;
