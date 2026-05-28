import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { GuestRequest } from '../types';

interface GuestPanelProps {
  roomLink: string;
  guestRequests: GuestRequest[];
  approvedGuests: GuestRequest[];
  liveViewers: number;
  isLive: boolean;
  showGuestPanel: boolean;
  onTogglePanel: () => void;
  onCopyLink: () => void;
  onShareLink: () => void;
  onApproveGuest: (id: string) => void;
  onDenyGuest: (id: string) => void;
  onRemoveGuest: (id: string) => void;
  onToggleGuestMic: (guestId: string) => void;
  colors: any;
}

export const GuestPanel: React.FC<GuestPanelProps> = ({
  roomLink,
  guestRequests,
  approvedGuests,
  liveViewers,
  isLive,
  showGuestPanel,
  onTogglePanel,
  onCopyLink,
  onShareLink,
  onApproveGuest,
  onDenyGuest,
  onRemoveGuest,
  onToggleGuestMic,
  colors,
}) => {
  const pendingGuest = guestRequests[0];
  const roomIdMatch = roomLink.match(/roomId=([A-Z0-9]+)/i);
  const roomId = roomIdMatch ? roomIdMatch[1] : '';
  const guestRoomUrl = roomLink;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(guestRoomUrl);
    onCopyLink();
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join my podcast room:\n\n${guestRoomUrl}`,
        title: 'Podcast Room Invite',
      });
      onShareLink();
    } catch (_) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <TouchableOpacity style={styles.header} onPress={onTogglePanel}>
        <View style={styles.headerTitle}>
          <Feather name="users" size={16} color={colors.textSecondary} />
          <Text style={[styles.title, { color: colors.text }]}>Remote Guests</Text>
          {guestRequests.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.text }]}>
              <Text style={[styles.countBadgeText, { color: colors.background }]}>{guestRequests.length}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerMeta}>
          <Feather name="radio" size={13} color={isLive ? colors.textSecondary : colors.textMuted} />
          <Text style={[styles.viewerText, { color: colors.textMuted }]}>{liveViewers} live</Text>
          <Feather name={showGuestPanel ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {showGuestPanel ? (
        <View style={styles.body}>
          <View style={[styles.linkBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.linkHeader}>
              <View>
                <Text style={[styles.label, { color: colors.textMuted }]}>Guest link</Text>
                <Text style={[styles.roomId, { color: colors.textSecondary }]}>{roomId || 'Live room not ready'}</Text>
              </View>
              <View style={[styles.livePill, { backgroundColor: isLive ? colors.text : colors.cardBorder }]}>
                <Text style={[styles.livePillText, { color: isLive ? colors.background : colors.textMuted }]}>
                  {isLive ? 'LIVE' : 'OFF'}
                </Text>
              </View>
            </View>

            <Text style={[styles.linkText, { color: colors.text }]} numberOfLines={1}>
              {guestRoomUrl || 'Start live to generate a guest link'}
            </Text>

            <View style={styles.linkActions}>
              <TouchableOpacity
                onPress={handleCopyLink}
                disabled={!roomId}
                style={[styles.iconButton, { borderColor: colors.cardBorder, opacity: roomId ? 1 : 0.45 }]}
              >
                <Feather name="copy" size={15} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShareLink}
                disabled={!roomId}
                style={[styles.iconButton, { borderColor: colors.cardBorder, opacity: roomId ? 1 : 0.45 }]}
              >
                <Feather name="share-2" size={15} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pendingGuest && onApproveGuest(pendingGuest.id)}
                disabled={!pendingGuest}
                style={[
                  styles.allowButton,
                  {
                    backgroundColor: pendingGuest ? colors.text : colors.cardBorder,
                    opacity: pendingGuest ? 1 : 0.6,
                  },
                ]}
              >
                <Feather name="user-check" size={15} color={colors.background} />
                <Text style={[styles.allowButtonText, { color: colors.background }]}>
                  {pendingGuest ? `Allow ${pendingGuest.name}` : 'No request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pending requests</Text>
            {guestRequests.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No guest requests yet</Text>
              </View>
            ) : (
              guestRequests.map((guest) => (
                <View key={guest.id} style={[styles.requestRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.guestIdentity}>
                    <View style={[styles.avatar, { backgroundColor: colors.cardBorder }]}>
                      <Feather name="user" size={15} color={colors.textSecondary} />
                    </View>
                    <View style={styles.guestTextBlock}>
                      <Text style={[styles.guestName, { color: colors.text }]}>{guest.name}</Text>
                      <Text style={[styles.guestDevice, { color: colors.textMuted }]}>{guest.device}</Text>
                    </View>
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity onPress={() => onApproveGuest(guest.id)} style={[styles.approveButton, { backgroundColor: colors.text }]}>
                      <Feather name="check" size={15} color={colors.background} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDenyGuest(guest.id)} style={[styles.denyButton, { borderColor: colors.cardBorder }]}>
                      <Feather name="x" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Connected guests</Text>
            {approvedGuests.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No guests connected</Text>
              </View>
            ) : (
              approvedGuests.map((guest) => (
                <View key={guest.id} style={[styles.connectedRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.guestIdentity}>
                    <View style={[styles.avatar, { backgroundColor: colors.cardBorder }]}>
                      <Feather name="user-check" size={15} color={colors.textSecondary} />
                    </View>
                    <View style={styles.guestTextBlock}>
                      <Text style={[styles.guestName, { color: colors.text }]}>{guest.name}</Text>
                      <Text style={[styles.guestDevice, { color: colors.textMuted }]}>Mic muted by default</Text>
                    </View>
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      onPress={() => onToggleGuestMic(guest.id)}
                      style={[styles.micButton, { borderColor: colors.cardBorder }]}
                    >
                      <Feather name="mic-off" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onRemoveGuest(guest.id)} style={[styles.denyButton, { borderColor: colors.cardBorder }]}>
                      <Feather name="x" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    marginTop: 12,
    gap: 14,
  },
  linkBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roomId: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
  },
  livePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  linkText: {
    fontSize: 12,
  },
  linkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  allowButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  requestRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  connectedRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  guestIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 12,
    fontWeight: '700',
  },
  guestDevice: {
    fontSize: 10,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approveButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
