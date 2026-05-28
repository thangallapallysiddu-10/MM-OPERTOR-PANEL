import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Podcast } from '../types';
import { getFileUrl } from '../../../services/api/operatorApi';

interface EpisodesListProps {
  podcasts: Podcast[];
  onDeletePodcast: (id: number) => void;
  onPlayEpisode?: (podcast: Podcast) => void;
  colors: any;
}

export const EpisodesList: React.FC<EpisodesListProps> = ({
  podcasts,
  onDeletePodcast,
  onPlayEpisode,
  colors,
}) => {
  const badgeColor = (status: string): { backgroundColor: string; color: string } => {
    if (status === "Published") return { backgroundColor: `${colors.success}20`, color: colors.success };
    if (status === "Draft") return { backgroundColor: `${colors.warning}20`, color: colors.warning };
    if (status === "Scheduled") return { backgroundColor: `${colors.accent}20`, color: colors.accent };
    return { backgroundColor: colors.cardBorder, color: colors.textMuted };
  };

  return (
    <View style={[styles.episodesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIndicator, { backgroundColor: colors.textSecondary }]} />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>YOUR EPISODES</Text>
        <Text style={[styles.episodesCount, { color: colors.textMuted }]}>{podcasts.length} total</Text>
      </View>

      {podcasts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="music" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>no episodes published yet</Text>
        </View>
      ) : (
        podcasts.map((item) => {
          const badge = badgeColor(item.status);
          return (
            <View key={item.id} style={[styles.episodeItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
              <View style={styles.episodeInfo}>
                {item.coverArt ? (
                  <Image source={{ uri: getFileUrl(item.coverArt) }} style={styles.episodeThumbnail} />
                ) : (
                  <View style={[styles.episodeThumbnailFallback, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Feather name="mic" size={20} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.episodeDetails}>
                  {(item.seasonNumber || item.episodeNumber) && (
                    <Text style={[styles.episodeNumber, { color: colors.textSecondary }]}>
                      {item.seasonNumber ? `Season ${item.seasonNumber}` : 'Season -'} • {item.episodeNumber ? `Episode ${item.episodeNumber}` : 'Episode -'}
                    </Text>
                  )}
                  <Text style={[styles.episodeTitle, { color: colors.text }]}>{item.title}</Text>
                  {item.genre ? <Text style={[styles.episodeGenre, { color: colors.textSecondary }]}>{item.genre}</Text> : null}
                  <Text style={[styles.episodeFileName, { color: colors.textMuted }]}>{item.fileName}</Text>
                  {item.fileSize && <Text style={[styles.episodeFileSize, { color: colors.textMuted }]}>{item.fileSize}</Text>}
                  {item.schedule !== "Not scheduled" && (
                    <View style={styles.episodeScheduleRow}>
                      <Feather name="calendar" size={10} color={colors.textSecondary} />
                      <Text style={[styles.episodeSchedule, { color: colors.textSecondary }]}>{item.schedule}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.episodeActions}>
                <View style={[styles.statusBadge, { backgroundColor: badge.backgroundColor }]}>
                  <Text style={[styles.statusTextSmall, { color: badge.color }]}>{item.status}</Text>
                </View>
                {onPlayEpisode && (
                  <TouchableOpacity onPress={() => onPlayEpisode(item)}>
                    <Feather name="play-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => onDeletePodcast(item.id as number)}>
                  <Feather name="trash-2" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  episodesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  episodesCount: {
    fontSize: 11,
    marginLeft: "auto",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 13,
  },
  episodeItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  episodeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  episodeDetails: {
    flex: 1,
  },
  episodeThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  episodeThumbnailFallback: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  episodeTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  episodeNumber: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  episodeFileName: {
    fontSize: 11,
    marginTop: 2,
  },
  episodeGenre: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },
  episodeFileSize: {
    fontSize: 10,
    marginTop: 2,
  },
  episodeScheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  episodeSchedule: {
    fontSize: 10,
    fontStyle: "italic",
  },
  episodeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "500",
  },
});
