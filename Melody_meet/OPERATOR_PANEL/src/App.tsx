import "../global.css";
import React, { useState, useEffect } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { OperatorProvider } from './context/OperatorContext';
import { AuthProvider } from './context/AuthContext';
import { SessionTimer } from './components/SessionTimer';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import RJStudio from './features/rj';
import PodcastUpload from './features/podcast/PodcastUpload';

import Profile from './pages/Profile';
import GuestRoom from './pages/GuestRoom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { LogBox } from 'react-native';
import { StorageService } from './services/storageService';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';

// Add global styles for web
if (isWeb) {
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    input:focus, textarea:focus, select:focus {
      outline: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

const InvalidRoomPage = () => (
  <View style={styles.fullScreen}>
    <Text style={styles.emoji}>🔗</Text>
    <Text style={styles.invalidTitle}>Invalid Room Link</Text>
    <Text style={styles.invalidText}>This is a guest-only page. Please use a valid room link to join a podcast.</Text>
    <Text style={styles.invalidSubText}>Make sure your link contains a room ID</Text>
  </View>
);

function AppContent({ onLogout }: { onLogout: () => Promise<void> }) {
  const [currentScreen, setCurrentScreen] = useState<string>('Dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [guestRoomId, setGuestRoomId] = useState<string | undefined>(undefined);
  const [pageState, setPageState] = useState<'host' | 'guest' | 'invalid'>('host');

  const guestNavigation = {
    goBack: () => {
      if (isWeb) {
        document.body.innerHTML = `<!DOCTYPE html><html><head><title>Thank You</title><style>body{background:black;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;margin:0}.container{text-align:center}.emoji{font-size:80px;animation:bounce 1s infinite}h1{color:white}p{color:rgba(255,255,255,0.9)}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}</style></head><body><div class="container"><div class="emoji">👋</div><h1>Thank You for Listening!</h1><p>You have successfully left the podcast room.</p></div></body></html>`;
      } else {
        Alert.alert('Thank You!', "You've left the podcast room.");
      }
    },
    navigate: () => {},
    getCurrentScreen: () => 'GuestRoom',
    logout: onLogout,
  };

  useEffect(() => {
    if (isWeb) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('roomId');
      if (roomId && roomId.trim() !== '') {
        setGuestRoomId(roomId);
        setPageState('guest');
      }
    }
  }, []);

  if (pageState === 'guest' && guestRoomId) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <GuestRoom route={{ params: { roomId: guestRoomId } }} navigation={guestNavigation} />
      </SafeAreaView>
    );
  }

  if (pageState === 'invalid') {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <InvalidRoomPage />
      </SafeAreaView>
    );
  }

  const navigation = {
    navigate: (screen: string) => setCurrentScreen(screen),
    goBack: () => {},
    getCurrentScreen: () => currentScreen,
    logout: onLogout,
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard': return <Dashboard navigation={navigation} />;
      case 'RJStudio': return <RJStudio navigation={navigation} />;
      case 'Podcast': return <PodcastUpload />;

      case 'Profile': return <Profile navigation={navigation} />;
      default: return <Dashboard navigation={navigation} />;
    }
  };

  const sidebarWidth = isSidebarCollapsed ? 70 : 220;

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <View style={styles.fullScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.fullScreen}>
          {renderScreen()}
        </View>
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen: string) => setCurrentScreen(screen)}
          onCollapseChange={setIsSidebarCollapsed}
        />
        <SessionTimer />
      </View>
    );
  }

  // DESKTOP/WEB LAYOUT
  return (
    <View style={styles.desktopContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Sidebar - Fixed width on left */}
      <View style={{ width: sidebarWidth, height: '100%' }}>
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen: string) => setCurrentScreen(screen)}
          onCollapseChange={setIsSidebarCollapsed}
        />
      </View>
      
      {/* Main Content - Takes ALL remaining space */}
      <ScrollView style={styles.contentArea} contentContainerStyle={{ flexGrow: 1 }}>
        {renderScreen()}
        <SessionTimer />
      </ScrollView>
    </View>
  );
}

function AuthWrapper() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAuthScreen, setCurrentAuthScreen] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const guestRoomId =
    isWeb && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('roomId') || undefined
      : undefined;

  const guestNavigation = {
    goBack: () => {
      if (isWeb && typeof window !== 'undefined') {
        window.location.href = window.location.origin;
      } else {
        Alert.alert('Thank You!', "You've left the podcast room.");
      }
    },
    navigate: () => {},
    getCurrentScreen: () => 'GuestRoom',
    logout: async () => {},
  };

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await StorageService.isLoggedIn();
      const user = await StorageService.getUser();

      if (auth && user) {
        console.log('✅ Valid session found');
        setIsLoggedIn(true);
      } else {
        await StorageService.clearAll();
        setIsLoggedIn(false);
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    console.log('✅ Login success! Setting isLoggedIn to true');
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await StorageService.clearAll();
    setIsLoggedIn(false);
    console.log('✅ Logged out, returning to login screen');
  };

  if (loading) {
    if (guestRoomId) {
      return (
        <SafeAreaView style={styles.fullScreen}>
          <GuestRoom route={{ params: { roomId: guestRoomId } }} navigation={guestNavigation} />
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (guestRoomId) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <GuestRoom route={{ params: { roomId: guestRoomId } }} navigation={guestNavigation} />
      </SafeAreaView>
    );
  }

  if (isLoggedIn) {
    return <AppContent onLogout={handleLogout} />;
  }

  if (currentAuthScreen === 'login') {
    return (
      <Login 
        onSwitchToSignup={() => setCurrentAuthScreen('signup')} 
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <Signup 
      onSwitchToLogin={() => setCurrentAuthScreen('login')} 
    />
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#000000',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
    textAlign: 'center',
  },
  invalidTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  invalidText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 4,
  },
  invalidSubText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#999999',
  },
});

export default function App() {
  LogBox.ignoreLogs([
    'expo-av has been deprecated',
    'VirtualizedLists should never be nested',
  ]);

  return (
    <AuthProvider>
      <OperatorProvider>
        <AuthWrapper />
      </OperatorProvider>
    </AuthProvider>
  );
}
