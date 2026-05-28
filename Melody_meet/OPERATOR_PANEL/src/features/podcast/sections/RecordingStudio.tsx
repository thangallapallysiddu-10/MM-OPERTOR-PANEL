// sections/RecordingStudio.tsx - Complete fixed version

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Mic, Recording } from '../types';

interface RecordingStudioProps {
  mics: Mic[];
  activeMic: Mic | undefined;
  isRecording: boolean;
  recordingSeconds: number;
  showAfterRecordingOptions: boolean;
  lastRecording: Recording | null;
  recordings?: Recording[];
  isLive: boolean;
  onSelectMic: (id: number) => void;
  onToggleMute: (id: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDeleteRecording?: (id: number) => void;
  onUseRecording: (recording: Recording) => void;
  onTrimRecording: (recording: Recording) => void;
  onPlayRecording: (recording: Recording) => void;
  playingRecordingId?: number | null;
  onStartLive: () => void;
  onEndLive: () => void;
  colors: any;
  gradients?: any;
}

export const RecordingStudio: React.FC<RecordingStudioProps> = ({
  mics,
  activeMic,
  isRecording,
  recordingSeconds,
  showAfterRecordingOptions,
  lastRecording,
  recordings = [],
  isLive,
  onSelectMic,
  onToggleMute,
  onStartRecording,
  onStopRecording,
  onUseRecording,
  onTrimRecording,
  onPlayRecording,
  playingRecordingId,
  onDeleteRecording,
  onStartLive,
  onEndLive,
  colors,
  gradients,
}) => {
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Local state for sliders
  const [localVolume, setLocalVolume] = useState(activeMic?.volume || 75);
  const [localGain, setLocalGain] = useState(activeMic?.gain || 60);

  // Update local values when active mic changes
  useEffect(() => {
    if (activeMic) {
      setLocalVolume(Math.round(activeMic.volume));
      setLocalGain(Math.round(activeMic.gain));
    }
  }, [activeMic]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIndicator, { backgroundColor: colors.text }]} />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECORDING STUDIO</Text>
      </View>

      {/* MIC Grid - 5 Mics */}
      <View style={[styles.micGrid, Platform.OS !== 'web' && styles.micGridMobile]}>
        {mics.slice(0, 5).map((mic) => {
          const micBorderColor = mic.muted ? "#EF4444" : "#22C55E";
          return (
            <TouchableOpacity
              key={mic.id}
              onPress={() => onSelectMic(mic.id)}
              style={[
                styles.micCard,
                Platform.OS !== 'web' && styles.micCardMobile,
                { borderColor: micBorderColor, borderWidth: 2 },
                mic.active && { backgroundColor: mic.muted ? "#EF444410" : "#22C55E10" },
                mic.isGuest && { borderColor: colors.textSecondary },
              ]}
            >
              <View style={styles.micContent}>
                <View style={[styles.micIconBorder, { backgroundColor: `${colors.text}20` }]}>
                  <Text style={styles.micIcon}>{mic.icon}</Text>
                </View>
                <View>
                  <Text style={[styles.micName, { color: colors.text }]}>{mic.name}</Text>
                  <Text style={[styles.micType, { color: colors.textMuted }]}>{mic.type}</Text>
                </View>
              </View>
              {mic.active && (
                <View style={styles.micStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      mic.muted ? styles.mutedDot : styles.activeDot,
                    ]}
                  />
                  <Text style={[styles.statusTextSmall, { color: mic.muted ? "#EF4444" : "#22C55E" }]}>{mic.muted ? "muted" : "on"}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Mic Controls with SLIDERS - Volume and Gain in ONE ROW */}
      {activeMic && !activeMic.isGuest && activeMic.id <= 5 && (
        <View style={[styles.controlPanel, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{activeMic.name} Controls</Text>
            <TouchableOpacity
              onPress={() => onToggleMute(activeMic.id)}
              style={[styles.powerButton, { backgroundColor: activeMic.muted ? "#EF4444" : "#22C55E" }]}
            >
              <Text style={styles.powerButtonText}>{!activeMic.muted ? "ON" : "OFF"}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Volume and Gain in ONE ROW */}
          <View style={styles.controlsRow}>
            {/* Volume Control */}
            <View style={styles.controlItemHalf}>
              <View style={styles.controlLabel}>
                <Text style={[styles.controlLabelText, { color: colors.textMuted }]}>Volume</Text>
                <Text style={[styles.controlValue, { color: colors.text }]}>{Math.round(localVolume)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={localVolume}
                onValueChange={(value) => setLocalVolume(Math.round(value))}
                onSlidingComplete={(value) => {
                  console.log('Volume set to:', Math.round(value));
                }}
                minimumTrackTintColor={colors.text}
                maximumTrackTintColor={colors.cardBorder}
                thumbTintColor={colors.text}
              />
            </View>
            
            {/* Gain Control */}
            <View style={styles.controlItemHalf}>
              <View style={styles.controlLabel}>
                <Text style={[styles.controlLabelText, { color: colors.textMuted }]}>Gain</Text>
                <Text style={[styles.controlValue, { color: colors.text }]}>{Math.round(localGain)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={localGain}
                onValueChange={(value) => setLocalGain(Math.round(value))}
                onSlidingComplete={(value) => {
                  console.log('Gain set to:', Math.round(value));
                }}
                minimumTrackTintColor={colors.text}
                maximumTrackTintColor={colors.cardBorder}
                thumbTintColor={colors.text}
              />
            </View>
          </View>
        </View>
      )}

      {/* Guest Mic Controls */}
      {activeMic && activeMic.isGuest && (
        <View style={[styles.controlPanel, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{activeMic.name}</Text>
            <TouchableOpacity
              onPress={() => onToggleMute(activeMic.id)}
              style={[styles.powerButton, { backgroundColor: activeMic.muted ? "#EF4444" : "#22C55E" }]}
            >
              <Text style={styles.powerButtonText}>{!activeMic.muted ? "ON" : "OFF"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.guestNote, { color: colors.textMuted }]}>Guest mic - only ON/OFF control</Text>
        </View>
      )}

      {/* Record Button + Go Live Button */}
      <View style={styles.buttonsContainer}>
        <View style={styles.recordSection}>
          {!isRecording ? (
            <TouchableOpacity onPress={onStartRecording} style={[styles.recordBtn, { backgroundColor: colors.text }]}>
              <View style={[styles.recordDot, { backgroundColor: colors.background }]} />
              <Text style={[styles.recordBtnText, { color: colors.background }]}>Record</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onStopRecording} style={[styles.stopBtn, { backgroundColor: colors.text }]}>
              <View style={styles.stopSquare} />
              <Text style={[styles.stopBtnText, { color: colors.background }]}>Stop Recording</Text>
            </TouchableOpacity>
          )}
          {isRecording && <Text style={[styles.timerText, { color: colors.text }]}>{formatRecordingTime(recordingSeconds)}</Text>}
        </View>

        <TouchableOpacity onPress={isLive ? onEndLive : onStartLive} style={styles.liveBtn}>
          <LinearGradient colors={isLive ? ["#B91C1C", "#EF4444"] : (gradients?.primary || [colors.text, colors.textSecondary])} style={styles.liveBtnGradient}>
            <Feather name={isLive ? "power" : "radio"} size={20} color={colors.background} />
            <Text style={[styles.liveBtnText, { color: colors.background }]}>{isLive ? "End Live" : "Go Live"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* After Recording Options */}
      {showAfterRecordingOptions && lastRecording && (
        <View style={styles.afterRecordingOptions}>
          <Text style={[styles.afterRecordingTitle, { color: colors.textSecondary }]}>Recording Complete!</Text>
          <View style={styles.afterRecordingButtons}>
            <TouchableOpacity
              onPress={() => onUseRecording(lastRecording)}
              style={[styles.useButtonLarge, { backgroundColor: colors.textSecondary }]}
            >
              <Feather name="check" size={16} color={colors.background} />
              <Text style={[styles.useButtonLargeText, { color: colors.background }]}>Use</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onTrimRecording(lastRecording)}
              style={[styles.trimButtonLarge, { backgroundColor: colors.text }]}
            >
              <Feather name="scissors" size={16} color={colors.background} />
              <Text style={[styles.trimButtonLargeText, { color: colors.background }]}>Trim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onPlayRecording(lastRecording)}
              style={[styles.playButtonLarge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            >
              <Feather
                name={playingRecordingId === lastRecording.id ? "square" : "play"}
                size={16}
                color={colors.text}
              />
              <Text style={[styles.playButtonLargeText, { color: colors.text }]}>
                {playingRecordingId === lastRecording.id ? "Stop" : "Play"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent Recordings List - Trim works for ALL recordings */}
      <View style={styles.recordingsCard}>
        <Text style={[styles.recordingsTitle, { color: colors.textSecondary }]}>RECENT RECORDINGS</Text>
        {recordings.length === 0 ? (
          <View style={styles.noRecordingsContainer}>
            <Feather name="mic" size={24} color={colors.textMuted} />
            <Text style={[styles.noRecordingsText, { color: colors.textMuted }]}>No recordings yet</Text>
            <Text style={[styles.noRecordingsSubText, { color: colors.textMuted }]}>Record your first episode above</Text>
          </View>
        ) : (
          recordings.map((item) => (
            <View key={item.id} style={[styles.recordingItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
              <View style={styles.recordingInfo}>
                <Text style={styles.recordingIcon}>🎵</Text>
                <View style={styles.recordingDetails}>
                  <Text style={[styles.recordingName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.recordingMeta, { color: colors.textMuted }]}>{item.duration} • {item.size}</Text>
                </View>
              </View>
              <View style={styles.recordingActions}>
                {/* Use Button */}
                <TouchableOpacity onPress={() => onUseRecording(item)} style={[styles.actionButton, { backgroundColor: colors.cardBorder }]}>
                  <Text style={[styles.actionButtonText, { color: colors.textMuted }]}>use</Text>
                </TouchableOpacity>

                {/* Play Button */}
                <TouchableOpacity onPress={() => onPlayRecording(item)} style={[styles.iconButton, { backgroundColor: colors.cardBorder }]}>
                  <Feather name={playingRecordingId === item.id ? "square" : "play"} size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {/* Trim Button - Works for ALL recordings */}
                <TouchableOpacity onPress={() => onTrimRecording(item)} style={[styles.iconButton, { backgroundColor: colors.cardBorder }]}>
                  <Feather name="scissors" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {/* Delete Button */}
                {onDeleteRecording && (
                  <TouchableOpacity onPress={() => onDeleteRecording(item.id)} style={[styles.iconButton, { backgroundColor: colors.cardBorder }]}>
                    <Feather name="x" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
  micGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  micGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  micCard: {
    width: "18%",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  micCardMobile: {
    width: "30%",
    marginBottom: 8,
  },
  micContent: {
    alignItems: "center",
    gap: 4,
  },
  micIconBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  micIcon: {
    fontSize: 22,
  },
  micName: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  micType: {
    fontSize: 7,
    textAlign: "center",
  },
  micStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  mutedDot: {
    backgroundColor: "#EF4444",
  },
  activeDot: {
    backgroundColor: "#22C55E",
  },
  statusTextSmall: {
    fontSize: 7,
  },
  controlPanel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  powerButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  powerButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 16,
  },
  controlItemHalf: {
    flex: 1,
  },
  controlLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  controlLabelText: {
    fontSize: 12,
  },
  controlValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  guestNote: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  recordSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    flex: 1,
  },
  recordBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    flex: 1,
  },
  stopSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timerText: {
    fontSize: 14,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  liveBtn: {
    borderRadius: 25,
    overflow: "hidden",
    flex: 1,
  },
  liveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  liveBtnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  afterRecordingOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  afterRecordingTitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 12,
  },
  afterRecordingButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  useButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
  },
  useButtonLargeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  trimButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
  },
  trimButtonLargeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  playButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  playButtonLargeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  recordingsCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  recordingsTitle: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  recordingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  recordingIcon: {
    fontSize: 18,
  },
  recordingDetails: {
    flex: 1,
  },
  recordingName: {
    fontSize: 12,
    fontWeight: "500",
  },
  recordingMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "500",
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  noRecordingsContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  noRecordingsText: {
    fontSize: 13,
    fontWeight: "500",
  },
  noRecordingsSubText: {
    fontSize: 11,
  },
});

export default RecordingStudio;
