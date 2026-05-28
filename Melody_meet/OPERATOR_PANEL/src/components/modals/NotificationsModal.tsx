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
    switch (type) {
      case 'live':
        return <Feather name="radio" size={18} color={isDarkMode ? '#FFFFFF' : '#000000'} />;
      case 'song':
        return <Feather name="music" size={18} color={isDarkMode ? '#CCCCCC' : '#666666'} />;
      case 'report':
        return <Feather name="flag" size={18} color={isDarkMode ? '#CCCCCC' : '#666666'} />;
      case 'ban':
        return <Feather name="slash" size={18} color={isDarkMode ? '#888888' : '#999999'} />;
      default:
        return <Feather name="bell" size={18} color={isDarkMode ? '#888888' : '#999999'} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="items-end justify-start flex-1 pt-20 pr-4 bg-black/70" activeOpacity={1} onPress={onClose}>
        <View className={`${isMobile ? 'w-[340px]' : 'w-[380px]'} max-h-[80%] rounded-2xl p-5 border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E0E0E0]'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={isDarkMode ? '#888888' : '#999999'} />
            </TouchableOpacity>
          </View>

          <View className={`h-px my-3 ${isDarkMode ? 'bg-[#333333]' : 'bg-[#E0E0E0]'}`} />

          {unreadCount > 0 && (
            <View className="flex-row justify-between mb-3">
              <TouchableOpacity onPress={onMarkAllAsRead}>
                <Text className={`text-xs ${isDarkMode ? 'text-[#CCCCCC]' : 'text-[#666666]'}`}>Mark all read</Text>
              </TouchableOpacity>
      
                <Text className={`text-xs ${isDarkMode ? 'text-[#888888]' : 'text-[#999999]'}`}>Clear all</Text>
            </View>
          )}

          <ScrollView className="max-h-[400px]">
            {notifications.length === 0 ? (
              <View className="items-center gap-3 py-10">
                <Feather name="bell-off" size={40} color={isDarkMode ? '#888888' : '#999999'} />
                <Text className={`text-sm ${isDarkMode ? 'text-[#888888]' : 'text-[#999999]'}`}>No notifications</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  className={`flex-row items-start gap-3 py-3 relative ${!notification.read ? `mx-[-12px] px-3 rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}` : ''}`}
                  onPress={() => onMarkAsRead(notification.id)}
                >
                  <View className={`w-8 h-8 rounded-full justify-center items-center ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                    {getIcon(notification.type)}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {notification.title}
                    </Text>
                    <Text className={`text-xs mb-1 ${isDarkMode ? 'text-[#CCCCCC]' : 'text-[#666666]'}`}>
                      {notification.message}
                    </Text>
                    <Text className={`text-[10px] ${isDarkMode ? 'text-[#888888]' : 'text-[#999999]'}`}>
                      {notification.time}
                    </Text>
                  </View>
                  {!notification.read && (
                    <View className={`w-2 h-2 rounded-full absolute right-0 top-4 ${isDarkMode ? 'bg-white' : 'bg-black'}`} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {notifications.length > 0 && (
            <TouchableOpacity 
              className={`mt-4 py-2.5 items-center rounded-lg ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} 
              onPress={onClearAll}
            >
              <Text className={`text-xs font-semibold ${isDarkMode ? 'text-[#888888]' : 'text-[#999999]'}`}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default NotificationsModal;