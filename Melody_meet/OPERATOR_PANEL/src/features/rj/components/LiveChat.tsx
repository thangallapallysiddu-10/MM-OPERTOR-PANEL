// LiveChat.tsx - WITH EMOJI PICKER FIXED (Categories work, 2 rows only)

import React, { useCallback, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, FlatList, ScrollView, 
  Platform, Keyboard
} from 'react-native';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Message } from '../types';
import { emojiCategories } from '../constants';

interface LiveChatProps {
  messages: Message[];
  filteredMessages: Message[];
  newMessage: string;
  replyTo: { user: string } | null;
  bannedUsers: string[];
  showBanList: boolean;
  showEmojiPicker: boolean;
  activeEmojiCategory: keyof typeof emojiCategories;
  isDarkMode: boolean;
  colors: any;
  flatListRef: React.RefObject<FlatList<any>>;
  isAtBottom: boolean;
  typingUsers: { [key: string]: boolean };
  pinnedMessage: Message | null;
  onSendMessage: () => void;
  onNewMessageChange: (text: string) => void;
  onLikeMessage: (messageId: number) => void;
  onReply: (user: string) => void;
  onShareMessage: (text: string, user: string) => void;
  onBanUser: (user: string) => void;
  onUnbanUser: (user: string) => void;
  onClearChat: () => void;
  onPinMessage: (message: Message) => void;
  onToggleEmojiPicker: () => void;
  onAddEmoji: (emoji: string) => void;
  onSetActiveEmojiCategory: (category: keyof typeof emojiCategories) => void;
  onCancelReply: () => void;
  onOpenGiftModal: () => void;
  onOpenStickerModal: () => void;
  onToggleBanList: () => void;
  onScroll: (event: any) => void;
}

const isWeb = Platform.OS === 'web';
const isNative = Platform.OS !== 'web';

export const LiveChat: React.FC<LiveChatProps> = ({
  filteredMessages,
  newMessage,
  replyTo,
  bannedUsers,
  showBanList,
  showEmojiPicker,
  activeEmojiCategory,
  isDarkMode,
  flatListRef,
  onSendMessage,
  onNewMessageChange,
  onLikeMessage,
  onReply,
  onShareMessage,
  onBanUser,
  onUnbanUser,
  onClearChat,
  onPinMessage,
  onToggleEmojiPicker,
  onAddEmoji,
  onSetActiveEmojiCategory,
  onCancelReply,
  onOpenGiftModal,
  onOpenStickerModal,
  onToggleBanList,
  onScroll,
}) => {
  const isKeyboardVisibleRef = useRef(false);

  React.useEffect(() => {
    if (!isNative) return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardVisibleRef.current = true;
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (!item) return null;
    if (!item.user || typeof item.user !== 'string') return null;
    if (!item.text || typeof item.text !== 'string') return null;
    if (item.text.trim() === '') return null;

    const isSystem = item.system === true;
    const isVIP = item.isVIP === true;
    const avatarLetter = item.avatar || item.user.charAt(0).toUpperCase();

    return (
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => onLikeMessage(item.id)} 
        onLongPress={() => onReply(item.user)} 
        delayLongPress={300}
        key={item.id}
      >
        <View style={{
          flexDirection: 'row',
          marginBottom: 14,
          paddingHorizontal: 5,
          ...(!isSystem && { alignItems: 'flex-start' }),
        }}>
          {!isSystem && (
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
              position: 'relative',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#000' }}>
                {avatarLetter}
              </Text>
            </View>
          )}
          
          <View style={{ 
            flex: 1, 
            ...(!isSystem && { 
              borderRadius: 16, 
              padding: 10, 
              backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' 
            })
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 4, 
              flexWrap: 'wrap', 
              gap: 5 
            }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDarkMode ? '#FFF' : '#000' }}>
                {item.user}
              </Text>
              {isVIP && (
                <Text style={{ fontSize: 10, fontWeight: '500', color: '#F59E0B' }}>👑 VIP</Text>
              )}
              <Text style={{ fontSize: 9, color: isDarkMode ? '#6B7280' : '#9CA3AF' }}>
                {item.time}
              </Text>
            </View>
            
            <Text style={{ 
              fontSize: 14, 
              lineHeight: 20, 
              color: isSystem ? (isDarkMode ? '#9CA3AF' : '#6B7280') : (isDarkMode ? '#FFFFFF' : '#000000'),
              flexWrap: 'wrap',
              flexShrink: 1,
            }}>
              {item.text}
            </Text>
            
            {!isSystem && item.likeCount && item.likeCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                <Ionicons name="heart" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={{ fontSize: 10, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  {item.likeCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [isDarkMode, onLikeMessage, onReply]);

  const handleContentSizeChange = useCallback(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [flatListRef]);

  const messageCount = filteredMessages.length;
  
  // Get current category emojis and take only first 20 for 2 rows
  const currentEmojis = emojiCategories[activeEmojiCategory] || [];
  const displayEmojis = currentEmojis.slice(0, 20);

  const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    'smileys': '😊',
    'music': '🎵',
    'reactions': '👍',
    'hearts': '❤️',
    'fire': '🔥',
  };
  return icons[category] || '😊';
};
  return (
    <View style={{
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderRadius: 12,
      overflow: 'visible',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
            LIVE CHAT
          </Text>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 4, 
            paddingHorizontal: 6, 
            paddingVertical: 2, 
            borderRadius: 12, 
            backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' 
          }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }} />
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: isDarkMode ? '#000000' : '#FFFFFF' }}>
              LIVE
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
            ({messageCount})
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onOpenGiftModal} style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 4, 
            paddingHorizontal: 10, 
            paddingVertical: 6, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
            backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' 
          }}>
            <FontAwesome5 name="gift" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
              Gift
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onOpenStickerModal} style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 4, 
            paddingHorizontal: 10, 
            paddingVertical: 6, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
            backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' 
          }}>
            <Feather name="smile" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
              Sticker
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onToggleBanList} style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 4, 
            paddingHorizontal: 10, 
            paddingVertical: 6, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
            backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' 
          }}>
            <Feather name="slash" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
              Ban
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onClearChat} style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 4, 
            paddingHorizontal: 10, 
            paddingVertical: 6, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
            backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' 
          }}>
            <Feather name="trash-2" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ban List */}
      {showBanList && (
        <View style={{ 
          padding: 12, 
          borderBottomWidth: 1, 
          borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB', 
          backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' 
        }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
            BANNED USERS
          </Text>
          {bannedUsers.length === 0 ? (
            <Text style={{ fontSize: 11, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
              No banned users
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              {bannedUsers.map(user => (
                <View key={user} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                    {user}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => onUnbanUser(user)} 
                    style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: isDarkMode ? '#6B7280' : '#9CA3AF' }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '500', color: '#FFFFFF' }}>
                      Unban
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={filteredMessages}
        keyExtractor={(item) => String(item.id)}
        style={{ height: 320, backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }}
        contentContainerStyle={{ padding: 14, paddingBottom: 20 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={renderMessage}
        onContentSizeChange={handleContentSizeChange}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={isWeb}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {/* Reply indicator */}
      {replyTo && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 10, 
          marginHorizontal: 14, 
          marginBottom: 10, 
          borderRadius: 10, 
          borderWidth: 1, 
          borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
          backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' 
        }}>
          <Feather name="corner-up-left" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={{ fontSize: 11, flex: 1, marginHorizontal: 8, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
            Replying to @{replyTo.user}
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <Text style={{ fontSize: 14, color: '#9CA3AF' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
        <View style={{ flexDirection: 'row', gap: 10, position: 'relative' }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput 
              value={newMessage} 
              onChangeText={onNewMessageChange} 
              onSubmitEditing={onSendMessage} 
              placeholder={replyTo ? `Reply to @${replyTo.user}...` : "Type a message..."} 
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
              style={{
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: Platform.select({ ios: 14, android: 10, default: 12 }),
                fontSize: 13,
                paddingRight: 45,
                backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                borderWidth: 1,
                borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}
              returnKeyType="send"
              blurOnSubmit={true}
              enablesReturnKeyAutomatically={true}
              multiline={isWeb}
              numberOfLines={1}
            />
            <TouchableOpacity onPress={onToggleEmojiPicker} style={{ position: 'absolute', right: 12, top: 10 }}>
              <Text style={{ fontSize: 18 }}>😊</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={onSendMessage} 
            style={{ 
              paddingHorizontal: 18, 
              paddingVertical: 12, 
              borderRadius: 24, 
              justifyContent: 'center', 
              backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
              opacity: newMessage.trim().length > 0 ? 1 : 0.5,
            }}
            disabled={newMessage.trim().length === 0}
          >
            <Feather name="send" size={18} color={isDarkMode ? "#000000" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>

        {/* EMOJI PICKER - Categories on top, 2 rows only */}
        {showEmojiPicker && (
          <View style={{
            marginTop: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            overflow: 'hidden',
          }}>
            {/* Category Tabs - Full width, top */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
                backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              }}
              contentContainerStyle={{ paddingHorizontal: 8 }}
            >
              {Object.keys(emojiCategories).map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => onSetActiveEmojiCategory(category as keyof typeof emojiCategories)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: activeEmojiCategory === category 
                      ? (isDarkMode ? '#FFFFFF' : '#000000')
                      : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 22, opacity: activeEmojiCategory === category ? 1 : 0.6 }}>
                    {getCategoryIcon(category)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emojis Grid - ONLY 2 ROWS (max 20 emojis) */}
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {displayEmojis.map((emoji: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => onAddEmoji(emoji)}
                    style={{
                      padding: 8,
                      margin: 4,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};