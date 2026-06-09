import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Message } from '../types';

interface PinnedMessageProps {
  pinnedMessage: Message | null;
  isDarkMode: boolean;
  colors: any;
  onUnpin: () => void;
}

export const PinnedMessage: React.FC<PinnedMessageProps> = ({
  pinnedMessage,
  isDarkMode,
  colors,
  onUnpin,
}) => {
  if (!pinnedMessage) return null;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      marginBottom: 12,
      borderRadius: 10,
      gap: 8,
      backgroundColor: isDarkMode ? '#1E3A8A18' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#2D4A9A' : '#C7D2FE',
    }}>
      <Ionicons name="pin" size={14} color="#4F6AF0" />
      <Text style={{ flex: 1, fontSize: 11, color: isDarkMode ? '#94A3B8' : '#475569' }} numberOfLines={2}>
        📌 {pinnedMessage.user}: {pinnedMessage.text}
      </Text>
      <TouchableOpacity
        onPress={onUnpin}
        style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
      >
        <Feather name="x" size={12} color={isDarkMode ? '#94A3B8' : '#475569'} />
      </TouchableOpacity>
    </View>
  );
};