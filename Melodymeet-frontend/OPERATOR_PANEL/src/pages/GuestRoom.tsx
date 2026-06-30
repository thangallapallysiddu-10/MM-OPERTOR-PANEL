// src/pages/GuestRoom.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { podcastSocket } from '../services/socketService';
import { useAppStore } from '../store/useAppStore';
import { podcastApi } from '../services/api';
import { StorageService } from '../services/storageService';

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isHost: boolean;
  isSystem?: boolean;
}

interface GuestRoomProps {
  slotId: string;
  roomId: string;
  guestName: string;
  guestId?: number;
  guestToken?: string;
  onLeave: () => void;  // ← This goes back to GuestJoinPage
}

export default function GuestRoom({ slotId, roomId, guestName, guestId, guestToken, onLeave }: GuestRoomProps) {
  // ─── Audio State ──────────────────────────────────────────────────────────
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // ─── Connection State ──────────────────────────────────────────────────────
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  const [sessionTime, setSessionTime] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);

  // ─── Chat State ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'System',
      text: `🎙️ Joining as ${guestName} on slot ${slotId}...`,
      time: new Date().toLocaleTimeString(),
      isHost: false,
      isSystem: true,
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const [speakRequestStatus, setSpeakRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);

  // ─── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Real WebSocket Connection ──────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const cleanups: Array<() => void> = [];

    const initSocket = async () => {
      try {
        await podcastSocket.connect();
        
        if (!active) return;
        setIsConnecting(false);

        // Join the podcast slot
        podcastSocket.guestJoined({
          roomId,
          slotId,
          guestName,
          guestId,
          guestToken,
        });

        // Add chat system message
        setMessages(prev => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            sender: 'System',
            text: `🟢 Successfully connected to ${roomId} on ${slotId}`,
            time: new Date().toLocaleTimeString(),
            isHost: false,
            isSystem: true,
          }
        ]);

        // Listen for incoming chat messages
        const offChat = podcastSocket.onChatMessage((msg: any) => {
          if (!active) return;
          // Map to local message format
          setMessages(prev => {
            if (prev.some(m => m.id === String(msg.id))) return prev;
            return [
              ...prev,
              {
                id: String(msg.id),
                sender: msg.senderName,
                text: msg.text,
                time: new Date(msg.createdAt).toLocaleTimeString(),
                isHost: msg.senderRole === 'host',
              }
            ];
          });
        });
        if (offChat) cleanups.push(offChat);

        // Listen for chat history
        const offHistory = podcastSocket.onChatHistory((payload: any) => {
          if (!active || !payload.messages) return;
          setMessages(prev => {
            const incoming = (payload.messages || []).map((msg: any) => ({
              id: String(msg.id),
              sender: msg.senderName,
              text: msg.text,
              time: new Date(msg.createdAt).toLocaleTimeString(),
              isHost: msg.senderRole === 'host',
            }));
            // Merge lists keeping unique ones
            const merged = [...prev];
            incoming.forEach((msg: any) => {
              if (!merged.some(m => m.id === msg.id)) {
                merged.push(msg);
              }
            });
            return merged;
          });
        });
        if (offHistory) cleanups.push(offHistory);

        // Listen for remote mic kick by the operator
        const offRemoved = podcastSocket.onGuestRemoved((payload: any) => {
          if (!active) return;
          if (payload.slotId === slotId) {
            Alert.alert('Kicked', `You were disconnected by the host: ${payload.reason || 'No reason'}`);
            void (async () => {
              try {
                const tokenKey = `@guest_token:${roomId}:${slotId}`;
                await StorageService.removeCustomItem(tokenKey);
                await StorageService.removeCustomItem(`@guest_id:${roomId}:${slotId}`);
              } catch (e) {}
              onLeave();
            })();
          }
        });
        if (offRemoved) cleanups.push(offRemoved);

        // Listen for speak request accepted
        const offSpeakAccepted = podcastSocket.onSpeakRequestAccepted((payload: any) => {
          if (!active) return;
          setSpeakRequestStatus('accepted');
          setIsMicOn(true);
          setIsMuted(false);
          setMessages(prev => [
            ...prev,
            {
              id: `speak-accepted-${Date.now()}`,
              sender: 'System',
              text: `🎙️ Your speak request was accepted! You are now live.`,
              time: new Date().toLocaleTimeString(),
              isHost: false,
              isSystem: true,
            }
          ]);
        });
        if (offSpeakAccepted) cleanups.push(offSpeakAccepted);

        // Listen for speak request rejected
        const offSpeakRejected = podcastSocket.onSpeakRequestRejected((payload: any) => {
          if (!active) return;
          setSpeakRequestStatus('rejected');
          setMessages(prev => [
            ...prev,
            {
              id: `speak-rejected-${Date.now()}`,
              sender: 'System',
              text: `❌ Your speak request was declined.`,
              time: new Date().toLocaleTimeString(),
              isHost: false,
              isSystem: true,
            }
          ]);
        });
        if (offSpeakRejected) cleanups.push(offSpeakRejected);

      } catch (err) {
        if (!active) return;
        setIsConnecting(false);
        setIsDisconnected(true);
      }
    };

    void initSocket();

    return () => {
      active = false;
      cleanups.forEach(fn => fn());
      podcastSocket.guestLeft({ roomId, slotId, guestToken });
      podcastSocket.disconnect();
    };
  }, [roomId, slotId, guestName]);

  // ─── Real Speaking indicator pulses ─────────────────────────────────────────
  useEffect(() => {
    if (isConnecting || isDisconnected || !isMicOn || isMuted) return;

    const interval = setInterval(() => {
      const isSpeaking = Math.random() > 0.65; // Simulates natural speech pauses
      podcastSocket.guestSpeaking(roomId, slotId, isSpeaking);
    }, 2500);

    return () => {
      clearInterval(interval);
      podcastSocket.guestSpeaking(roomId, slotId, false);
    };
  }, [isConnecting, isDisconnected, isMicOn, isMuted, roomId, slotId]);

  // ─── Simulate connection quality ──────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const qualities: ('excellent' | 'good' | 'poor')[] = ['excellent', 'good', 'good', 'excellent'];
      setConnectionQuality(qualities[Math.floor(Math.random() * qualities.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || isDisconnected) return;

    // Send via socket to host
    podcastSocket.guestChatMessage(roomId, guestName, text);
    setChatInput('');
  };

  // ─── Toggle Mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const nextVal = !isMicOn;
    setIsMicOn(nextVal);
    
    // Notify host of our mute status
    const mutedForHost = !nextVal || isMuted;
    podcastSocket.guestMicToggle(roomId, slotId, mutedForHost);

    const status = nextVal ? 'ON' : 'OFF';
    setMessages(prev => [
      ...prev,
      {
        id: `mic-${Date.now()}`,
        sender: 'System',
        text: `🎤 You turned your mic ${status}`,
        time: new Date().toLocaleTimeString(),
        isHost: false,
        isSystem: true,
      }
    ]);
  };

  // ─── Toggle Mute ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);

    // Notify host of our mute status
    const mutedForHost = !isMicOn || nextVal;
    podcastSocket.guestMicToggle(roomId, slotId, mutedForHost);

    const status = nextVal ? 'MUTED' : 'UNMUTED';
    setMessages(prev => [
      ...prev,
      {
        id: `mute-${Date.now()}`,
        sender: 'System',
        text: `🔇 You ${status} yourself`,
        time: new Date().toLocaleTimeString(),
        isHost: false,
        isSystem: true,
      }
    ]);
  };

  // ─── Reconnect ──────────────────────────────────────────────────────────────
  const handleReconnect = () => {
    setIsDisconnected(false);
    setIsConnecting(true);
    // Real socket connection will retry automatically, we just reset state
  };

  // ─── Leave Room ────────────────────────────────────────────────────────────
  // NOTE: Alert.alert with multiple buttons does NOT render any UI on web
  // (React Native Web), so on web it silently does nothing and the button
  // looks broken. We branch by platform and use window.confirm on web.
  const handleLeave = async () => {
    const confirmLeave = async () => {
      try {
        const tokenKey = `@guest_token:${roomId}:${slotId}`;
        const token = guestToken || await StorageService.getCustomItem(tokenKey);
        if (token) {
          await podcastApi.leaveGuestSlot({ roomId, slotId, guestToken: token });
        }
        await StorageService.removeCustomItem(tokenKey);
        await StorageService.removeCustomItem(`@guest_id:${roomId}:${slotId}`);
      } catch (e) {
        console.error('Failed to voluntarily leave slot:', e);
      }
      onLeave();
    };

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to leave the podcast?')
          : true;
      if (confirmed) {
        await confirmLeave();
      }
      return;
    }

    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave the podcast?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await confirmLeave();
          },
        },
      ]
    );
  };

  // ─── Format Time ───────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── Render Message ────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, item.isHost ? styles.hostMessage : styles.guestMessage]}>
        <View style={[styles.messageBubble, item.isHost ? styles.hostBubble : styles.guestBubble]}>
          <Text style={[styles.messageSender, item.isHost ? styles.hostSender : styles.guestSender]}>
            {item.sender}
          </Text>
          <Text style={styles.messageText}>
            {item.text}
          </Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  // ─── Connecting Screen ─────────────────────────────────────────────────────
  if (isConnecting) {
    return (
      <View style={styles.connectingContainer}>
        <View style={styles.connectingCard}>
          <Feather name="wifi" size={40} color="#00d4ff" />
          <Text style={styles.connectingTitle}>Connecting to Room…</Text>
          <Text style={styles.connectingSub}>Please wait while we connect you</Text>
          <View style={styles.loadingDots}>
            <ActivityIndicator size="small" color="#00d4ff" />
          </View>
        </View>
      </View>
    );
  }

  // ─── Disconnected Screen ──────────────────────────────────────────────────
  if (isDisconnected) {
    return (
      <View style={styles.connectingContainer}>
        <View style={styles.connectingCard}>
          <Feather name="wifi-off" size={40} color="#ef4444" />
          <Text style={[styles.connectingTitle, { color: '#ef4444' }]}>Disconnected</Text>
          <Text style={styles.connectingSub}>You lost connection to the room</Text>
          <TouchableOpacity onPress={handleReconnect} style={styles.reconnectButton}>
            <Feather name="refresh-cw" size={16} color="#000" />
            <Text style={styles.reconnectText}>Reconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main Room UI ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Guest Room</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerSub}>{slotId} · {roomId}</Text>
            <View style={styles.sessionTime}>
              <Feather name="clock" size={11} color="#6B7A9E" />
              <Text style={styles.sessionTimeText}>{formatTime(sessionTime)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.qualityBadge,
            connectionQuality === 'excellent' && styles.qualityExcellent,
            connectionQuality === 'good' && styles.qualityGood,
            connectionQuality === 'poor' && styles.qualityPoor,
          ]}>
            <View style={[
              styles.qualityDot,
              connectionQuality === 'excellent' && styles.dotExcellent,
              connectionQuality === 'good' && styles.dotGood,
              connectionQuality === 'poor' && styles.dotPoor,
            ]} />
            <Text style={styles.qualityText}>
              {connectionQuality === 'excellent' && 'Excellent'}
              {connectionQuality === 'good' && 'Good'}
              {connectionQuality === 'poor' && 'Poor'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveButton} activeOpacity={0.7}>
            <Feather name="log-out" size={16} color="#ef4444" />
            <Text style={styles.leaveButtonText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentInner}>
        {/* Audio Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Audio Controls</Text>

          <View style={styles.controlsRow}>
            {/* Mic Control */}
            <TouchableOpacity
              onPress={toggleMic}
              style={[styles.controlButton, isMicOn ? styles.micOn : styles.micOff]}
              activeOpacity={0.8}
            >
              <Feather name={isMicOn ? 'mic' : 'mic-off'} size={18} color="#fff" />
              <Text style={styles.controlLabel}>Microphone</Text>
              <Text style={styles.controlStatus}>{isMicOn ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>

            {/* Mute Control */}
            <TouchableOpacity
              onPress={toggleMute}
              style={[styles.controlButton, isMuted ? styles.mutedOn : styles.mutedOff]}
              activeOpacity={0.8}
            >
              <Feather name={isMuted ? 'volume-x' : 'volume-2'} size={18} color="#fff" />
              <Text style={styles.controlLabel}>Self Mute</Text>
              <Text style={styles.controlStatus}>{isMuted ? 'MUTED' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Speak Request Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Speak Request (Open Connect)</Text>
          
          <View style={{ marginTop: 4 }}>
            {speakRequestStatus === 'none' && (
              <TouchableOpacity
                onPress={() => {
                  const reqId = `speak_${Date.now()}`;
                  setRequestId(reqId);
                  setSpeakRequestStatus('pending');
                  podcastSocket.speakRequest(roomId, slotId, guestName, reqId);
                  
                  setMessages(prev => [
                    ...prev,
                    {
                      id: `speak-${Date.now()}`,
                      sender: 'System',
                      text: `🎙️ Sent speak request to host...`,
                      time: new Date().toLocaleTimeString(),
                      isHost: false,
                      isSystem: true,
                    }
                  ]);
                }}
                style={[styles.controlButton, { width: '100%', backgroundColor: '#00d4ff', borderColor: '#00b0d6', flexDirection: 'row', gap: 8 }]}
                activeOpacity={0.8}
              >
                <Feather name="mic" size={18} color="#000" />
                <Text style={[styles.controlLabel, { color: '#000', fontWeight: 'bold' }]}>Request to Speak Live</Text>
              </TouchableOpacity>
            )}

            {speakRequestStatus === 'pending' && (
              <View
                style={[
                  styles.controlButton,
                  {
                    width: '100%',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                    flexDirection: 'row',
                    gap: 8,
                  },
                ]}
              >
                <Feather name="clock" size={18} color="#F59E0B" />
                <Text style={[styles.controlLabel, { color: '#F59E0B', fontWeight: '600' }]}>Speak Request Pending Host Approval...</Text>
              </View>
            )}

            {speakRequestStatus === 'accepted' && (
              <View
                style={[
                  styles.controlButton,
                  {
                    width: '100%',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    borderColor: 'rgba(34, 197, 94, 0.4)',
                    flexDirection: 'row',
                    gap: 8,
                  },
                ]}
              >
                <Feather name="check-circle" size={18} color="#22C55E" />
                <Text style={[styles.controlLabel, { color: '#22C55E', fontWeight: 'bold' }]}>Request Approved! You are ON AIR 🎙️</Text>
              </View>
            )}

            {speakRequestStatus === 'rejected' && (
              <View style={{ gap: 8 }}>
                <View
                  style={[
                    styles.controlButton,
                    {
                      width: '100%',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      flexDirection: 'row',
                      gap: 8,
                    },
                  ]}
                >
                  <Feather name="x-circle" size={18} color="#EF4444" />
                  <Text style={[styles.controlLabel, { color: '#EF4444', fontWeight: '600' }]}>Speak Request Declined by Host</Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => {
                    setSpeakRequestStatus('none');
                    setRequestId(null);
                  }}
                  style={[styles.controlButton, { width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.controlLabel, { color: '#E8ECF5' }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderLeft}>
              <Feather name="message-circle" size={16} color="#00d4ff" />
              <Text style={styles.chatTitle}>Chat with Host</Text>
            </View>
            <Text style={styles.chatCount}>{messages.filter(m => !m.isSystem).length} messages</Text>
          </View>

          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              scrollEnabled={false}
            />
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor="#6B7A9E"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, !chatInput.trim() && styles.sendButtonDisabled]}
              disabled={!chatInput.trim()}
              activeOpacity={0.7}
            >
              <Feather name="send" size={18} color={chatInput.trim() ? '#00d4ff' : '#2D3F5C'} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1A',
  },
  // Connecting / Disconnected Screen
  connectingContainer: {
    flex: 1,
    backgroundColor: '#0D0F1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingCard: {
    backgroundColor: '#151A2E',
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242C45',
    width: 280,
  },
  connectingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8ECF5',
    marginTop: 14,
  },
  connectingSub: {
    fontSize: 13,
    color: '#6B7A9E',
    marginTop: 6,
    textAlign: 'center',
  },
  loadingDots: {
    marginTop: 18,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 7,
    backgroundColor: '#00d4ff',
  },
  reconnectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2235',
    backgroundColor: '#0D0F1A',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E8ECF5',
    letterSpacing: 0.2,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7A9E',
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionTimeText: {
    fontSize: 12,
    color: '#6B7A9E',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotExcellent: { backgroundColor: '#22c55e' },
  dotGood: { backgroundColor: '#eab308' },
  dotPoor: { backgroundColor: '#ef4444' },
  qualityExcellent: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  qualityGood: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  qualityPoor: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C7CEDE',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Content
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 18,
    paddingTop: 18,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  controlsSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B97B5',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  controlButton: {
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  micOn: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderColor: 'rgba(0, 212, 255, 0.4)',
  },
  micOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  mutedOn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  mutedOff: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  controlLabel: {
    fontSize: 11,
    color: '#9AA5C2',
  },
  controlStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
  // Chat
  chatSection: {
    flex: 1,
    backgroundColor: '#151A2E',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242C45',
    marginBottom: 18,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8ECF5',
  },
  chatCount: {
    fontSize: 11,
    color: '#6B7A9E',
  },
  chatContainer: {
    maxHeight: 260,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingBottom: 8,
  },
  // Messages
  messageRow: {
    marginBottom: 8,
  },
  hostMessage: {
    alignItems: 'flex-start',
  },
  guestMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  hostBubble: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.18)',
  },
  guestBubble: {
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.18)',
  },
  messageSender: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  hostSender: {
    color: '#00d4ff',
  },
  guestSender: {
    color: '#a78bfa',
  },
  messageText: {
    fontSize: 13,
    color: '#E8ECF5',
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 9,
    color: '#6B7A9E',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 4,
  },
  systemText: {
    fontSize: 11,
    color: '#6B7A9E',
    fontStyle: 'italic',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#242C45',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0D0F1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#E8ECF5',
    borderWidth: 1,
    borderColor: '#242C45',
  },
  sendButton: {
    padding: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
});
