import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: '@operator_user',
  LAST_ACTIVITY: '@last_activity',
  SESSION_TOKEN: '@session_token',
  TWO_FACTOR_SECRET: '@two_factor_secret',
  BACKUP_CODES: '@backup_codes',
  LOGGED_IN: '@logged_in',
  TEMP_USER_ID: '@temp_user_id',
  TEMP_MOBILE: '@temp_mobile',
} as const;

// Helper to handle web vs mobile storage
const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
};

const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await AsyncStorage.getItem(key);
  }
};

const removeItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
};

const multiRemove = async (keys: string[]): Promise<void> => {
  if (Platform.OS === 'web') {
    keys.forEach(key => localStorage.removeItem(key));
  } else {
    await AsyncStorage.multiRemove(keys);
  }
};

export class StorageService {
  static async saveUser(user: any): Promise<void> {
    try {
      const userJson = JSON.stringify(user);
      await setItem(STORAGE_KEYS.USER, userJson);
      await setItem(STORAGE_KEYS.LOGGED_IN, 'true');
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  }

  static async getUser(): Promise<any | null> {
    try {
      const user = await getItem(STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  static async removeUser(): Promise<void> {
    try {
      await removeItem(STORAGE_KEYS.USER);
      await removeItem(STORAGE_KEYS.LOGGED_IN);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  static async isLoggedIn(): Promise<boolean> {
    try {
      const loggedIn = await getItem(STORAGE_KEYS.LOGGED_IN);
      return loggedIn === 'true';
    } catch (error) {
      return false;
    }
  }

  static async updateLastActivity(): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      await setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp);
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  static async getLastActivity(): Promise<number | null> {
    try {
      const activity = await getItem(STORAGE_KEYS.LAST_ACTIVITY);
      return activity ? parseInt(activity, 10) : null;
    } catch (error) {
      return null;
    }
  }

  static async saveSessionToken(token: string): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.SESSION_TOKEN, token);
    } catch (error) {
      console.error('Failed to save session token:', error);
    }
  }

  static async getSessionToken(): Promise<string | null> {
    try {
      return await getItem(STORAGE_KEYS.SESSION_TOKEN);
    } catch (error) {
      return null;
    }
  }

  static async saveTwoFactorSecret(secret: string): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.TWO_FACTOR_SECRET, secret);
    } catch (error) {
      console.error('Failed to save 2FA secret:', error);
    }
  }

  static async getTwoFactorSecret(): Promise<string | null> {
    try {
      return await getItem(STORAGE_KEYS.TWO_FACTOR_SECRET);
    } catch (error) {
      return null;
    }
  }

  static async saveBackupCodes(codes: string[]): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.BACKUP_CODES, JSON.stringify(codes));
    } catch (error) {
      console.error('Failed to save backup codes:', error);
    }
  }

  static async getBackupCodes(): Promise<string[] | null> {
    try {
      const codes = await getItem(STORAGE_KEYS.BACKUP_CODES);
      return codes ? JSON.parse(codes) : null;
    } catch (error) {
      return null;
    }
  }

  // For OTP flow - save temp data
  static async saveTempUserId(userId: string): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.TEMP_USER_ID, userId);
    } catch (error) {
      console.error('Failed to save temp user ID:', error);
    }
  }

  static async getTempUserId(): Promise<string | null> {
    try {
      return await getItem(STORAGE_KEYS.TEMP_USER_ID);
    } catch (error) {
      return null;
    }
  }

  static async saveTempMobile(mobile: string): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.TEMP_MOBILE, mobile);
    } catch (error) {
      console.error('Failed to save temp mobile:', error);
    }
  }

  static async getTempMobile(): Promise<string | null> {
    try {
      return await getItem(STORAGE_KEYS.TEMP_MOBILE);
    } catch (error) {
      return null;
    }
  }

  static async clearTempData(): Promise<void> {
    try {
      await removeItem(STORAGE_KEYS.TEMP_USER_ID);
      await removeItem(STORAGE_KEYS.TEMP_MOBILE);
    } catch (error) {
      console.error('Failed to clear temp data:', error);
    }
  }

  // ✅ NEW METHODS FOR CUSTOM ITEMS (OTP storage)
  static async getCustomItem(key: string): Promise<string | null> {
    try {
      return await getItem(key);
    } catch (error) {
      console.error('Failed to get custom item:', error);
      return null;
    }
  }

  static async setCustomItem(key: string, value: string): Promise<void> {
    try {
      await setItem(key, value);
    } catch (error) {
      console.error('Failed to set custom item:', error);
    }
  }

  static async removeCustomItem(key: string): Promise<void> {
    try {
      await removeItem(key);
    } catch (error) {
      console.error('Failed to remove custom item:', error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await multiRemove([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.LAST_ACTIVITY,
        STORAGE_KEYS.SESSION_TOKEN,
        STORAGE_KEYS.TWO_FACTOR_SECRET,
        STORAGE_KEYS.BACKUP_CODES,
        STORAGE_KEYS.LOGGED_IN,
        STORAGE_KEYS.TEMP_USER_ID,
        STORAGE_KEYS.TEMP_MOBILE,
      ]);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  static async isSessionValid(): Promise<boolean> {
    try {
      const lastActivity = await this.getLastActivity();
      if (!lastActivity) return false;
      
      const SESSION_TIMEOUT = 30 * 60 * 1000;
      return Date.now() - lastActivity < SESSION_TIMEOUT;
    } catch (error) {
      return false;
    }
  }
}