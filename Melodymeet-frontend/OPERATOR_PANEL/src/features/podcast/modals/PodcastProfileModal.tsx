import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface PodcastProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userAvatar: string;
  isDarkMode: boolean;
}

const PodcastProfileModal: React.FC<PodcastProfileModalProps> = ({
  visible,
  onClose,
  userName,
  userEmail,
  userAvatar,
  isDarkMode,
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 80, paddingRight: 16, backgroundColor: 'rgba(0,0,0,0.4)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{
          width: isMobile ? 280 : 310,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.25 : 0.08,
          shadowRadius: 12,
          elevation: 6,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 46, height: 46, borderRadius: 12,
              backgroundColor: isDarkMode ? '#1E3A8A' : '#EEF2FF',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: isDarkMode ? '#6B8EFF' : '#4F6AF0' }}>{userAvatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>{userName}</Text>
              <Text style={{ fontSize: 12, marginTop: 2, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{userEmail}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default PodcastProfileModal;