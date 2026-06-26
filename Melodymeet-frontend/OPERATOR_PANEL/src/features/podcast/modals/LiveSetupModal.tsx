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
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <Feather name="x" size={15} color={colors.textMuted} />
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
                  <Feather name="check-circle" size={40} color="#059669" />
                </View>
                <Text style={[styles.readyTitle, { color: colors.text }]}>Ready to Go Live!</Text>
                <Text style={[styles.readySubtitle, { color: colors.textMuted }]}>"{liveTitle}"</Text>
                <Text style={[styles.readySubtitle, { color: colors.textMuted }]}>
                  {liveDescription || "No description"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onStartLive}
                style={styles.liveStartButton}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="radio" size={18} color="#FFFFFF" />
                    <Text style={styles.liveStartButtonText}>Start Live Now!</Text>
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: Platform.OS === 'web' ? 480 : "90%",
    maxWidth: 480,
    maxHeight: Platform.OS === 'web' ? "90%" : "85%",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  liveSetupTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  liveTestItem: {
    marginBottom: 16,
  },
  liveTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  liveTestLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  liveTestButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  liveTestButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  liveNextButton: {
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    backgroundColor: '#4F6AF0',
  },
  liveNextButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: '#FFFFFF',
  },
  readyContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  readyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  readySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 3,
  },
  liveStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 13,
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: '#4F6AF0',
  },
  liveStartButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: '#FFFFFF',
  },
  liveBackButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  liveBackButtonText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
});