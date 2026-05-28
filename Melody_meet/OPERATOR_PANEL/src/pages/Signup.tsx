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
      Alert.alert(
        'Biometric Required',
        'Please enroll fingerprint on Android or Face ID on iOS. It will be required when you log in.'
      );
      return;
    }

    const attempts = Platform.OS === 'android' ? 5 : 1;

    for (let step = 1; step <= attempts; step += 1) {
      setFingerprintStep(step);
      const biometricVerified = await verifyBiometric();
      if (!biometricVerified) {
        setFingerprintStep(0);
        Alert.alert(
          'Biometric Required',
          `${biometricType || 'Biometric'} setup stopped at ${step} of ${attempts}. It will be required again when you log in.`
        );
        return;
      }
    }

    try {
      await AuthApi.enableBiometrics(uid, getBackendBiometricType());
    } catch (error: any) {
      Alert.alert('Biometric Setup Failed', error.message || 'Could not enable biometrics on this device.');
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
    if (mobileError) {
      Alert.alert('Error', mobileError);
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(dob.split('-')[0]);

    if (birthYear < 1900 || birthYear > currentYear) {
      Alert.alert('Error', 'Please enter a valid year');
      return;
    }

    setLoading(true);
    const newUser = await signup({
      mobileNumber: mobileNumber.trim(),
      countryCode,
      password,
      confirmPassword,
      name: name.trim(),
      dob: dob.trim(),
    });
    setLoading(false);

    if (newUser) {
      await setupSignupBiometric(newUser.uid || newUser.id);

      // Setup Google Authenticator
      const gaSetup = await AuthApi.setupGoogleAuthenticator(newUser.uid || newUser.id);
      
      setAuthenticatorSetup({
        uid: newUser.uid || newUser.id,
        user: newUser,
        authenticator: gaSetup,
      });
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {!authenticatorSetup ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Feather name="mic" size={45} color="#1a1a2e" />
                </View>
              </View>

              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join as an Operator</Text>

              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color="#888" style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#aaa"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.mobileContainer}>
                <TouchableOpacity 
                  style={styles.countryCodeButton} 
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <Text style={styles.countryCodeText}>{countryCode}</Text>
                  <Feather name="chevron-down" size={16} color="#888" />
                </TouchableOpacity>
                <View style={[styles.inputWrapper, styles.mobileInputWrapper]}>
                  <Feather name="smartphone" size={18} color="#888" style={styles.inputIconLeft} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    placeholderTextColor="#aaa"
                    value={mobileNumber}
                    onChangeText={(value) => {
                      const digitsOnly = value.replace(/\D/g, '');
                      setMobileNumber(countryCode === '+91' ? digitsOnly.slice(0, 10) : digitsOnly);
                    }}
                    keyboardType="phone-pad"
                    maxLength={countryCode === '+91' ? 10 : 15}
                  />
                </View>
              </View>

              {showCountryPicker && (
                <View style={styles.countryPicker}>
                  <ScrollView style={{ maxHeight: 250 }}>
                    {COUNTRY_CODES.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={styles.countryItem}
                        onPress={() => {
                          setCountryCode(country.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryItemText}>{country.code}</Text>
                        <Text style={styles.countryItemName}>{country.country}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Feather name="calendar" size={18} color="#888" style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (YYYY-MM-DD)"
                  placeholderTextColor="#aaa"
                  value={dob}
                  onChangeText={(value) => setDob(formatDateOfBirth(value))}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#888" style={styles.inputIconLeft} />
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  placeholder="Password (min 6 chars)"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#888" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#888" style={styles.inputIconLeft} />
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#aaa"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#888" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.signupButtonText}>Sign Up</Text>}
              </TouchableOpacity>

              {Platform.OS === 'android' && fingerprintStep > 0 && (
                <View style={styles.fingerprintPanel}>
                  <FingerprintFiveSides />
                  <View style={styles.fingerprintPanelText}>
                    <Text style={styles.fingerprintPanelTitle}>Fingerprint setup</Text>
                    <Text style={styles.fingerprintPanelCopy}>
                      {fingerprintStep > 0
                        ? `Capturing ${FINGERPRINT_SCAN_HINTS[fingerprintStep - 1]?.zone || 'fingerprint'} (${fingerprintStep}/5)`
                        : 'Five captures during signup, one match during login'}
                    </Text>
                    <Text style={styles.fingerprintPanelHint}>
                      {fingerprintStep > 0
                        ? FINGERPRINT_SCAN_HINTS[fingerprintStep - 1]?.hint
                        : 'Centre, tip, left edge, right edge, full thumb.'}
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
                <Image
                  source={{ uri: authenticatorSetup.authenticator.qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <Feather name="lock" size={80} color="#1a1a2e" />
              )}
              <Text style={styles.qrPlaceholderText}>
                Secret: {authenticatorSetup?.authenticator?.secret?.substring(0, 20)}...
              </Text>
            </View>
            
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.codeInputShell}
              onPress={() => authenticatorInputRef.current?.focus()}
            >
              {Array.from({ length: 6 }).map((_, index) => {
                const digit = authenticatorCode[index] || '';
                return (
                  <View
                    key={`auth-code-${index}`}
                    style={[styles.codeDigitBox, authenticatorCode.length === index && styles.codeDigitBoxActive]}
                  >
                    <Text style={styles.codeDigitText}>{digit}</Text>
                  </View>
                );
              })}
              <TextInput
                ref={authenticatorInputRef}
                style={styles.codeInputHidden}
                value={authenticatorCode}
                onChangeText={(value) => {
                  setAuthenticatorCode(value.replace(/\D/g, '').slice(0, 6));
                  setAuthenticatorError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
              />
            </TouchableOpacity>
            
            {authenticatorError && (
              <Text style={styles.authenticatorError}>{authenticatorError}</Text>
            )}
            
            <TouchableOpacity style={styles.signupButton} onPress={handleConfirmAuthenticator} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.signupButtonText}>Confirm Account</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={accountConfirmed} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.confirmedCircle}>
              <Feather name="check" size={48} color="#ffffff" />
            </View>
            <Text style={styles.confirmedTitle}>Account Confirmed</Text>
            <Text style={styles.modalText}>
              Your account security is ready. You can sign in now.
            </Text>
            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => {
                setAuthenticatorSetup(null);
                setAccountConfirmed(false);
                setAuthenticatorCode('');
                onSwitchToLogin();
              }}
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
  logoContainer: { marginBottom: 20 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 28, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 52, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, marginBottom: 14, backgroundColor: '#fafafa' },
  inputIconLeft: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: '#333' },
  passwordInputField: { paddingRight: 45 },
  eyeIcon: { paddingHorizontal: 15 },
  mobileContainer: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 14 },
  countryCodeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 80, height: 52, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, backgroundColor: '#fafafa', gap: 4 },
  countryCodeText: { fontSize: 15, color: '#333', fontWeight: '500' },
  mobileInputWrapper: { flex: 1, marginBottom: 0 },
  countryPicker: { position: 'absolute', top: 320, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e0e0e0', maxHeight: 200, zIndex: 1000, elevation: 5 },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  countryItemText: { fontSize: 14, fontWeight: '500', color: '#333' },
  countryItemName: { fontSize: 12, color: '#888' },
  signupButton: { width: '100%', height: 52, backgroundColor: '#1a1a2e', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  signupButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', marginTop: 8 },
  loginText: { color: '#888', fontSize: 14 },
  loginLink: { color: '#1a1a2e', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '90%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 22, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16, lineHeight: 19 },
  qrPlaceholder: { width: 160, height: 160, backgroundColor: '#f0f0f0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  qrImage: { width: 128, height: 128, marginBottom: 4 },
  qrPlaceholderText: { fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center' },
  codeInputShell: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'relative', marginBottom: 10 },
  codeDigitBox: { width: 38, height: 48, borderWidth: 1, borderColor: '#d8dbe2', borderRadius: 12, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  codeDigitBoxActive: { borderColor: '#1a1a2e', backgroundColor: '#fff' },
  codeDigitText: { color: '#1a1a2e', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  codeInputHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  authenticatorError: { color: '#d32f2f', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  confirmedCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1fa463', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  confirmedTitle: { fontSize: 24, fontWeight: '800', color: '#1fa463', marginBottom: 10, textAlign: 'center' },
  fingerprintPanel: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#b9e4c9', borderRadius: 14, padding: 10, marginBottom: 12 },
  fingerprintPanelText: { flex: 1 },
  fingerprintPanelTitle: { color: '#166b3d', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  fingerprintPanelCopy: { color: '#2e7d32', fontSize: 12, lineHeight: 16 },
  fingerprintPanelHint: { color: '#4f8d68', fontSize: 11, lineHeight: 15 },
  biometricSetupBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e8f5e9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 },
  biometricSetupText: { fontSize: 12, color: '#2e7d32', fontWeight: '700' },
  fingerprintMark: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden', backgroundColor: '#eef8ee' },
  fingerprintImage: { width: 84, height: 84 },
  fingerprintMarkCompact: { width: 22, height: 22, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fingerprintImageCompact: { width: 24, height: 22 },
});
