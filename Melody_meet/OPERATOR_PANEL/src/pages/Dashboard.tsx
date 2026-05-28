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

const Dashboard: React.FC<DashboardProps> = ({ navigation }) => {
  // Get from Zustand store
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
  
  // Local UI state (doesn't need persistence)
  const [localListeners, setLocalListeners] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  // Backend data
  const [analyticsStats, setAnalyticsStats] = useState<any>(null);
  const [realPodcasts, setRealPodcasts] = useState<any[]>([]);

  const darkMode = dashboardDarkMode;
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

  // Simulate listener count when live (fallback when socket not connected)
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

  // Fetch real analytics + podcasts from backend on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const stats = await AnalyticsApi.getDashboard();
        setAnalyticsStats(stats);
      } catch {
        // Backend offline — silent fail, mock data used
      }
      try {
        const pods = await PodcastApi.getAll();
        if (pods.length > 0) setRealPodcasts(pods);
      } catch {
        // Backend offline — silent fail, mock data used
      }
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
            if (navigation?.logout) {
              navigation.logout();
            }
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
  // Real listener count: prefer socket-driven value, fall back to local simulation
  const displayListeners = listeners > 0 ? listeners : localListeners;
  // Real stats from backend (with fallback defaults)
  const peakListeners = analyticsStats?.streams?.totalViewers || 2800;
  const totalPodcasts = analyticsStats?.podcasts?.total || 0;

  const userName = user?.name || 'Operator';
  const userEmail = user?.email || 'operator@melodymeet.com';
  const userAvatar = userName?.charAt(0).toUpperCase() || 'O';

  const qualityOptions = ['Auto', 'Low', 'Medium', 'High', 'Lossless'];

  const IconCircle = ({ icon, color }: { icon: string; color: string }) => (
    <View className={`w-10 h-10 rounded-full items-center justify-center mb-2`} style={{ backgroundColor: color + '20' }}>
      <Feather name={icon as any} size={20} color={color} />
    </View>
  );

  return (
    <View className={`flex-1 pt-10 ${darkMode ? 'bg-[#121212]' : 'bg-[#F5F5F5]'}`}>
      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isMobile ? 120 : 40 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Dashboard</Text>
            <View className={`w-12 h-0.5 mt-2 rounded-sm ${darkMode ? 'bg-white' : 'bg-[#1A1A1A]'}`} />
          </View>
          <View className="flex-row gap-4">
            <TouchableOpacity onPress={() => setShowSettings(true)}>
              <Feather name="settings" size={22} color={darkMode ? '#888' : '#666'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNotifications(true)} className="relative">
              <Feather name="bell" size={22} color={darkMode ? '#888' : '#666'} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1.5 bg-gray-500 rounded-full min-w-4 h-4 items-center justify-center px-1">
                  <Text className="text-[9px] font-bold text-white">{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Feather name="user" size={22} color={darkMode ? '#888' : '#666'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Feather name="log-out" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        {isMobile ? (
          <View className="mb-5">
            <View className="flex-row gap-2 mb-2">
              <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                <IconCircle icon="headphones" color="#22C55E" />
                <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{displayListeners}</Text>
                <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Current</Text>
                <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                  <Text className="text-[9px] font-bold text-white">+12%</Text>
                </View>
              </View>

              <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                <IconCircle icon="trending-up" color="#22C55E" />
                <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{peakListeners.toLocaleString()}</Text>
                <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Peak</Text>
                <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                  <Text className="text-[9px] font-bold text-white">+8%</Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-2">
              <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                <IconCircle icon="clock" color="#EF4444" />
                <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>45m</Text>
                <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Avg Time</Text>
                <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                  <Text className="text-[9px] font-bold text-white">-3%</Text>
                </View>
              </View>

              <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                <IconCircle icon="heart" color="#22C55E" />
                <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>91%</Text>
                <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Engagement</Text>
                <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                  <Text className="text-[9px] font-bold text-white">+5%</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className="flex-row gap-2 mb-5">
            <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
              <IconCircle icon="headphones" color="#22C55E" />
              <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{displayListeners}</Text>
              <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Current</Text>
              <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                <Text className="text-[9px] font-bold text-white">+12%</Text>
              </View>
            </View>

            <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
              <IconCircle icon="trending-up" color="#22C55E" />
              <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{peakListeners.toLocaleString()}</Text>
              <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Peak</Text>
              <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                <Text className="text-[9px] font-bold text-white">+8%</Text>
              </View>
            </View>

            <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
              <IconCircle icon="clock" color="#EF4444" />
              <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>45m</Text>
              <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Avg Time</Text>
              <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                <Text className="text-[9px] font-bold text-white">-3%</Text>
              </View>
            </View>

            <View className={`flex-1 rounded-2xl p-3 items-center border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
              <IconCircle icon="heart" color="#22C55E" />
              <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>91%</Text>
              <Text className={`text-xs mt-1 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Engagement</Text>
              <View className="bg-gray-500 px-2 py-0.5 rounded-lg mt-1.5">
                <Text className="text-[9px] font-bold text-white">+5%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Status Card */}
        <View className={`rounded-2xl p-5 mb-4 border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
          <View className="flex-row items-center justify-between py-2">
            <Text className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Channel Status</Text>
            <Text className={`text-sm font-bold ${isLive ? 'text-gray-500' : (darkMode ? 'text-[#888]' : 'text-[#666]')}`}>{isLive ? 'Live' : 'Offline'}</Text>
          </View>
          <View className="flex-row items-center justify-between py-2">
            <Text className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Listeners</Text>
            <Text className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{isLive ? displayListeners : 0}</Text>
          </View>
          <View className="flex-row items-center justify-between py-2">
            <Text className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Stream Health</Text>
            <Text className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{isLive ? getQualityText() : 'Offline'}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity 
            onPress={() => setShowGoLiveModal(true)} 
            className={`flex-1 py-3.5 rounded-full border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}
          >
            <Text className={`font-bold text-center ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              {isLive ? 'End Live' : 'Go Live'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Podcast')} 
            className={`flex-1 py-3.5 rounded-full border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}
          >
            <Text className={`text-center font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {/* LIVE CONTENT */}
        {isLive && (
          <View className={`flex-col ${!isMobile ? 'md:flex-row' : ''} gap-5`}>
            <View className="flex-1">
              <View className={`flex-row items-center rounded-full border px-4 mb-5 ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                <Feather name="search" size={18} color={darkMode ? '#888' : '#666'} />
                <TextInput 
                  placeholder="Search by title or host..." 
                  placeholderTextColor={darkMode ? '#888' : '#666'} 
                  value={dashboardSearchQuery} 
                  onChangeText={setDashboardSearchQuery} 
                  className="flex-1 py-3 px-2.5"
                  style={{ color: darkMode ? '#FFF' : '#1A1A1A' }}
                />
              </View>

              <View className={`rounded-2xl p-5 border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                <Text className={`text-xs font-semibold mb-3 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Now Playing</Text>
                <View className="flex-row items-center gap-1.5 mb-2">
                  <View className="w-2 h-2 bg-gray-500 rounded-full" />
                  <Text className="text-[10px] font-bold text-gray-500">LIVE</Text>
                </View>
                <Text className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{currentSong}</Text>
                <Text className={`text-sm mb-4 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{currentArtist}</Text>
                <View className="flex-row gap-3 mb-4">
                  <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: darkMode ? '#2A2A2A' : '#F0F0F0' }}>
                    <Text className={`text-[11px] font-semibold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>CH{channel}</Text>
                  </View>
                  <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: darkMode ? '#2A2A2A' : '#F0F0F0' }}>
                    <Feather name="headphones" size={12} color={darkMode ? '#888' : '#666'} />
                    <Text className={`text-[11px] font-semibold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{displayListeners}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('RJStudio')} className="items-center py-3 rounded-full" style={{ backgroundColor: darkMode ? '#2A2A2A' : '#F0F0F0' }}>
                  <Text className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Enter Studio →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-3">
                <Text className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Latest Podcasts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Podcast')}>
                  <Text className={`text-xs ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>View All →</Text>
                </TouchableOpacity>
              </View>
              {podcasts.map((podcast: any) => (
                <TouchableOpacity key={podcast.id} onPress={() => navigation.navigate('Podcast')} className={`flex-row justify-between items-center rounded-2xl p-3 mb-2.5 border ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{podcast.name}</Text>
                    <Text className={`text-[11px] ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{podcast.host}</Text>
                    <Text className={`text-[10px] mt-0.5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{podcast.duration} • {podcast.episodes} eps</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{podcast.listeners}</Text>
                    <Text className={`text-[10px] mt-0.5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{podcast.time}</Text>
                    <Text className={`text-[10px] mt-0.5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Listen →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Offline Message */}
        {!isLive && (
          <View className={`rounded-3xl p-10 items-center border gap-3 ${darkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-[#E0E0E0]'}`}>
            <Feather name="mic-off" size={48} color={darkMode ? '#888' : '#666'} />
            <Text className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>No active broadcast</Text>
            <Text className={`text-xs text-center ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Tap 'Go Live' to start streaming and view content</Text>
          </View>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <View className="items-center justify-center flex-1 bg-black/70">
          <View className={`rounded-2xl p-5 w-[85%] max-w-[320px] ${darkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>User Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Feather name="x" size={22} color={darkMode ? '#888' : '#666'} />
              </TouchableOpacity>
            </View>
            
            <View className="items-center mb-5">
              <View className="items-center justify-center w-20 h-20 mb-3 rounded-full" style={{ backgroundColor: darkMode ? '#2A2A2A' : '#F0F0F0' }}>
                <Text className="text-4xl">{userAvatar}</Text>
              </View>
              <Text className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{userName}</Text>
              <Text className={`text-xs mt-0.5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{userEmail}</Text>
            </View>

            <View className={`border-b mb-3 ${darkMode ? 'border-[#333]' : 'border-[#E0E0E0]'}`} />
            
            <TouchableOpacity onPress={() => { setShowProfileModal(false); navigation.navigate('RJStudio'); }} className="flex-row items-center gap-3 py-3">
              <Feather name="mic" size={20} color={darkMode ? '#FFF' : '#1A1A1A'} />
              <Text className={`text-sm ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>RJ Studio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { setShowProfileModal(false); navigation.navigate('Podcast'); }} className="flex-row items-center gap-3 py-3">
              <Feather name="headphones" size={20} color={darkMode ? '#FFF' : '#1A1A1A'} />
              <Text className={`text-sm ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Podcast Host</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} transparent animationType="fade">
        <View className="items-center justify-center flex-1 bg-black/70">
          <View className={`rounded-2xl p-4 w-[85%] max-w-[320px] max-h-[70%] ${darkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Notifications</Text>
              <View className="flex-row gap-3">
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllDashboardNotificationsRead}>
                    <Text className={`text-xs ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Feather name="x" size={22} color={darkMode ? '#888' : '#666'} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={true}>
              {dashboardNotifications.map((notif) => (
                <TouchableOpacity 
                  key={notif.id} 
                  onPress={() => markDashboardNotificationRead(notif.id)}
                  className={`py-2.5 px-2 rounded-lg mb-1 ${!notif.read && (darkMode ? 'bg-[#2A2A2A]' : 'bg-[#F5F5F5]')}`}
                  style={{ borderBottomWidth: 1, borderBottomColor: darkMode ? '#333' : '#E0E0E0' }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Text className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{notif.title}</Text>
                      <Text className={`text-[11px] mt-0.5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{notif.message}</Text>
                      <Text className={`text-[10px] mt-0.5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{notif.time}</Text>
                    </View>
                    {!notif.read && (
                      <View className="w-2 h-2 bg-gray-500 rounded-full" />
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
        <View className="items-center justify-center flex-1 bg-black/70">
          <View className={`rounded-2xl p-4 w-[85%] max-w-[320px] ${darkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Feather name="x" size={22} color={darkMode ? '#888' : '#666'} />
              </TouchableOpacity>
            </View>
            
            <View className={`border-b py-3 ${darkMode ? 'border-[#333]' : 'border-[#E0E0E0]'}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <Feather name="moon" size={18} color={darkMode ? '#888' : '#666'} />
                  <Text className={`text-sm ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Dark Mode</Text>
                </View>
                <Switch 
                  value={darkMode} 
                  onValueChange={setDashboardDarkMode} 
                  trackColor={{ false: darkMode ? '#333' : '#E0E0E0', true: '#6B7280' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            <View className={`border-b py-3 ${darkMode ? 'border-[#333]' : 'border-[#E0E0E0]'}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <Feather name="bell" size={18} color={darkMode ? '#888' : '#666'} />
                  <Text className={`text-sm ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Push Notifications</Text>
                </View>
                <Switch 
                  value={dashboardNotificationsEnabled} 
                  onValueChange={setDashboardNotificationsEnabled} 
                  trackColor={{ false: darkMode ? '#333' : '#E0E0E0', true: '#22C55E' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            <View className={`border-b py-3 ${darkMode ? 'border-[#333]' : 'border-[#E0E0E0]'}`}>
              <TouchableOpacity 
                className="flex-row items-center justify-between"
                onPress={() => setShowQualityOptions(!showQualityOptions)}
              >
                <View className="flex-row items-center gap-2.5">
                  <Feather name="cpu" size={18} color={darkMode ? '#888' : '#666'} />
                  <Text className={`text-sm ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Stream Quality</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className={`text-xs ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>{dashboardStreamQuality}</Text>
                  <Feather name={showQualityOptions ? "chevron-up" : "chevron-down"} size={14} color={darkMode ? '#888' : '#666'} />
                </View>
              </TouchableOpacity>
              {showQualityOptions && (
                <View className="mt-2 ml-7">
                  {qualityOptions.map((option: string) => (
                    <TouchableOpacity 
                      key={option}
                      onPress={() => {
                        setDashboardStreamQuality(option);
                        setShowQualityOptions(false);
                      }}
                      className="py-2"
                    >
                      <Text className={`text-xs ${option === dashboardStreamQuality ? 'text-gray-500' : (darkMode ? 'text-[#888]' : 'text-[#666]')}`}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity className="py-3" onPress={handleHelpSupport}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5">
                  <Feather name="help-circle" size={18} color={darkMode ? '#888' : '#666'} />
                  <Text className={`text-sm ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Help & Support</Text>
                </View>
                <Feather name="chevron-right" size={14} color={darkMode ? '#888' : '#666'} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Go Live Modal */}
      <Modal visible={showGoLiveModal && !isLive} transparent animationType="fade">
        <View className="items-center justify-center flex-1 bg-black/70">
          <View className={`rounded-2xl p-5 w-[85%] max-w-[320px] ${darkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
            <Text className={`text-lg font-bold text-center mb-3 ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Start Broadcasting</Text>
            <Text className={`text-xs text-center mb-5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Start your live broadcast and connect with your audience!</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowGoLiveModal(false)} className={`flex-1 py-2.5 rounded-xl border ${darkMode ? 'border-[#333]' : 'border-[#E0E0E0]'}`}>
                <Text className={`text-center ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGoLive} className="flex-1 py-2.5 rounded-xl bg-black">
                <Text className="font-bold text-center text-white">Go Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Live Modal */}
      <Modal visible={showGoLiveModal && isLive} transparent animationType="fade">
        <View className="items-center justify-center flex-1 bg-black/70">
          <View className={`rounded-2xl p-5 w-[85%] max-w-[320px] ${darkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
            <Text className={`text-lg font-bold text-center mb-3 ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>End Broadcast?</Text>
            <Text className={`text-xs text-center mb-5 ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Are you sure you want to end your live broadcast?</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowGoLiveModal(false)} className={`flex-1 py-2.5 rounded-xl border ${darkMode ? 'border-[#333]' : 'border-[#E0E0E0]'}`}>
                <Text className={`text-center ${darkMode ? 'text-[#888]' : 'text-[#666]'}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGoLive} className="flex-1 py-2.5 rounded-xl bg-black">
                <Text className="font-bold text-center text-white">End Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Dashboard;