// features/podcast/sections/RecentRecordingsList.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Recording } from '../types';

interface RecentRecordingsListProps {
  recordings: Recording[];
  onUseRecording: (recording: Recording) => void;
  onTrimRecording: (recording: Recording) => void;
  onDeleteRecording: (id: number) => void;
  colors: any;
}

const RecordingItem: React.FC<{
  recording: Recording;
  onUse: () => void;
  onTrim: () => void;
  onDelete: () => void;
  colors: any;
}> = ({ recording, onUse, onTrim, onDelete, colors }) => {
  const themeColors = colors || {
    surface: '#1E293B',
    cardBorder: '#334155',
    text: '#F1F5F9',
    textMuted: '#64748B',
    accent: '#4F6AF0',
    warning: '#D97706',
    danger: '#DC2626',
  };

  return (
    <View
      style={[
        styles.recordingItem,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.cardBorder,
        },
      ]}
    >
      <View style={styles.leftSection}>
        <View
          style={[
            styles.recordingIcon,
            { backgroundColor: `${themeColors.accent}12` },
          ]}
        >
          <Feather name="mic" size={16} color={themeColors.accent} />
        </View>

        <View style={styles.recordingInfo}>
          <Text
            style={[styles.recordingName, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {recording.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.statPill, { backgroundColor: `${themeColors.accent}08` }]}>
              <Feather name="clock" size={10} color={themeColors.textMuted} />
              <Text style={[styles.statPillText, { color: themeColors.textMuted }]}>{recording.duration}</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: `${themeColors.accent}08` }]}>
              <Feather name="hard-drive" size={10} color={themeColors.textMuted} />
              <Text style={[styles.statPillText, { color: themeColors.textMuted }]}>{recording.size || '5 MB'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.recordingActions}>
        <TouchableOpacity
          onPress={onTrim}
          style={[
            styles.actionButton,
            { backgroundColor: 'rgba(217, 119, 6, 0.08)', borderColor: 'rgba(217, 119, 6, 0.2)', borderWidth: 1 },
          ]}
        >
          <Feather name="scissors" size={12} color={themeColors.warning} />
          <Text style={[styles.actionText, { color: themeColors.warning }]}>
            Trim
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onUse}
          style={[styles.actionButton, { backgroundColor: themeColors.accent }]}
        >
          <Feather name="arrow-right" size={12} color="#FFF" />
          <Text style={[styles.actionText, { color: '#FFF' }]}>Use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          style={[
            styles.deleteButton,
            { backgroundColor: 'rgba(220, 38, 38, 0.06)' },
          ]}
        >
          <Feather name="trash-2" size={13} color={themeColors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const RecentRecordingsList: React.FC<RecentRecordingsListProps> = ({
  recordings,
  onUseRecording,
  onTrimRecording,
  onDeleteRecording,
  colors,
}) => {
  const themeColors = colors || {
    textMuted: '#64748B',
  };

  if (recordings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Feather name="mic-off" size={26} color={themeColors.textMuted} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No recordings yet
        </Text>
        <Text style={[styles.emptySubText, { color: themeColors.textMuted }]}>
          Record a session in the Podcast Studio to get started
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={true}
      contentContainerStyle={styles.contentContainer}
    >
      {recordings.map((recording) => (
        <RecordingItem
          key={recording.id}
          recording={recording}
          onUse={() => onUseRecording(recording)}
          onTrim={() => onTrimRecording(recording)}
          onDelete={() => onDeleteRecording(recording.id)}
          colors={colors}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 8,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  recordingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recordingInfo: {
    flex: 1,
    gap: 4,
  },
  recordingName: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statPillText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(100, 116, 139, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});