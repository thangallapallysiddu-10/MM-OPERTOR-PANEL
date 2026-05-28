import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

const stickerSets = [
  { id: 1, emoji: "🎉", name: "Party" },
  { id: 2, emoji: "🎈", name: "Balloon" },
  { id: 3, emoji: "🎀", name: "Ribbon" },
  { id: 4, emoji: "💎", name: "Diamond" },
  { id: 5, emoji: "🌟", name: "Star" },
  { id: 6, emoji: "💥", name: "Explosion" },
  { id: 7, emoji: "⚡", name: "Lightning" },
  { id: 8, emoji: "💫", name: "Sparkle" },
];

interface StickerModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: any;
  onClose: () => void;
  onSendSticker: (sticker: { emoji: string; name: string }) => void;
}

export const StickerModal: React.FC<StickerModalProps> = ({
  visible,
  isDarkMode,
  colors,
  onClose,
  onSendSticker,
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
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>Send a Sticker 🎨</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            {stickerSets.map((sticker) => (
              <TouchableOpacity 
                key={sticker.id} 
                style={{
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  minWidth: 80,
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                }}
                onPress={() => { onSendSticker(sticker); onClose(); }}
              >
                <Text style={{ fontSize: 32 }}>{sticker.emoji}</Text>
                <Text style={{ fontSize: 11, marginTop: 4, color: isDarkMode ? '#FFFFFF' : '#000000' }}>{sticker.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};