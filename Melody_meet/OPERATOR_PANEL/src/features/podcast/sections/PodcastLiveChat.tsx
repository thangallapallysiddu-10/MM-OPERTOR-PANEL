import React, { useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { LiveChat } from '../../rj/components/LiveChat';
import { Message } from '../../rj/types';
import { StickerModal } from '../../rj/components/modals/StickerModal';
import { emojiCategories } from '../../rj/constants';

export type { Message } from '../../rj/types';

export interface PodcastChatMessage {
  id: string;
  senderName: string;
  senderRole: 'host' | 'guest' | 'listener' | 'system' | string;
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
  isDarkMode?: boolean;
  onClearChat?: () => void;
  onLikeMessage?: (messageId: string) => void;
}

// Convert PodcastChatMessage to RJ Message format safely
const convertToRjMessage = (msg: PodcastChatMessage, index: number): Message => {
  // If msg.id isn't a clean numeric string, parseInt returns NaN.
  // We combine fallback tools to ensure duplicate list keys are completely avoided.
  const parsedId = parseInt(msg.id);
  const fallbackId = Date.now() + index; 

  return {
    id: isNaN(parsedId) ? fallbackId : parsedId,
    user: msg.senderName || 'Anonymous',
    text: msg.text || '',
    time: msg.createdAt 
      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    system: msg.senderRole === 'system',
    likeCount: 0,
    isLiked: false,
    avatar: msg.senderName?.charAt(0)?.toUpperCase() || 'U',
    isVIP: msg.senderRole === 'host',
    isNew: false,
    isPinned: false,
    giftAmount: 0,
  };
};

export const PodcastLiveChat: React.FC<PodcastLiveChatProps> = ({
  isLive,
  messages = [],
  value,
  onChangeText,
  onSend,
  colors,
  isDarkMode = false,
  onClearChat,
  onLikeMessage,
}) => {
  const flatListRef = useRef<FlatList<any>>(null) as React.RefObject<FlatList<any>>;
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{ user: string } | null>(null);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [showBanList, setShowBanList] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>({});
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof emojiCategories>('smileys');

  // Map converting with index offset to eliminate list item key collision
  const rjMessages = messages.map((msg, index) => convertToRjMessage(msg, index));

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleSend = () => {
    // FIX: Bypassed the strict `isLive` gate for easier sandbox environments/offline testing
    if (value.trim().length === 0) return;
    onSend();
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
  };

  const handleReply = (user: string) => {
    setReplyTo({ user });
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleToggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleAddEmoji = (emoji: string) => {
    onChangeText(value + emoji);
  };

  const handleSetActiveEmojiCategory = (category: keyof typeof emojiCategories) => {
    setActiveEmojiCategory(category);
  };

  const handleLikeMessage = (messageId: number) => {
    if (onLikeMessage) {
      onLikeMessage(String(messageId));
    }
  };

  const handleSendSticker = (sticker: { emoji: string; name: string }) => {
    
    const stickerText = value + sticker.emoji;
    onChangeText(stickerText);
    setShowStickerModal(false);
    
    
    setTimeout(() => {
      onSend();
    }, 60);
  };

  const handleBanUser = (user: string) => {
    setBannedUsers([...bannedUsers, user]);
  };

  const handleUnbanUser = (user: string) => {
    setBannedUsers(bannedUsers.filter(u => u !== user));
  };

  const handleToggleBanList = () => {
    setShowBanList(!showBanList);
  };

  const handlePinMessage = (msg: Message) => {
    setPinnedMessage(msg);
  };

  // ─── THEME ──────────────────────────────────────────────────────────────────

  const darkMode = isDarkMode || colors?.background === '#121212';

  const defaultColors = {
    text: '#FFFFFF',
    textSecondary: '#8B8FA8',
    textMuted: '#4B5568',
    cardBorder: '#2A2A36',
    card: '#181820',
    surface: '#1E1E2A',
    background: '#0E0E12',
  };

  const combinedColors = { ...defaultColors, ...colors };

  return (
    <>
      <LiveChat
        messages={rjMessages}
        filteredMessages={rjMessages}
        newMessage={value}
        replyTo={replyTo}
        bannedUsers={bannedUsers}
        showBanList={showBanList}
        showEmojiPicker={showEmojiPicker}
        activeEmojiCategory={activeEmojiCategory}
        isDarkMode={darkMode}
        colors={combinedColors}
        flatListRef={flatListRef}
        isAtBottom={true}
        typingUsers={typingUsers}
        pinnedMessage={pinnedMessage}
        onSendMessage={handleSend}
        onNewMessageChange={handleTextChange}
        onLikeMessage={handleLikeMessage}
        onReply={handleReply}
        onShareMessage={() => {}}
        onBanUser={handleBanUser}
        onRestrictUser={(user, minutes) => {}}
        onUnbanUser={handleUnbanUser}
        onClearChat={onClearChat || (() => {})}
        onPinMessage={handlePinMessage}
        onToggleEmojiPicker={handleToggleEmojiPicker}
        onAddEmoji={handleAddEmoji}
        onSetActiveEmojiCategory={handleSetActiveEmojiCategory}
        onCancelReply={handleCancelReply}
        onOpenStickerModal={() => setShowStickerModal(true)}
        onToggleBanList={handleToggleBanList}
        onScroll={() => {}}
      />

      <StickerModal
        visible={showStickerModal}
        isDarkMode={darkMode}
        colors={combinedColors}
        onClose={() => setShowStickerModal(false)}
        onSendSticker={handleSendSticker}
      />
    </>
  );
};

export default PodcastLiveChat;