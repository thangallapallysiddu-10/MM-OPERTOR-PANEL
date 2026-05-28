import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Recording, TrimRange } from '../types';

interface TrimModalProps {
  visible: boolean;
  currentRecording: Recording | null;
  trimRanges: TrimRange[];
  currentRangeStart: number;
  currentRangeEnd: number;
  trimFileName: string;
  trimPreviewDuration: string;
  trimSaveSuccess: boolean;
  previewPlaying: boolean;
  activeTrimTab: 'simple' | 'advanced';
  waveformData: number[];
  originalDurationSecs: number;
  loading?: boolean;
  onClose: () => void;
  onRangeStartChange: (value: number) => void;
  onRangeEndChange: (value: number) => void;
  onAddTrimRange: () => void;
  onRemoveTrimRange: (index: number) => void;
  onClearAllRanges: () => void;
  onTrimFileNameChange: (text: string) => void;
  onPreview: () => void;
  onSave: () => void;
  onTabChange: (tab: 'simple' | 'advanced') => void;
  colors: any;
}

export const TrimModal: React.FC<TrimModalProps> = ({
  visible,
  currentRecording,
  trimRanges,
  currentRangeStart,
  currentRangeEnd,
  trimFileName,
  trimPreviewDuration,
  trimSaveSuccess,
  previewPlaying,
  activeTrimTab,
  waveformData,
  originalDurationSecs,
  loading,
  onClose,
  onRangeStartChange,
  onRangeEndChange,
  onAddTrimRange,
  onRemoveTrimRange,
  onClearAllRanges,
  onTrimFileNameChange,
  onPreview,
  onSave,
  onTabChange,
  colors,
}) => {
  const isPositionInRemovalRange = (position: number): boolean => {
    return trimRanges.some(range => position >= range.start && position <= range.end);
  };

  const handleAddRange = () => {
    if (currentRangeStart >= currentRangeEnd) {
      Alert.alert("Invalid Range", "Start must be less than end");
      return;
    }
    onAddTrimRange();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.trimModalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Trim Audio</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {currentRecording && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.trimInfoContainer}>
                <Text style={[styles.trimFileName, { color: colors.text }]} numberOfLines={2}>
                  {currentRecording.name}
                </Text>
                <Text style={[styles.trimDuration, { color: colors.textMuted }]}>
                  Original: {currentRecording.duration}
                </Text>
              </View>

              {/* Tab buttons inside box */}
              <View style={[styles.trimTabContainer, { borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.trimTab, activeTrimTab === 'simple' && { backgroundColor: colors.text }]}
                  onPress={() => onTabChange('simple')}
                >
                  <Text style={[styles.trimTabText, activeTrimTab === 'simple' && { color: colors.background }]}>
                    Simple Trim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.trimTab, activeTrimTab === 'advanced' && { backgroundColor: colors.text }]}
                  onPress={() => onTabChange('advanced')}
                >
                  <Text style={[styles.trimTabText, activeTrimTab === 'advanced' && { color: colors.background }]}>
                    Remove Middle
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Simple Trim Tab */}
              {activeTrimTab === 'simple' ? (
                <View style={[styles.trimBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={[styles.waveformContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.waveform}>
                      {waveformData.map((height, index) => {
                        const position = (index / waveformData.length) * 100;
                        const isKept = position >= currentRangeStart && position <= currentRangeEnd;
                        return (
                          <View
                            key={index}
                            style={[styles.waveformBar, { height, backgroundColor: isKept ? colors.text : colors.textMuted }]}
                          />
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.trimSliders}>
                    <View style={styles.trimSliderItem}>
                      <Text style={[styles.trimSliderLabel, { color: colors.textMuted }]}>Start Position</Text>
                      <Slider
                        style={styles.trimSlider}
                        minimumValue={0}
                        maximumValue={100}
                        value={currentRangeStart}
                        onValueChange={(v) => v < currentRangeEnd && onRangeStartChange(v)}
                        minimumTrackTintColor={colors.text}
                        maximumTrackTintColor={colors.cardBorder}
                        thumbTintColor={colors.text}
                      />
                      <Text style={[styles.trimSliderValue, { color: colors.text }]}>{Math.round(currentRangeStart)}%</Text>
                    </View>
                    <View style={styles.trimSliderItem}>
                      <Text style={[styles.trimSliderLabel, { color: colors.textMuted }]}>End Position</Text>
                      <Slider
                        style={styles.trimSlider}
                        minimumValue={0}
                        maximumValue={100}
                        value={currentRangeEnd}
                        onValueChange={(v) => v > currentRangeStart && onRangeEndChange(v)}
                        minimumTrackTintColor={colors.text}
                        maximumTrackTintColor={colors.cardBorder}
                        thumbTintColor={colors.text}
                      />
                      <Text style={[styles.trimSliderValue, { color: colors.text }]}>{Math.round(currentRangeEnd)}%</Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* Advanced Trim Tab */
                <View style={[styles.trimBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.advancedTrimHeader}>
                    <Feather name="scissors" size={16} color={colors.textMuted} />
                    <Text style={[styles.advancedTrimInfo, { color: colors.textSecondary }]}>
                      Select sections to remove
                    </Text>
                  </View>

                  <View style={[styles.waveformContainerAdvanced, { backgroundColor: colors.surface }]}>
                    <View style={styles.waveform}>
                      {waveformData.map((height, index) => {
                        const position = (index / waveformData.length) * 100;
                        const isInRemovalRange = isPositionInRemovalRange(position);
                        return (
                          <View
                            key={index}
                            style={[styles.waveformBar, { height, backgroundColor: isInRemovalRange ? colors.textMuted : colors.text }]}
                          />
                        );
                      })}
                    </View>
                    {trimRanges.map((range, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.trimOverlayRemoval,
                          {
                            left: `${range.start}%`,
                            width: `${range.end - range.start}%`,
                            backgroundColor: `${colors.textMuted}40`,
                          },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.rangeSelection}>
                    <Text style={[styles.rangeLabel, { color: colors.text }]}>Select Range to Remove</Text>
                    <View style={styles.rangeSliders}>
                      <View style={styles.trimSliderItem}>
                        <Text style={[styles.trimSliderLabel, { color: colors.textMuted }]}>Start %</Text>
                        <Slider
                          style={styles.trimSlider}
                          minimumValue={0}
                          maximumValue={100}
                          value={currentRangeStart}
                          onValueChange={onRangeStartChange}
                          minimumTrackTintColor={colors.textMuted}
                          maximumTrackTintColor={colors.cardBorder}
                          thumbTintColor={colors.textMuted}
                        />
                        <Text style={[styles.trimSliderValue, { color: colors.text }]}>{Math.round(currentRangeStart)}%</Text>
                      </View>
                      <View style={styles.trimSliderItem}>
                        <Text style={[styles.trimSliderLabel, { color: colors.textMuted }]}>End %</Text>
                        <Slider
                          style={styles.trimSlider}
                          minimumValue={0}
                          maximumValue={100}
                          value={currentRangeEnd}
                          onValueChange={onRangeEndChange}
                          minimumTrackTintColor={colors.textMuted}
                          maximumTrackTintColor={colors.cardBorder}
                          thumbTintColor={colors.textMuted}
                        />
                        <Text style={[styles.trimSliderValue, { color: colors.text }]}>{Math.round(currentRangeEnd)}%</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleAddRange} style={[styles.addRangeButton, { backgroundColor: colors.text }]}>
                      <Feather name="plus" size={16} color={colors.background} />
                      <Text style={[styles.addRangeText, { color: colors.background }]}>Add Section</Text>
                    </TouchableOpacity>
                  </View>

                  {trimRanges.length > 0 && (
                    <View style={styles.rangesList}>
                      <View style={styles.rangesListHeader}>
                        <Text style={[styles.rangesTitle, { color: colors.text }]}>
                          Sections to Remove ({trimRanges.length})
                        </Text>
                        <TouchableOpacity onPress={onClearAllRanges}>
                          <Text style={[styles.clearRangesText, { color: colors.textMuted }]}>Clear All</Text>
                        </TouchableOpacity>
                      </View>
                      {trimRanges.map((range, index) => (
                        <View
                          key={index}
                          style={[styles.rangeItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}
                        >
                          <View style={styles.rangeItemInfo}>
                            <View style={[styles.rangeColorDot, { backgroundColor: colors.textMuted }]} />
                            <Text style={[styles.rangeItemText, { color: colors.text }]} numberOfLines={2}>
                              {Math.round(range.start)}% → {Math.round(range.end)}% ({(range.end - range.start).toFixed(0)}% removed)
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => onRemoveTrimRange(index)}>
                            <Feather name="trash-2" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Preview and Save buttons inside box */}
              <View style={[styles.trimPreviewCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Text style={[styles.trimPreviewLabel, { color: colors.textMuted }]}>After Trim</Text>
                <Text style={[styles.trimPreviewValue, { color: colors.textSecondary }]}>{trimPreviewDuration}</Text>
                {trimRanges.length > 0 && (
                  <Text style={[styles.trimRemovedPercent, { color: colors.textMuted }]}>
                    -{trimRanges.reduce((s, r) => s + (r.end - r.start), 0).toFixed(0)}%
                  </Text>
                )}
              </View>

              <View style={styles.trimSaveName}>
                <Text style={[styles.trimSaveLabel, { color: colors.textMuted }]}>Save as:</Text>
                <TextInput
                  style={[
                    styles.trimSaveInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      color: colors.text,
                    },
                  ]}
                  value={trimFileName}
                  onChangeText={onTrimFileNameChange}
                  placeholder="File name"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.trimSaveExt, { color: colors.textMuted }]}> .mp3</Text>
              </View>

              {trimSaveSuccess && (
                <View style={[styles.trimSaveSuccess, { backgroundColor: `${colors.textSecondary}20` }]}>
                  <Feather name="check-circle" size={16} color={colors.textSecondary} />
                  <Text style={[styles.trimSaveSuccessText, { color: colors.textSecondary }]}>Saved!</Text>
                </View>
              )}

              {previewPlaying && (
                <View style={styles.trimPreviewPlaying}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={[styles.trimPreviewPlayingText, { color: colors.textSecondary }]}>Previewing...</Text>
                </View>
              )}

              {/* Buttons inside box */}
              <View style={[styles.trimButtonsContainer, { borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  onPress={onPreview}
                  style={[
                    styles.previewTrimButton,
                    { backgroundColor: previewPlaying ? '#e53e3e' : colors.textSecondary },
                  ]}
                >
                  <Feather name={previewPlaying ? 'square' : 'play'} size={16} color={colors.background} />
                  <Text style={[styles.previewTrimText, { color: colors.background }]}>
                    {previewPlaying ? 'Stop' : 'Preview'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSave}
                  style={[styles.saveTrimButton, { backgroundColor: colors.text }]}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator size="small" color={colors.background} /> : (
                    <>
                      <Feather name="save" size={16} color={colors.background} />
                      <Text style={[styles.saveTrimText, { color: colors.background }]}>Save Trim</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  trimModalContent: {
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  trimInfoContainer: {
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  trimFileName: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    flexWrap: "wrap",
    maxWidth: "100%",
  },
  trimDuration: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
  trimTabContainer: {
    flexDirection: "row",
    marginVertical: 16,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    flexWrap: "wrap",
  },
  trimTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "transparent",
    minWidth: 120,
  },
  trimTabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  trimBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  advancedTrimHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    justifyContent: "center",
  },
  advancedTrimInfo: {
    fontSize: 12,
    textAlign: "center",
  },
  waveformContainer: {
    height: 100,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  waveformContainerAdvanced: {
    height: 100,
    borderRadius: 12,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 3,
    paddingHorizontal: 8,
  },
  waveformBar: {
    width: 5,
    borderRadius: 2,
  },
  trimOverlayRemoval: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  trimSliders: {
    gap: 16,
    marginBottom: 20,
  },
  trimSliderItem: {
    gap: 6,
  },
  trimSliderLabel: {
    fontSize: 12,
  },
  trimSlider: {
    width: "100%",
    height: 40,
  },
  trimSliderValue: {
    fontSize: 11,
    textAlign: "right",
  },
  rangeSelection: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 12,
  },
  rangeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  rangeSliders: {
    gap: 12,
    marginBottom: 12,
  },
  addRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  addRangeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  rangesList: {
    marginVertical: 12,
  },
  rangesListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rangesTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  clearRangesText: {
    fontSize: 12,
  },
  rangeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rangeItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  rangeColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rangeItemText: {
    fontSize: 12,
    flexShrink: 1,
    flexWrap: "wrap",
    maxWidth: "70%",
  },
  trimPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
  },
  trimPreviewLabel: {
    fontSize: 13,
  },
  trimPreviewValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  trimRemovedPercent: {
    fontSize: 12,
    fontWeight: "500",
  },
  trimSaveName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  trimSaveLabel: {
    fontSize: 13,
  },
  trimSaveInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minWidth: Platform.OS === 'web' ? 150 : 100,
  },
  trimSaveExt: {
    fontSize: 13,
  },
  trimSaveSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trimSaveSuccessText: {
    fontSize: 12,
    fontWeight: "500",
  },
  trimPreviewPlaying: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  trimPreviewPlayingText: {
    fontSize: 12,
  },
  trimButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
  },
  previewTrimButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 25,
  },
  previewTrimText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveTrimButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 25,
  },
  saveTrimText: {
    fontSize: 14,
    fontWeight: "600",
  },
});