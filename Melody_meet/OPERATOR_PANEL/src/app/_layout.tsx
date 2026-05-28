import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { OperatorProvider } from '../context/OperatorContext';
import { UserProvider } from '../context/UserContext';
import { AudioProvider } from '../context/AudioContext';
import MainLayout from '../components/layout/MainLayout';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-black">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <MainLayout 
      currentScreen="Dashboard"
      navigation={router}
      isDarkMode={false}
    >
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </MainLayout>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OperatorProvider>
        <UserProvider>
          <AudioProvider>
            <RootLayoutNav />
          </AudioProvider>
        </UserProvider>
      </OperatorProvider>
    </AuthProvider>
  );
}