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
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface LiveSetupModalProps {
  visible: boolean;
  onStartLive: (title: string, description: string) => Promise<void> | void;
  onClose: () => void;
  colors: any;
}

export const LiveSetupModal: React.FC<LiveSetupModalProps> = ({
  visible,
  onStartLive,
  onClose,
  colors,
}) => {
  const [step, setStep] = useState<'test' | 'ready'>('test');
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  
  // Test states: 'idle' | 'testing' | 'success'
  const [micTestState, setMicTestState] = useState<'idle' | 'testing' | 'success'>('idle');
  const [internetTestState, setInternetTestState] = useState<'idle' | 'testing' | 'success'>('idle');
  
  const [validationError, setValidationError] = useState('');
  const [launchState, setLaunchState] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  // simulated metrics
  const [micVolume, setMicVolume] = useState([12, 8, 14, 10, 6]);
  const [speedProgress, setSpeedProgress] = useState(0);

  // Focus states
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  // Reset states on show
  useEffect(() => {
    if (visible) {
      setStep('test');
      setLocalTitle('');
      setLocalDescription('');
      setMicTestState('idle');
      setInternetTestState('idle');
      setValidationError('');
      setLaunchState('idle');
      setSpeedProgress(0);
    }
  }, [visible]);

  // Mic visualizer animation loop
  useEffect(() => {
    let interval: any;
    if (micTestState === 'testing') {
      interval = setInterval(() => {
        setMicVolume([
          Math.floor(Math.random() * 32) + 6,
          Math.floor(Math.random() * 32) + 6,
          Math.floor(Math.random() * 32) + 6,
          Math.floor(Math.random() * 32) + 6,
          Math.floor(Math.random() * 32) + 6,
        ]);
      }, 100);
    } else {
      setMicVolume([12, 8, 14, 10, 6]);
    }
    return () => clearInterval(interval);
  }, [micTestState]);

  // Speed test progress animation loop
  useEffect(() => {
    let interval: any;
    if (internetTestState === 'testing') {
      let current = 0;
      setSpeedProgress(0);
      interval = setInterval(() => {
        current += Math.floor(Math.random() * 12) + 4;
        if (current >= 84) {
          current = 84.2;
          setInternetTestState('success');
          clearInterval(interval);
        }
        setSpeedProgress(current);
      }, 120);
    }
    return () => clearInterval(interval);
  }, [internetTestState]);

  const handleTestMicrophone = () => {
    if (micTestState !== 'idle') return;
    setMicTestState('testing');
    setValidationError('');
    setTimeout(() => {
      setMicTestState('success');
    }, 2500);
  };

  const handleTestInternet = () => {
    if (internetTestState !== 'idle') return;
    setInternetTestState('testing');
    setValidationError('');
  };

  const handleContinue = () => {
    if (micTestState !== 'success') {
      setValidationError('⚠️ Microphone test is required before you can go live.');
      return;
    }
    if (!localTitle.trim()) {
      setValidationError('⚠️ Please enter a title for your live stream.');
      return;
    }
    setValidationError('');
    setStep('ready');
  };

  const handleStartBroadcast = async () => {
    setValidationError('');
    setLaunchState('connecting');
    try {
      await onStartLive(localTitle, localDescription);
      setLaunchState('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setLaunchState('error');
      setValidationError(err?.message || 'Failed to establish broadcast link.');
    }
  };

  const themeColors = colors || {
    card: '#161B22',
    cardBorder: '#21262D',
    surface: '#0D1117',
    text: '#F0F6FC',
    textSecondary: '#C9D1D9',
    textMuted: '#8B949E',
    accent: '#4F6AF0',
    background: '#0D1117',
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
          
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.pulseIconBg, { backgroundColor: step === 'ready' ? '#EF4444' : themeColors.accent }]}>
                <Feather name="radio" size={15} color="#FFFFFF" />
              </View>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {step === 'test' ? 'Setup Check' : 'Confirm Broadcast'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={launchState === 'connecting' || launchState === 'success'}
              style={[styles.closeBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
            >
              <Feather name="x" size={15} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* VALIDATION ERROR BANNER */}
          {validationError ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-triangle" size={16} color="#F87171" style={{ marginTop: 1 }} />
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}

          {launchState === 'connecting' && (
            <View style={styles.statusView}>
              <ActivityIndicator size="large" color={themeColors.accent} />
              <Text style={[styles.statusTitle, { color: themeColors.text }]}>Starting Broadcast...</Text>
              <Text style={[styles.statusSubtitle, { color: themeColors.textMuted }]}>Connecting to streaming servers and initializing stream...</Text>
            </View>
          )}

          {launchState === 'success' && (
            <View style={styles.statusView}>
              <View style={styles.successCheckGlow}>
                <Feather name="check" size={42} color="#10B981" />
              </View>
              <Text style={[styles.statusTitle, { color: '#10B981' }]}>Successfully Configured!</Text>
              <Text style={[styles.statusSubtitle, { color: themeColors.textMuted }]}>Broadcasting link established. Enjoy your session!</Text>
            </View>
          )}

          {launchState !== 'connecting' && launchState !== 'success' && (
            <>
              {step === 'test' ? (
                <View style={{ width: '100%' }}>
                  
                  {/* TESTS CONTAINER */}
                  <View style={styles.testsGrid}>
                    
                    {/* MIC TEST CARD */}
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={handleTestMicrophone}
                      disabled={micTestState !== 'idle'}
                      style={[
                        styles.testCard, 
                        { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                        micTestState === 'success' && styles.testCardSuccess,
                        micTestState === 'testing' && styles.testCardActive
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.iconContainer, micTestState === 'success' && styles.iconSuccess]}>
                          <Feather name="mic" size={16} color={micTestState === 'success' ? '#10B981' : themeColors.accent} />
                        </View>
                        <Text style={[styles.cardTitle, { color: themeColors.text }]}>Microphone Check</Text>
                      </View>
                      
                      <View style={styles.cardContent}>
                        {micTestState === 'idle' && (
                          <Text style={[styles.cardDescription, { color: themeColors.textMuted }]}>Click to verify your audio input hardware</Text>
                        )}
                        {micTestState === 'testing' && (
                          <View style={styles.visualizerRow}>
                            {micVolume.map((h, i) => (
                              <View key={i} style={[styles.soundBar, { height: h, backgroundColor: themeColors.accent }]} />
                            ))}
                            <Text style={[styles.testingText, { color: themeColors.accent }]}>Testing...</Text>
                          </View>
                        )}
                        {micTestState === 'success' && (
                          <View style={styles.successRow}>
                            <Feather name="check" size={14} color="#10B981" />
                            <Text style={styles.successValue}>Input level: Excellent</Text>
                          </View>
                        )}
                      </View>

                      {micTestState === 'idle' && (
                        <View style={[styles.testActionBtn, { backgroundColor: themeColors.card }]}>
                          <Text style={[styles.testActionBtnText, { color: themeColors.text }]}>Run Test</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* SPEED TEST CARD */}
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={handleTestInternet}
                      disabled={internetTestState !== 'idle'}
                      style={[
                        styles.testCard, 
                        { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                        internetTestState === 'success' && styles.testCardSuccess,
                        internetTestState === 'testing' && styles.testCardActive
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.iconContainer, internetTestState === 'success' && styles.iconSuccess]}>
                          <Feather name="wifi" size={16} color={internetTestState === 'success' ? '#10B981' : themeColors.accent} />
                        </View>
                        <Text style={[styles.cardTitle, { color: themeColors.text }]}>Network Latency</Text>
                      </View>
                      
                      <View style={styles.cardContent}>
                        {internetTestState === 'idle' && (
                          <Text style={[styles.cardDescription, { color: themeColors.textMuted }]}>Click to measure your upload bandwidth stability</Text>
                        )}
                        {internetTestState === 'testing' && (
                          <View style={{ gap: 4 }}>
                            <ActivityIndicator size="small" color={themeColors.accent} style={{ alignSelf: 'flex-start' }} />
                            <Text style={[styles.testingText, { color: themeColors.accent }]}>Measuring: {speedProgress.toFixed(0)} Mbps</Text>
                          </View>
                        )}
                        {internetTestState === 'success' && (
                          <View style={styles.successRow}>
                            <Feather name="check" size={14} color="#10B981" />
                            <Text style={styles.successValue}>{speedProgress.toFixed(1)} Mbps • 12ms ping</Text>
                          </View>
                        )}
                      </View>

                      {internetTestState === 'idle' && (
                        <View style={[styles.testActionBtn, { backgroundColor: themeColors.card }]}>
                          <Text style={[styles.testActionBtnText, { color: themeColors.text }]}>Run Test</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                  </View>

                  {/* FORM FIELDS */}
                  <View style={{ marginTop: 8, gap: 14 }}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Live Stream Title</Text>
                      <TextInput
                        style={[
                          styles.modernInput,
                          {
                            backgroundColor: themeColors.surface,
                            borderColor: titleFocused ? themeColors.accent : themeColors.cardBorder,
                            color: themeColors.text,
                          },
                        ]}
                        placeholder="e.g., Chill Sunday Evening Broadcast"
                        placeholderTextColor={themeColors.textMuted}
                        value={localTitle}
                        onChangeText={setLocalTitle}
                        onFocus={() => setTitleFocused(true)}
                        onBlur={() => setTitleFocused(false)}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Live Description (optional)</Text>
                      <TextInput
                        style={[
                          styles.modernInput,
                          styles.modernTextArea,
                          {
                            backgroundColor: themeColors.surface,
                            borderColor: descFocused ? themeColors.accent : themeColors.cardBorder,
                            color: themeColors.text,
                          },
                        ]}
                        placeholder="Add some notes about today's episode topics..."
                        placeholderTextColor={themeColors.textMuted}
                        value={localDescription}
                        onChangeText={setLocalDescription}
                        onFocus={() => setDescFocused(true)}
                        onBlur={() => setDescFocused(false)}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </View>

                  {/* CONTINUE */}
                  <TouchableOpacity
                    onPress={handleContinue}
                    style={[styles.primaryActionBtn, { backgroundColor: themeColors.text, marginTop: 20, marginBottom: 10 }]}
                  >
                    <Text style={[styles.primaryActionBtnText, { color: themeColors.background }]}>Continue</Text>
                  </TouchableOpacity>

                </View>
              ) : (
                <View style={{ paddingVertical: 10 }}>
                  
                  {/* READY SCREEN */}
                  <View style={styles.readyCard}>
                    <View style={styles.pulsingAirCircle}>
                      <Feather name="radio" size={32} color="#EF4444" />
                    </View>
                    <Text style={[styles.readyTitleText, { color: themeColors.text }]}>Ready to Broadcast!</Text>
                    <Text style={[styles.readySubtitleText, { color: themeColors.textMuted }]}>
                      Review and confirm your broadcast configuration.
                    </Text>
                  </View>

                  <View style={[styles.metaSummaryBox, { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>Stream Title</Text>
                      <Text style={[styles.summaryValueText, { color: themeColors.text }]}>"{localTitle}"</Text>
                    </View>

                    {localDescription ? (
                      <View style={[styles.summaryItem, { borderTopWidth: 1, borderTopColor: themeColors.cardBorder, paddingTop: 10, marginTop: 10 }]}>
                        <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>Description</Text>
                        <Text style={[styles.summaryValueText, { color: themeColors.textSecondary }]} numberOfLines={2}>
                          {localDescription}
                        </Text>
                      </View>
                    ) : null}

                    <View style={[styles.summaryItem, { borderTopWidth: 1, borderTopColor: themeColors.cardBorder, paddingTop: 10, marginTop: 10 }]}>
                      <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>Hardware & Bandwidth</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                        <View style={styles.pillStat}>
                          <Feather name="check" size={11} color="#10B981" />
                          <Text style={styles.pillStatText}>Microphone OK</Text>
                        </View>
                        <View style={styles.pillStat}>
                          <Feather name="check" size={11} color="#10B981" />
                          <Text style={styles.pillStatText}>{speedProgress > 0 ? `${speedProgress.toFixed(0)} Mbps` : 'Speed OK'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* START LIVE */}
                  <TouchableOpacity
                    onPress={handleStartBroadcast}
                    style={[styles.primaryActionBtn, { backgroundColor: '#EF4444', shadowColor: '#EF4444', marginTop: 16 }]}
                  >
                    <Feather name="radio" size={16} color="#FFFFFF" />
                    <Text style={[styles.primaryActionBtnText, { color: '#FFFFFF' }]}>Start Broadcast Now</Text>
                  </TouchableOpacity>

                  {/* BACK */}
                  <TouchableOpacity 
                    onPress={() => setStep('test')}
                    style={[styles.secondaryActionBtn, { borderColor: themeColors.cardBorder }]}
                  >
                    <Feather name="arrow-left" size={14} color={themeColors.textSecondary} />
                    <Text style={[styles.secondaryActionBtnText, { color: themeColors.textSecondary }]}>Back to Settings</Text>
                  </TouchableOpacity>

                </View>
              )}
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
    backgroundColor: 'rgba(5, 8, 16, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: Platform.OS === 'web' ? 520 : '92%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
    lineHeight: 16,
  },
  statusView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  statusSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 30,
  },
  successCheckGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  testsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  testCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 124,
    justifyContent: 'space-between',
  },
  testCardActive: {
    borderColor: '#4F6AF0',
  },
  testCardSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 106, 240, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    marginVertical: 10,
    justifyContent: 'center',
  },
  cardDescription: {
    fontSize: 11,
    lineHeight: 15,
  },
  visualizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  soundBar: {
    width: 3,
    borderRadius: 1.5,
  },
  testingText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  successValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  testActionBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  testActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modernInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
  },
  modernTextArea: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  readyCard: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pulsingAirCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 12,
  },
  readyTitleText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  readySubtitleText: {
    fontSize: 12,
    textAlign: 'center',
  },
  metaSummaryBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
  },
  summaryItem: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValueText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  pillStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillStatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});