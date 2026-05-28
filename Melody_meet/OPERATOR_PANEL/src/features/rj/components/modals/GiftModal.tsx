import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

const gifts = ["🎁", "🎉", "🎈", "🎀", "💎", "🌟", "❤️", "🔥"];

interface GiftModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
  onSendGift: (gift: string) => void;
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
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Send a Gift 🎁</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            {gifts.map((gift, index) => (
              <TouchableOpacity 
                key={index} 
                style={{
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  minWidth: 80,
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                }}
                onPress={() => { onSendGift(gift); onClose(); }}
              >
                <Text style={{ fontSize: 32 }}>{gift}</Text>
                <Text style={{ fontSize: 11, marginTop: 4, color: isDarkMode ? '#FFFFFF' : '#000000' }}>Send</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};