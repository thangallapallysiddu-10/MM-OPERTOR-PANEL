import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Light mode colors
export const lightColors = {
  background: "#F5F5F5",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "#E0E0E0",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textMuted: "#999999",
  primary: "#FF6B8B",
  secondary: "#FFB347",
  accent: "#C084FC",
  success: "#34D399",
  warning: "#F59E0B",
  danger: "#EF4444",
  purple: "#C084FC",
  teal: "#14B8A6",
  gold: "#FBBF24",
};

// Dark mode colors
export const darkColors = {
  background: "#0A0A0F",
  surface: "#1A1A1F",
  card: "#24242C",
  cardBorder: "#2F2F38",
  text: "#FFFFFF",
  textSecondary: "#B0B0C0",
  textMuted: "#9A9AAA",
  primary: "#FF6B8B",
  secondary: "#FFB347",
  accent: "#C084FC",
  success: "#34D399",
  warning: "#F59E0B",
  danger: "#EF4444",
  purple: "#C084FC",
  teal: "#14B8A6",
  gold: "#FBBF24",
};

type ThemeContextType = {
  isDarkMode: boolean;
  colors: typeof darkColors;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // Use system preference as default
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const setDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('theme_preference', value ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    setDarkMode(!isDarkMode);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};