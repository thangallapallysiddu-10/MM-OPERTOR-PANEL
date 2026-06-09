import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

interface EpisodeDetailsProps {
  title: string;
  description: string;
  genre: string;
  seasonNumber: string;
  episodeNumber: string;
  coverArt: string;
  fileName: string;
  fileSize: string;
  uploading: boolean;
  progress: number;
  scheduleDisplay: string;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onGenreChange: (text: string) => void;
  onSeasonNumberChange: (text: string) => void;
  onEpisodeNumberChange: (text: string) => void;
  onPickCoverArt: () => void;
  onResetCoverArt: () => void;
  onPickFile: () => void;
  onResetFile: () => void;
  onOpenCalendar: () => void;
  onClearSchedule: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  colors: any;
  gradients?: any;
}

export const EpisodeDetails: React.FC<EpisodeDetailsProps> = ({
  title,
  description,
  genre,
  seasonNumber,
  episodeNumber,
  coverArt,
  fileName,
  fileSize,
  uploading,
  progress,
  scheduleDisplay,
  onTitleChange,
  onDescriptionChange,
  onGenreChange,
  onSeasonNumberChange,
  onEpisodeNumberChange,
  onPickCoverArt,
  onResetCoverArt,
  onPickFile,
  onResetFile,
  onOpenCalendar,
  onClearSchedule,
  onPublish,
  onSaveDraft,
  colors,
  gradients,
}) => {
  const genreSuggestions = ['Interview', 'Music', 'Comedy', 'News', 'Education', 'Storytelling'];

  return (
    <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIndicator, { backgroundColor: colors.textSecondary }]} />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>EPISODE DETAILS</Text>
      </View>

      <View style={styles.thumbnailArea}>
        <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>episode thumbnail</Text>
        <TouchableOpacity
          onPress={onPickCoverArt}
          style={[styles.thumbnailBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
        >
          {coverArt ? (
            <Image source={{ uri: coverArt }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailEmpty}>
              <Feather name="image" size={28} color={colors.textSecondary} />
              <Text style={[styles.uploadPlaceholder, { color: colors.textMuted }]}>Tap to select thumbnail</Text>
            </View>
          )}
        </TouchableOpacity>
        {coverArt ? (
          <View style={styles.fileActions}>
            <TouchableOpacity onPress={onPickCoverArt} style={[styles.changeFileButton, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.changeFileText, { color: colors.textSecondary }]}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onResetCoverArt} style={[styles.removeFileButton, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.removeFileText, { color: colors.textMuted }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Upload Area */}
      <View style={styles.uploadArea}>
        <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>upload audio file</Text>
        <TouchableOpacity
          onPress={onPickFile}
          style={[styles.uploadBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
        >
          <Feather name="music" size={32} color={colors.textSecondary} />
          <Text style={[styles.uploadPlaceholder, { color: fileName ? colors.text : colors.textMuted }]}>
            {fileName ? fileName : "Tap to select audio file"}
          </Text>
          {fileName && fileSize ? <Text style={[styles.fileSizeText, { color: colors.textMuted }]}>{fileSize}</Text> : null}
        </TouchableOpacity>

        {!fileName && <Text style={[styles.noFileText, { color: colors.textMuted }]}>Supported: MP3, WAV, M4A, AAC</Text>}

        {!!fileName && (
          <View style={styles.fileActions}>
            <TouchableOpacity
              onPress={onPickFile}
              style={[styles.changeFileButton, { borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.changeFileText, { color: colors.textSecondary }]}>🔄 Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onResetFile}
              style={[styles.removeFileButton, { borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.removeFileText, { color: colors.textMuted }]}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upload Progress */}
      {uploading && progress > 0 && progress < 100 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>uploading...</Text>
            <Text style={[styles.progressValue, { color: colors.textSecondary }]}>{progress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.cardBorder }]}>
            <LinearGradient
              colors={gradients?.primary || [colors.text, colors.textSecondary]}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
        </View>
      )}

      {/* Title Input */}
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
        placeholder="episode title"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={onTitleChange}
      />

      <View style={styles.numberRow}>
        <TextInput
          style={[styles.input, styles.numberInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="season"
          placeholderTextColor={colors.textMuted}
          value={seasonNumber}
          onChangeText={(text) => onSeasonNumberChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, styles.numberInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="episode no."
          placeholderTextColor={colors.textMuted}
          value={episodeNumber}
          onChangeText={(text) => onEpisodeNumberChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
        placeholder="genre"
        placeholderTextColor={colors.textMuted}
        value={genre}
        onChangeText={onGenreChange}
      />

      <View style={styles.genreSuggestions}>
        {genreSuggestions.map((item) => {
          const selected = genre.toLowerCase() === item.toLowerCase();
          return (
            <TouchableOpacity
              key={item}
              onPress={() => onGenreChange(item)}
              style={[
                styles.genreChip,
                {
                  borderColor: selected ? '#4F6AF0' : colors.cardBorder,
                  backgroundColor: selected ? '#4F6AF0' : colors.surface,
                },
              ]}
            >
              <Text style={[styles.genreChipText, { color: selected ? colors.background : colors.textMuted }]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description Input */}
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
        placeholder="description"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        numberOfLines={3}
      />

      {/* Schedule Section */}
      <View style={styles.scheduleContainer}>
        <Text style={[styles.scheduleLabel, { color: colors.textMuted }]}>schedule</Text>
        {scheduleDisplay ? (
          <View style={styles.scheduleDisplay}>
            <View style={[styles.scheduleBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
              <Feather name="calendar" size={14} color={colors.textSecondary} />
              <Text style={[styles.scheduleBadgeText, { color: colors.textSecondary }]}>{scheduleDisplay}</Text>
              <TouchableOpacity onPress={onClearSchedule}>
                <Feather name="x" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <TouchableOpacity
          onPress={onOpenCalendar}
          style={[styles.scheduleButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <Feather name="calendar" size={16} color={colors.text} />
          <Text style={[styles.scheduleButtonText, { color: colors.text }]}>Select Date & Time</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={onPublish}
          disabled={uploading || !fileName}
          style={[styles.publishButton, (uploading || !fileName) && styles.disabledButton]}
        >
          <LinearGradient colors={gradients?.primary || [colors.text, colors.textSecondary]} style={styles.buttonGradient}>
            <Text style={[styles.publishButtonText, { color: colors.background }]}>publish</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSaveDraft}
          disabled={uploading || !fileName}
          style={[styles.draftButton, (uploading || !fileName) && styles.disabledButton, { borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <Text style={[styles.draftButtonText, { color: colors.text }]}>save draft</Text>
        </TouchableOpacity>
      </View>

      {/* File Status */}
      {!!fileName && !uploading && (
        <View style={styles.fileStatus}>
          <Feather name="check-circle" size={14} color={colors.textSecondary} />
          <Text style={[styles.fileStatusText, { color: colors.textSecondary }]}>File ready: {fileName}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  uploadCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  sectionIndicator: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#4F6AF0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  uploadArea: {
    marginBottom: 16,
  },
  thumbnailArea: {
    marginBottom: 16,
  },
  uploadLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  thumbnailBox: {
    borderWidth: 1,
    borderRadius: 10,
    height: 150,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailEmpty: {
    alignItems: "center",
    gap: 8,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  uploadPlaceholder: {
    fontSize: 13,
    textAlign: "center",
  },
  fileSizeText: {
    fontSize: 11,
    marginTop: 4,
  },
  noFileText: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
  fileActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    justifyContent: "center",
  },
  changeFileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  changeFileText: {
    fontSize: 11,
    fontWeight: "500",
  },
  removeFileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  removeFileText: {
    fontSize: 11,
    fontWeight: "500",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 10,
  },
  numberRow: {
    flexDirection: "row",
    gap: 10,
  },
  numberInput: {
    flex: 1,
  },
  genreSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  genreChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  genreChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  scheduleContainer: {
    marginBottom: 14,
  },
  scheduleLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  scheduleDisplay: {
    marginBottom: 8,
  },
  scheduleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleBadgeText: {
    fontSize: 13,
  },
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
  },
  scheduleButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  publishButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  draftButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.45,
  },
  fileStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  fileStatusText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
