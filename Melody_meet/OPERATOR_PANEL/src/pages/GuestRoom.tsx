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
  onLeave: () => void;  // ← This goes back to GuestJoinPage
}

export default function GuestRoom({ slotId, roomId, guestName, onLeave }: GuestRoomProps) {
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
      text: `🎙️ You joined as ${guestName} on ${slotId}`,
      time: new Date().toLocaleTimeString(),
      isHost: false,
      isSystem: true,
    },
    {
      id: '2',
      sender: 'Host',
      text: `👋 Welcome ${guestName}! Ready to start the podcast?`,
      time: new Date().toLocaleTimeString(),
      isHost: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // ─── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Simulate connection ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnecting(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // ─── Simulate connection quality ──────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const qualities: ('excellent' | 'good' | 'poor')[] = ['excellent', 'good', 'good', 'excellent'];
      setConnectionQuality(qualities[Math.floor(Math.random() * qualities.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── Send Message ──────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!chatInput.trim() || isDisconnected) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: guestName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString(),
      isHost: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setChatInput('');

    // Simulate host reply
    setTimeout(() => {
      const replies = [
        'That\'s great to hear! 🎉',
        'Thanks for sharing! 🙌',
        'Interesting point! 🤔',
        'I agree with you! 💯',
        'Let\'s talk more about that.',
        'Awesome! 🔥',
        'Got it! ✅',
        'Perfect! ⭐',
        'Well said! 👏',
        'Love that perspective! 💡',
      ];
      const hostReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'Host',
        text: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString(),
        isHost: true,
      };
      setMessages(prev => [...prev, hostReply]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 1500 + Math.random() * 2000);
  };

  // ─── Toggle Mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    const status = !isMicOn ? 'ON' : 'OFF';
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'System',
      text: `🎤 You turned your mic ${status}`,
      time: new Date().toLocaleTimeString(),
      isHost: false,
      isSystem: true,
    };
    setMessages(prev => [...prev, msg]);
  };

  // ─── Toggle Mute ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    setIsMuted(!isMuted);
    const status = !isMuted ? 'MUTED' : 'UNMUTED';
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'System',
      text: `🔇 You ${status} yourself`,
      time: new Date().toLocaleTimeString(),
      isHost: false,
      isSystem: true,
    };
    setMessages(prev => [...prev, msg]);
  };

  // ─── Reconnect ──────────────────────────────────────────────────────────────
  const handleReconnect = () => {
    setIsDisconnected(false);
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      const msg: Message = {
        id: Date.now().toString(),
        sender: 'System',
        text: '🔄 Reconnected to the room!',
        time: new Date().toLocaleTimeString(),
        isHost: false,
        isSystem: true,
      };
      setMessages(prev => [...prev, msg]);
    }, 2000);
  };

  // ─── Leave Room ────────────────────────────────────────────────────────────
  // NOTE: Alert.alert with multiple buttons does NOT render any UI on web
  // (React Native Web), so on web it silently does nothing and the button
  // looks broken. We branch by platform and use window.confirm on web.
  const handleLeave = () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to leave the podcast?')
          : true;
      if (confirmed) {
        onLeave();
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
          onPress: () => {
            onLeave();
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