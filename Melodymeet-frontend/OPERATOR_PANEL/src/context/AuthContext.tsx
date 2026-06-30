import React, { createContext, useState, useContext, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';
import { AuthApi } from '../services/api/authApi';
import { StorageService } from '../services/storageService';
import { User, LoginCredentials, SignupCredentials, TwoFactorLoginRequest, TwoFactorSetupResponse } from '../types/auth.types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBiometricSupported: boolean;
  biometricType: string;
  reloadSession: () => Promise<boolean>;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  sendLoginOTP: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  loginWithOTP: (request: TwoFactorLoginRequest) => Promise<boolean>;
  signup: (credentials: SignupCredentials) => Promise<User | null>;
  logout: () => Promise<void>;
  verifyBiometric: () => Promise<boolean>;
  updateLastActivity: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<boolean>;
  // New 2FA methods
  setupTwoFactor: () => Promise<TwoFactorSetupResponse | null>;
  verifyTwoFactor: (token: string) => Promise<boolean>;
}

const symbolObj = Symbol.for('AuthContext');
let AuthContext = (globalThis as any)[symbolObj];
if (!AuthContext) {
  AuthContext = createContext<AuthContextType | undefined>(undefined);
  (globalThis as any)[symbolObj] = AuthContext;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    checkBiometricSupport();
    checkStoredSession();
  }, []);

  const checkBiometricSupport = async () => {
    if (Platform.OS === 'web') {
      setIsBiometricSupported(false);
      setBiometricType('');
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      let type = 'Biometric';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        type = Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        type = 'Fingerprint';
      }
      
      setIsBiometricSupported(hasHardware && isEnrolled);
      setBiometricType(type);
    } catch (error) {
      console.error('Biometric check failed:', error);
      setIsBiometricSupported(false);
      setBiometricType('');
    }
  };

  const reloadSession = async (): Promise<boolean> => {
    try {
      const storedUser = await StorageService.getUser();
      const lastActivity = await StorageService.getLastActivity();

      if (!storedUser || !lastActivity) {
        setUser(null);
        return false;
      }

      const SESSION_TIMEOUT = 30 * 60 * 1000;
      if (Date.now() - lastActivity >= SESSION_TIMEOUT) {
        await AuthApi.logout();
        setUser(null);
        return false;
      }

      let token = await StorageService.getSessionToken();

      if (!token) {
        try {
          await AuthApi.refreshTokens();
          token = await StorageService.getSessionToken();
        } catch {
          token = null;
        }
      }

      if (!token) {
        await AuthApi.logout();
        setUser(null);
        return false;
      }

      setUser(storedUser);
      return true;
    } catch (error) {
      console.error('[AuthContext] reloadSession failed:', error);
      setUser(null);
      return false;
    }
  };

  const checkStoredSession = async () => {
    try {
      await reloadSession();
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyBiometric = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true;
    }

    if (!isBiometricSupported) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate with ${biometricType}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use password',
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  };

  // Mobile login with password + biometric
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      if (Platform.OS !== 'web' && isBiometricSupported) {
        const biometricValid = await verifyBiometric();
        if (!biometricValid) {
          Alert.alert('Authentication Failed', `${biometricType} verification failed`);
          return false;
        }
      }

      const loggedInUser = await AuthApi.loginWithPassword(credentials);
      if (loggedInUser) {
        setUser(loggedInUser);
        await StorageService.updateLastActivity();
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid mobile number or password');
      return false;
    }
  };

  // Web: Send OTP for login
  const sendLoginOTP = async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      return await AuthApi.sendLoginOTP(credentials);
    } catch (error: any) {
      console.error('Send OTP failed:', error);
      throw error;
    }
  };

  // Web: Login with OTP
  const loginWithOTP = async (request: TwoFactorLoginRequest): Promise<boolean> => {
    try {
      const loggedInUser = await AuthApi.loginWithOTP(request);
      if (loggedInUser) {
        setUser(loggedInUser);
        await StorageService.updateLastActivity();
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid OTP');
      return false;
    }
  };

  const signup = async (credentials: SignupCredentials): Promise<User | null> => {
    try {
      const newUser = await AuthApi.signup(credentials);
      if (newUser) {
        if (Platform.OS !== 'web' && isBiometricSupported) {
          Alert.alert('Success', `${biometricType} will be required for future logins`);
        }
        return newUser;
      }
      return null;
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
      return null;
    }
  };

  // Setup 2FA for user
  const setupTwoFactor = async (): Promise<TwoFactorSetupResponse | null> => {
    try {
      if (!user) {
        throw new Error('User not logged in');
      }
      const result = await AuthApi.setupTwoFactor(user.id);
      return result;
    } catch (error: any) {
      Alert.alert('2FA Setup Failed', error.message);
      return null;
    }
  };

  // Verify and enable 2FA
  const verifyTwoFactor = async (token: string): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error('User not logged in');
      }
      const success = await AuthApi.verifyAndEnableTwoFactor(user.id, token);
      if (success) {
        // Update user in state
        setUser({ ...user, isTwoFactorEnabled: true });
      }
      return success;
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
      return false;
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      Alert.alert('Info', 'Password reset will be available soon');
      return false;
    } catch (error: any) {
      Alert.alert('Error', error.message);
      return false;
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword: string): Promise<boolean> => {
    try {
      Alert.alert('Info', 'Password reset will be available soon');
      return false;
    } catch (error: any) {
      Alert.alert('Error', error.message);
      return false;
    }
  };

  const logout = async () => {
    await AuthApi.logout();
    setUser(null);
  };

  const updateLastActivity = async () => {
    await StorageService.updateLastActivity();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isBiometricSupported,
        biometricType,
        reloadSession,
        login,
        sendLoginOTP,
        loginWithOTP,
        signup,
        logout,
        verifyBiometric,
        updateLastActivity,
        forgotPassword,
        resetPassword,
        setupTwoFactor,
        verifyTwoFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};