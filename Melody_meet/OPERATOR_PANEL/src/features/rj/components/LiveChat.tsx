import React, { useCallback, useRef, useEffect, useState } from 'react';
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
  onRestrictUser: (user: string, minutes: 5 | 10) => void;
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
  onBanUser,
  onRestrictUser,
  onUnbanUser,
  onClearChat,
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; user: string } | null>(null);

  useEffect(() => {
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

  // Use global click listener on web to close the context menu instead of onStartShouldSetResponder
  useEffect(() => {
    if (!isWeb) return;
    const closeMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = useCallback((e: any, username: string) => {
    if (username === 'RJ' || username === 'SYSTEM') return;
    
    e.preventDefault();
    e.stopPropagation();

    let menuX = e.clientX || e.pageX || 0;
    let menuY = e.clientY || e.pageY || 0;

    try {
      const target = e.target;
      if (target && typeof target.getBoundingClientRect === 'function') {
        const rect = target.getBoundingClientRect();
        const menuWidth = 180;
        const menuHeight = 150;
        menuX = rect.right + 8;
        menuY = rect.top;
        if (typeof window !== 'undefined') {
          if (menuX + menuWidth > window.innerWidth) menuX = window.innerWidth - menuWidth - 10;
          if (menuY + menuHeight > window.innerHeight) menuY = window.innerHeight - menuHeight - 10;
        }
        if (menuX < 10) menuX = 10;
        if (menuY < 10) menuY = 10;
      }
    } catch (err) {}

    setContextMenu({ x: menuX, y: menuY, user: username });
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (!item || !item.user || !item.text || item.text.trim() === '') return null;

    const isSystem = item.system === true;
    const isVIP = item.isVIP === true;
    const avatarLetter = item.avatar || item.user.charAt(0).toUpperCase();

    const content = (
      <View style={{
        flexDirection: 'row',
        marginBottom: 14,
        paddingHorizontal: 5,
        ...(!isSystem && { alignItems: 'flex-start' }),
      }}>
        {!isSystem && (
          <View style={{
            width: 34, height: 34, borderRadius: 10,
            justifyContent: 'center', alignItems: 'center', marginRight: 8,
            position: 'relative',
            backgroundColor: isDarkMode ? '#1E3A8A' : '#EEF2FF',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#6B8EFF' : '#4F6AF0' }}>
              {avatarLetter}
            </Text>
          </View>
        )}
        
        <View style={{
          flex: 1,
          ...(!isSystem && {
            borderRadius: 12,
            padding: 10,
            backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
          })
        }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 3, flexWrap: 'wrap', gap: 4,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>
              {item.user}
            </Text>
            {isVIP && (
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#D97706' }}>ðŸ‘‘ VIP</Text>
            )}
            <Text style={{ fontSize: 9, color: isDarkMode ? '#64748B' : '#94A3B8' }}>
              {item.time}
            </Text>
          </View>
          
          <Text style={{
            fontSize: 13, lineHeight: 19,
            color: isSystem ? (isDarkMode ? '#64748B' : '#94A3B8') : (isDarkMode ? '#E2E8F0' : '#334155'),
            flexWrap: 'wrap', flexShrink: 1,
          }}>
            {item.text}
          </Text>
          
          {!isSystem && typeof item.likeCount === 'number' && item.likeCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="heart" size={11} color="#DC2626" />
              <Text style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8' }}>{item.likeCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );

    // On Web, we MUST replace TouchableOpacity with a standard HTML element entirely to ensure 
    // the gesture system doesn't swallow native right clicks.
    if (isWeb) {
      return (
        <div
          key={item.id}
          onContextMenu={(e) => handleContextMenu(e, item.user)}
          onClick={() => {
            setContextMenu(null);
            onLikeMessage(item.id);
          }}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
        >
          {content}
        </div>
      );
    }

    // On Native mobile, keep TouchableOpacity
    return (
      <View key={item.id}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setContextMenu(null);
            onLikeMessage(item.id);
          }}
          onLongPress={() => onReply(item.user)}
          delayLongPress={300}
        >
          {content}
        </TouchableOpacity>
      </View>
    );
  }, [isDarkMode, onLikeMessage, onReply, handleContextMenu]);

  const handleContentSizeChange = useCallback(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [flatListRef]);

  const messageCount = filteredMessages.length;
  
  const currentEmojis = emojiCategories[activeEmojiCategory] || [];
  const displayEmojis = currentEmojis.slice(0, 20);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'smileys':   '😊',
      'music':     '🎵',
      'reactions': '👍',
      'hearts':    '❤️',
      'fire':      '🔥',
    };
    return icons[category] || '😊';
  };
  return (
    <View style={{
      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
      borderRadius: 14,
      overflow: 'visible',
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04,
      shadowRadius: 4,
      elevation: 2,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>
            LIVE CHAT
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
            backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
          }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#DC2626' }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#DC2626' }}>LIVE</Text>
          </View>
          <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#94A3B8' }}>({messageCount})</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { label: 'Gift', icon: 'gift', action: onOpenGiftModal, isFa: true },
            { label: 'Sticker', icon: 'smile', action: onOpenStickerModal, isFa: false },
            { label: 'Ban', icon: 'slash', action: onToggleBanList, isFa: false },
            { label: 'Clear', icon: 'trash-2', action: onClearChat, isFa: false },
          ].map(({ label, icon, action, isFa }) => (
            <TouchableOpacity
              key={label}
              onPress={action}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
              }}
            >
              {isFa
                ? <FontAwesome5 name={icon as any} size={12} color={isDarkMode ? '#94A3B8' : '#475569'} />
                : <Feather name={icon as any} size={12} color={isDarkMode ? '#94A3B8' : '#475569'} />
              }
              <Text style={{ fontSize: 11, fontWeight: '500', color: isDarkMode ? '#94A3B8' : '#475569' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ban List */}
      {showBanList && (
        <View style={{
          padding: 12, borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0',
          backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, color: isDarkMode ? '#64748B' : '#94A3B8' }}>
            BANNED USERS
          </Text>
          {bannedUsers.length === 0 ? (
            <Text style={{ fontSize: 12, color: isDarkMode ? '#64748B' : '#94A3B8' }}>No banned users</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {bannedUsers.map(user => (
                <View key={user} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: isDarkMode ? '#F1F5F9' : '#0F172A' }}>{user}</Text>
                  <TouchableOpacity
                    onPress={() => onUnbanUser(user)}
                    style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>Unban</Text>
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
        style={{ height: 300, backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }}
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
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
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: 10, marginHorizontal: 12, marginBottom: 8,
          borderRadius: 9, borderWidth: 1,
          borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
        }}>
          <Feather name="corner-up-left" size={13} color={isDarkMode ? '#94A3B8' : '#475569'} />
          <Text style={{ fontSize: 11, flex: 1, marginHorizontal: 8, color: isDarkMode ? '#94A3B8' : '#475569' }}>
            Replying to @{replyTo.user}
          </Text>
          <TouchableOpacity
            onPress={onCancelReply}
            style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}
          >
            <Feather name="x" size={11} color={isDarkMode ? '#94A3B8' : '#475569'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
        <View style={{ flexDirection: 'row', gap: 8, position: 'relative' }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput
              value={newMessage}
              onChangeText={onNewMessageChange}
              onSubmitEditing={onSendMessage}
              placeholder={replyTo ? `Reply to @${replyTo.user}...` : "Type a message..."}
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              style={{
                borderRadius: 10, paddingHorizontal: 14,
                paddingVertical: Platform.select({ ios: 13, android: 10, default: 11 }),
                fontSize: 13, paddingRight: 44,
                backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
                borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                color: isDarkMode ? '#F1F5F9' : '#0F172A',
              }}
              returnKeyType="send"
              blurOnSubmit
              enablesReturnKeyAutomatically
              multiline={isWeb}
              numberOfLines={1}
            />
            <TouchableOpacity onPress={onToggleEmojiPicker} style={{ position: 'absolute', right: 11, top: 10 }}>
              <Text style={{ fontSize: 17 }}>ðŸ˜Š</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onSendMessage}
            style={{
              paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
              justifyContent: 'center',
              backgroundColor: '#4F6AF0',
              opacity: newMessage.trim().length > 0 ? 1 : 0.4,
            }}
            disabled={newMessage.trim().length === 0}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <View style={{
            marginTop: 10, borderRadius: 12, borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
            backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
            overflow: 'hidden',
          }}>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={{ borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0', backgroundColor: isDarkMode ? '#263347' : '#F8FAFC' }}
              contentContainerStyle={{ paddingHorizontal: 8 }}
            >
              {Object.keys(emojiCategories).map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => onSetActiveEmojiCategory(category as keyof typeof emojiCategories)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 9,
                    borderBottomWidth: 2,
                    borderBottomColor: activeEmojiCategory === category ? '#4F6AF0' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 20, opacity: activeEmojiCategory === category ? 1 : 0.55 }}>
                    {getCategoryIcon(category)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ padding: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {displayEmojis.map((emoji: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => onAddEmoji(emoji)}
                    style={{
                      padding: 7, margin: 3, borderRadius: 8,
                      backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Context Menu */}
      {isWeb && contextMenu && (
        <View style={{
          position: 'fixed' as any,
          top: contextMenu.y, left: contextMenu.x,
          width: 180, zIndex: 9999, borderRadius: 10,
          borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
          backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', padding: 10, color: isDarkMode ? '#94A3B8' : '#475569' }}>
            {contextMenu.user}
          </Text>
          <TouchableOpacity onPress={() => { onRestrictUser(contextMenu.user, 5); setContextMenu(null); }} style={{ paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#F1F5F9' }}>
            <Text style={{ fontSize: 12, color: '#D97706' }}>Restrict 5 min</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { onRestrictUser(contextMenu.user, 10); setContextMenu(null); }} style={{ paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#F1F5F9' }}>
            <Text style={{ fontSize: 12, color: '#D97706' }}>Restrict 10 min</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { onBanUser(contextMenu.user); setContextMenu(null); }} style={{ paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#F1F5F9' }}>
            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>Ban User</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
