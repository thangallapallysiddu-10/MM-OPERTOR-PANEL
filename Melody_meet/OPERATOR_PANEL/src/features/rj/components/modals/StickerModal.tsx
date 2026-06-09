import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

const stickerSets = [
  { id: 1, emoji: "🙌", name: "Hype" },
  { id: 2, emoji: "😂", name: "Laugh" },
  { id: 3, emoji: "😮", name: "Shock" },
  { id: 4, emoji: "🕺", name: "Vibe" },
  { id: 5, emoji: "🎧", name: "Headphones" },
  { id: 6, emoji: "🎶", name: "Notes" },
  { id: 7, emoji: "🐐", name: "GOAT" },
  { id: 8, emoji: "✨", name: "Sparkle" },
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
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>Send a Sticker 🎨</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
            >
              <Feather name="x" size={15} color={isDarkMode ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {stickerSets.map((sticker) => (
              <TouchableOpacity
                key={sticker.id}
                style={{
                  alignItems: 'center', padding: 14, borderRadius: 14, minWidth: 80,
                  backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
                  borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                }}
                onPress={() => { onSendSticker(sticker); onClose(); }}
              >
                <Text style={{ fontSize: 30 }}>{sticker.emoji}</Text>
                <Text style={{ fontSize: 11, marginTop: 5, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>{sticker.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};