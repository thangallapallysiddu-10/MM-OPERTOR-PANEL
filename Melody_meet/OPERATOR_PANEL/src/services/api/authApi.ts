import { Platform } from 'react-native';
import axios from 'axios';
import {
  LoginCredentials,
  SignupCredentials,
  User,
  TwoFactorSetupResponse,
  TwoFactorLoginRequest,
} from '../../types/auth.types';
import { StorageService } from '../storageService';

const API_BASE_URL =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

const DEVICE_ID_KEY = '@auth_device_id';
const REFRESH_TOKEN_KEY = '@refresh_token';
const LAST_SIGNUP_AUTHENTICATOR_KEY = '@last_signup_authenticator';

interface BackendUser {
  id?: string | number;
  uid: string;
  username?: string;
  name?: string;
  mobileNumber?: string;
  mobile_number?: string;
  countryCode?: string;
  country_code?: string;
  dob?: string;
  createdAt?: string;
  created_at?: string;
  authenticatorEnabled?: boolean;
  authenticator_enabled?: boolean;
}

interface StoredUser extends User {
  password?: string;
}

function normalizeError(error: any): Error {
  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Authentication request failed';
  return new Error(message);
}

function toUser(user: BackendUser): User {
  return {
    id: String(user.uid || user.id),
    uid: String(user.uid || user.id),
    name: user.name || user.username || 'MelodyMeet User',
    mobileNumber: user.mobileNumber || user.mobile_number,
    countryCode: user.countryCode || user.country_code,
    dob: user.dob,
    createdAt: user.createdAt || user.created_at,
    isTwoFactorEnabled: Boolean(user.authenticatorEnabled ?? user.authenticator_enabled),
    isRJ: false,
  };
}

async function getDeviceId(): Promise<string> {
  const existing = await StorageService.getCustomItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const random =
    (globalThis as any)?.crypto?.randomUUID?.() ||
    `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await StorageService.setCustomItem(DEVICE_ID_KEY, random);
  return random;
}

async function persistSession(user?: BackendUser, tokens?: any): Promise<User | null> {
  if (!user) return null;

  const normalizedUser = toUser(user);
  await StorageService.saveUser(normalizedUser);
  await StorageService.updateLastActivity();

  if (tokens?.accessToken) {
    await StorageService.saveSessionToken(tokens.accessToken);
  }
  if (tokens?.refreshToken) {
    await StorageService.setCustomItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  return normalizedUser;
}

class AuthApi {
  static async persistLoginResponse(data: { user?: BackendUser; tokens?: { accessToken?: string; refreshToken?: string } }): Promise<User | null> {
    return persistSession(data.user, data.tokens);
  }

  static async getDeviceId(): Promise<string> {
    return getDeviceId();
  }

  static async signup(credentials: SignupCredentials): Promise<(User & { authenticator?: any }) | null> {
    try {
      const deviceId = await getDeviceId();
      const { data } = await axios.post(`${API_BASE_URL}/auth/signup`, {
        name: credentials.name,
        mobileNumber: credentials.mobileNumber,
        countryCode: credentials.countryCode,
        dob: credentials.dob,
        password: credentials.password,
        deviceId,
        deviceName: Platform.OS === 'web' ? 'Web browser' : `${Platform.OS} device`,
        platform: Platform.OS,
      });

      const user = toUser(data.user);
      const authenticator = data.authenticator;
      await StorageService.setCustomItem(
        LAST_SIGNUP_AUTHENTICATOR_KEY,
        JSON.stringify({ uid: user.uid || user.id, authenticator })
      );

      return { ...user, authenticator };
    } catch (error: any) {
      throw normalizeError(error);
    }
  }

  static async loginWithPassword(credentials: LoginCredentials): Promise<User | null> {
    try {
      const deviceId = await getDeviceId();
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
        mobileNumber: credentials.mobileNumber,
        countryCode: credentials.countryCode,
        password: credentials.password,
        deviceId,
        deviceName: Platform.OS === 'web' ? 'Web browser' : `${Platform.OS} device`,
        platform: Platform.OS,
      });

      if (data.requiresAuthenticator || data.requiresBiometric || data.requiresBiometricSetup) {
        return {
          id: String(data.uid),
          uid: String(data.uid),
          name: 'Pending verification',
          mobileNumber: credentials.mobileNumber,
          countryCode: credentials.countryCode,
        };
      }

      return persistSession(data.user, data.tokens);
    } catch (error: any) {
      throw normalizeError(error);
    }
  }

  static async startPasswordLogin(credentials: LoginCredentials): Promise<any> {
    try {
      const deviceId = await getDeviceId();
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
        mobileNumber: credentials.mobileNumber,
        countryCode: credentials.countryCode,
        password: credentials.password,
        deviceId,
        deviceName: Platform.OS === 'web' ? 'Web browser' : `${Platform.OS} device`,
        platform: Platform.OS,
      });
      return data;
    } catch (error: any) {
      throw normalizeError(error);
    }
  }

  static async loginWithBiometric(credentials: Pick<LoginCredentials, 'mobileNumber' | 'countryCode'>): Promise<User | null> {
    try {
      const deviceId = await getDeviceId();
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
        mobileNumber: credentials.mobileNumber,
        countryCode: credentials.countryCode,
        deviceId,
        deviceName: `${Platform.OS} device`,
        platform: Platform.OS,
        biometricVerified: true,
      });

      if (!data.user || !data.tokens) {
        throw new Error(
          data.requiresBiometricSetup
            ? 'Biometric login is not enabled for this device. Please sign in with password once to finish setup.'
            : 'Biometric verification is required before login.'
        );
      }

      return persistSession(data.user, data.tokens);
    } catch (error: any) {
      throw normalizeError(error);
    }
  }

  static async verifyAuthenticator(uid: string, token: string): Promise<User | null> {
    try {
      const deviceId = await getDeviceId();
      const { data } = await axios.post(`${API_BASE_URL}/auth/verify-authenticator`, {
        uid,
        deviceId,
        code: token,
      });

      return persistSession(data.user, data.tokens);
    } catch (error: any) {
      throw normalizeError(error);
    }
  }

  static async enableBiometrics(uid: string, biometricType: string): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      await axios.post(`${API_BASE_URL}/auth/biometrics/enable`, {
        uid,
        deviceId,
        biometricType,
        appSecret: `${uid}:${deviceId}`,
      });
    } catch (error: any) {
      throw normalizeError(error);
    }
  }

  static async refreshTokens(): Promise<User | null> {
    try {
      const refreshToken = await StorageService.getCustomItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      return persistSession(data.user, data.tokens);
    } catch (error: any) {
      // Do NOT call logout() here — that wipes the session (including the refresh token
      // itself) and makes recovery impossible. Just rethrow so the caller can decide.
      throw normalizeError(error);
    }
  }

  static async logout(): Promise<void> {
    const user = await StorageService.getUser();
    const deviceId = await getDeviceId();

    try {
      if (user?.uid) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { uid: user.uid, deviceId });
      }
    } catch (error) {
      console.warn('Backend logout failed; clearing local session anyway.');
    } finally {
      await StorageService.clearAll();
      await StorageService.removeCustomItem(REFRESH_TOKEN_KEY);
      await StorageService.setCustomItem(DEVICE_ID_KEY, deviceId);
    }
  }

  static async getLastSignupAuthenticator(): Promise<{ uid: string; authenticator: any } | null> {
    const saved = await StorageService.getCustomItem(LAST_SIGNUP_AUTHENTICATOR_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  static async clearLastSignupAuthenticator(): Promise<void> {
    await StorageService.removeCustomItem(LAST_SIGNUP_AUTHENTICATOR_KEY);
  }

  static async saveUser(user: any): Promise<void> {
    await StorageService.saveUser(user);
  }

  static async updateLastActivity(): Promise<void> {
    await StorageService.updateLastActivity();
  }

  static async getCustomItem(key: string): Promise<string | null> {
    return StorageService.getCustomItem(key);
  }

  static async setCustomItem(key: string, value: string): Promise<void> {
    return StorageService.setCustomItem(key, value);
  }

  static async sendLoginOTP(credentials: LoginCredentials): Promise<{ success: boolean; message: string; hasTwoFactor?: boolean }> {
    const response = await this.startPasswordLogin(credentials);
    return {
      success: true,
      message: response.requiresAuthenticator ? 'Google Authenticator required' : 'Login verified',
      hasTwoFactor: Boolean(response.requiresAuthenticator),
    };
  }

  static async loginWithOTP(request: TwoFactorLoginRequest): Promise<User | null> {
    if (!request.userId || !request.otp) {
      throw new Error('Authenticator verification requires user id and code');
    }
    return this.verifyAuthenticator(request.userId, request.otp);
  }

  static async setupGoogleAuthenticator(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const setup = await this.getLastSignupAuthenticator();
    if (!setup?.authenticator || setup.uid !== userId) {
      throw new Error('Authenticator setup was not returned by the backend. Please sign up again.');
    }

    return {
      secret: setup.authenticator.secret,
      qrCodeUrl: setup.authenticator.qrCodeDataUrl || setup.authenticator.otpauthUrl,
    };
  }

  static async verifyGoogleAuthenticator(userId: string, token: string): Promise<boolean> {
    await this.verifyAuthenticator(userId, token);
    return true;
  }

  static async enableGoogleAuthenticator(userId: string, token: string): Promise<boolean> {
    return this.verifyGoogleAuthenticator(userId, token);
  }

  static async isGoogleAuthenticatorEnabled(): Promise<boolean> {
    return true;
  }

  static async loginWithGoogleAuthenticator(userId: string, token: string): Promise<User | null> {
    return this.verifyAuthenticator(userId, token);
  }

  static async getUserById(userId: string): Promise<StoredUser | null> {
    const user = await StorageService.getUser();
    return user && (user.id === userId || user.uid === userId) ? user : null;
  }

  static async getAllUsersFromStorage(): Promise<StoredUser[]> {
    const user = await StorageService.getUser();
    return user ? [user] : [];
  }

  static async findUser(mobileNumber: string, password: string, countryCode = '+91'): Promise<StoredUser | null> {
    const response = await this.startPasswordLogin({ mobileNumber, countryCode, password });
    return {
      id: String(response.uid || response.user?.uid),
      uid: String(response.uid || response.user?.uid),
      name: response.user?.name || response.user?.username || 'Pending verification',
      mobileNumber,
      countryCode,
    };
  }

  static async setupTwoFactor(userId: string): Promise<TwoFactorSetupResponse> {
    const setup = await this.setupGoogleAuthenticator(userId);
    return { secret: setup.secret, qrCodeUrl: setup.qrCodeUrl, backupCodes: [] };
  }

  static async verifyAndEnableTwoFactor(userId: string, token: string): Promise<boolean> {
    return this.verifyGoogleAuthenticator(userId, token);
  }
}

export { AuthApi };
