import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ProfileModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, isDarkMode, colors, onClose }) => {
  const rjProfile = {
    name: "DJ MAVERICK",
    avatar: "DJ",
    followers: "12.5K",
    joinRate: "+24",
    leaveRate: "-8",
    isOnline: true
  };

  const rjStats = {
    subscribers: 89,
    followers: 234,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%',
          maxWidth: 420,
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>RJ Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{rjProfile.avatar}</Text>
              {rjProfile.isOnline && (
                <View style={{ position: 'absolute', width: 16, height: 16, backgroundColor: '#22C55E', borderRadius: 8, bottom: 4, right: 4, borderWidth: 2, borderColor: '#FFFFFF' }} />
              )}
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{rjProfile.name}</Text>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>● Live Now</Text>
            </View>
          </View>
          
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 18,
            borderRadius: 12,
            marginBottom: 24,
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{rjStats.subscribers}</Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Subscribers</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{rjStats.followers}</Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Followers</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>{rjProfile.joinRate}</Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Join Rate</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{rjProfile.leaveRate}</Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Leave Rate</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};