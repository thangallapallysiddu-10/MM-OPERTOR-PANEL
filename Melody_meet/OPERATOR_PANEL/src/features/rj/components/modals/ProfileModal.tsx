import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  colors: any;
  user?: { name?: string; email?: string; avatar?: string } | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, isDarkMode, colors, onClose, user }) => {
  // Use user data if available, otherwise fallback to demo data
  const displayName = user?.name || "DJ MAVERICK";
  const avatarLetter = user?.name?.charAt(0) || "DJ";
  const userEmail = user?.email || "operator@melodymeet.com";
  
  // Demo stats (these would come from backend in real app)
  const rjStats = {
    subscribers: 89,
    followers: 234,
    joinRate: "+24",
    leaveRate: "-8",
    isOnline: true
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
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>RJ Profile</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={15} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <View style={{
              width: 68,
              height: 68,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              backgroundColor: isDarkMode ? '#1E3A8A' : '#EEF2FF',
            }}>
              <Text style={{ fontSize: 26, fontWeight: '700', color: isDarkMode ? '#6B8EFF' : '#4F6AF0' }}>{avatarLetter}</Text>
              {rjStats.isOnline && (
                <View style={{ position: 'absolute', width: 14, height: 14, backgroundColor: '#059669', borderRadius: 7, bottom: -2, right: -2, borderWidth: 2, borderColor: isDarkMode ? '#1E293B' : '#FFFFFF' }} />
              )}
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>{displayName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#DC2626' }}>LIVE NOW</Text>
              </View>
              {userEmail && userEmail !== "operator@melodymeet.com" && (
                <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{userEmail}</Text>
              )}
            </View>
          </View>
          
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 16,
            borderRadius: 12,
            marginBottom: 4,
            backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          }}>
            {[
              { label: 'Subscribers', value: rjStats.subscribers },
              { label: 'Followers', value: rjStats.followers },
              { label: 'Join Rate', value: rjStats.joinRate },
              { label: 'Leave Rate', value: rjStats.leaveRate },
            ].map((stat, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>{stat.value}</Text>
                <Text style={{ fontSize: 10, marginTop: 2, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};