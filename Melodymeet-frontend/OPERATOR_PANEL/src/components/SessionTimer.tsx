import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const SESSION_TIMEOUT = 30 * 60 * 1000;

export const SessionTimer: React.FC = () => {
  const { logout, updateLastActivity } = useAuth();
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

  const resetTimer = async () => {
    await updateLastActivity();
    
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    
    inactivityTimer.current = setTimeout(async () => {
      Alert.alert(
        'Session Expired',
        'Your session has expired due to inactivity. Please login again.',
        [{ text: 'OK', onPress: logout }]
      );
    }, SESSION_TIMEOUT);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    resetTimer();

    return () => {
      subscription.remove();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      resetTimer();
    }
    appState.current = nextAppState;
  };

  return null;
};