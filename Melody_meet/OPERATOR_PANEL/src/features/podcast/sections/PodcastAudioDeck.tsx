// PodcastAudioDeck.tsx
// Podcast Studio — Section 1 (always visible)
//
// MIC 1 = Host (fixed, separate controls)
// MIC 2–5 = Guest Slots with: Copy Link · Mute · Volume · Remove
//
// Copy Link is always visible when roomLink exists (pre-live distribution).
// Controls panel expands inline per card — no permanent sliders.
// No architecture changes. Reuses existing mute/volume/kick API endpoints.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Mic } from '../types';
import { GuestSlot } from '../../../store/useAppStore';
import { PodcastApi } from '../../../services/api/operatorApi';
import { extractRoomId } from '../utils/podcastMappers';

// ── Constants ─────────────────────────────────────────────────────────────────

type SlotId = 'mic2' | 'mic3' | 'mic4' | 'mic5';

// Slot metadata: label shown under the MIC number
const SLOT_META: Record<SlotId, { micLabel: string; slotLabel: string }> = {
  mic2: { micLabel: 'MIC 2', slotLabel: 'Guest Slot 1' },
  mic3: { micLabel: 'MIC 3', slotLabel: 'Guest Slot 2' },
  mic4: { micLabel: 'MIC 4', slotLabel: 'Guest Slot 3' },
  mic5: { micLabel: 'MIC 5', slotLabel: 'Backup Slot' },
};

const GUEST_SLOTS: SlotId[] = ['mic2', 'mic3', 'mic4', 'mic5'];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PodcastAudioDeckProps {
  mics: Mic[];
  guestSlots: GuestSlot[];
  roomLink: string;
  isRecording: boolean;
  recordingSeconds: number;
  liveViewers: number;
  isLive: boolean;
  onToggleMute: (id: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStartLive: () => void;
  onEndLive: () => void;
  colors: any;
  gradients?: any;
  // Phase 3 — real-audio callbacks from usePeerConnections.
  // Optional: when undefined (mobile / no WebRTC) only DB/socket state changes.
  onPeerMute?: (slotId: SlotId, muted: boolean) => void;
  onPeerVolume?: (slotId: SlotId, volume: number) => void;
  onPeerRemove?: (slotId: SlotId) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildGuestLink(roomLink: string, slotId: SlotId, slotUrl?: string): string {
  if (slotUrl) return slotUrl;
  const match = roomLink.match(/[?&]roomId=([A-Za-z0-9_-]+)/i);
  const roomId = match ? match[1] : extractRoomId(roomLink) ?? 'ROOM';
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : '';
  return `${base}/podcast/guest/${slotId}/${roomId}`;
}

async function copyGuestLink(roomLink: string, slot: GuestSlot) {
  const url = buildGuestLink(roomLink, slot.slotId as SlotId, slot.url);
  try {
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied', `${SLOT_META[slot.slotId as SlotId].micLabel} link copied`);
  } catch {
    Alert.alert(`${SLOT_META[slot.slotId as SlotId].micLabel} Link`, url);
  }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Host Mic Card ─────────────────────────────────────────────────────────────

interface HostMicCardProps {
  mic: Mic | undefined;
  onToggleMute: (id: number) => void;
  colors: any;
}

const HostMicCard: React.FC<HostMicCardProps> = ({ mic, onToggleMute, colors }) => {
  const [showControls, setShowControls] = useState(false);
  const on = mic ? !mic.muted : false;

  return (
    <View
      style={[
        styles.micCard,
        {
          borderColor: on ? '#22C55E' : '#EF4444',
          backgroundColor: on ? '#22C55E0A' : '#EF44440A',
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.micIconWrap, { backgroundColor: `${colors.text}12` }]}>
        <Text style={{ fontSize: 20 }}>{mic?.icon ?? '🎙️'}</Text>
      </View>

      {/* Labels */}
      <View style={styles.micLabels}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.micNum, { color: colors.text }]}>MIC 1</Text>
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>HOST</Text>
          </View>
        </View>
        <Text style={[styles.micSlotLabel, { color: colors.textMuted }]}>Operator</Text>
      </View>

      {/* Status dot */}
      <View style={[styles.statusDot, { backgroundColor: on ? '#22C55E' : '#EF4444' }]} />

      {/* Inline action row */}
      <View style={styles.actionRow}>
        {/* Mute toggle */}
        <TouchableOpacity
          onPress={() => mic && onToggleMute(mic.id)}
          style={[
            styles.iconBtn,
            {
              borderColor: on ? '#22C55E40' : '#EF444440',
              backgroundColor: on ? '#22C55E12' : '#EF444412',
            },
          ]}
          accessibilityLabel={on ? 'Mute host mic' : 'Unmute host mic'}
        >
          <Feather name={on ? 'mic' : 'mic-off'} size={12} color={on ? '#22C55E' : '#EF4444'} />
        </TouchableOpacity>

        {/* Controls toggle */}
        <TouchableOpacity
          onPress={() => setShowControls(v => !v)}
          style={[styles.iconBtn, { borderColor: colors.cardBorder }]}
          accessibilityLabel="Host controls"
        >
          <Feather name="sliders" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Expanded controls panel */}
      {showControls && (
        <View style={[styles.expandedPanel, { borderTopColor: colors.cardBorder, backgroundColor: colors.surface }]}>
          <Text style={[styles.panelLabel, { color: colors.textMuted }]}>Volume</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={200}
            value={mic?.volume ?? 100}
            step={5}
            minimumTrackTintColor="#4F6AF0"
            maximumTrackTintColor={colors.cardBorder}
            thumbTintColor="#4F6AF0"
            onSlidingComplete={(val) => {
              // Host volume goes through the existing mic update path
              if (mic) {
                // Import is handled via store's updateMic which already debounces API
                const { useAppStore } = require('../../../store/useAppStore');
                useAppStore.getState().updateMic(mic.id, { volume: Math.round(val) });
              }
            }}
          />
          <View style={styles.panelRow}>
            <Text style={[styles.panelValueText, { color: colors.textMuted }]}>
              {mic?.volume ?? 100}%
            </Text>
            <View style={styles.connectionRow}>
              <View style={[styles.connDot, { backgroundColor: on ? '#22C55E' : colors.textMuted }]} />
              <Text style={[styles.connText, { color: colors.textMuted }]}>
                {on ? 'Active' : 'Muted'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// ── Guest Slot Card ───────────────────────────────────────────────────────────

interface GuestMicCardProps {
  slot: GuestSlot;
  roomLink: string;
  isLive: boolean;
  colors: any;
  onUpdateSlot: (slotId: string, patch: Partial<GuestSlot>) => void;
  roomId: string;
  // Phase 3 — real-audio callbacks (undefined on mobile / no WebRTC)
  onPeerMute?: (slotId: SlotId, muted: boolean) => void;
  onPeerVolume?: (slotId: SlotId, volume: number) => void;
  onPeerRemove?: (slotId: SlotId) => void;
}

const GuestMicCard: React.FC<GuestMicCardProps> = ({
  slot,
  roomLink,
  isLive,
  colors,
  onUpdateSlot,
  roomId,
  onPeerMute,
  onPeerVolume,
  onPeerRemove,
}) => {
  const [showControls, setShowControls] = useState(false);
  const [pendingVolume, setPendingVolume] = useState<number>(slot.volume ?? 100);

  const connected = slot.status === 'connected';
  const muted = slot.micMuted ?? false;
  const guestSelfMuted = slot.guestSelfMuted ?? false;
  const meta = SLOT_META[slot.slotId as SlotId];
  const hasRoomLink = roomLink.trim().length > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCopy = () => copyGuestLink(roomLink, slot);

  const handleMute = async () => {
    if (!connected) return;
    const nextMuted = !muted;
    onUpdateSlot(slot.slotId, { micMuted: nextMuted });
    // Apply to real audio immediately (Phase 3)
    onPeerMute?.(slot.slotId as SlotId, nextMuted);
    try {
      await PodcastApi.muteGuestSlot(roomId, slot.slotId, nextMuted);
    } catch {
      onUpdateSlot(slot.slotId, { micMuted: muted });
      onPeerMute?.(slot.slotId as SlotId, muted); // revert audio
      Alert.alert('Error', 'Could not change mute state');
    }
  };

  const handleVolumeCommit = async (val: number) => {
    if (!connected) return;
    const rounded = Math.round(val);
    onUpdateSlot(slot.slotId, { volume: rounded });
    // Apply to real audio immediately (Phase 3)
    onPeerVolume?.(slot.slotId as SlotId, rounded);
    try {
      await PodcastApi.setGuestSlotVolume(roomId, slot.slotId, rounded);
    } catch {
      Alert.alert('Error', 'Could not set volume');
    }
  };

  const handleRemove = () => {
    if (!connected) return;
    Alert.alert(
      'Remove Guest',
      `Remove ${slot.guestName ?? 'guest'} from ${meta.micLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            onUpdateSlot(slot.slotId, { status: 'empty', guestName: null, guestId: null });
            setShowControls(false);
            // Close peer connection immediately (Phase 3)
            onPeerRemove?.(slot.slotId as SlotId);
            try {
              await PodcastApi.kickGuestSlot(roomId, slot.slotId);
            } catch {
              Alert.alert('Error', 'Could not remove guest');
            }
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.micCard,
        {
          borderColor: connected ? '#22C55E' : colors.cardBorder,
          backgroundColor: connected ? '#22C55E0A' : colors.surface,
        },
      ]}
    >
      {/* Avatar / icon */}
      <View style={[styles.micIconWrap, { backgroundColor: connected ? '#22C55E15' : colors.card }]}>
        {connected ? (
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#22C55E' }}>
            {slot.guestName?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        ) : (
          <Feather name="user" size={16} color={colors.textMuted} />
        )}
      </View>

      {/* Labels */}
      <View style={styles.micLabels}>
        <Text style={[styles.micNum, { color: colors.text }]}>{meta.micLabel}</Text>
        <Text style={[styles.micSlotLabel, { color: colors.textMuted }]}>{meta.slotLabel}</Text>
        {connected && slot.guestName ? (
          <Text style={[styles.micGuestName, { color: '#059669' }]} numberOfLines={1}>
            {slot.guestName}
          </Text>
        ) : (
          <Text style={[styles.micGuestName, { color: colors.textMuted }]}>Available</Text>
        )}
        {/* Phase 2: Guest self-mute indicator — shown when guest toggled their own mic */}
        {connected && guestSelfMuted && (
          <Text style={styles.selfMutedBadge}>🔇 Guest muted</Text>
        )}
        {/* Phase 1: Speaking indicator */}
        {connected && slot.isSpeaking && !guestSelfMuted && (
          <Text style={styles.speakingBadge}>🎙 Speaking</Text>
        )}
      </View>

      {/* Status dot */}
      <View
        style={[styles.statusDot, { backgroundColor: connected ? '#22C55E' : colors.cardBorder }]}
      />

      {/* Action row: Copy · Mute · Controls */}
      <View style={styles.actionRow}>

        {/* Copy Link — always visible when roomLink exists */}
        {hasRoomLink && (
          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.iconBtn, { borderColor: colors.cardBorder }]}
            accessibilityLabel={`Copy guest link for ${meta.micLabel}`}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="copy" size={11} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Mute — only when connected */}
        {connected && (
          <TouchableOpacity
            onPress={handleMute}
            style={[
              styles.iconBtn,
              {
                borderColor: muted ? '#EF444440' : '#22C55E40',
                backgroundColor: muted ? '#EF444412' : '#22C55E12',
              },
            ]}
            accessibilityLabel={muted ? `Unmute ${meta.micLabel}` : `Mute ${meta.micLabel}`}
          >
            <Feather name={muted ? 'mic-off' : 'mic'} size={11} color={muted ? '#EF4444' : '#22C55E'} />
          </TouchableOpacity>
        )}

        {/* Controls toggle */}
        <TouchableOpacity
          onPress={() => setShowControls(v => !v)}
          style={[
            styles.iconBtn,
            {
              borderColor: showControls ? '#4F6AF0' : colors.cardBorder,
              backgroundColor: showControls ? '#4F6AF012' : 'transparent',
            },
          ]}
          accessibilityLabel={`${showControls ? 'Hide' : 'Show'} controls for ${meta.micLabel}`}
        >
          <Feather name="settings" size={11} color={showControls ? '#4F6AF0' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Expanded controls panel */}
      {showControls && (
        <View style={[styles.expandedPanel, { borderTopColor: colors.cardBorder, backgroundColor: colors.surface }]}>

          {/* Volume slider — only meaningful when connected */}
          <Text style={[styles.panelLabel, { color: colors.textMuted }]}>
            Volume {Math.round(pendingVolume)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={200}
            value={pendingVolume}
            step={5}
            disabled={!connected}
            minimumTrackTintColor={connected ? '#4F6AF0' : colors.cardBorder}
            maximumTrackTintColor={colors.cardBorder}
            thumbTintColor={connected ? '#4F6AF0' : colors.textMuted}
            onValueChange={setPendingVolume}
            onSlidingComplete={handleVolumeCommit}
          />

          {/* Status + Remove */}
          <View style={styles.panelRow}>
            <View style={styles.connectionRow}>
              <View
                style={[styles.connDot, { backgroundColor: connected ? '#22C55E' : colors.textMuted }]}
              />
              <Text style={[styles.connText, { color: colors.textMuted }]}>
                {connected ? (muted ? 'Op. Muted' : guestSelfMuted ? 'Guest Muted' : 'Connected') : 'Empty'}
              </Text>
            </View>

            {connected && (
              <TouchableOpacity
                onPress={handleRemove}
                style={styles.removeBtn}
                accessibilityLabel={`Remove guest from ${meta.micLabel}`}
              >
                <Feather name="user-x" size={11} color="#EF4444" />
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// ── PodcastAudioDeck ──────────────────────────────────────────────────────────

export const PodcastAudioDeck: React.FC<PodcastAudioDeckProps> = ({
  mics,
  guestSlots,
  roomLink,
  isRecording,
  recordingSeconds,
  liveViewers,
  isLive,
  onToggleMute,
  onStartRecording,
  onStopRecording,
  onStartLive,
  onEndLive,
  colors,
  gradients,
  onPeerMute,
  onPeerVolume,
  onPeerRemove,
}) => {
  const hostMic = mics.find(m => m.id === 1);
  const roomId = extractRoomId(roomLink) ?? '';

  // Get or build slot objects for all 4 guest slots
  const slots = GUEST_SLOTS.map(slotId =>
    guestSlots.find(s => s.slotId === slotId) ?? {
      slotId,
      label: SLOT_META[slotId].micLabel,
      status: 'empty' as const,
      guestName: null,
      guestId: null,
    }
  );

  // Optimistic slot patch — passed into each card so they can update store directly
  const handleUpdateSlot = (slotId: string, patch: Partial<GuestSlot>) => {
    const { useAppStore } = require('../../../store/useAppStore');
    useAppStore.getState().updateGuestSlot(slotId, patch);
  };

  return (
    <View style={{ gap: 12 }}>

      {/* ── Mic row ── */}
      <View style={styles.micRow}>
        <HostMicCard mic={hostMic} onToggleMute={onToggleMute} colors={colors} />
        {slots.map(slot => (
          <GuestMicCard
            key={slot.slotId}
            slot={slot}
            roomLink={roomLink}
            isLive={isLive}
            colors={colors}
            onUpdateSlot={handleUpdateSlot}
            roomId={roomId}
            onPeerMute={onPeerMute}
            onPeerVolume={onPeerVolume}
            onPeerRemove={onPeerRemove}
          />
        ))}
      </View>

      {/* ── Control bar ── */}
      <View style={[styles.controlBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>

        {!isRecording ? (
          <TouchableOpacity
            onPress={onStartRecording}
            style={[styles.ctrlBtn, { backgroundColor: '#4F6AF0' }]}
            accessibilityLabel="Start recording"
          >
            <View style={styles.recDot} />
            <Text style={styles.ctrlBtnText}>Record</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onStopRecording}
            style={[styles.ctrlBtn, { backgroundColor: '#DC2626' }]}
            accessibilityLabel="Stop recording"
          >
            <View style={styles.stopSquare} />
            <Text style={styles.ctrlBtnText}>Stop</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={isLive ? onEndLive : onStartLive}
          style={{ borderRadius: 8, overflow: 'hidden' }}
          accessibilityLabel={isLive ? 'End live stream' : 'Go live'}
        >
          <LinearGradient
            colors={isLive ? ['#B91C1C', '#EF4444'] : (gradients?.primary ?? ['#4F6AF0', '#6B8EFF'])}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.liveGradient}
          >
            <Feather name={isLive ? 'power' : 'radio'} size={13} color="#FFFFFF" />
            <Text style={styles.ctrlBtnText}>{isLive ? 'End Live' : 'Go Live'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.metaItem}>
          <Feather name="clock" size={12} color={isRecording ? '#DC2626' : colors.textMuted} />
          <Text style={[styles.metaText, { color: isRecording ? '#DC2626' : colors.textMuted, fontVariant: ['tabular-nums'] }]}>
            {formatTime(recordingSeconds)}
          </Text>
        </View>

        {isLive && (
          <View style={styles.metaItem}>
            <Feather name="eye" size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{liveViewers}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Mic row ──────────────────────────────────────────────────────────────────
  micRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap',
    alignItems: 'flex-start',
  },
  micCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 90 : '18%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 5,
  },
  micIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micLabels: {
    alignItems: 'center',
    gap: 1,
    width: '100%',
  },
  micNum: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  micSlotLabel: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  micGuestName: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  hostBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#4F6AF0',
  },
  hostBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // ── Action row (icon buttons under each card) ─────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Expanded controls panel ───────────────────────────────────────────────
  expandedPanel: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 4,
  },
  panelLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 28,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  panelValueText: {
    fontSize: 9,
    fontWeight: '600',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connText: {
    fontSize: 9,
    fontWeight: '600',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF444440',
    backgroundColor: '#EF444408',
  },
  removeBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  selfMutedBadge: {
    fontSize: 8,
    fontWeight: '700',
    color: '#F59E0B',
    textAlign: 'center',
  },
  speakingBadge: {
    fontSize: 8,
    fontWeight: '700',
    color: '#22C55E',
    textAlign: 'center',
  },

  // ── Control bar ───────────────────────────────────────────────────────────
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  ctrlBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stopSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PodcastAudioDeck;
