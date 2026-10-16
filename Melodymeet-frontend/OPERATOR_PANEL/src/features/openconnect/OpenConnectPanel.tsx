import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  OpenConnectApi,
  OpenConnectHealthResponse,
  OpenConnectUser,
  OpenConnectStation,
  OpenConnectRJ,
  OpenConnectPodcast,
  OpenConnectReport,
} from '../../services/api/openConnectApi';
import { useAppStore } from '../../store/useAppStore';

type ActiveTab = 'users' | 'stations' | 'rjs' | 'podcasts' | 'reports';

export const OpenConnectPanel: React.FC = () => {
  const { dashboardDarkMode } = useAppStore();
  const [health, setHealth] = useState<OpenConnectHealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('stations');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [users, setUsers] = useState<OpenConnectUser[]>([]);
  const [stations, setStations] = useState<OpenConnectStation[]>([]);
  const [rjs, setRjs] = useState<OpenConnectRJ[]>([]);
  const [podcasts, setPodcasts] = useState<OpenConnectPodcast[]>([]);
  const [reports, setReports] = useState<OpenConnectReport[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    setErrorMsg(null);
    try {
      const res = await OpenConnectApi.getHealth();
      setHealth(res);
    } catch (err: any) {
      setHealth({
        connected: false,
        success: false,
        error: err.message || 'Failed to reach OpenConnect',
      });
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const fetchDataForTab = useCallback(async (tab: ActiveTab) => {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      if (tab === 'users') {
        const data = await OpenConnectApi.getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } else if (tab === 'stations') {
        const data = await OpenConnectApi.getStations();
        setStations(Array.isArray(data) ? data : []);
      } else if (tab === 'rjs') {
        const data = await OpenConnectApi.getRjs();
        setRjs(Array.isArray(data) ? data : []);
      } else if (tab === 'podcasts') {
        const data = await OpenConnectApi.getPodcasts();
        setPodcasts(Array.isArray(data) ? data : []);
      } else if (tab === 'reports') {
        const data = await OpenConnectApi.getReports();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to fetch OpenConnect ${tab}`);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealth();
    await fetchDataForTab(activeTab);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    fetchDataForTab(activeTab);
  }, [activeTab, fetchDataForTab]);

  const isDark = dashboardDarkMode;
  const bg = isDark ? '#080A10' : '#F8FAFC';
  const cardBg = isDark ? '#111625' : '#FFFFFF';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#1B2234' : '#E2E8F0';

  const isConnected = health?.connected && health?.details?.status !== 'unhealthy';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>OpenConnect Integration</Text>
          <Text style={[styles.subtitle, { color: subTextColor }]}>
            Monitor and manage live OpenConnect infrastructure & catalog
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: cardBg, borderColor }]}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={16} color={textColor} />
          <Text style={[styles.refreshBtnText, { color: textColor }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Connection & Status Banner */}
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: isConnected ? (isDark ? '#064E3B' : '#ECFDF5') : (isDark ? '#7F1D1D' : '#FEF2F2'),
            borderColor: isConnected ? (isDark ? '#059669' : '#10B981') : (isDark ? '#DC2626' : '#EF4444'),
          },
        ]}
      >
        <View style={styles.statusRow}>
          <Feather
            name={isConnected ? 'check-circle' : 'alert-triangle'}
            size={22}
            color={isConnected ? '#10B981' : '#EF4444'}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                styles.statusTitle,
                { color: isConnected ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#FCA5A5' : '#991B1B') },
              ]}
            >
              {loadingHealth
                ? 'Checking OpenConnect connection...'
                : isConnected
                ? `Connected to OpenConnect (Status: ${health?.details?.status || 'healthy'})`
                : `OpenConnect Unavailable (${health?.error || 'Offline'})`}
            </Text>
            <Text
              style={[
                styles.statusSub,
                { color: isConnected ? (isDark ? '#A7F3D0' : '#047857') : (isDark ? '#FECACA' : '#B91C1C') },
              ]}
            >
              Target endpoint: http://localhost:4000 (OpenConnect Backend)
            </Text>
          </View>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
          <Feather name="database" size={20} color="#3B82F6" />
          <Text style={[styles.metricLabel, { color: subTextColor }]}>PostgreSQL DB</Text>
          <Text style={[styles.metricValue, { color: textColor }]}>
            {health?.details?.database ? 'Online (5433)' : 'Disconnected'}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
          <Feather name="layers" size={20} color="#A855F7" />
          <Text style={[styles.metricLabel, { color: subTextColor }]}>Redis Cache</Text>
          <Text style={[styles.metricValue, { color: textColor }]}>
            {health?.details?.redis ? 'Active (6379)' : 'Disabled / Offline'}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
          <Feather name="shield" size={20} color="#10B981" />
          <Text style={[styles.metricLabel, { color: subTextColor }]}>Security & Auth</Text>
          <Text style={[styles.metricValue, { color: textColor }]}>System JWT Admin</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsRow}>
        {(['stations', 'rjs', 'podcasts', 'users', 'reports'] as ActiveTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const labelMap: Record<ActiveTab, string> = {
            stations: 'Radio Stations',
            rjs: 'Radio Jockeys',
            podcasts: 'Podcasts',
            users: 'Users',
            reports: 'Reports',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                { backgroundColor: isActive ? '#4F6AF0' : cardBg, borderColor },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : textColor },
                ]}
              >
                {labelMap[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error Message */}
      {errorMsg && (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#311414' : '#FEE2E2' }]}>
          <Feather name="info" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Data Section */}
      <View style={[styles.dataCard, { backgroundColor: cardBg, borderColor }]}>
        {loadingData ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4F6AF0" />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              Loading OpenConnect {activeTab}...
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activeTab === 'stations' && (
              stations.length === 0 ? (
                <Text style={[styles.emptyText, { color: subTextColor }]}>No stations found or OpenConnect is offline.</Text>
              ) : (
                stations.map((st) => (
                  <View key={st.id} style={[styles.listItem, { borderColor }]}>
                    <View style={styles.iconCircle}>
                      <Feather name="radio" size={16} color="#4F6AF0" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: textColor }]}>{st.name}</Text>
                      <Text style={[styles.itemSub, { color: subTextColor }]}>
                        {st.description || 'No description provided'}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{st.status || 'Active'}</Text>
                    </View>
                  </View>
                ))
              )
            )}

            {activeTab === 'rjs' && (
              rjs.length === 0 ? (
                <Text style={[styles.emptyText, { color: subTextColor }]}>No Radio Jockeys found.</Text>
              ) : (
                rjs.map((rj) => (
                  <View key={rj.id} style={[styles.listItem, { borderColor }]}>
                    <View style={styles.iconCircle}>
                      <Feather name="mic" size={16} color="#A855F7" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: textColor }]}>{rj.name}</Text>
                      <Text style={[styles.itemSub, { color: subTextColor }]}>{rj.bio || 'Radio Jockey Profile'}</Text>
                    </View>
                  </View>
                ))
              )
            )}

            {activeTab === 'podcasts' && (
              podcasts.length === 0 ? (
                <Text style={[styles.emptyText, { color: subTextColor }]}>No podcasts catalog entries found.</Text>
              ) : (
                podcasts.map((pod) => (
                  <View key={pod.id} style={[styles.listItem, { borderColor }]}>
                    <View style={styles.iconCircle}>
                      <Feather name="headphones" size={16} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: textColor }]}>{pod.title}</Text>
                      <Text style={[styles.itemSub, { color: subTextColor }]}>{pod.author || pod.description || 'Podcast Show'}</Text>
                    </View>
                  </View>
                ))
              )
            )}

            {activeTab === 'users' && (
              users.length === 0 ? (
                <Text style={[styles.emptyText, { color: subTextColor }]}>No user records returned.</Text>
              ) : (
                users.map((usr) => (
                  <View key={usr.id} style={[styles.listItem, { borderColor }]}>
                    <View style={styles.iconCircle}>
                      <Feather name="user" size={16} color="#10B981" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: textColor }]}>{usr.email}</Text>
                      <Text style={[styles.itemSub, { color: subTextColor }]}>ID: {usr.id}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#E0E7FF' }]}>
                      <Text style={[styles.badgeText, { color: '#3730A3' }]}>{usr.role}</Text>
                    </View>
                  </View>
                ))
              )
            )}

            {activeTab === 'reports' && (
              reports.length === 0 ? (
                <Text style={[styles.emptyText, { color: subTextColor }]}>No moderation reports logged.</Text>
              ) : (
                reports.map((rep) => (
                  <View key={rep.id} style={[styles.listItem, { borderColor }]}>
                    <View style={styles.iconCircle}>
                      <Feather name="flag" size={16} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: textColor }]}>{rep.reason}</Text>
                      <Text style={[styles.itemSub, { color: subTextColor }]}>Report ID: {rep.id}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{rep.status || 'Pending'}</Text>
                    </View>
                  </View>
                ))
              )
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusSub: {
    fontSize: 12,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginLeft: 8,
  },
  dataCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 250,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(79, 106, 240, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 14,
  },
});

export default OpenConnectPanel;
