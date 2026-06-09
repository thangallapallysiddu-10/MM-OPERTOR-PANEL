// PodcastAnalytics.tsx
// Podcast Studio — Session Analytics panel (shown while live).
//
// Displays:
//   • Session Duration           — from liveSeconds (store)
//   • Peak Listeners             — from liveViewers (store)
//   • Guest Speaking Time        — accumulated per slot from guest_speaking events
//   • Mic Health                 — per slot, from RTCPeerConnection.connectionState
//   • Connection Quality         — per slot, from RTCPeerConnection.getStats()
//
// Rules:
//   No changes to audio routing.
//   No changes to recording.
//   No changes to WebRTC signaling.
//   Reuses existing GuestSlot fields added in Phase 1–3.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GuestSlot } from '../../../store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PodcastAnalyticsProps {
  isLive: boolean;
  liveSeconds: number;
  liveViewers: number;
  guestSlots: GuestSlot[];
  hostMicMuted: boolean;
  colors: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSpeakingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

type HealthStatus = 'connected' | 'disconnected' | 'reconnecting' | undefined;
type QualityTier  = 'excellent' | 'good' | 'poor' | null | undefined;

function healthColor(h: HealthStatus): string {
  if (h === 'connected')    return '#22C55E';
  if (h === 'reconnecting') return '#F59E0B';
  return '#64748B';
}

function healthLabel(h: HealthStatus): string {
  if (h === 'connected')    return 'Connected';
  if (h === 'reconnecting') return 'Reconnecting';
  if (h === 'disconnected') return 'Disconnected';
  return '—';
}

function qualityColor(q: QualityTier): string {
  if (q === 'excellent') return '#22C55E';
  if (q === 'good')      return '#F59E0B';
  if (q === 'poor')      return '#EF4444';
  return '#64748B';
}

function qualityLabel(q: QualityTier): string {
  if (q === 'excellent') return 'Excellent';
  if (q === 'good')      return 'Good';
  if (q === 'poor')      return 'Poor';
  return '—';
}

function qualityIcon(q: QualityTier): string {
  if (q === 'excellent') return '▲▲▲';
  if (q === 'good')      return '▲▲';
  if (q === 'poor')      return '▲';
  return '—';
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
  colors: any;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, icon, valueColor, colors }) => (
  <View style={[s.tile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
    <View style={s.tileIcon}>{icon}</View>
    <Text style={[s.tileValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    <Text style={[s.tileLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

// ── Guest Row ─────────────────────────────────────────────────────────────────

interface GuestAnalyticsRowProps {
  slot: GuestSlot;
  colors: any;
}

const MIC_LABELS: Record<string, string> = {
  mic2: 'MIC 2',
  mic3: 'MIC 3',
  mic4: 'MIC 4',
  mic5: 'MIC 5',
};

const GuestAnalyticsRow: React.FC<GuestAnalyticsRowProps> = ({ slot, colors }) => {
  const connected = slot.status === 'connected';
  const hColor = healthColor(slot.micHealth);
  const qColor = qualityColor(slot.connectionQuality);
  const speakSec = slot.speakingSeconds ?? 0;

  return (
    <View style={[s.guestRow, { borderColor: colors.cardBorder }]}>
      {/* Mic label + guest name */}
      <View style={s.guestLeft}>
        <View style={[s.micDot, { backgroundColor: connected ? '#22C55E' : colors.cardBorder }]} />
        <View>
          <Text style={[s.guestMicLabel, { color: colors.text }]}>
            {MIC_LABELS[slot.slotId] ?? slot.slotId}
          </Text>
          <Text style={[s.guestName, { color: connected ? '#059669' : colors.textMuted }]} numberOfLines={1}>
            {connected && slot.guestName ? slot.guestName : 'Empty'}
          </Text>
        </View>
      </View>

      {/* Speaking indicator + time */}
      <View style={s.guestStat}>
        {slot.isSpeaking && (
          <View style={s.speakingPulse} />
        )}
        <Text style={[s.guestStatValue, { color: connected ? colors.text : colors.textMuted }]}>
          {connected ? formatSpeakingTime(speakSec) : '—'}
        </Text>
        <Text style={[s.guestStatLabel, { color: colors.textMuted }]}>speaking</Text>
      </View>

      {/* Mic health */}
      <View style={s.guestStat}>
        <View style={[s.healthDot, { backgroundColor: connected ? hColor : colors.cardBorder }]} />
        <Text style={[s.guestStatValue, { color: connected ? hColor : colors.textMuted }]}>
          {connected ? healthLabel(slot.micHealth) : '—'}
        </Text>
        <Text style={[s.guestStatLabel, { color: colors.textMuted }]}>health</Text>
      </View>

      {/* Connection quality */}
      <View style={s.guestStat}>
        <Text style={[s.qualityIcon, { color: connected ? qColor : colors.textMuted }]}>
          {connected ? qualityIcon(slot.connectionQuality) : '—'}
        </Text>
        <Text style={[s.guestStatValue, { color: connected ? qColor : colors.textMuted }]}>
          {connected ? qualityLabel(slot.connectionQuality) : '—'}
        </Text>
        {connected && slot.rtt != null && (
          <Text style={[s.guestStatLabel, { color: colors.textMuted }]}>{slot.rtt}ms</Text>
        )}
        {connected && slot.rtt == null && (
          <Text style={[s.guestStatLabel, { color: colors.textMuted }]}>quality</Text>
        )}
      </View>
    </View>
  );
};

// ── PodcastAnalytics ──────────────────────────────────────────────────────────

export const PodcastAnalytics: React.FC<PodcastAnalyticsProps> = ({
  isLive,
  liveSeconds,
  liveViewers,
  guestSlots,
  hostMicMuted,
  colors,
}) => {
  if (!isLive) return null;

  const connectedSlots = guestSlots.filter(s => s.status === 'connected');
  const totalGuestSpeaking = guestSlots.reduce((sum, s) => sum + (s.speakingSeconds ?? 0), 0);

  return (
    <View style={[s.container, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      {/* Header */}
      <View style={s.header}>
        <Feather name="bar-chart-2" size={13} color={colors.textSecondary} />
        <Text style={[s.headerText, { color: colors.textSecondary }]}>SESSION ANALYTICS</Text>
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveChipText}>LIVE</Text>
        </View>
      </View>

      {/* Top stat row */}
      <View style={s.tileRow}>
        <StatTile
          label="Duration"
          value={formatDuration(liveSeconds)}
          valueColor="#4F6AF0"
          colors={colors}
          icon={<Feather name="clock" size={14} color="#4F6AF0" />}
        />
        <StatTile
          label="Listeners"
          value={String(liveViewers)}
          valueColor="#22C55E"
          colors={colors}
          icon={<Feather name="users" size={14} color="#22C55E" />}
        />
        <StatTile
          label="Guests Live"
          value={String(connectedSlots.length)}
          valueColor={connectedSlots.length > 0 ? '#22C55E' : colors.textMuted}
          colors={colors}
          icon={<Feather name="mic" size={14} color={connectedSlots.length > 0 ? '#22C55E' : colors.textMuted} />}
        />
        <StatTile
          label="Guest Talk"
          value={totalGuestSpeaking > 0 ? formatSpeakingTime(totalGuestSpeaking) : '—'}
          valueColor={totalGuestSpeaking > 0 ? '#F59E0B' : colors.textMuted}
          colors={colors}
          icon={<Feather name="activity" size={14} color="#F59E0B" />}
        />
      </View>

      {/* Guest analytics table */}
      <View style={[s.table, { borderColor: colors.cardBorder }]}>
        {/* Table header */}
        <View style={[s.tableHeader, { borderBottomColor: colors.cardBorder }]}>
          <Text style={[s.tableHeaderCell, s.guestLeft, { color: colors.textMuted }]}>SLOT</Text>
          <Text style={[s.tableHeaderCell, { color: colors.textMuted }]}>SPEAKING</Text>
          <Text style={[s.tableHeaderCell, { color: colors.textMuted }]}>MIC HEALTH</Text>
          <Text style={[s.tableHeaderCell, { color: colors.textMuted }]}>QUALITY</Text>
        </View>

        {guestSlots.map(slot => (
          <GuestAnalyticsRow key={slot.slotId} slot={slot} colors={colors} />
        ))}
      </View>

      {/* Host MIC 1 health */}
      <View style={[s.hostRow, { borderTopColor: colors.cardBorder }]}>
        <View style={[s.micDot, { backgroundColor: hostMicMuted ? '#EF4444' : '#22C55E' }]} />
        <Text style={[s.guestMicLabel, { color: colors.text }]}>MIC 1</Text>
        <Text style={[s.guestName, { color: colors.textSecondary }]}>Host</Text>
        <View style={{ flex: 1 }} />
        <View style={[s.hostHealthBadge, { backgroundColor: hostMicMuted ? '#EF444418' : '#22C55E18', borderColor: hostMicMuted ? '#EF444440' : '#22C55E40' }]}>
          <Text style={[s.hostHealthText, { color: hostMicMuted ? '#EF4444' : '#22C55E' }]}>
            {hostMicMuted ? 'Muted' : 'Active'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PodcastAnalytics;

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    flex: 1,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#EF444418',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.6,
  },

  // Tile row
  tileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  tileIcon: {
    marginBottom: 2,
  },
  tileValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Table
  table: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Guest row
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  guestLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  micDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  guestMicLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  guestName: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  guestStat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  guestStatValue: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  guestStatLabel: {
    fontSize: 8,
    fontWeight: '500',
  },

  // Speaking pulse indicator
  speakingPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginBottom: 2,
  },

  // Health dot
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 1,
  },

  // Quality icon
  qualityIcon: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 1,
  },

  // Host row
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  hostHealthBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  hostHealthText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
