import React from 'react';
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface LiveSetupModalProps {
  visible: boolean;
  liveSetupStep: 'test' | 'ready';
  micTestComplete: boolean;
  internetTestComplete: boolean;
  liveTitle: string;
  liveDescription: string;
  loading?: boolean;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onTestMicrophone: () => void;
  onTestInternet: () => void;
  onProceedToReady: () => void;
  onStartLive: () => void;
  onBackToTest: () => void;
  onClose: () => void;
  colors: any;
}

export const LiveSetupModal: React.FC<LiveSetupModalProps> = ({
  visible,
  liveSetupStep,
  micTestComplete,
  internetTestComplete,
  liveTitle,
  liveDescription,
  loading,
  onTitleChange,
  onDescriptionChange,
  onTestMicrophone,
  onTestInternet,
  onProceedToReady,
  onStartLive,
  onBackToTest,
  onClose,
  colors,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Go Live</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {liveSetupStep === 'test' ? (
            <ScrollView>
              <Text style={[styles.liveSetupTitle, { color: colors.text }]}>Setup Check</Text>

              <View style={styles.liveTestItem}>
                <View style={styles.liveTestHeader}>
                  <Feather name="mic" size={20} color={micTestComplete ? colors.textSecondary : colors.textMuted} />
                  <Text style={[styles.liveTestLabel, { color: colors.text }]}>Microphone Test</Text>
                  {micTestComplete && <Feather name="check-circle" size={16} color={colors.textSecondary} />}
                </View>
                <TouchableOpacity onPress={onTestMicrophone} style={[styles.liveTestButton, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.liveTestButtonText, { color: colors.textSecondary }]}>Test Microphone</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.liveTestItem}>
                <View style={styles.liveTestHeader}>
                  <Feather name="wifi" size={20} color={internetTestComplete ? colors.textSecondary : colors.textMuted} />
                  <Text style={[styles.liveTestLabel, { color: colors.text }]}>Internet Speed Test</Text>
                  {internetTestComplete && <Feather name="check-circle" size={16} color={colors.textSecondary} />}
                </View>
                <TouchableOpacity onPress={onTestInternet} style={[styles.liveTestButton, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.liveTestButtonText, { color: colors.textSecondary }]}>Test Connection</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    color: colors.text,
                    marginTop: 16,
                  },
                ]}
                placeholder="Live Stream Title"
                placeholderTextColor={colors.textMuted}
                value={liveTitle}
                onChangeText={onTitleChange}
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Live Description (optional)"
                placeholderTextColor={colors.textMuted}
                value={liveDescription}
                onChangeText={onDescriptionChange}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                onPress={onProceedToReady}
                style={[styles.liveNextButton, { backgroundColor: colors.text, marginBottom: 16 }]}
              >
                <Text style={[styles.liveNextButtonText, { color: colors.background }]}>Continue</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <>
              <View style={styles.readyContainer}>
                <View style={styles.readyIcon}>
                  <Feather name="check-circle" size={60} color={colors.textSecondary} />
                </View>
                <Text style={[styles.readyTitle, { color: colors.text }]}>Ready to Go Live!</Text>
                <Text style={[styles.readySubtitle, { color: colors.textMuted }]}>"{liveTitle}"</Text>
                <Text style={[styles.readySubtitle, { color: colors.textMuted }]}>
                  {liveDescription || "No description"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onStartLive}
                style={[styles.liveStartButton, { backgroundColor: colors.text }]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <>
                    <Feather name="radio" size={20} color={colors.background} />
                    <Text style={[styles.liveStartButtonText, { color: colors.background }]}>Start Live Now!</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={onBackToTest} style={[styles.liveBackButton, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.liveBackButtonText, { color: colors.textMuted }]}>← Back</Text>
              </TouchableOpacity>
            </>
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
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: Platform.OS === 'web' ? 500 : "90%",
    maxWidth: 500,
    maxHeight: Platform.OS === 'web' ? "90%" : "85%",
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
  liveSetupTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  liveTestItem: {
    marginBottom: 20,
  },
  liveTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  liveTestLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  liveTestButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  liveTestButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  liveNextButton: {
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 16,
  },
  liveNextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  readyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  readyIcon: {
    marginBottom: 16,
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  liveStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 30,
    marginTop: 16,
  },
  liveStartButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  liveBackButton: {
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  liveBackButtonText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});