import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

const gifts = [
  { id: 'gold-mic', emoji: '🎤', label: 'Gold Mic' },
  { id: 'party-rocket', emoji: '🚀', label: 'Party Rocket' },
  { id: 'diamond-vinyl', emoji: '💿', label: 'Diamond Vinyl' },
  { id: 'crown-wave', emoji: '👑', label: 'Crown Wave' },
  { id: 'firestorm', emoji: '🔥', label: 'Firestorm' },
];

interface GiftModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
  onSendGift: (gift: { id: string; emoji: string; label: string }) => void;
}

export const GiftModal: React.FC<GiftModalProps> = ({
  visible,
  isDarkMode,
  colors,
  onClose,
  onSendGift,
}) => {
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Send a Gift 🎁</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={15} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {gifts.map((gift) => (
              <TouchableOpacity
                key={gift.id}
                style={{
                  alignItems: 'center', padding: 14, borderRadius: 14, minWidth: 80,
                  backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
                  borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                }}
                onPress={() => { onSendGift(gift); onClose(); }}
              >
                <Text style={{ fontSize: 30 }}>{gift.emoji}</Text>
                <Text style={{ fontSize: 11, marginTop: 5, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>{gift.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};