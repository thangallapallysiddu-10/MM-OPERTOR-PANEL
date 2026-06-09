import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { AuthApi } from '../services/api/authApi';

const FINGERPRINT_FIVE_IMAGE = require('../assets/fingerprint-five.png');

const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+86', country: 'China' },
  { code: '+81', country: 'Japan' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+7', country: 'Russia' },
  { code: '+55', country: 'Brazil' },
];

const FINGERPRINT_SCAN_HINTS = [
  { zone: 'Centre', hint: 'Place the centre of your thumb on the sensor.' },
  { zone: 'Tip', hint: 'Lift slightly, then press the tip of your thumb.' },
  { zone: 'Left edge', hint: 'Tilt your thumb left and press gently.' },
  { zone: 'Right edge', hint: 'Tilt your thumb right and press gently.' },
  { zone: 'Full thumb', hint: 'Press your whole thumb flat on the sensor.' },
];

function FingerprintFiveSides({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <View style={styles.fingerprintMarkCompact}>
        <Image source={FINGERPRINT_FIVE_IMAGE} style={styles.fingerprintImageCompact} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={styles.fingerprintMark}>
      <Image source={FINGERPRINT_FIVE_IMAGE} style={styles.fingerprintImage} resizeMode="contain" />
    </View>
  );
}

function getMobileValidationError(countryCode: string, mobileNumber: string) {
  const trimmedMobile = mobileNumber.trim();
  if (countryCode === '+91') {
    return /^\d{10}$/.test(trimmedMobile) ? '' : 'Please enter exactly 10 digits for +91 mobile number';
  }
  return trimmedMobile.length >= 10 ? '' : 'Please enter a valid mobile number';
}

export default function SignupScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticatorSetup, setAuthenticatorSetup] = useState<any>(null);
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [authenticatorError, setAuthenticatorError] = useState('');
  const [accountConfirmed, setAccountConfirmed] = useState(false);
  const [fingerprintStep, setFingerprintStep] = useState(0);
  const authenticatorInputRef = useRef<TextInput>(null);
  const { signup, isBiometricSupported, biometricType, verifyBiometric } = useAuth();

  const getBackendBiometricType = () => {
    if (Platform.OS === 'ios') return 'faceid';
    return 'fingerprint';
  };

  const formatDateOfBirth = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const setupSignupBiometric = async (uid: string) => {
    if (Platform.OS === 'web') return;
    if (!isBiometricSupported) {
      Alert.alert('Biometric Required', 'Please enroll fingerprint on Android or Face ID on iOS.');
      return;
    }
    const attempts = Platform.OS === 'android' ? 5 : 1;
    for (let step = 1; step <= attempts; step += 1) {
      setFingerprintStep(step);
      const ok = await verifyBiometric();
      if (!ok) {
        setFingerprintStep(0);
        Alert.alert('Biometric Required', `${biometricType || 'Biometric'} setup stopped at ${step} of ${attempts}.`);
        return;
      }
    }
    try {
      await AuthApi.enableBiometrics(uid, getBackendBiometricType());
    } catch (error: any) {
      Alert.alert('Biometric Setup Failed', error.message || 'Could not enable biometrics.');
    } finally {
      setFingerprintStep(0);
    }
  };

  const handleConfirmAuthenticator = async () => {
    if (!authenticatorSetup?.uid || authenticatorCode.trim().length !== 6) {
      setAuthenticatorError('Enter the 6-digit Google Authenticator code');
      return;
    }
    setLoading(true);
    setAuthenticatorError('');
    try {
      await AuthApi.verifyAuthenticator(authenticatorSetup.uid, authenticatorCode.trim());
      await AuthApi.clearLastSignupAuthenticator();
      setAccountConfirmed(true);
    } catch (error: any) {
      setAuthenticatorError(error.message || 'Invalid Google Authenticator code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!mobileNumber.trim() || !password.trim() || !name.trim() || !dob.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    const mobileError = getMobileValidationError(countryCode, mobileNumber);
    if (mobileError) { Alert.alert('Error', mobileError); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) { Alert.alert('Error', 'Please enter date in YYYY-MM-DD format'); return; }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    const birthYear = parseInt(dob.split('-')[0]);
    if (birthYear < 1900 || birthYear > new Date().getFullYear()) { Alert.alert('Error', 'Please enter a valid year'); return; }

    setLoading(true);
    const newUser = await signup({ mobileNumber: mobileNumber.trim(), countryCode, password, confirmPassword, name: name.trim(), dob: dob.trim() });
    setLoading(false);

    if (newUser) {
      await setupSignupBiometric(newUser.uid || newUser.id);
      const gaSetup = await AuthApi.setupGoogleAuthenticator(newUser.uid || newUser.id);
      setAuthenticatorSetup({ uid: newUser.uid || newUser.id, user: newUser, authenticator: gaSetup });
    }
  };

  return (
    <LinearGradient colors={['#EEF2FF', '#F8FAFC']} style={styles.container}>
      {!authenticatorSetup ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Feather name="mic" size={38} color="#4F6AF0" />
                </View>
              </View>

              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join as an Operator</Text>

              <View style={styles.inputWrapper}>
                <Feather name="user" size={17} color="#94A3B8" style={styles.inputIconLeft} />
                <TextInput nativeID="full-name" autoComplete="name" style={styles.input} placeholder="Full Name" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />
              </View>

              <View style={styles.mobileContainer}>
                <TouchableOpacity style={styles.countryCodeButton} onPress={() => setShowCountryPicker(!showCountryPicker)}>
                  <Text style={styles.countryCodeText}>{countryCode}</Text>
                  <Feather name="chevron-down" size={14} color="#94A3B8" />
                </TouchableOpacity>
                <View style={[styles.inputWrapper, styles.mobileInputWrapper]}>
                  <Feather name="smartphone" size={17} color="#94A3B8" style={styles.inputIconLeft} />
                  <TextInput
                    nativeID="mobile-number" autoComplete="tel" style={styles.input}
                    placeholder="Mobile Number" placeholderTextColor="#94A3B8"
                    value={mobileNumber}
                    onChangeText={(v) => { const d = v.replace(/\D/g, ''); setMobileNumber(countryCode === '+91' ? d.slice(0, 10) : d); }}
                    keyboardType="phone-pad" maxLength={countryCode === '+91' ? 10 : 15}
                  />
                </View>
              </View>

              {showCountryPicker && (
                <View style={styles.countryPicker}>
                  <ScrollView style={{ maxHeight: 220 }}>
                    {COUNTRY_CODES.map((c) => (
                      <TouchableOpacity key={c.code} style={styles.countryItem} onPress={() => { setCountryCode(c.code); setShowCountryPicker(false); }}>
                        <Text style={styles.countryItemText}>{c.code}</Text>
                        <Text style={styles.countryItemName}>{c.country}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Feather name="calendar" size={17} color="#94A3B8" style={styles.inputIconLeft} />
                <TextInput nativeID="bday" autoComplete="birthdate-full" style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor="#94A3B8" value={dob} onChangeText={(v) => setDob(formatDateOfBirth(v))} keyboardType="number-pad" maxLength={10} />
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={17} color="#94A3B8" style={styles.inputIconLeft} />
                <TextInput nativeID="password" autoComplete="new-password" style={[styles.input, styles.passwordInputField]} placeholder="Password (min 6 chars)" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={17} color="#94A3B8" style={styles.inputIconLeft} />
                <TextInput nativeID="confirm-password" autoComplete="new-password" style={[styles.input, styles.passwordInputField]} placeholder="Confirm Password" placeholderTextColor="#94A3B8" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={17} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.signupButtonText}>Sign Up</Text>}
              </TouchableOpacity>

              {Platform.OS === 'android' && fingerprintStep > 0 && (
                <View style={styles.fingerprintPanel}>
                  <FingerprintFiveSides />
                  <View style={styles.fingerprintPanelText}>
                    <Text style={styles.fingerprintPanelTitle}>Fingerprint setup</Text>
                    <Text style={styles.fingerprintPanelCopy}>
                      {`Capturing ${FINGERPRINT_SCAN_HINTS[fingerprintStep - 1]?.zone || 'fingerprint'} (${fingerprintStep}/5)`}
                    </Text>
                    <Text style={styles.fingerprintPanelHint}>
                      {FINGERPRINT_SCAN_HINTS[fingerprintStep - 1]?.hint}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={onSwitchToLogin}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      {/* Google Authenticator Setup Modal */}
      <Modal visible={!!authenticatorSetup && !accountConfirmed} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Google Authenticator Setup</Text>

            {Platform.OS === 'android' && (
              <View style={styles.biometricSetupBadge}>
                <FingerprintFiveSides compact />
                <Text style={styles.biometricSetupText}>Fingerprint setup complete</Text>
              </View>
            )}

            <Text style={styles.modalText}>
              Scan this QR in Google Authenticator. The 6-digit code will be required for login.
            </Text>

            <View style={styles.qrPlaceholder}>
              {authenticatorSetup?.authenticator?.qrCodeUrl?.startsWith('data:image') ? (
                <Image source={{ uri: authenticatorSetup.authenticator.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
              ) : (
                <Feather name="lock" size={64} color="#4F6AF0" />
              )}
              <Text style={styles.qrPlaceholderText}>
                Secret: {authenticatorSetup?.authenticator?.secret?.substring(0, 20)}...
              </Text>
            </View>

            {/* OTP input */}
            <TouchableOpacity
              activeOpacity={0.9}
              focusable={false}
              style={styles.codeInputShell}
              onPress={() => authenticatorInputRef.current?.focus()}
            >
              {Array.from({ length: 6 }).map((_, i) => {
                const digit = authenticatorCode[i] || '';
                const isActive = authenticatorCode.length === i;
                return (
                  <View key={i} style={[styles.codeDigitBox, isActive && styles.codeDigitBoxActive]}>
                    <Text style={styles.codeDigitText}>{digit}</Text>
                  </View>
                );
              })}
              <TextInput
                nativeID="otp-code"
                autoComplete="one-time-code"
                ref={authenticatorInputRef}
                style={styles.codeInputHidden}
                value={authenticatorCode}
                onChangeText={(t) => { setAuthenticatorCode(t.replace(/\D/g, '').slice(0, 6)); setAuthenticatorError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </TouchableOpacity>

            {authenticatorError ? (
              <Text style={styles.authenticatorError}>{authenticatorError}</Text>
            ) : null}

            <TouchableOpacity style={styles.signupButton} onPress={handleConfirmAuthenticator} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.signupButtonText}>Confirm Account</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={accountConfirmed} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.confirmedCircle}>
              <Feather name="check" size={44} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmedTitle}>Account Confirmed</Text>
            <Text style={styles.modalText}>Your account security is ready. You can sign in now.</Text>
            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => { setAuthenticatorSetup(null); setAccountConfirmed(false); setAuthenticatorCode(''); onSwitchToLogin(); }}
            >
              <Text style={styles.signupButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 36 },
  card: {
    width: '90%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28,
    alignItems: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  logoContainer: { marginBottom: 18 },
  logoCircle: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 20, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 10, backgroundColor: '#F8FAFC' },
  inputIconLeft: { paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#0F172A' },
  passwordInputField: { paddingRight: 42 },
  eyeIcon: { paddingHorizontal: 14 },
  mobileContainer: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 10 },
  countryCodeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 76, height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC', gap: 4 },
  countryCodeText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  mobileInputWrapper: { flex: 1, marginBottom: 0 },
  countryPicker: { position: 'absolute', top: 300, left: 20, right: 20, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 200, zIndex: 1000, elevation: 5 },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  countryItemText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  countryItemName: { fontSize: 12, color: '#94A3B8' },
  signupButton: {
    width: '100%', height: 48, backgroundColor: '#4F6AF0', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 12,
    shadowColor: '#4F6AF0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  signupButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', marginTop: 4 },
  loginText: { color: '#94A3B8', fontSize: 13 },
  loginLink: { color: '#4F6AF0', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '90%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  modalText: { fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 14, lineHeight: 19 },
  qrPlaceholder: { width: 148, height: 148, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  qrImage: { width: 120, height: 120, marginBottom: 4 },
  qrPlaceholderText: { fontSize: 10, color: '#94A3B8', marginTop: 6, textAlign: 'center' },
  codeInputShell: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'relative', marginBottom: 10 },
  codeDigitBox: { width: 38, height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  codeDigitBoxActive: { borderColor: '#4F6AF0', backgroundColor: '#FFFFFF', borderWidth: 2 },
  codeDigitText: { color: '#0F172A', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  codeInputHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  authenticatorError: { color: '#DC2626', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  confirmedCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmedTitle: { fontSize: 22, fontWeight: '800', color: '#059669', marginBottom: 8, textAlign: 'center' },
  fingerprintPanel: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, padding: 10, marginBottom: 10 },
  fingerprintPanelText: { flex: 1 },
  fingerprintPanelTitle: { color: '#065F46', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  fingerprintPanelCopy: { color: '#059669', fontSize: 12, lineHeight: 16 },
  fingerprintPanelHint: { color: '#10B981', fontSize: 11, lineHeight: 15 },
  biometricSetupBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  biometricSetupText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  fingerprintMark: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden', backgroundColor: '#ECFDF5' },
  fingerprintImage: { width: 84, height: 84 },
  fingerprintMarkCompact: { width: 22, height: 22, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fingerprintImageCompact: { width: 24, height: 22 },
});
