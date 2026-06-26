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
  return (
    <View
      style={[
        styles.recordingItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View
        style={[
          styles.recordingIcon,
          { backgroundColor: `${colors.accent}20` },
        ]}
      >
        <Feather name="mic" size={18} color={colors.accent} />
      </View>

      <View style={styles.recordingInfo}>
        <Text
          style={[styles.recordingName, { color: colors.text }]}
          numberOfLines={1}
        >
          {recording.name}
        </Text>
        <Text style={[styles.recordingMeta, { color: colors.textMuted }]}>
          {recording.duration} • {recording.size || '5 MB'}
        </Text>
      </View>

      <View style={styles.recordingActions}>
        <TouchableOpacity
          onPress={onTrim}
          style={[
            styles.actionButton,
            { backgroundColor: `${colors.warning}20` },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.warning }]}>
            Trim
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onUse}
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.actionText, { color: '#FFF' }]}>Use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          style={[
            styles.actionButton,
            { backgroundColor: `${colors.danger}20` },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.danger }]}>
            Delete
          </Text>
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
  if (recordings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="mic-off" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No recordings yet
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
          Record something in Podcast Session
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  recordingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 13,
    fontWeight: '600',
  },
  recordingMeta: {
    fontSize: 11,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: 12,
  },
});