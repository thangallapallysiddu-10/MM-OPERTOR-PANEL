// Dashboard.tsx - Redesigned interactive RJ & Podcast dashboards
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
    primaryBg:   '#7C3AED',
    primaryText: '#FFFFFF',
    successBg:   '#059669',
    dangerBg:    '#DC2626',
    badgeBg:     '#EEF2FF',
    badgeText:   '#7C3AED',
    offlineBg:   '#F1F5F9',
  },
  dark: {
    bg:          '#080A10',
    card:        '#111625',
    border:      '#1B2234',
    text:        '#F8FAFC',
    textSec:     '#94A3B8',
    textMuted:   '#64748B',
    inputBg:     '#1A2035',
    pillBg:      '#1A2035',
    primaryBg:   '#5B21B6',
    primaryText: '#FFFFFF',
    successBg:   '#059669',
    dangerBg:    '#DC2626',
    badgeBg:     '#1E1B4B',
    badgeText:   '#A78BFA',
    offlineBg:   '#1A2035',
  },
};

// ─── Custom SVG Sparkline ──────────────────────────────────────────────────
const Sparkline = ({ points, color }: { points: number[]; color: string }) => {
  if (Platform.OS !== 'web') {
    return <View style={{ height: 16, width: 80, backgroundColor: '#1e293b', borderRadius: 4 }} />;
  }
  
  const width = 120;
  const height = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substr(2, 4)}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Custom SVG Line Chart ─────────────────────────────────────────────────
const LineChart = ({ 
  labels, 
  datasets 
}: { 
  labels: string[]; 
  datasets: { data: number[]; color: string; label: string }[] 
}) => {
  if (Platform.OS !== 'web') {
    return <View style={{ height: 180, backgroundColor: '#1a2232', borderRadius: 8 }} />;
  }

  const height = 200;
  const width = 500;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = 60000; // Y axis maximum limit (60k as in mocks)
  const minVal = 0;
  const range = maxVal - minVal;

  const yTicks = [0, 15000, 30000, 45000, 60000];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick, i) => {
          const y = paddingTop + chartHeight - (tick / range) * chartHeight;
          return (
            <g key={i}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1e293b" strokeWidth={1} strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 4} fill="#64748b" fontSize={9} fontFamily="monospace" textAnchor="end">
                {tick === 0 ? '0' : `${tick / 1000}K`}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {labels.map((lbl, i) => {
          const x = paddingLeft + (i / (labels.length - 1)) * chartWidth;
          return (
            <text key={i} x={x} y={height - 8} fill="#64748b" fontSize={9} fontFamily="monospace" textAnchor="middle">
              {lbl}
            </text>
          );
        })}

        {/* Lines */}
        {datasets.map((dataset, idx) => {
          const pathD = dataset.data.map((p, i) => {
            const x = paddingLeft + (i / (dataset.data.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - (p / range) * chartHeight;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');

          const gradId = `chart-area-grad-${idx}-${Math.random().toString(36).substr(2, 4)}`;

          return (
            <g key={idx}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dataset.color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={dataset.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d={`${pathD} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`} 
                fill={`url(#${gradId})`} 
              />
              <path 
                d={pathD} 
                fill="none" 
                stroke={dataset.color} 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Dots */}
              {dataset.data.map((p, i) => {
                const x = paddingLeft + (i / (dataset.data.length - 1)) * chartWidth;
                const y = paddingTop + chartHeight - (p / range) * chartHeight;
                return (
                  <circle 
                    key={i} 
                    cx={x} 
                    cy={y} 
                    r={3.5} 
                    fill={dataset.color} 
                    stroke="#080c14" 
                    strokeWidth={1} 
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Custom SVG Donut Chart ────────────────────────────────────────────────
const DonutChart = ({
  data,
  totalLabel,
  totalValue,
}: {
  data: { label: string; value: number; color: string }[];
  totalLabel: string;
  totalValue: string;
}) => {
  if (Platform.OS !== 'web') {
    return <View style={{ height: 120, width: 120, backgroundColor: '#1a2232', borderRadius: 60 }} />;
  }

  const size = 130;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = data.reduce((acc, d) => acc + d.value, 0);
  let accumulatedPercent = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((segment, idx) => {
          const percentage = segment.value / total;
          const strokeLength = percentage * circumference;
          const strokeOffset = circumference - (accumulatedPercent * circumference);
          accumulatedPercent += percentage;

          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {/* Absolute overlay text */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 16, fontWeight: '700', color: '#f1f5f9' }}>{totalValue}</span>
        <span style={{ fontSize: 9, color: '#64748b', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{totalLabel}</span>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
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
  const { listeners } = useOperator() as any;

  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  
  // Dashboard view toggle state
  const [activeTab, setActiveTab] = useState<'rj' | 'podcast'>('podcast');
  const [loading, setLoading] = useState(false);

  const darkMode = dashboardDarkMode;
  const c = darkMode ? T.dark : T.light;
  const unreadCount = dashboardNotifications.filter(n => !n.read).length;

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

  // format number helper
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // ─── Metric Card ─────────────────────────────────────────────────────────────
  const MetricCard = ({ icon, value, label, trend, iconColor, sparkPoints }: {
    icon: string; value: string | number; label: string;
    trend: string; iconColor: string; sparkPoints: number[];
  }) => (
    <View style={{
      flex: 1,
      minWidth: isMobile ? '47%' : 150,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSec, marginBottom: 4 }}>{label}</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5 }}>{value}</Text>
        </View>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: iconColor + '18',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Feather name={icon as any} size={16} color={iconColor} />
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>{trend}</Text>
      </View>

      <View style={{ marginTop: 12, height: 24, width: '100%' }}>
        <Sparkline points={sparkPoints} color={iconColor} />
      </View>
    </View>
  );

  // ─── Mini Analytics Card (Grid elements) ──────────────────────────────────
  const MiniAnalyticsCard = ({ label, value, trend, color, points }: {
    label: string; value: string; trend: string; color: string; points: number[];
  }) => (
    <View style={{
      flex: 1,
      minWidth: isMobile ? '100%' : '48%',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: c.textSec, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{value}</Text>
        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 4 }}>{trend}</Text>
      </View>
      <View style={{ width: 90, height: 24 }}>
        <Sparkline points={points} color={color} />
      </View>
    </View>
  );

  // ─── Episode Row (Top Episodes list) ─────────────────────────────────────
  const EpisodeRow = ({ rank, title, date, downloads, coverBg }: {
    rank: number; title: string; date: string; downloads: string; coverBg: string;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSec, width: 20 }}>{rank}</Text>
      <View style={{
        width: 32, height: 32, borderRadius: 6,
        backgroundColor: coverBg, marginRight: 10,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Feather name="music" size={14} color="#fff" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, overflow: 'hidden' }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 11, color: c.textSec, marginTop: 2 }}>{date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{downloads}</Text>
        <Text style={{ fontSize: 9, color: c.textSec, marginTop: 1 }}>Downloads</Text>
      </View>
    </View>
  );

  // ─── Activity Row (Recent Activity list) ─────────────────────────────────
  const ActivityRow = ({ icon, iconBg, title, subtitle, time }: {
    icon: string; iconBg: string; title: string; subtitle: string; time: string;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    }}>
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: iconBg + '20',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
      }}>
        <Feather name={icon as any} size={14} color={iconBg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, overflow: 'hidden' }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 11, color: c.textSec, marginTop: 2, overflow: 'hidden' }} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={{ fontSize: 11, color: c.textSec, marginLeft: 10 }}>{time}</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5 }}>
              {activeTab === 'rj' ? 'Dashboard' : 'Podcast Dashboard'}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {activeTab === 'rj' 
                ? 'Overview of your radio and podcast performance' 
                : 'Overview of your podcast performance and audience insights'
              }
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            
            {/* RJ & PODCAST toggle switcher pill */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: c.card,
              borderRadius: 8,
              padding: 4,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
            }}>
              <TouchableOpacity
                onPress={() => setActiveTab('rj')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                  borderRadius: 6,
                  backgroundColor: activeTab === 'rj' ? c.primaryBg : 'transparent',
                }}
              >
                <Feather name="radio" size={14} color={activeTab === 'rj' ? '#fff' : c.textSec} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'rj' ? '#fff' : c.textSec }}>RJ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('podcast')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                  borderRadius: 6,
                  backgroundColor: activeTab === 'podcast' ? c.primaryBg : 'transparent',
                }}
              >
                <Feather name="mic" size={14} color={activeTab === 'podcast' ? '#fff' : c.textSec} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === 'podcast' ? '#fff' : c.textSec }}>PODCAST</Text>
              </TouchableOpacity>
            </View>

            {/* Utility action buttons */}
            <TouchableOpacity
              onPress={() => setDashboardDarkMode(!darkMode)}
              style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name={darkMode ? 'sun' : 'moon'} size={17} color={c.textSec} />
            </TouchableOpacity>
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
                  backgroundColor: c.primaryBg, borderRadius: 8,
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

        {/* ─── RJ DASHBOARD VIEW ───────────────────────────────────────────────── */}
        {activeTab === 'rj' && (
          <View style={{ width: '100%' }}>
            
            {/* Top row metrics cards */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20 }}>
              <MetricCard icon="headphones" value="2.45M" label="Total Listeners" trend="▲ 18.6%" iconColor="#a78bfa" sparkPoints={[30, 35, 32, 38, 42, 40, 45]} />
              <MetricCard icon="download" value="128.7K" label="Podcast Downloads" trend="▲ 21.3%" iconColor="#60a5fa" sparkPoints={[20, 25, 22, 28, 35, 30, 32]} />
              <MetricCard icon="radio" value="24h 35m" label="Live Hours (RJ)" trend="▲ 8.5%" iconColor="#34d399" sparkPoints={[15, 18, 14, 20, 22, 25, 24]} />
              <MetricCard icon="user-check" value="56.8K" label="Followers / Subscribers" trend="▲ 12.4%" iconColor="#2dd4bf" sparkPoints={[40, 42, 45, 48, 52, 55, 56]} />
              <MetricCard icon="mic" value="24" label="Total Episodes" trend="▲ 4" iconColor="#f472b6" sparkPoints={[21, 21, 22, 22, 23, 24, 24]} />
            </View>

            {/* Middle Section (2 columns) */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 20 }}>
              {/* Audience Overview Graph card */}
              <View style={{
                flex: isMobile ? 1 : 2,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>Audience Overview</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#a78bfa' }} />
                      <Text style={{ fontSize: 11, color: c.textSec }}>Listeners</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#60a5fa' }} />
                      <Text style={{ fontSize: 11, color: c.textSec }}>Downloads</Text>
                    </View>
                    <select style={{ backgroundColor: c.inputBg, border: '1px solid ' + c.border, color: c.text, fontSize: 11, borderRadius: 5, padding: '3px 8px', outline: 'none' }}>
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </View>
                </View>
                <LineChart 
                  labels={['May 5', 'May 6', 'May 7', 'May 8', 'May 9', 'May 10', 'May 11']}
                  datasets={[
                    { label: 'Listeners', data: [36000, 42000, 41000, 44000, 46000, 45000, 48000], color: '#a78bfa' },
                    { label: 'Downloads', data: [11000, 16000, 22000, 23000, 28000, 22000, 31000], color: '#60a5fa' }
                  ]}
                />
              </View>

              {/* Recent Activity card */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 14 }}>Recent Activity</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 270 }}>
                  <ActivityRow icon="plus-circle" iconBg="#a78bfa" title="New Episode Published" subtitle="AI in Content Creation" time="2h ago" />
                  <ActivityRow icon="radio" iconBg="#34d399" title="You went Live" subtitle="The RJ Show" time="4h ago" />
                  <ActivityRow icon="user" iconBg="#60a5fa" title="New Subscriber" subtitle="John Doe" time="5h ago" />
                  <ActivityRow icon="download" iconBg="#a78bfa" title="Episode Downloaded" subtitle="Marketing Trends 2024" time="6h ago" />
                  <ActivityRow icon="message-circle" iconBg="#f59e0b" title="New Comment" subtitle="Great episode!" time="8h ago" />
                </ScrollView>
                <TouchableOpacity onPress={() => setShowAllActivity(true)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: c.primaryBg, fontWeight: '700' }}>View All Activity</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Section (2 columns) */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
              {/* Audience Demographics donut chart */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, alignSelf: 'flex-start', marginBottom: 16 }}>Audience Demographics</Text>
                <DonutChart 
                  data={[
                    { label: '18-24', value: 22, color: '#a78bfa' },
                    { label: '25-34', value: 38, color: '#60a5fa' },
                    { label: '35-44', value: 24, color: '#2dd4bf' },
                    { label: '45-54', value: 11, color: '#f59e0b' },
                    { label: '55+', value: 5, color: '#14b8a6' },
                  ]}
                  totalLabel="Total"
                  totalValue="2.45M"
                />
                {/* Custom Legend Grid */}
                <View style={{ width: '100%', marginTop: 16, gap: 6 }}>
                  {[
                    { label: '18-24', val: '22%', color: '#a78bfa' },
                    { label: '25-34', val: '38%', color: '#60a5fa' },
                    { label: '35-44', val: '24%', color: '#2dd4bf' },
                    { label: '45-54', val: '11%', color: '#f59e0b' },
                    { label: '55+', val: '5%', color: '#14b8a6' },
                  ].map((leg) => (
                    <View key={leg.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leg.color }} />
                        <Text style={{ fontSize: 11, color: c.textSec }}>{leg.label}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{leg.val}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Detailed Analytics Grid */}
              <View style={{
                flex: isMobile ? 1 : 2,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 16 }}>Detailed Analytics (Last 7 Days)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <MiniAnalyticsCard label="Listeners" value="2.45M" trend="▲ 18.6%" color="#a78bfa" points={[30, 32, 31, 35, 38, 36, 40]} />
                  <MiniAnalyticsCard label="Downloads" value="128.7K" trend="▲ 21.3%" color="#60a5fa" points={[15, 18, 16, 22, 25, 20, 24]} />
                  <MiniAnalyticsCard label="Live Hours (RJ)" value="24h 35m" trend="▲ 8.5%" color="#34d399" points={[12, 14, 11, 16, 18, 17, 20]} />
                  <MiniAnalyticsCard label="Subscribers" value="56.8K" trend="▲ 12.4%" color="#2dd4bf" points={[35, 37, 36, 39, 42, 41, 45]} />
                  <MiniAnalyticsCard label="Engagement Rate" value="8.7%" trend="▲ 9.2%" color="#f59e0b" points={[5, 6, 5.5, 7, 7.5, 7.2, 8.2]} />
                  <MiniAnalyticsCard label="Avg. Listen Time" value="32m 45s" trend="▲ 6.8%" color="#f472b6" points={[25, 26, 25.5, 28, 29, 28.5, 30]} />
                </View>
              </View>
            </View>

          </View>
        )}

        {/* ─── PODCAST DASHBOARD VIEW ──────────────────────────────────────────── */}
        {activeTab === 'podcast' && (
          <View style={{ width: '100%' }}>
            
            {/* Top row metrics cards (6 cards) */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <MetricCard icon="download" value="128.7K" label="Total Downloads" trend="▲ 21.3%" iconColor="#2dd4bf" sparkPoints={[20, 25, 22, 28, 35, 30, 32]} />
              <MetricCard icon="users" value="85.4K" label="Unique Listeners" trend="▲ 18.6%" iconColor="#a78bfa" sparkPoints={[30, 35, 32, 38, 42, 40, 45]} />
              <MetricCard icon="headphones" value="24" label="Total Episodes" trend="▲ 4" iconColor="#60a5fa" sparkPoints={[21, 21, 22, 22, 23, 24, 24]} />
              <MetricCard icon="heart" value="56.8K" label="Subscribers" trend="▲ 12.4%" iconColor="#f472b6" sparkPoints={[40, 42, 45, 48, 52, 55, 56]} />
              <MetricCard icon="clock" value="24h 35m" label="Total Listening Hours" trend="▲ 8.5%" iconColor="#f59e0b" sparkPoints={[15, 18, 14, 20, 22, 25, 24]} />
              <MetricCard icon="star" value="4.8" label="Average Rating" trend="▲ 0.2" iconColor="#ca8a04" sparkPoints={[4.5, 4.6, 4.6, 4.7, 4.7, 4.8, 4.8]} />
            </View>

            {/* Middle Section (3 columns) */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 20 }}>
              {/* Downloads Overview line chart card (Column 1) */}
              <View style={{
                flex: isMobile ? 1 : 1.5,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>Downloads Overview</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#a78bfa' }} />
                      <Text style={{ fontSize: 11, color: c.textSec }}>Downloads</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#60a5fa' }} />
                      <Text style={{ fontSize: 11, color: c.textSec }}>Unique Listeners</Text>
                    </View>
                    <select style={{ backgroundColor: c.inputBg, border: '1px solid ' + c.border, color: c.text, fontSize: 11, borderRadius: 5, padding: '3px 8px', outline: 'none' }}>
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </View>
                </View>
                <LineChart 
                  labels={['May 5', 'May 6', 'May 7', 'May 8', 'May 9', 'May 10', 'May 11']}
                  datasets={[
                    { label: 'Downloads', data: [36000, 42000, 41000, 44000, 46000, 45000, 48000], color: '#a78bfa' },
                    { label: 'Unique Listeners', data: [11000, 16000, 22000, 23000, 28000, 22000, 31000], color: '#60a5fa' }
                  ]}
                />
              </View>

              {/* Top Episodes List card (Column 2) */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 14 }}>Top Episodes</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 270 }}>
                  <EpisodeRow rank={1} title="The Future of Voice Tech" date="May 16, 2025" downloads="9.2K" coverBg="#7c5cff" />
                  <EpisodeRow rank={2} title="AI in Content Creation" date="May 14, 2025" downloads="7.6K" coverBg="#2dd4bf" />
                  <EpisodeRow rank={3} title="Audience Q&A Special" date="May 12, 2025" downloads="6.1K" coverBg="#f472b6" />
                  <EpisodeRow rank={4} title="Monetizing Your Podcast" date="May 9, 2025" downloads="5.4K" coverBg="#f59e0b" />
                  <EpisodeRow rank={5} title="Behind The Mic" date="May 7, 2025" downloads="4.8K" coverBg="#60a5fa" />
                </ScrollView>
                <TouchableOpacity onPress={() => setShowAllEpisodes(true)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: c.primaryBg, fontWeight: '700' }}>View All Episodes</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Activity card (Column 3) */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 14 }}>Recent Activity</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 270 }}>
                  <ActivityRow icon="plus-circle" iconBg="#a78bfa" title="New Episode Published" subtitle="AI in Content Creation" time="2h ago" />
                  <ActivityRow icon="user" iconBg="#10b981" title="New Subscriber" subtitle="John Doe" time="5h ago" />
                  <ActivityRow icon="download" iconBg="#a78bfa" title="Episode Downloaded" subtitle="The Future of Voice Tech" time="6h ago" />
                  <ActivityRow icon="star" iconBg="#60a5fa" title="New Review" subtitle="5 stars" time="8h ago" />
                  <ActivityRow icon="award" iconBg="#a78bfa" title="Milestone" subtitle="Crossed 50K Subscribers!" time="1d ago" />
                </ScrollView>
                <TouchableOpacity onPress={() => setShowAllActivity(true)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: c.primaryBg, fontWeight: '700' }}>View All Activity</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Section (3 columns) */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
              {/* Audience Demographics donut chart */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, alignSelf: 'flex-start', marginBottom: 16 }}>Audience Demographics</Text>
                <DonutChart 
                  data={[
                    { label: '18-24', value: 22, color: '#a78bfa' },
                    { label: '25-34', value: 38, color: '#60a5fa' },
                    { label: '35-44', value: 24, color: '#2dd4bf' },
                    { label: '45-54', value: 11, color: '#f59e0b' },
                    { label: '55+', value: 5, color: '#14b8a6' },
                  ]}
                  totalLabel="Total"
                  totalValue="85.4K"
                />
                {/* Custom Legend Grid */}
                <View style={{ width: '100%', marginTop: 16, gap: 6 }}>
                  {[
                    { label: '18-24', val: '22%', color: '#a78bfa' },
                    { label: '25-34', val: '38%', color: '#60a5fa' },
                    { label: '35-44', val: '24%', color: '#2dd4bf' },
                    { label: '45-54', val: '11%', color: '#f59e0b' },
                    { label: '55+', val: '5%', color: '#14b8a6' },
                  ].map((leg) => (
                    <View key={leg.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leg.color }} />
                        <Text style={{ fontSize: 11, color: c.textSec }}>{leg.label}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{leg.val}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Engagement Overview List grid */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 16 }}>Engagement Overview (Last 7 Days)</Text>
                <View style={{ flexDirection: 'column', gap: 8 }}>
                  <MiniAnalyticsCard label="Completion Rate" value="52.6%" trend="▲ 6.2%" color="#a78bfa" points={[30, 32, 31, 35, 38, 36, 40]} />
                  <MiniAnalyticsCard label="Avg. Listen Time" value="32m 45s" trend="▲ 6.8%" color="#60a5fa" points={[15, 18, 16, 22, 25, 20, 24]} />
                  <MiniAnalyticsCard label="Likes" value="3.2K" trend="▲ 14.6%" color="#f472b6" points={[12, 14, 11, 16, 18, 17, 20]} />
                  <MiniAnalyticsCard label="Shares" value="1.8K" trend="▲ 12.7%" color="#34d399" points={[35, 37, 36, 39, 42, 41, 45]} />
                  <MiniAnalyticsCard label="Comments" value="640" trend="▲ 9.3%" color="#f59e0b" points={[5, 6, 5.5, 7, 7.5, 7.2, 8.2]} />
                  <MiniAnalyticsCard label="Saves" value="2.4K" trend="▲ 11.2%" color="#ca8a04" points={[25, 26, 25.5, 28, 29, 28.5, 30]} />
                </View>
              </View>

              {/* Content Performance donut chart card */}
              <View style={{
                flex: isMobile ? 1 : 1,
                backgroundColor: c.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, alignSelf: 'flex-start', marginBottom: 16 }}>Content Performance (Last 7 Days)</Text>
                <DonutChart 
                  data={[
                    { label: 'Downloaded', value: 53, color: '#a78bfa' },
                    { label: 'In Progress', value: 28, color: '#60a5fa' },
                    { label: 'Completed', value: 19, color: '#2dd4bf' },
                  ]}
                  totalLabel="Total Metrics"
                  totalValue="100%"
                />
                {/* Custom Legend Grid */}
                <View style={{ width: '100%', marginTop: 24, gap: 10 }}>
                  {[
                    { label: 'Downloaded', val: '53%', color: '#a78bfa', desc: 'Episodes fully downloaded offline' },
                    { label: 'In Progress', val: '28%', color: '#60a5fa', desc: 'Currently streaming / partially heard' },
                    { label: 'Completed', val: '19%', color: '#2dd4bf', desc: 'Finished listening session fully' },
                  ].map((leg) => (
                    <View key={leg.label} style={{ borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leg.color }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{leg.label}</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: leg.color }}>{leg.val}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: c.textMuted }}>{leg.desc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

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

      {/* View All Activity Modal */}
      <Modal visible={showAllActivity} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 20, width: '90%', maxWidth: 450, maxHeight: '80%', borderWidth: 1, borderColor: c.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>All Activities</Text>
              <TouchableOpacity onPress={() => setShowAllActivity(false)}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="x" size={16} color={c.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ActivityRow icon="plus-circle" iconBg="#a78bfa" title="New Episode Published" subtitle="AI in Content Creation" time="2h ago" />
              <ActivityRow icon="radio" iconBg="#34d399" title="You went Live" subtitle="The RJ Show" time="4h ago" />
              <ActivityRow icon="user" iconBg="#60a5fa" title="New Subscriber" subtitle="John Doe" time="5h ago" />
              <ActivityRow icon="download" iconBg="#a78bfa" title="Episode Downloaded" subtitle="Marketing Trends 2024" time="6h ago" />
              <ActivityRow icon="message-circle" iconBg="#f59e0b" title="New Comment" subtitle="Great episode!" time="8h ago" />
              <ActivityRow icon="star" iconBg="#f472b6" title="New Review" subtitle="5 stars - Love the voice quality!" time="12h ago" />
              <ActivityRow icon="award" iconBg="#34d399" title="Milestone Crossed" subtitle="Reached 50K total subscribers" time="1d ago" />
              <ActivityRow icon="settings" iconBg="#60a5fa" title="System Update" subtitle="Audio engine upgraded to version 2.4" time="2d ago" />
              <ActivityRow icon="dollar-sign" iconBg="#10b981" title="Payout Processed" subtitle="Monthly payout sent to bank account" time="3d ago" />
              <ActivityRow icon="activity" iconBg="#f59e0b" title="Stream Performance Report" subtitle="Avg. 99.8% uptime during live RJ sessions" time="4d ago" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View All Episodes Modal */}
      <Modal visible={showAllEpisodes} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 20, width: '90%', maxWidth: 450, maxHeight: '80%', borderWidth: 1, borderColor: c.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>All Episodes</Text>
              <TouchableOpacity onPress={() => setShowAllEpisodes(false)}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c.pillBg, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="x" size={16} color={c.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <EpisodeRow rank={1} title="The Future of Voice Tech" date="May 16, 2025" downloads="9.2K" coverBg="#7c5cff" />
              <EpisodeRow rank={2} title="AI in Content Creation" date="May 14, 2025" downloads="7.6K" coverBg="#2dd4bf" />
              <EpisodeRow rank={3} title="Audience Q&A Special" date="May 12, 2025" downloads="6.1K" coverBg="#f472b6" />
              <EpisodeRow rank={4} title="Monetizing Your Podcast" date="May 9, 2025" downloads="5.4K" coverBg="#f59e0b" />
              <EpisodeRow rank={5} title="Behind The Mic" date="May 7, 2025" downloads="4.8K" coverBg="#60a5fa" />
              <EpisodeRow rank={6} title="Storytelling in Audio Format" date="May 4, 2025" downloads="4.2K" coverBg="#a78bfa" />
              <EpisodeRow rank={7} title="Audio Engineering Basics" date="May 1, 2025" downloads="3.9K" coverBg="#10b981" />
              <EpisodeRow rank={8} title="Interviewing Techniques" date="Apr 28, 2025" downloads="3.5K" coverBg="#f59e0b" />
              <EpisodeRow rank={9} title="Setting Up a Home Studio" date="Apr 25, 2025" downloads="3.1K" coverBg="#f472b6" />
              <EpisodeRow rank={10} title="Choosing the Right Microphone" date="Apr 22, 2025" downloads="2.8K" coverBg="#7c5cff" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Dashboard;
