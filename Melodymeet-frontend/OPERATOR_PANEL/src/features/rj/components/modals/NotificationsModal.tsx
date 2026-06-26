import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface NotificationItem {
  id: number;
  type: "request" | "system" | "alert";
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  notifications: NotificationItem[];
  unreadCount: number;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ 
  visible, 
  isDarkMode, 
  colors, 
  notifications, 
  unreadCount, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead 
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%',
          maxWidth: 420,
          maxHeight: '80%',
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#4F6AF0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={onMarkAllAsRead}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#4F6AF0' }}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
              >
                <Feather name="x" size={15} color={isDarkMode ? '#94A3B8' : '#475569'} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ height: 1, marginBottom: 10, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }} />
          
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 12, paddingHorizontal: 8,
                  borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9',
                  backgroundColor: !item.read
                    ? (isDarkMode ? '#1E3A8A18' : '#EEF2FF')
                    : 'transparent',
                  borderRadius: !item.read ? 8 : 0,
                }}
                onPress={() => onMarkAsRead(item.id)}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
                }}>
                  {item.type === "request" && <Feather name="music"        size={16} color="#4F6AF0" />}
                  {item.type === "system"  && <Feather name="bell"         size={16} color={isDarkMode ? '#94A3B8' : '#475569'} />}
                  {item.type === "alert"   && <Feather name="alert-circle" size={16} color="#D97706" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>{item.message}</Text>
                  <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{item.time}</Text>
                </View>
                {!item.read && (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4F6AF0' }} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', gap: 12, paddingVertical: 48 }}>
                <Feather name="bell-off" size={36} color={isDarkMode ? '#334155' : '#CBD5E1'} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#64748B' : '#94A3B8' }}>No notifications</Text>
                <Text style={{ fontSize: 11, color: isDarkMode ? '#64748B' : '#94A3B8', textAlign: 'center' }}>When you get notifications, they'll appear here</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};