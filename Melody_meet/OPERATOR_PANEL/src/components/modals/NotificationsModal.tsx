import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'live' | 'song' | 'system' | 'report' | 'ban';
}

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  isDarkMode: boolean;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  isDarkMode,
}) => {
  const getIcon = (type: string) => {
    const iconColor = isDarkMode ? '#94A3B8' : '#475569';
    switch (type) {
      case 'live':   return <Feather name="radio"      size={16} color="#4F6AF0" />;
      case 'song':   return <Feather name="music"      size={16} color="#0D9488" />;
      case 'report': return <Feather name="flag"       size={16} color="#D97706" />;
      case 'ban':    return <Feather name="slash"      size={16} color="#DC2626" />;
      default:       return <Feather name="bell"       size={16} color={iconColor} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="items-end justify-start flex-1 pt-20 pr-4 bg-black/60" activeOpacity={1} onPress={onClose}>
        <View style={{
          width: isMobile ? 340 : 380,
          maxHeight: '80%' as any,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View className="flex-row items-center justify-between mb-2">
            <Text style={{ fontSize: 16, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Notifications</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={14} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, marginVertical: 10, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }} />

          {unreadCount > 0 && (
            <View className="flex-row justify-between mb-2">
              <TouchableOpacity onPress={onMarkAllAsRead}>
                <Text style={{ fontSize: 12, color: '#4F6AF0', fontWeight: '500' }}>Mark all read</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#94A3B8' }}>Clear all</Text>
            </View>
          )}

          <ScrollView className="max-h-[400px]" showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View className="items-center gap-3 py-10">
                <Feather name="bell-off" size={32} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                <Text style={{ fontSize: 13, color: isDarkMode ? '#64748B' : '#94A3B8' }}>No notifications</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 10,
                    marginBottom: 4,
                    backgroundColor: !notification.read ? (isDarkMode ? '#1E3A8A18' : '#EEF2FF') : 'transparent',
                    borderWidth: !notification.read ? 1 : 0,
                    borderColor: !notification.read ? '#4F6AF020' : 'transparent',
                  }}
                  onPress={() => onMarkAsRead(notification.id)}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    {getIcon(notification.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#F1F5F9' : '#0F172A', marginBottom: 2 }}>
                      {notification.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#475569' }}>
                      {notification.message}
                    </Text>
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                      {notification.time}
                    </Text>
                  </View>
                  {!notification.read && (
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4F6AF0', marginTop: 4 }} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {notifications.length > 0 && (
            <TouchableOpacity
              style={{
                marginTop: 10, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
                backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
                borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
              }}
              onPress={onClearAll}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default NotificationsModal;