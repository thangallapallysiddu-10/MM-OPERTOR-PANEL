// src/pages/GuestJoinPage.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import GuestRoom from './GuestRoom';

interface GuestJoinPageProps {
  slotId: string;
  roomId: string;
  onLeave?: () => void;
}

export default function GuestJoinPage({ slotId, roomId, onLeave }: GuestJoinPageProps) {
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Auto-identify and auto-join guest if name is present in invite URL query string
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlGuestName = urlParams.get('name');
      if (urlGuestName && urlGuestName.trim() !== '') {
        const finalName = urlGuestName.trim();
        setGuestName(finalName);
        setIsJoining(true);
        setError('');

        const timer = setTimeout(() => {
          setIsJoining(false);
          setHasJoined(true);
        }, 1000); // 1-second delay for smooth transitions
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const getSlotLabel = (id: string) => {
    const map: Record<string, string> = {
      'mic2': 'MIC 2 — Guest Slot 1',
      'mic3': 'MIC 3 — Guest Slot 2',
      'mic4': 'MIC 4 — Guest Slot 3',
      'mic5': 'MIC 5 — Guest Slot 4',
      'mic6': 'MIC 6 — Call-in Guest',
    };
    return map[id] || `MIC ${id?.replace('mic', '') || '?'} — Guest Slot`;
  };

  const slotLabel = slotId ? getSlotLabel(slotId) : 'Guest Slot';

  const handleJoin = () => {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setIsJoining(true);

    setTimeout(() => {
      setIsJoining(false);
      setHasJoined(true);  // ✅ Navigate to GuestRoom
    }, 1500);
  };

  // ─── IF JOINED, SHOW GUEST ROOM ───────────────────────────────────────────
  if (hasJoined) {
    return (
      <GuestRoom
        slotId={slotId}
        roomId={roomId}
        guestName={guestName}
        onLeave={() => {
          setHasJoined(false);  // ✅ Go back to join page
          onLeave?.();
        }}
      />
    );
  }

  // ─── JOIN PAGE ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Podcast Guest Slot</Text>
          <Text style={styles.slotLabel}>{slotLabel}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : styles.inputNormal]}
            placeholder="Enter your name"
            placeholderTextColor="#6B7A9E"
            value={guestName}
            onChangeText={(text) => {
              setGuestName(text);
              setError('');
            }}
            onSubmitEditing={handleJoin}
            autoFocus
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.joinButtonText}>Join</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          One guest per slot. No approval needed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1A1F35',
    borderRadius: 16,
    padding: 40,
    maxWidth: 420,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2D3F5C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 10,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00d4ff',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  slotLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8ECF5',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7A9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 14,
    color: '#E8ECF5',
    backgroundColor: '#0D0F1A',
    borderWidth: 1,
  },
  inputNormal: {
    borderColor: '#2D3F5C',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#ef4444',
  },
  joinButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#00d4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  joinButtonDisabled: {
    backgroundColor: '#2D3F5C',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7A9E',
  },
});
