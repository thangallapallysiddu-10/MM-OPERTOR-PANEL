import React from 'react';
import { FlatList } from 'react-native';
import { Message, PlaylistTrack, Track } from '../../types';
import { emojiCategories } from '../../constants';
import { PlaylistMonitorData } from './PlaylistModal';

export interface RjPlaylistLocalFile {
  id: string;
  name: string;
  duration: string;
  uri?: string;
  type?: string;
  size?: number;
  track?: Track;
}

export interface RjNowPlayingBridge {
  localCurrentTrack: Track | null;
  currentMood: string;
  playlistLength: number;
  isPlaylistActive: boolean;
  onOpenPlaylist: () => void;
}

export interface RjPlaylistBridge {
  showPlaylistModal: boolean;
  playlist: PlaylistTrack[];
  uploadedLocalFiles: RjPlaylistLocalFile[];
  playlistDuration: number;
  customDuration: string;
  timerRemaining: number;
  isPlaylistActive: boolean;
  isPlaylistPaused: boolean;
  monitorData: PlaylistMonitorData | undefined;
  currentPlaylistIndex: number;
  isSongInPlaylist: (title: string, artist: string) => boolean;
  isListening: boolean;
  onListenToggle: () => void;
  onClosePlaylist: () => void;
  onAddLocalFile: (file: RjPlaylistLocalFile) => void;
  onUploadAndAddLocalFile: () => Promise<void>;
  onClearPlaylist: () => void;
  onRemoveSong: (id: number) => void;
  onPausePlaylist: () => void;
  onResumePlaylist: () => void;
  onStopPlaylist: () => void;
  onSkipToNext: () => void;
  onStartPlaylist: () => void;
  onSetDuration: (duration: number) => void;
  onSetCustomDuration: (text: string) => void;
  formatTimer: (seconds: number) => string;
}

export interface RjChatBridge {
  chatMessages: Message[];
  filteredChatMessages: Message[];
  chatNewMessage: string;
  chatReplyTo: { user: string } | null;
  bannedUsers: string[];
  showBanList: boolean;
  showEmojiPicker: boolean;
  activeEmojiCategory: keyof typeof emojiCategories;
  flatListRef: React.RefObject<FlatList<any>>;
  isAtBottom: boolean;
  typingUsers: { [key: string]: boolean };
  pinnedMessage: Message | null;
  onSendChatMessage: () => void;
  onChatMessageChange: (text: string) => void;
  onLikeChatMessage: (messageId: number) => void;
  onReplyChat: (user: string) => void;
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
  onChatScroll: (event: any) => void;
}

export interface RjGiftStickerBridge {
  showGiftModal: boolean;
  showStickerModal: boolean;
  onCloseGiftModal: () => void;
  onCloseStickerModal: () => void;
  onSendGift: (gift: { id: string; emoji: string; label: string }) => void;
  onSendSticker: (sticker: { emoji: string; name: string }) => void;
}
