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
import { useAppStore } from './store/useAppStore';

// PHASE 4A: Load developer validation utilities for console testing
import './utils/devValidation';

const Dashboard = lazy(() => import('./pages/Dashboard'));
import RJStudio from './features/rj';
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

const routeMap: Record<string, string> = {
  'Dashboard': '/',
  'RJStudio': '/rj',
  'Podcast': '/podcast',
  'Profile': '/profile',
  'EpisodeManager': '/episodes'
};

const pathMap: Record<string, string> = {
  '/': 'Dashboard',
  '/rj': 'RJStudio',
  '/podcast': 'Podcast',
  '/profile': 'Profile',
  '/episodes': 'EpisodeManager'
};

function AppContent({ onLogout }: { onLogout: () => Promise<void> }) {
  const { dashboardDarkMode } = useAppStore();
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    if (isWeb && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.match(/\/podcast\/guest\//)) {
        if (pathMap[path]) {
          return pathMap[path];
        }
        const saved = localStorage.getItem('currentScreen');
        if (saved && ['Dashboard', 'RJStudio', 'Podcast', 'EpisodeManager', 'Profile'].includes(saved)) {
          return saved;
        }
      }
    }
    return 'Dashboard';
  });
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

  // Sync state changes with localStorage and browser url path
  useEffect(() => {
    if (isWeb) {
      localStorage.setItem('currentScreen', currentScreen);
      const path = window.location.pathname;
      if (!path.match(/\/podcast\/guest\//)) {
        const newPath = routeMap[currentScreen] || '/';
        if (path !== newPath) {
          window.history.pushState({}, '', newPath);
        }
      }
    }
  }, [currentScreen]);

  // Support browser Back/Forward navigation buttons
  useEffect(() => {
    if (isWeb) {
      const handlePopState = () => {
        const path = window.location.pathname;
        if (pathMap[path]) {
          setCurrentScreen(pathMap[path]);
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Check scheduled events time redirect
  useEffect(() => {
    if (!isWeb) return;

    const checkScheduledEvents = () => {
      const saved = localStorage.getItem('scheduledEvents');
      if (!saved) return;

      try {
        const events = JSON.parse(saved);
        const now = new Date();
        let changed = false;

        const updatedEvents = events.map((event: any) => {
          if (event.isActive) {
            const eventTime = new Date(event.date);
            // Check if current time matches or is past the scheduled time
            if (now >= eventTime) {
              // Trigger auto setup and navigation
              localStorage.setItem('autoStartLive', 'true');
              setCurrentScreen('RJStudio');
              event.isActive = false;
              changed = true;
            }
          }
          return event;
        });

        if (changed) {
          localStorage.setItem('scheduledEvents', JSON.stringify(updatedEvents));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {
        console.error('[ScheduledEventsChecker] Error:', e);
      }
    };

    const interval = setInterval(checkScheduledEvents, 2000);
    return () => clearInterval(interval);
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
      case 'RJStudio': return <RJStudio navigation={navigation} />;
      case 'Podcast': 
      case 'EpisodeManager':
        return <Suspense fallback={<View style={styles.centered}><ActivityIndicator size="large" color="#000000" /></View>}><PodcastUpload view={currentScreen === 'EpisodeManager' ? 'manager' : 'studio'} /></Suspense>;

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
    <View style={[styles.desktopContainer, { backgroundColor: dashboardDarkMode ? '#080A10' : '#F8FAFC' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Sidebar - Fixed width on left */}
      <View style={{ width: sidebarWidth, height: '100%', backgroundColor: dashboardDarkMode ? '#080A10' : '#F8FAFC' }}>
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen: string) => setCurrentScreen(screen)}
          onCollapseChange={setIsSidebarCollapsed}
          isDarkMode={dashboardDarkMode}
        />
      </View>
      
      {/* Main Content - Takes ALL remaining space */}
      <ScrollView style={[styles.contentArea, { backgroundColor: dashboardDarkMode ? '#080A10' : '#F8FAFC' }]} contentContainerStyle={{ flexGrow: 1 }}>
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
