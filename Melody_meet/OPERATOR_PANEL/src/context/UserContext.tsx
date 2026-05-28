import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  name: string;
  role: 'RJ' | 'Podcast Host' | 'Listener';
  avatar: string;
  avatarImage?: string;
  followers: number;
  isBanned: boolean;
  reports: number;
  joinDate?: string;
  bio?: string;
  email?: string;
  location?: string;
}

interface UserContextType {
  currentUser: User;
  updateUserProfile: (updatedData: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = '@user_profile';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 0,
    name: 'Mamatha',
    role: 'RJ',
    avatar: 'MA',
    followers: 12500,
    isBanned: false,
    reports: 0,
    joinDate: '2024-01-15',
    bio: 'Passionate RJ and music lover. Bringing you the best vibes every day! 🎧✨',
    email: 'mamatha@melodymeet.com',
    location: 'Hyderabad, India',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user data on app start
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updatedData: Partial<User>) => {
    try {
      const updatedUser = { ...currentUser, ...updatedData };
      setCurrentUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      Alert.alert('✅ Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save user data:', error);
      Alert.alert('❌ Error', 'Failed to save profile changes');
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, updateUserProfile, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};