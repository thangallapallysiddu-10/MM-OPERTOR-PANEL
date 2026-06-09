// Dashboard.tsx - Updated to use Zustand store
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Switch, Alert, Platform, TextInput, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useOperator } from '../context/OperatorContext';
import { useStream } from '../hooks/useStream';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storageService';
import { useAppStore } from '../store/useAppStore';
import { AnalyticsApi, PodcastApi } from '../services/api/operatorApi';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isWeb = Platform.OS === 'web';

interface DashboardProps {
  navigation: any;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  light: {
    bg:          '#F8FAFC',
    card:        '#FFFFFF',
    border:      '#E2E8F0',
    text:        '#0F172A',
    textSec:     '#475569',
    textMuted:   '#94A3B8',
    inputBg:     '#F1F5F9',
    pillBg:      '#F1F5F9',
    primaryBg:   '#4F6AF0',
    primaryText: '#FFFFFF',
    successBg:   '#059669',
    dangerBg:    '#DC2626',
    badgeBg:     '#EEF2FF',
    badgeText:   '#4F6AF0',
    offlineBg:   '#F1F5F9',
  },
  dark: {
    bg:          '#0F172A',
    card:        '#1E293B',
    border:      '#334155',
    text:        '#F1F5F9',
    textSec:     '#94A3B8',
    textMuted:   '#64748B',
    inputBg:     '#263347',
    pillBg:      '#263347',
    primaryBg:   '#4F6AF0',
    primaryText: '#FFFFFF',
    successBg:   '#059669',
    dangerBg:    '#DC2626',
    badgeBg:     '#1E3A8A',
    badgeText:   '#6B8EFF',
    offlineBg:   '#1E293B',
  },
};

const Dashboard: React.FC<DashboardProps> = ({ navigation }) => {
  const {
    dashboardDarkMode,
    dashboardNotificationsEnabled,
    dashboardStreamQuality,
    dashboardNotifications,
    dashboardSearchQuery,
    setDashboardDarkMode,
    setDashboardNotificationsEnabled,
    setDashboardStreamQuality,
    setDashboardSearchQuery,
    addDashboardNotification,
    markDashboardNotificationRead,
    markAllDashboardNotificationsRead,
  } = useAppStore();

  const { isLive, listeners, toggleLive, currentTrack, activeChannel } = useOperator();
  const { bufferHealth, getQualityText } = useStream();
  const { logout, user } = useAuth();

  const [localListeners, setLocalListeners] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [analyticsStats, setAnalyticsStats] = useState<any>(null);
  const [realPodcasts, setRealPodcasts] = useState<any[]>([]);

  const darkMode = dashboardDarkMode;
  const c = darkMode ? T.dark : T.light;
  const unreadCount = dashboardNotifications.filter(n => !n.read).length;

  const mockPodcasts = [
    { id: 1, name: 'Morning Beats', host: 'DJ Maverick', listeners: 234, time: '10 min ago', duration: '45 min', episodes: 24 },
    { id: 2, name: 'Evening Chill', host: 'RTPI', listeners: 156, time: '25 min ago', duration: '60 min', episodes: 18 },
    { id: 3, name: 'Night Vibes', host: 'Kygo', listeners: 89, time: '1 hour ago', duration: '50 min', episodes: 32 },
  ];

  const allPodcasts = realPodcasts.length > 0
    ? realPodcasts.map((p: any) => ({
        id: p.id,
        name: p.title,
        host: p.host || 'Unknown',
        listeners: analyticsStats?.streams?.totalViewers || 0,
        time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recently',
        duration: p.duration || 'N/A',
        episodes: 1,
      }))
    : mockPodcasts;

  const podcasts = allPodcasts.filter((podcast: any) =>
    dashboardSearchQuery === '' ||
    podcast.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
    podcast.host.toLowerCase().includes(dashboardSearchQuery.toLowerCase())
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLive) {
      interval = setInterval(() => {
        setLocalListeners(prev => prev + Math.floor(Math.random() * 5) + 1);
      }, 4000);
    } else {
      setLocalListeners(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stats = await AnalyticsApi.getDashboard();
        setAnalyticsStats(stats);
      } catch { }
      try {
        const pods = await PodcastApi.getAll();
        if (pods.length > 0) setRealPodcasts(pods);
      } catch { }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    if (isWeb) {
      if (window.confirm('Are you sure you want to logout?')) {
        await StorageService.clearAll();
        await logout();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAll();
            await logout();
            if (navigation?.logout) navigation.logout();
          }
        },
      ]);
    }
  };

  const handleGoLive = () => {
    toggleLive();
    setShowGoLiveModal(false);
    addDashboardNotification({
      title: isLive ? "Broadcast Ended" : "Live Stream Started",
      message: isLive ? "Your broadcast has ended" : "You started a live stream on Channel 1",
      time: "Just now",
      read: false,
    });
  };

  const handleHelpSupport = () => {
    const message = 'Contact support at support@melodymeet.com\n\nOr visit our website: www.melodymeet.com';
    if (isWeb) {
      window.alert(message);
    } else {
      Alert.alert('Help & Support', message);
    }
  };

  const currentSong = currentTrack?.title || 'STARGAZING';
  const currentArtist = currentTrack?.artist || 'Kygo';
  const channel = activeChannel || 1;
  const displayListeners = listeners > 0 ? listeners : localListeners;
  const peakListeners = analyticsStats?.streams?.totalViewers || 2800;
  const totalPodcasts = analyticsStats?.podcasts?.total || 0;
  const userName = user?.name || 'Operator';
  const userEmail = user?.email || 'operator@melodymeet.com';
  const userAvatar = userName?.charAt(0).toUpperCase() || 'O';
  const qualityOptions = ['Auto', 'Low', 'Medium', 'High', 'Lossless'];

  // ─── Stat card ─────────────────────────────────────────────────────────────
  const StatCard = ({ icon, value, label, iconColor, badgeText, badgePositive }: {
    icon: string; value: string | number; label: string;
    iconColor: string; badgeText: string; badgePositive?: boolean;
  }) => (
    <View style={{
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: darkMode ? 0.2 : 0.04,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <View style={{
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: iconColor + '18',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
      }}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{label}</Text>
      <View style={{
        backgroundColor: badgePositive !== false ? '#ECFDF5' : '#FEF2F2',
        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 6,
      }}>
        <Text style={{
          fontSize: 10, fontWeight: '600',
          color: badgePositive !== false ? '#059669' : '#DC2626',
        }}>{badgeText}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 44 : 12, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: isMobile ? 120 : 40 }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5 }}>Dashboard</Text>
            <View style={{ width: 28, height: 3, backgroundColor: '#4F6AF0', borderRadius: 2, marginTop: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="settings" size={17} color={c.textSec} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="bell" size={17} color={c.textSec} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: -2, right: -2,
                  backgroundColor: '#4F6AF0', borderRadius: 8,
                  minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="user" size={17} color={c.textSec} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="log-out" size={17} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stat Cards ────────────────────────────────────────────────── */}
        {isMobile ? (
          <View style={{ marginBottom: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard icon="headphones" value={displayListeners} label="Listeners" iconColor="#4F6AF0" badgeText="+12%" badgePositive />
              <StatCard icon="trending-up" value={peakListeners.toLocaleString()} label="Peak" iconColor="#059669" badgeText="+8%" badgePositive />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard icon="clock" value="45m" label="Avg Time" iconColor="#D97706" badgeText="-3%" badgePositive={false} />
              <StatCard icon="heart" value="91%" label="Engagement" iconColor="#7C3AED" badgeText="+5%" badgePositive />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard icon="headphones" value={displayListeners} label="Listeners" iconColor="#4F6AF0" badgeText="+12%" badgePositive />
            <StatCard icon="trending-up" value={peakListeners.toLocaleString()} label="Peak" iconColor="#059669" badgeText="+8%" badgePositive />
            <StatCard icon="clock" value="45m" label="Avg Time" iconColor="#D97706" badgeText="-3%" badgePositive={false} />
            <StatCard icon="heart" value="91%" label="Engagement" iconColor="#7C3AED" badgeText="+5%" badgePositive />
          </View>
        )}

        {/* ── Status Card ───────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 14,
          borderWidth: 1, borderColor: c.border,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: darkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Stream Status
          </Text>
          {[
            { label: 'Channel Status', value: isLive ? 'Live' : 'Offline', valueColor: isLive ? '#059669' : c.textMuted },
            { label: 'Listeners',      value: isLive ? String(displayListeners) : '0' },
            { label: 'Stream Health',  value: isLive ? getQualityText() : 'Offline' },
          ].map((row, i, arr) => (
            <View key={row.label} style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0,
              borderBottomColor: c.border,
            }}>
              <Text style={{ fontSize: 13, color: c.textSec }}>{row.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: row.valueColor ?? c.text }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Action Buttons ────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setShowGoLiveModal(true)}
            style={{
              flex: 1, paddingVertical: 13, borderRadius: 12,
              backgroundColor: isLive ? '#DC2626' : '#4F6AF0',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
              shadowColor: isLive ? '#DC2626' : '#4F6AF0',
              shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
            }}
          >
            <Feather name={isLive ? 'square' : 'radio'} size={15} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
              {isLive ? 'End Live' : 'Go Live'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Podcast')}
            style={{
              flex: 1, paddingVertical: 13, borderRadius: 12,
              backgroundColor: c.card,
              borderWidth: 1, borderColor: c.border,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
            }}
          >
            <Feather name="calendar" size={15} color={c.textSec} />
            <Text style={{ color: c.textSec, fontWeight: '600', fontSize: 14 }}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* ── Live Content ──────────────────────────────────────────────── */}
        {isLive && (
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
            {/* Now Playing */}
            <View style={{ flex: 1 }}>
              {/* Search */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: c.inputBg, borderRadius: 10,
                paddingHorizontal: 12, marginBottom: 12, height: 42,
                borderWidth: 1, borderColor: c.border,
              }}>
                <Feather name="search" size={15} color={c.textMuted} />
                <TextInput
                  placeholder="Search podcasts..."
                  placeholderTextColor={c.textMuted}
                  value={dashboardSearchQuery}
                  onChangeText={setDashboardSearchQuery}
                  style={{ flex: 1, paddingHorizontal: 10, fontSize: 13, color: c.text }}
                />
              </View>

              <View style={{
                backgroundColor: c.card, borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: c.border,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: darkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Now Playing
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626' }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626', letterSpacing: 1 }}>LIVE</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}>{currentSong}</Text>
                <Text style={{ fontSize: 13, color: c.textSec, marginTop: 2, marginBottom: 12 }}>{currentArtist}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: c.pillBg }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSec }}>CH{channel}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: c.pillBg }}>
                    <Feather name="headphones" size={11} color={c.textSec} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSec }}>{displayListeners}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => navigation.navigate('RJStudio')}
                  style={{
                    alignItems: 'center', paddingVertical: 10, borderRadius: 10,
                    backgroundColor: '#4F6AF0',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Enter Studio →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Podcast list */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>Latest Podcasts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Podcast')}>
                  <Text style={{ fontSize: 12, color: '#4F6AF0', fontWeight: '500' }}>View All →</Text>
                </TouchableOpacity>
              </View>
              {podcasts.map((podcast: any) => (
                <TouchableOpacity
                  key={podcast.id}
                  onPress={() => navigation.navigate('Podcast')}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: c.card, borderRadius: 12, padding: 12, marginBottom: 8,
                    borderWidth: 1, borderColor: c.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{podcast.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textSec, marginTop: 1 }}>{podcast.host}</Text>
                    <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>{podcast.duration} · {podcast.episodes} eps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{podcast.listeners}</Text>
                    <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 1 }}>{podcast.time}</Text>
                    <Text style={{ fontSize: 10, color: '#4F6AF0', marginTop: 3, fontWeight: '500' }}>Listen →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Offline State ─────────────────────────────────────────────── */}
        {!isLive && (
          <View style={{
            backgroundColor: c.card, borderRadius: 16, padding: 40,
            alignItems: 'center', borderWidth: 1, borderColor: c.border, gap: 10,
          }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.offlineBg, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="mic-off" size={28} color={c.textMuted} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginTop: 4 }}>No active broadcast</Text>
            <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center' }}>
              Tap 'Go Live' to start streaming and view your content
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Profile Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 20, width: '85%', maxWidth: 320 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}
                style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="x" size={16} color={c.textSec} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF',
                justifyContent: 'center', alignItems: 'center', marginBottom: 10,
              }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#4F6AF0' }}>{userAvatar}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>{userName}</Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{userEmail}</Text>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
              {[
                { icon: 'mic', label: 'RJ Studio', screen: 'RJStudio' },
                { icon: 'headphones', label: 'Podcast Host', screen: 'Podcast' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  onPress={() => { setShowProfileModal(false); navigation.navigate(item.screen); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}
                >
                  <Feather name={item.icon as any} size={17} color={c.textSec} />
                  <Text style={{ fontSize: 14, color: c.text }}>{item.label}</Text>
                  <Feather name="chevron-right" size={14} color={c.textMuted} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Notifications Modal ───────────────────────────────────────────── */}
      <Modal visible={showNotifications} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, width: '85%', maxWidth: 340, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Notifications</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllDashboardNotificationsRead}>
                    <Text style={{ fontSize: 12, color: '#4F6AF0', fontWeight: '500' }}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}
                  style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}>
                  <Feather name="x" size={14} color={c.textSec} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {dashboardNotifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => markDashboardNotificationRead(notif.id)}
                  style={{
                    padding: 10, borderRadius: 10, marginBottom: 6,
                    backgroundColor: !notif.read ? (darkMode ? '#1E3A8A18' : '#EEF2FF') : 'transparent',
                    borderWidth: 1, borderColor: !notif.read ? '#4F6AF020' : c.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: c.text }}>{notif.title}</Text>
                      <Text style={{ fontSize: 11, color: c.textSec, marginTop: 2 }}>{notif.message}</Text>
                      <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>{notif.time}</Text>
                    </View>
                    {!notif.read && (
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4F6AF0', marginTop: 4 }} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Settings Modal ────────────────────────────────────────────────── */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, width: '85%', maxWidth: 320 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}
                style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="x" size={14} color={c.textSec} />
              </TouchableOpacity>
            </View>

            {/* Dark Mode */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="moon" size={16} color={c.textSec} />
                <Text style={{ fontSize: 14, color: c.text }}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDashboardDarkMode}
                trackColor={{ false: '#E2E8F0', true: '#4F6AF0' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Notifications */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="bell" size={16} color={c.textSec} />
                <Text style={{ fontSize: 14, color: c.text }}>Push Notifications</Text>
              </View>
              <Switch
                value={dashboardNotificationsEnabled}
                onValueChange={setDashboardNotificationsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#059669' }}
                thumbColor="#FFF"
              />
            </View>

            {/* Stream Quality */}
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => setShowQualityOptions(!showQualityOptions)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="cpu" size={16} color={c.textSec} />
                  <Text style={{ fontSize: 14, color: c.text }}>Stream Quality</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, color: c.textMuted }}>{dashboardStreamQuality}</Text>
                  <Feather name={showQualityOptions ? 'chevron-up' : 'chevron-down'} size={13} color={c.textMuted} />
                </View>
              </TouchableOpacity>
              {showQualityOptions && (
                <View style={{ marginTop: 8, paddingLeft: 26, gap: 2 }}>
                  {qualityOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setDashboardStreamQuality(opt); setShowQualityOptions(false); }}
                      style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: opt === dashboardStreamQuality ? '#EEF2FF' : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, color: opt === dashboardStreamQuality ? '#4F6AF0' : c.textSec, fontWeight: opt === dashboardStreamQuality ? '600' : '400' }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Help */}
            <TouchableOpacity
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}
              onPress={handleHelpSupport}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="help-circle" size={16} color={c.textSec} />
                <Text style={{ fontSize: 14, color: c.text }}>Help & Support</Text>
              </View>
              <Feather name="chevron-right" size={13} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Go Live Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showGoLiveModal && !isLive} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 20, width: '85%', maxWidth: 320 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 }}>
              <Feather name="radio" size={24} color="#4F6AF0" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', textAlign: 'center', color: c.text, marginBottom: 6 }}>Start Broadcasting</Text>
            <Text style={{ fontSize: 13, textAlign: 'center', color: c.textMuted, marginBottom: 20 }}>
              Start your live broadcast and connect with your audience!
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowGoLiveModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: c.textSec, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGoLive}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4F6AF0', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '700' }}>Go Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── End Live Modal ────────────────────────────────────────────────── */}
      <Modal visible={showGoLiveModal && isLive} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 20, width: '85%', maxWidth: 320 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 }}>
              <Feather name="square" size={22} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', textAlign: 'center', color: c.text, marginBottom: 6 }}>End Broadcast?</Text>
            <Text style={{ fontSize: 13, textAlign: 'center', color: c.textMuted, marginBottom: 20 }}>
              Are you sure you want to end your live broadcast?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowGoLiveModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: c.textSec, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGoLive}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '700' }}>End Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Dashboard;
