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
import { StorageService } from '../services/storageService';
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
  onLoginSuccess: () => void | Promise<void>;
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
    reloadSession,
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
      
      // ─── Fix: reload session so AuthContext.user is populated and token
      // is confirmed written before navigating. Without this, isAuthenticated
      // stays false and any API call made during navigation returns 401. ───
      await reloadSession();
      
      setFormError('');
      if (onLoginSuccess) await onLoginSuccess();
      
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

      if (response.user && response.tokens?.accessToken) {
        await AuthApi.persistLoginResponse(response);
        await reloadSession();
        setFormError('');
        if (onLoginSuccess) await onLoginSuccess();
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
      await reloadSession();
      const token = await StorageService.getSessionToken();
      if (!token) {
        setOtpError('Login succeeded but session token was not saved. Please try again.');
        return;
      }
      setShowOtpModal(false);
      setOtp('');
      setFormError('');
      if (onLoginSuccess) await onLoginSuccess();
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
      <LinearGradient colors={['#EEF2FF', '#F8FAFC']} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Feather name="mic" size={38} color="#4F6AF0" />
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
                    nativeID="mobile-number"
                    autoComplete="tel"
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
                    nativeID="password"
                    autoComplete="password"
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
                  nativeID="otp-code"
                  autoComplete="one-time-code"
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoContainer: { marginBottom: 20 },
  logoCircle: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 24, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 12, backgroundColor: '#F8FAFC' },
  inputIconLeft: { paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#0F172A' },
  passwordInputField: { paddingRight: 42 },
  eyeIcon: { paddingHorizontal: 14 },
  mobileContainer: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 12 },
  countryCodeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 76, height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC', gap: 4 },
  countryCodeText: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  mobileInputWrapper: { flex: 1, marginBottom: 0 },
  countryPicker: { position: 'absolute', top: 175, left: 20, right: 20, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', zIndex: 1000, elevation: 5, maxHeight: 240 },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  countryItemText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  countryItemName: { fontSize: 12, color: '#94A3B8' },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  formErrorText: { color: '#DC2626', fontSize: 12, flex: 1, lineHeight: 18 },
  loginButton: { width: '100%', height: 48, backgroundColor: '#4F6AF0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#4F6AF0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  loginButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  biometricNote: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 10, marginVertical: 10, alignItems: 'center', gap: 8, width: '100%', borderWidth: 1, borderColor: '#A7F3D0' },
  biometricNoteText: { color: '#059669', fontSize: 12, flex: 1 },
  gaNote: { flexDirection: 'row', backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, marginVertical: 10, alignItems: 'center', gap: 8, width: '100%', borderWidth: 1, borderColor: '#C7D2FE' },
  gaNoteText: { color: '#4F6AF0', fontSize: 12, flex: 1 },
  signupContainer: { flexDirection: 'row', marginTop: 14 },
  signupText: { color: '#94A3B8', fontSize: 13 },
  signupLink: { color: '#4F6AF0', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 20, textAlign: 'center' },
  otpInputCenter: { alignItems: 'center', width: '100%', marginBottom: 20 },
  codeInputShell: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'relative' },
  codeDigitBox: { width: 38, height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  codeDigitBoxActive: { borderColor: '#4F6AF0', backgroundColor: '#FFFFFF', borderWidth: 2 },
  codeDigitText: { color: '#0F172A', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  codeInputHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 12, flex: 1, textAlign: 'center' },
  verifyButton: { width: '100%', height: 48, backgroundColor: '#4F6AF0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#4F6AF0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  verifyButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resendText: { color: '#475569', fontSize: 13, textAlign: 'center' },
  fingerprintMark: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden', backgroundColor: '#ECFDF5' },
  fingerprintImage: { width: 84, height: 84 },
  fingerprintMarkCompact: { width: 22, height: 22, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fingerprintImageCompact: { width: 24, height: 22 },
});
