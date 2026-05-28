import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Image,
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

export default function LoginScreen({ 
  onSwitchToSignup, 
  onLoginSuccess 
}: { 
  onSwitchToSignup: () => void;
  onLoginSuccess: () => void;
}) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // OTP Modal states (WEB ONLY)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [pendingUid, setPendingUid] = useState<string>('');
  const otpInputRef = useRef<TextInput>(null);
  
  const {
    isBiometricSupported,
    biometricType,
    verifyBiometric,
  } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
    }
  }, []);

  // MOBILE: Handle Login with Biometric ONLY (No Password)
  const handleMobileLogin = async () => {
    setFormError('');
    if (!mobileNumber.trim()) {
      setFormError('Please enter mobile number');
      Alert.alert('Error', 'Please enter Mobile Number');
      return;
    }

    const mobileError = getMobileValidationError(countryCode, mobileNumber);
    if (mobileError) {
      setFormError(mobileError);
      Alert.alert('Error', mobileError);
      return;
    }

    setLoading(true);

    try {
      if (isBiometricSupported) {
        const biometricValid = await verifyBiometric();
        if (!biometricValid) {
          Alert.alert('Authentication Failed', `${biometricType} verification failed`);
          setLoading(false);
          return;
        }
      }

      await AuthApi.loginWithBiometric({
        mobileNumber: mobileNumber.trim(),
        countryCode,
      });
      
      setFormError('');
      if (onLoginSuccess) onLoginSuccess();
      
    } catch (error: any) {
      const message = error.message || 'User not found';
      setFormError(message);
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // WEB: Handle Login with Password + Google Authenticator (ALWAYS SHOW OTP MODAL)
  const handleWebLogin = async () => {
    setFormError('');
    if (!mobileNumber.trim() || !password.trim()) {
      setFormError('Please enter mobile number and password');
      Alert.alert('Error', 'Please enter Mobile Number and Password');
      return;
    }

    const mobileError = getMobileValidationError(countryCode, mobileNumber);
    if (mobileError) {
      setFormError(mobileError);
      Alert.alert('Error', mobileError);
      return;
    }

    setLoading(true);
    
    try {
      const response = await AuthApi.startPasswordLogin({
        mobileNumber: mobileNumber.trim(),
        countryCode,
        password,
      });

      if (response.requiresAuthenticator) {
        setPendingUid(String(response.uid));
        setShowOtpModal(true);
        setOtpError('');
        setOtp('');
        return;
      }

      if (response.user) {
        await AuthApi.saveUser(response.user);
        await AuthApi.updateLastActivity();
        setFormError('');
        if (onLoginSuccess) onLoginSuccess();
      }
      
    } catch (error: any) {
      const message = error.message || 'Invalid mobile number or password';
      setFormError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // WEB: Verify Google Authenticator Code
  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    
    try {
      await AuthApi.verifyAuthenticator(pendingUid, otp);
      setShowOtpModal(false);
      setOtp('');
      setFormError('');
      if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      setOtpError(error.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (Platform.OS === 'web') {
      handleWebLogin();  // Web: Password + Google Authenticator
    } else {
      handleMobileLogin();  // Mobile: Biometric only
    }
  };

  const getButtonText = () => {
    return 'Sign In';
  };

  return (
    <>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Feather name="mic" size={45} color="#1a1a2e" />
                </View>
              </View>

              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>

              {/* Mobile Number */}
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
                      if (formError) setFormError('');
                    }}
                    keyboardType="phone-pad"
                    maxLength={countryCode === '+91' ? 10 : 15}
                  />
                </View>
              </View>

              {showCountryPicker && (
                <View style={styles.countryPicker}>
                  <ScrollView style={{ maxHeight: 200 }}>
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

              {/* Password - ONLY FOR WEB */}
              {Platform.OS === 'web' && (
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#888" style={styles.inputIconLeft} />
                  <TextInput
                    style={[styles.input, styles.passwordInputField]}
                    placeholder="Password"
                    placeholderTextColor="#aaa"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (formError) setFormError('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#888" />
                  </TouchableOpacity>
                </View>
              )}

              {formError ? (
                <View style={styles.formErrorBox}>
                  <Feather name="alert-circle" size={16} color="#d32f2f" />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loginButtonText}>{getButtonText()}</Text>}
              </TouchableOpacity>

              {/* Biometric Note (Mobile only) */}
              {Platform.OS !== 'web' && (
                <View style={styles.biometricNote}>
                  {Platform.OS === 'android' ? (
                    <FingerprintFiveSides compact />
                  ) : (
                    <Feather name="shield" size={14} color="#2e7d32" />
                  )}
                  <Text style={styles.biometricNoteText}>
                    {Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint'} is used for mobile login
                  </Text>
                </View>
              )}

              {/* OTP Note (Web only) */}
              {Platform.OS === 'web' && (
                <View style={styles.gaNote}>
                  <Feather name="smartphone" size={14} color="#1565c0" />
                  <Text style={styles.gaNoteText}>
                    Google Authenticator code will be required after password
                  </Text>
                </View>
              )}

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onSwitchToSignup}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* OTP Modal (Web only) */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowOtpModal(false);
          setOtp('');
          setOtpError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Google Authenticator</Text>
              <TouchableOpacity onPress={() => {
                setShowOtpModal(false);
                setOtp('');
                setOtpError('');
              }}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter the 6-digit Google Authenticator code
            </Text>

            <View style={styles.otpInputCenter}>
              <TouchableOpacity
                activeOpacity={0.9}
                focusable={false}
                style={styles.codeInputShell}
                onPress={() => otpInputRef.current?.focus()}
              >
                {Array.from({ length: 6 }).map((_, index) => {
                  const digit = otp[index] || '';
                  const isActive = otp.length === index;
                  return (
                    <View
                      key={`otp-${index}`}
                      style={[styles.codeDigitBox, isActive && styles.codeDigitBoxActive]}
                    >
                      <Text style={styles.codeDigitText}>{digit}</Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={otpInputRef}
                  style={styles.codeInputHidden}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text.replace(/\D/g, '').slice(0, 6));
                    setOtpError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </TouchableOpacity>
            </View>

            {otpError ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#ff4444" />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.verifyButtonText}>Verify & Login</Text>}
            </TouchableOpacity>

            <Text style={styles.resendText}>Open Google Authenticator and enter the current code.</Text>
          </View>
        </View>
      </Modal>
    </>
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
  logoContainer: { marginBottom: 24 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 32, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 52, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, marginBottom: 16, backgroundColor: '#fafafa' },
  inputIconLeft: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: '#333' },
  passwordInputField: { paddingRight: 45 },
  eyeIcon: { paddingHorizontal: 15 },
  mobileContainer: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 16 },
  countryCodeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 80, height: 52, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, backgroundColor: '#fafafa', gap: 4 },
  countryCodeText: { fontSize: 15, color: '#333', fontWeight: '500' },
  mobileInputWrapper: { flex: 1, marginBottom: 0 },
  countryPicker: { position: 'absolute', top: 180, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e0e0e0', zIndex: 1000, elevation: 5, maxHeight: 250 },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  countryItemText: { fontSize: 14, fontWeight: '500', color: '#333' },
  countryItemName: { fontSize: 12, color: '#888' },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  formErrorText: { color: '#d32f2f', fontSize: 13, flex: 1, lineHeight: 18 },
  loginButton: { width: '100%', height: 52, backgroundColor: '#1a1a2e', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  biometricNote: { flexDirection: 'row', backgroundColor: '#e8f5e9', padding: 12, borderRadius: 12, marginVertical: 12, alignItems: 'center', gap: 8, width: '100%' },
  biometricNoteText: { color: '#2e7d32', fontSize: 12, flex: 1 },
  gaNote: { flexDirection: 'row', backgroundColor: '#e3f2fd', padding: 12, borderRadius: 12, marginVertical: 12, alignItems: 'center', gap: 8, width: '100%' },
  gaNoteText: { color: '#1565c0', fontSize: 12, flex: 1 },
  signupContainer: { flexDirection: 'row', marginTop: 16 },
  signupText: { color: '#888', fontSize: 14 },
  signupLink: { color: '#1a1a2e', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  modalSubtitle: { fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center' },
  otpInputCenter: { alignItems: 'center', width: '100%', marginBottom: 20 },
  codeInputShell: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'relative' },
  codeDigitBox: { width: 38, height: 48, borderWidth: 1, borderColor: '#d8dbe2', borderRadius: 12, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  codeDigitBoxActive: { borderColor: '#1a1a2e', backgroundColor: '#ffffff' },
  codeDigitText: { color: '#1a1a2e', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  codeInputHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe0e0', padding: 12, borderRadius: 10, marginBottom: 20, gap: 8 },
  errorText: { color: '#ff4444', fontSize: 13, flex: 1, textAlign: 'center' },
  verifyButton: { width: '100%', height: 50, backgroundColor: '#1a1a2e', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  verifyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendText: { color: '#1a1a2e', fontSize: 14, textAlign: 'center' },
  fingerprintMark: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden', backgroundColor: '#eef8ee' },
  fingerprintImage: { width: 84, height: 84 },
  fingerprintMarkCompact: { width: 22, height: 22, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fingerprintImageCompact: { width: 24, height: 22 },
});
