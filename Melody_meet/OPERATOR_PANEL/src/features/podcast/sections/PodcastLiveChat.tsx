import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export interface PodcastChatMessage {
  id: string;
  senderName: string;
  senderRole: 'host' | 'guest' | 'listener' | 'system';
  text: string;
  createdAt?: string;
}

interface PodcastLiveChatProps {
  isLive: boolean;
  messages: PodcastChatMessage[];
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  colors: any;
}

export const PodcastLiveChat: React.FC<PodcastLiveChatProps> = ({
  isLive,
  messages,
  value,
  onChangeText,
  onSend,
  colors,
}) => {
  const flatListRef = useRef<FlatList<PodcastChatMessage>>(null);
  const isDarkMode = colors.background === '#121212';

  const formatMessageTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = useCallback(({ item }: { item: PodcastChatMessage }) => {
    if (!item?.text?.trim()) return null;

    const isSystem = item.senderRole === 'system';
    const isHost = item.senderRole === 'host';
    const avatarLetter = isHost ? 'O' : item.senderRole === 'listener' ? 'U' : 'G';
    const displayName = isHost ? item.senderName || 'Operator' : item.senderName || 'OpenConnect User';
    const time = formatMessageTime(item.createdAt);

    return (
      <View
        style={{
          flexDirection: 'row',
          marginBottom: 14,
          paddingHorizontal: 5,
          ...(!isSystem && { alignItems: 'flex-start' }),
        }}
      >
        {!isSystem && (
          <View
            style={{
              width: 34, height: 34, borderRadius: 10,
              justifyContent: 'center', alignItems: 'center', marginRight: 8,
              backgroundColor: isDarkMode ? '#263347' : '#EEF2FF',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#6B8EFF' : '#4F6AF0' }}>{avatarLetter}</Text>
          </View>
        )}

        <View
          style={{
            flex: 1,
            ...(!isSystem && {
              borderRadius: 12,
              padding: 10,
              backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
            }),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
              flexWrap: 'wrap',
              gap: 5,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>
              {isSystem ? 'SYSTEM' : displayName}
            </Text>
            {time ? (
              <Text style={{ fontSize: 9, color: colors.textMuted }}>{time}</Text>
            ) : null}
          </View>

          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: isSystem ? colors.textSecondary : colors.text,
              flexWrap: 'wrap',
              flexShrink: 1,
            }}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  }, [colors, isDarkMode]);

  const handleContentSizeChange = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
  }, []);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.cardBorder,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: colors.text }}>
            OPENCONNECT CHAT
          </Text>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
              backgroundColor: isLive ? '#ECFDF5' : colors.cardBorder,
              borderWidth: 1,
              borderColor: isLive ? '#A7F3D0' : 'transparent',
            }}
          >
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isLive ? '#059669' : colors.textMuted }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: isLive ? '#059669' : colors.textMuted }}>
              {isLive ? 'LIVE' : 'OFF'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>({messages.length})</Text>
        </View>

        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 8, borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.surface,
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSec ?? colors.textSecondary }}>Users</Text>
        </View>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={{ height: 280, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.card }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
            <Feather name="message-circle" size={20} color={colors.textMuted} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
            {isLive ? 'No messages yet' : 'Start live to open chat'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          style={{ height: 280, backgroundColor: colors.card }}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          renderItem={renderMessage}
          onContentSizeChange={handleContentSizeChange}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      {/* Input */}
      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSend}
            editable={isLive}
            placeholder={isLive ? 'Type a message...' : 'Chat opens when live'}
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1, borderRadius: 10, paddingHorizontal: 14,
              paddingVertical: Platform.select({ ios: 13, android: 10, default: 11 }),
              fontSize: 13, backgroundColor: colors.surface,
              borderWidth: 1, borderColor: colors.cardBorder, color: colors.text,
            }}
            returnKeyType="send"
            blurOnSubmit
            enablesReturnKeyAutomatically
            multiline={Platform.OS === 'web'}
            numberOfLines={1}
            maxLength={500}
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={!isLive || value.trim().length === 0}
            style={{
              paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
              justifyContent: 'center',
              backgroundColor: '#4F6AF0',
              opacity: isLive && value.trim().length > 0 ? 1 : 0.4,
            }}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
