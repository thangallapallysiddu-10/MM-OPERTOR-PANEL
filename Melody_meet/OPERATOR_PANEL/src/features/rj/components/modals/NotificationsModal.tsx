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
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={onMarkAllAsRead}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ height: 1, marginVertical: 8, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }} />
          
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
                  backgroundColor: !item.read ? (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'transparent',
                }}
                onPress={() => onMarkAsRead(item.id)}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                }}>
                  {item.type === "request" && <Feather name="music" size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />}
                  {item.type === "system" && <Feather name="bell" size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />}
                  {item.type === "alert" && <Feather name="alert-circle" size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{item.message}</Text>
                  <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{item.time}</Text>
                </View>
                {!item.read && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', gap: 16, paddingVertical: 60 }}>
                <Feather name="bell-off" size={48} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>No notifications</Text>
                <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>When you get notifications, they'll appear here</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};