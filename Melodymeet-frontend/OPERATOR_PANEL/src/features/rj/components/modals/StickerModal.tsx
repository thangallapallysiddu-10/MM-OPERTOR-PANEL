import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

// ─── Color tokens — matching Live Chat component ─────────────────────────────
const C = {
  rootBg:       '#0E0E12',   // outer container
  cardBg:       '#181820',   // card / deck surface
  raisedBg:     '#1E1E2A',   // slightly lifted surface
  border:       '#2A2A36',   // default border
  textPrimary:  '#FFFFFF',
  textSecondary:'#8B8FA8',
  textMuted:    '#4B5568',
  accent:       '#4F6AF0',   // indigo accent
  btnBg:        '#23232F',
  btnBorder:    '#2E2E3E',
  btnText:      '#C0C4D6',
  modalOverlay: 'rgba(0,0,0,0.85)',
};

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
      <View style={{ flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%',
          maxWidth: 420,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.cardBg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            backgroundColor: C.raisedBg,
          }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.textPrimary }}>
              Send a Sticker 🎨
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: C.btnBg,
                borderWidth: 1,
                borderColor: C.btnBorder,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="x" size={16} color={C.btnText} />
            </TouchableOpacity>
          </View>

          {/* Sticker Grid */}
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {stickerSets.map((sticker) => (
                <TouchableOpacity
                  key={sticker.id}
                  style={{
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    minWidth: 80,
                    backgroundColor: C.btnBg,
                    borderWidth: 1,
                    borderColor: C.btnBorder,
                  }}
                  onPress={() => {
                    onSendSticker(sticker);
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{sticker.emoji}</Text>
                  <Text style={{
                    fontSize: 11,
                    marginTop: 6,
                    fontWeight: '500',
                    color: C.textSecondary,
                  }}>
                    {sticker.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};