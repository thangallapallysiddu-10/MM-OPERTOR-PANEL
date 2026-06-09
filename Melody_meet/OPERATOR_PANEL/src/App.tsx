import "../global.css";
import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  View,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { OperatorProvider } from './context/OperatorContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionTimer } from './components/SessionTimer';
import Sidebar from './components/layout/Sidebar';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RJStudio = lazy(() => import('./features/rj'));
const PodcastUpload = lazy(() => import('./features/podcast/PodcastUpload'));

const Profile = lazy(() => import('./pages/Profile'));
const GuestJoinPage = lazy(() => import('./pages/GuestJoinPage'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
import { LogBox } from 'react-native';

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
  const [pageState, setPageState] = useState<'host' | 'guest_slot' | 'invalid'>('host');

  // Guest slot state — parsed from /podcast/guest/:slotId/:roomId
  const [guestSlotId, setGuestSlotId] = useState<string>('');
  const [guestSlotRoomId, setGuestSlotRoomId] = useState<string>('');

  useEffect(() => {
    if (isWeb) {
      const path = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);

      // New slot join URL: /podcast/guest/:slotId/:roomId
      const slotMatch = path.match(/\/podcast\/guest\/([^/]+)\/([^/]+)/);
      if (slotMatch) {
        setGuestSlotId(slotMatch[1]);
        setGuestSlotRoomId(slotMatch[2]);
        setPageState('guest_slot');
        return;
      }

      // Legacy ?roomId= listener links are no longer supported — use /podcast/guest/:slotId/:roomId
      const roomId = urlParams.get('roomId');
      if (roomId && roomId.trim() !== '') {
        setPageState('invalid');
      }
    }
  }, []);

  // ── Guest slot join page (no auth required) ────────────────────────────────
  if (pageState === 'guest_slot') {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#4F6AF0" /></View>}>
          <GuestJoinPage
            slotId={guestSlotId}
            roomId={guestSlotRoomId}
            onLeave={() => {
              if (isWeb) {
                document.body.innerHTML = `<!DOCTYPE html><html><head><title>Thank You</title><style>body{background:#0F172A;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;margin:0}.c{text-align:center}.e{font-size:64px;margin-bottom:16px}h1{color:white;font-size:24px}p{color:#94A3B8;font-size:14px}</style></head><body><div class="c"><div class="e">👋</div><h1>Thanks for joining!</h1><p>You've left the podcast slot.</p></div></body></html>`;
              }
            }}
          />
        </Suspense>
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
      case 'Dashboard': return <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}><Dashboard navigation={navigation} /></Suspense>;
      case 'RJStudio': return <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}><RJStudio navigation={navigation} /></Suspense>;
      case 'Podcast': return <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}><PodcastUpload /></Suspense>;

      case 'Profile': return <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}><Profile navigation={navigation} /></Suspense>;
      default: return <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}><Dashboard navigation={navigation} /></Suspense>;
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
  const { isAuthenticated, isLoading, reloadSession, logout, user } = useAuth();
  const [currentAuthScreen, setCurrentAuthScreen] = useState<'login' | 'signup'>('login');

  const legacyRoomId =
    isWeb && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('roomId') || undefined
      : undefined;

  // Guest slot join: /podcast/guest/:slotId/:roomId — no auth needed
  const guestSlotMatch =
    isWeb && typeof window !== 'undefined'
      ? window.location.pathname.match(/\/podcast\/guest\/([^/]+)\/([^/]+)/)
      : null;

  if (guestSlotMatch) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#4F6AF0" /></View>}>
          <GuestJoinPage
            slotId={guestSlotMatch[1]}
            roomId={guestSlotMatch[2]}
            onLeave={() => {
              if (isWeb && typeof window !== 'undefined') {
                document.body.innerHTML = `<!DOCTYPE html><html><head><title>Thank You</title><style>body{background:#0F172A;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;margin:0}.c{text-align:center}.e{font-size:64px;margin-bottom:16px}h1{color:white;font-size:24px}p{color:#94A3B8;font-size:14px}</style></head><body><div class="c"><div class="e">👋</div><h1>Thanks for joining!</h1><p>You've left the podcast slot.</p></div></body></html>`;
              }
            }}
          />
        </Suspense>
      </SafeAreaView>
    );
  }

  const handleLoginSuccess = async () => {
    await reloadSession();
  };

  const handleLogout = async () => {
    await logout();
  };

  if (legacyRoomId) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <InvalidRoomPage />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <AppContent onLogout={handleLogout} />;
  }

  if (currentAuthScreen === 'login') {
    return (
      <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}>
        <Login
          onSwitchToSignup={() => setCurrentAuthScreen('signup')}
          onLoginSuccess={handleLoginSuccess}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}>
      <Signup
        onSwitchToLogin={() => setCurrentAuthScreen('login')}
      />
    </Suspense>
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
    '[expo-av]: Expo AV has been deprecated',
    'props.pointerEvents is deprecated',
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
