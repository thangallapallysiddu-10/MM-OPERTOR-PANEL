// Dashboard.tsx - Real metrics only (no recent podcasts)
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Switch, Alert, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useOperator } from '../context/OperatorContext';
import { StorageService } from '../services/storageService';
import { useAppStore } from '../store/useAppStore';
import { PodcastApi } from '../services/api/operatorApi';

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
    setDashboardDarkMode,
    setDashboardNotificationsEnabled,
    setDashboardStreamQuality,
    markDashboardNotificationRead,
    markAllDashboardNotificationsRead,
  } = useAppStore();

  const { logout, user } = useAuth();
  const { stats, listeners } = useOperator();

  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  
  // Podcast metrics
  const [totalPodcasts, setTotalPodcasts] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [totalPodcastListeners, setTotalPodcastListeners] = useState(0);
  const [loading, setLoading] = useState(true);

  const darkMode = dashboardDarkMode;
  const c = darkMode ? T.dark : T.light;
  const unreadCount = dashboardNotifications.filter(n => !n.read).length;

  // Fetch real podcast metrics from API
  useEffect(() => {
    const fetchPodcastMetrics = async () => {
      setLoading(true);
      try {
        const podcasts = await PodcastApi.getAll();
        const podcastsList = podcasts || [];
        
        setTotalPodcasts(podcastsList.length);
        
        // Calculate total episodes and listeners
        let episodes = 0;
        let listenersCount = 0;
        podcastsList.forEach((p: any) => {
          episodes += p.episodes?.length || 0;
          listenersCount += p.listeners || 0;
        });
        setTotalEpisodes(episodes);
        setTotalPodcastListeners(listenersCount);
      } catch (error) {
        console.log('Failed to fetch podcast metrics:', error);
      }
      setLoading(false);
    };
    fetchPodcastMetrics();
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

  const handleHelpSupport = () => {
    const message = 'Contact support at support@melodymeet.com\n\nOr visit our website: www.melodymeet.com';
    if (isWeb) {
      window.alert(message);
    } else {
      Alert.alert('Help & Support', message);
    }
  };

  const userName = user?.name || 'Operator';
  const userEmail = user?.email || 'operator@melodymeet.com';
  const userAvatar = userName?.charAt(0).toUpperCase() || 'O';
  const qualityOptions = ['Auto', 'Low', 'Medium', 'High', 'Lossless'];

  // RJ metrics from useOperator
  const rjListeners = listeners || 0;
  const rjLikes = stats?.likes || 0;
  const rjFollowers = stats?.followers || 0;
  const rjShares = stats?.shares || 0;
  const rjSubscribers = stats?.subscribers || 0;

  // Format number helper
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // ─── Metric Card ─────────────────────────────────────────────────────────────
  const MetricCard = ({ icon, value, label, iconColor }: {
    icon: string; value: string | number; label: string;
    iconColor: string;
  }) => (
    <View style={{
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
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

        {/* ── RJ Metrics Section ───────────────────────────────────────── */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 12 }}>RJ Metrics</Text>
        {isMobile ? (
          <View style={{ marginBottom: 24, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <MetricCard icon="headphones" value={formatNumber(rjListeners)} label="Listeners" iconColor="#4F6AF0" />
              <MetricCard icon="heart" value={formatNumber(rjLikes)} label="Likes" iconColor="#EC4899" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <MetricCard icon="users" value={formatNumber(rjFollowers)} label="Followers" iconColor="#10B981" />
              <MetricCard icon="share-2" value={formatNumber(rjShares)} label="Shares" iconColor="#F59E0B" />
            </View>
            <MetricCard icon="user-plus" value={formatNumber(rjSubscribers)} label="Subscribers" iconColor="#8B5CF6" />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <MetricCard icon="headphones" value={formatNumber(rjListeners)} label="Listeners" iconColor="#4F6AF0" />
            <MetricCard icon="heart" value={formatNumber(rjLikes)} label="Likes" iconColor="#EC4899" />
            <MetricCard icon="users" value={formatNumber(rjFollowers)} label="Followers" iconColor="#10B981" />
            <MetricCard icon="share-2" value={formatNumber(rjShares)} label="Shares" iconColor="#F59E0B" />
            <MetricCard icon="user-plus" value={formatNumber(rjSubscribers)} label="Subscribers" iconColor="#8B5CF6" />
          </View>
        )}

        {/* ── Podcast Metrics Section ────────────────────────────────────── */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 12 }}>Podcast Metrics</Text>
        {isMobile ? (
          <View style={{ marginBottom: 24, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <MetricCard icon="mic" value={totalPodcasts} label="Total Podcasts" iconColor="#8B5CF6" />
              <MetricCard icon="list" value={totalEpisodes} label="Episodes" iconColor="#3B82F6" />
            </View>
            <MetricCard icon="headphones" value={formatNumber(totalPodcastListeners)} label="Podcast Listeners" iconColor="#14B8A6" />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <MetricCard icon="mic" value={totalPodcasts} label="Total Podcasts" iconColor="#8B5CF6" />
            <MetricCard icon="list" value={totalEpisodes} label="Episodes" iconColor="#3B82F6" />
            <MetricCard icon="headphones" value={formatNumber(totalPodcastListeners)} label="Podcast Listeners" iconColor="#14B8A6" />
          </View>
        )}

        {loading && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ color: c.textMuted }}>Loading metrics...</Text>
          </View>
        )}
      </ScrollView>

      {/* Modals (Profile, Notifications, Settings)  */}
      {/* Profile Modal */}
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

      {/* Notifications Modal */}
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

      {/* Settings Modal */}
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
    </View>
  );
};

export default Dashboard;