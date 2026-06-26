// hooks/useChat.ts - Refactored with Zustand (FULLY FIXED)
import { useState, useRef } from 'react';
import { FlatList } from 'react-native';
import { Message } from '../types';
import { emojiCategories } from '../constants';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import { chatSocket } from '../../../services/socketService';

export const useChat = (addNotification: (type: "request" | "system" | "alert", message: string) => void) => {
  const { rjStudio, updateRjStudioState, addRjNotification } = useAppStore();
  
  // Local refs (don't need persistence)
  const flatListRef = useRef<FlatList<any>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof emojiCategories>("smileys");
  const [newMessage, setNewMessage] = useState<string>("");
  const [replyTo, setReplyTo] = useState<{ user: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>({});

  // Get values from store (these persist across navigation)
  const messages = Array.isArray(rjStudio.chatMessages) ? rjStudio.chatMessages : [];
  const setMessages = (fn: any) => {
    const currentMessages = Array.isArray(useAppStore.getState().rjStudio.chatMessages)
      ? useAppStore.getState().rjStudio.chatMessages
      : [];
    if (typeof fn === 'function') {
      updateRjStudioState({ chatMessages: fn(currentMessages) });
    } else {
      updateRjStudioState({ chatMessages: Array.isArray(fn) ? fn : [] });
    }
  };
  
  const bannedUsers = Array.isArray(rjStudio.bannedUsers) ? rjStudio.bannedUsers : [];
  const setBannedUsers = (fn: any) => {
    const currentBannedUsers = Array.isArray(useAppStore.getState().rjStudio.bannedUsers)
      ? useAppStore.getState().rjStudio.bannedUsers
      : [];
    if (typeof fn === 'function') {
      updateRjStudioState({ bannedUsers: fn(currentBannedUsers) });
    } else {
      updateRjStudioState({ bannedUsers: Array.isArray(fn) ? fn : [] });
    }
  };
  
  const showBanList = rjStudio.showBanList || false;
  const setShowBanList = (value: boolean) => updateRjStudioState({ showBanList: value });
  
  const pinnedMessage = rjStudio.pinnedMessage;
  const setPinnedMessage = (value: Message | null) => updateRjStudioState({ pinnedMessage: value });
  
  const showGiftModal = rjStudio.showGiftModal || false;
  const setShowGiftModal = (value: boolean) => updateRjStudioState({ showGiftModal: value });
  
  const showStickerModal = rjStudio.showStickerModal || false;
  const setShowStickerModal = (value: boolean) => updateRjStudioState({ showStickerModal: value });

  const handleLikeMessage = (messageId: number) => {
    setMessages((prev: Message[]) => prev.map((msg: Message) => 
      msg.id === messageId 
        ? { ...msg, likeCount: (msg.likeCount || 0) + 1, isLiked: true }
        : msg
    ));
  };


const handleSendMessage = (): void => {
  if (!newMessage.trim()) return;
  
  let messageText = newMessage;
  if (replyTo) {
    messageText = `@${replyTo.user} ${newMessage}`;
  }

  const sid = rjBackend.getStudioId();
  if (rjBackend.isEnabled() && sid) {
    chatSocket.sendMessage(sid, messageText, 'RJ');
    setNewMessage("");
    setReplyTo(null);
    setShowEmojiPicker(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    return;
  }
  
  const newMsg: Message = { 
    id: Date.now(), 
    user: "RJ", 
    text: messageText, 
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
    system: false,
    likeCount: 0,
    isLiked: false,
    avatar: "R",
    isVIP: true,
    isNew: false  
  };
  
  setMessages((prev: Message[]) => [...prev, newMsg]);
  setNewMessage("");
  setReplyTo(null);
  setShowEmojiPicker(false);
  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
};

  const handleReply = (user: string): void => {
    if (bannedUsers.includes(user)) { 
      return;
    }
    setReplyTo({ user });
    setNewMessage("");
  };

  const addEmoji = (emoji: string): void => { 
    setNewMessage(newMessage + emoji); 
    setShowEmojiPicker(false);
  };

  const restrictUser = (username: string, minutes: 5 | 10 = 5): void => {
    if (!username || username === "RJ" || username === "SYSTEM") return;
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      void RjApi.banUser(
        sid,
        username,
        `Restricted by RJ for ${minutes} minutes`,
        'cooldown',
        minutes
      ).catch(() => {});
    }
    if (!bannedUsers.includes(username)) {
      setBannedUsers([...bannedUsers, username]);
    }
    const infoMsg: Message = {
      id: Date.now(),
      user: "SYSTEM",
      text: `⏳ ${username} is restricted for ${minutes} minutes`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      system: true
    };
    setMessages((prev: Message[]) => [...prev, infoMsg]);
    addNotification("system", `${username} is on ${minutes}m cooldown`);
  };

  const banUser = (username: string): void => {
    if (!bannedUsers.includes(username) && username !== "RJ" && username !== "SYSTEM") {
      const sid = rjBackend.getStudioId();
      if (rjBackend.isEnabled() && sid) {
        void RjApi.banUser(sid, username, 'Blocked by RJ', 'ban')
          .catch(() => {});
      }
      setBannedUsers([...bannedUsers, username]);
      addNotification("system", `User ${username} was banned`);
      addRjNotification({
        title: "User Banned",
        message: `${username} was banned from chat`,
        type: "alert",
        read: false,
      });
    }
  };

  const unbanUser = (username: string): void => {
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      void RjApi.unbanUser(sid, username).catch(() => {});
    }
    setBannedUsers(bannedUsers.filter(u => u !== username));
  };

  const clearChat = (): void => {
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      void RjApi.clearChat(sid).catch(() => {});
    }
    // We intentionally do NOT clear the local state here immediately, 
    // because the backend clearChat will emit a system message and we want
    // that message to be the only thing visible. If we clear locally now,
    // the system message arrives a split second later and replaces the chat.
    // Actually, the user asked to preserve "Chat cleared by operator" briefly.
    // The backend `clearChat` broadcasts "Chat cleared by operator" after wiping DB.
  };

  const pinMessage = (message: Message) => {
    const sid = rjBackend.getStudioId();
    const pinText = message.text;
    if (rjBackend.isEnabled() && sid) {
      chatSocket.pinMessage(sid, String(message.id), pinText);
      void RjApi.pinMessage(sid, String(message.id), pinText).catch(() => {});
    }
    setPinnedMessage(message);
    addNotification("system", `📌 Pinned message from ${message.user}`);
    addRjNotification({
      title: "Message Pinned",
      message: `Pinned message from ${message.user}`,
      type: "system",
      read: false,
    });
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setIsAtBottom(isNearBottom);
  };

const filteredMessages = messages.filter((msg: Message) => {
  if (msg.user === "RJ") {
    return true;
  }
  if (msg.user === "SYSTEM") {
    return true;
  }
  return !bannedUsers.includes(msg.user);
});

  const simulateTyping = (user: string) => {
    setTypingUsers((prev: { [key: string]: boolean }) => ({ ...prev, [user]: true }));
    setTimeout(() => {
      setTypingUsers((prev: { [key: string]: boolean }) => ({ ...prev, [user]: false }));
    }, 3000);
  };

  const injectDemoMessages = () => {
    const hasDemo = messages.some((m) => m.user?.startsWith('Demo'));
    if (hasDemo) return;
    const now = new Date();
    const at = (offsetMin: number) =>
      new Date(now.getTime() - offsetMin * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const demo: Message[] = [
      { id: Date.now() + 1, user: "DemoUser_Aryan", text: "Yo RJ, drop bass boost!", time: at(3), system: false, likeCount: 0, avatar: "A" },
      { id: Date.now() + 2, user: "DemoUser_Neha", text: "Can we hear Player B next?", time: at(2), system: false, likeCount: 0, avatar: "N" },
      { id: Date.now() + 3, user: "DemoUser_Rahul", text: "This mix is fire 🔥", time: at(1), system: false, likeCount: 0, avatar: "R" },
    ];
    setMessages((prev: Message[]) => [...prev, ...demo]);
  };

  return {
    flatListRef: flatListRef as React.RefObject<FlatList<any>>,
    isAtBottom,
    activeEmojiCategory,
    setActiveEmojiCategory,
    showEmojiPicker,
    setShowEmojiPicker,
    bannedUsers,
    showBanList,
    setShowBanList,
    typingUsers,
    pinnedMessage,
    setPinnedMessage,
    showGiftModal,
    setShowGiftModal,
    showStickerModal,
    setShowStickerModal,
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    replyTo,
    setReplyTo,
    filteredMessages,
    handleLikeMessage,
    handleSendMessage,
    handleReply,
    addEmoji,
    restrictUser,
    banUser,
    unbanUser,
    clearChat,
    pinMessage,
    handleScroll,
    simulateTyping,    
    injectDemoMessages,
  };
};
