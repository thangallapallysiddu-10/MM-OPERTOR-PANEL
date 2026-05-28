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
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
    }}>
      <Ionicons name="pin" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
      <Text style={{ flex: 1, fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }} numberOfLines={2}>
        📌 Pinned: {pinnedMessage.user}: {pinnedMessage.text}
      </Text>
      <TouchableOpacity onPress={onUnpin}>
        <Feather name="x" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
      </TouchableOpacity>
    </View>
  );
};