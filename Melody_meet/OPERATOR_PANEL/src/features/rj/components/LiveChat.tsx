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
  onOpenStickerModal: () => void;
  onToggleBanList: () => void;
  onScroll: (event: any) => void;
}

const isWeb = Platform.OS === 'web';
const isNative = Platform.OS !== 'web';

// ─── Color tokens — same as DualPlayer ───────────────────────────────────────
const C = {
  rootBg:       '#0E0E12',   // outer container
  cardBg:       '#181820',   // card / deck surface
  raisedBg:     '#1E1E2A',   // slightly lifted surface (message bubbles, inputs)
  border:       '#2A2A36',   // default border
  borderHover:  '#3A3A4E',   // hover / active border

  textPrimary:  '#FFFFFF',
  textSecondary:'#8B8FA8',
  textMuted:    '#4B5568',

  // Accent — matches DualPlayer's indigo send button / crossfader
  accent:       '#4F6AF0',

  // Live badge
  liveBadgeBg:  '#2D0A0A',
  liveBadgeBdr: '#5C1A1A',
  liveDot:      '#DC2626',
  liveText:     '#DC2626',

  // Header buttons — same style as DualPlayer's ctrl-btn
  btnBg:        '#23232F',
  btnBorder:    '#2E2E3E',
  btnText:      '#C0C4D6',

  // Message bubble
  bubbleBg:     '#1E1E2A',
  bubbleBorder: '#2A2A36',

  // Reply bar
  replyBg:      '#1E1E2A',
  replyBorder:  '#2A2A36',

  // Input
  inputBg:      '#1E1E2A',
  inputBorder:  '#2A2A36',
  inputText:    '#FFFFFF',
  placeholder:  '#4B5568',

  // Emoji picker
  emojiTabBg:   '#1E1E2A',
  emojiGridBg:  '#181820',
  emojiItemBg:  '#23232F',

  // Context menu
  menuBg:       '#181820',
  menuBorder:   '#2A2A36',
};

// User avatar colour palette — same vibe as before, works on dark bg
const USER_COLORS = [
  '#38BDF8', '#FACC15', '#FB923C', '#4ADE80',
  '#F472B6', '#A78BFA', '#22D3EE', '#FCA5A5',
];
const getUserColor = (username: string): string => {
  if (!username) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

export const LiveChat: React.FC<LiveChatProps> = ({
  filteredMessages,
  newMessage,
  replyTo,
  showEmojiPicker,
  activeEmojiCategory,
  flatListRef,
  onSendMessage,
  onNewMessageChange,
  onLikeMessage,
  onReply,
  onBanUser,
  onRestrictUser,
  onClearChat,
  onToggleEmojiPicker,
  onAddEmoji,
  onSetActiveEmojiCategory,
  onCancelReply,
  onOpenStickerModal,
  onScroll,
}) => {
  const isKeyboardVisibleRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; user: string } | null>(null);

  useEffect(() => {
    if (!isNative) return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => { isKeyboardVisibleRef.current = true; });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => { isKeyboardVisibleRef.current = false; });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (!isWeb) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleContextMenu = useCallback((e: any, username: string) => {
    if (username === 'RJ' || username === 'SYSTEM') return;
    e.preventDefault();
    e.stopPropagation();
    let menuX = e.clientX || e.pageX || 0;
    let menuY = e.clientY || e.pageY || 0;
    try {
      const rect = e.target?.getBoundingClientRect?.();
      if (rect) {
        const mW = 180, mH = 150;
        menuX = rect.right + 8;
        menuY = rect.top;
        if (typeof window !== 'undefined') {
          if (menuX + mW > window.innerWidth)  menuX = window.innerWidth  - mW - 10;
          if (menuY + mH > window.innerHeight) menuY = window.innerHeight - mH - 10;
        }
        if (menuX < 10) menuX = 10;
        if (menuY < 10) menuY = 10;
      }
    } catch (_) {}
    setContextMenu({ x: menuX, y: menuY, user: username });
  }, []);

  // ─── Message row ───────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (!item?.user || !item?.text?.trim()) return null;

    const isSystem  = item.system === true;
    const isVIP     = item.isVIP === true;
    const letter    = (item.avatar || item.user.charAt(0)).toUpperCase();
    const userColor = getUserColor(item.user);

    const content = (
      <View style={{
        flexDirection: 'row',
        marginBottom: 10,
        paddingHorizontal: 4,
        alignItems: isSystem ? 'center' : 'flex-start',
      }}>
        {!isSystem && (
          <View style={{
            width: 34, height: 34, borderRadius: 10,
            justifyContent: 'center', alignItems: 'center',
            marginRight: 8,
            backgroundColor: userColor + '22',
            borderWidth: 1,
            borderColor: userColor + '55',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: userColor }}>
              {letter}
            </Text>
          </View>
        )}

        <View style={{
          flex: 1,
          ...(isSystem ? {} : {
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: C.bubbleBg,
            borderWidth: 1,
            borderColor: C.bubbleBorder,
          }),
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 3,
            flexWrap: 'wrap', gap: 4,
          }}>
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: isSystem ? C.textSecondary : userColor,
            }}>
              {item.user}
            </Text>
            {isVIP && (
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#D97706' }}>👑 VIP</Text>
            )}
            <Text style={{ fontSize: 9, color: C.textMuted }}>{item.time}</Text>
          </View>

          <Text style={{ fontSize: 13, lineHeight: 19, color: C.textPrimary, flexShrink: 1 }}>
            {item.text}
          </Text>

          {!isSystem && typeof item.likeCount === 'number' && item.likeCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="heart" size={11} color="#DC2626" />
              <Text style={{ fontSize: 10, color: C.textMuted }}>{item.likeCount}</Text>
            </View>
          )}
        </View>
      </View>
    );

    if (isWeb) {
      return (
        <div
          key={item.id}
          onContextMenu={(e) => handleContextMenu(e, item.user)}
          onClick={() => { setContextMenu(null); onLikeMessage(item.id); }}
          style={{ cursor: 'pointer' }}
        >
          {content}
        </div>
      );
    }

    return (
      <View key={item.id}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => { setContextMenu(null); onLikeMessage(item.id); }}
          onLongPress={() => onReply(item.user)}
          delayLongPress={300}
        >
          {content}
        </TouchableOpacity>
      </View>
    );
  }, [onLikeMessage, onReply, handleContextMenu]);

  const handleContentSizeChange = useCallback(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [flatListRef]);

  const currentEmojis  = (emojiCategories[activeEmojiCategory] || []).slice(0, 20);
  const messageCount   = filteredMessages.length;

  const getCategoryIcon = (cat: string) =>
    ({ smileys: '😊', music: '🎵', reactions: '👍', hearts: '❤️', fire: '🔥' }[cat] ?? '😊');

  // ─── Shared header-button style ────────────────────────────────────────────
  const hdrBtn = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder,
  };

  return (
    <View style={{
      backgroundColor: C.rootBg,
      borderRadius: 14,
      overflow: 'visible',
      borderWidth: 1,
      borderColor: C.border,
    }}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderBottomWidth: 1, borderBottomColor: C.border,
        flexWrap: 'wrap', gap: 8,
        backgroundColor: C.cardBg,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textPrimary }}>
            LIVE CHAT
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
            backgroundColor: C.liveBadgeBg, borderWidth: 1, borderColor: C.liveBadgeBdr,
          }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.liveDot }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: C.liveText }}>LIVE</Text>
          </View>
          <Text style={{ fontSize: 12, color: C.textMuted }}>({messageCount})</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={onOpenStickerModal} style={hdrBtn}>
            <Feather name="smile" size={12} color={C.btnText} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: C.btnText }}>Sticker</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClearChat} style={hdrBtn}>
            <Feather name="trash-2" size={12} color={C.btnText} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: C.btnText }}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={filteredMessages}
        keyExtractor={(item) => String(item.id)}
        style={{ height: 300, backgroundColor: C.rootBg }}
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

      {/* ── Reply indicator ── */}
      {replyTo && (
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 12, paddingVertical: 8,
          marginHorizontal: 12, marginBottom: 8,
          borderRadius: 9, borderWidth: 1,
          borderColor: C.replyBorder,
          backgroundColor: C.replyBg,
        }}>
          <Feather name="corner-up-left" size={13} color={C.textSecondary} />
          <Text style={{ fontSize: 11, flex: 1, marginHorizontal: 8, color: C.textSecondary }}>
            Replying to @{replyTo.user}
          </Text>
          <TouchableOpacity
            onPress={onCancelReply}
            style={{
              width: 20, height: 20, borderRadius: 5,
              backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Feather name="x" size={11} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input row ── */}
      <View style={{
        padding: 12,
        borderTopWidth: 1, borderTopColor: C.border,
        backgroundColor: C.cardBg,
        borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
      }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput
              value={newMessage}
              onChangeText={onNewMessageChange}
              onSubmitEditing={onSendMessage}
              placeholder={replyTo ? `Reply to @${replyTo.user}...` : 'Type your message...'}
              placeholderTextColor={C.placeholder}
              style={{
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: Platform.select({ ios: 13, android: 10, default: 11 }),
                fontSize: 13,
                paddingRight: 44,
                backgroundColor: C.inputBg,
                borderWidth: 1,
                borderColor: C.inputBorder,
                color: C.inputText,
              }}
              returnKeyType="send"
              blurOnSubmit
              enablesReturnKeyAutomatically
              multiline={isWeb}
              numberOfLines={1}
            />
            <TouchableOpacity
              onPress={onToggleEmojiPicker}
              style={{ position: 'absolute', right: 11, top: 10 }}
            >
              <Text style={{ fontSize: 18 }}>😊</Text>
            </TouchableOpacity>
          </View>

          
          <TouchableOpacity
            onPress={onSendMessage}
            disabled={newMessage.trim().length === 0}
            style={{
              paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: C.accent,
              opacity: newMessage.trim().length > 0 ? 1 : 0.35,
            }}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Emoji picker ── */}
        {showEmojiPicker && (
          <View style={{
            marginTop: 10, borderRadius: 12, borderWidth: 1,
            borderColor: C.border, backgroundColor: C.emojiGridBg,
            overflow: 'hidden',
          }}>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={{ borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.emojiTabBg }}
              contentContainerStyle={{ paddingHorizontal: 8 }}
            >
              {Object.keys(emojiCategories).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => onSetActiveEmojiCategory(cat as keyof typeof emojiCategories)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 9,
                    borderBottomWidth: 2,
                    borderBottomColor: activeEmojiCategory === cat ? C.accent : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 20, opacity: activeEmojiCategory === cat ? 1 : 0.45 }}>
                    {getCategoryIcon(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ padding: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {currentEmojis.map((emoji: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onAddEmoji(emoji)}
                    style={{
                      padding: 7, margin: 3, borderRadius: 8,
                      backgroundColor: C.emojiItemBg,
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

      {/* ── Context menu (web only) ── */}
      {isWeb && contextMenu && (
        <View style={{
          position: 'fixed' as any,
          top: contextMenu.y, left: contextMenu.x,
          width: 180, zIndex: 9999,
          borderRadius: 10, borderWidth: 1, borderColor: C.menuBorder,
          backgroundColor: C.menuBg,
          shadowColor: '#000', shadowOpacity: 0.4,
          shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', padding: 10, color: C.textSecondary }}>
            {contextMenu.user}
          </Text>
          {[
            { label: 'Restrict 5 min',  action: () => { onRestrictUser(contextMenu.user, 5);  setContextMenu(null); }, color: '#D97706' },
            { label: 'Restrict 10 min', action: () => { onRestrictUser(contextMenu.user, 10); setContextMenu(null); }, color: '#D97706' },
            { label: 'Ban User',        action: () => { onBanUser(contextMenu.user);           setContextMenu(null); }, color: '#DC2626' },
          ].map(({ label, action, color }) => (
            <TouchableOpacity
              key={label}
              onPress={action}
              style={{
                paddingHorizontal: 12, paddingVertical: 9,
                borderTopWidth: 1, borderTopColor: C.menuBorder,
              }}
            >
              <Text style={{ fontSize: 12, color, fontWeight: label === 'Ban User' ? '700' : '400' }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};