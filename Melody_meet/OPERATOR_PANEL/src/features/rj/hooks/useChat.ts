// hooks/useChat.ts - Refactored with Zustand (FULLY FIXED)
import { useState, useRef } from 'react';
import { FlatList } from 'react-native';
import { Message } from '../types';
import { emojiCategories } from '../constants';
import { useAppStore } from '../../../store/useAppStore';

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
  const messages = rjStudio.chatMessages;
  const setMessages = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ chatMessages: fn(messages) });
    } else {
      updateRjStudioState({ chatMessages: fn });
    }
  };
  
  const bannedUsers = rjStudio.bannedUsers;
  const setBannedUsers = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ bannedUsers: fn(bannedUsers) });
    } else {
      updateRjStudioState({ bannedUsers: fn });
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
    setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 100);
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

  const banUser = (username: string): void => {
    if (!bannedUsers.includes(username) && username !== "RJ" && username !== "SYSTEM") {
      setBannedUsers([...bannedUsers, username]);
      const banMsg: Message = { 
        id: Date.now(), 
        user: "SYSTEM", 
        text: `User ${username} banned`, 
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
        system: true 
      };
      setMessages((prev: Message[]) => [...prev, banMsg]);
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
    setBannedUsers(bannedUsers.filter(u => u !== username));
    const unbanMsg: Message = { 
      id: Date.now(), 
      user: "SYSTEM", 
      text: `User ${username} unbanned`, 
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
      system: true 
    };
    setMessages((prev: Message[]) => [...prev, unbanMsg]);
  };

  const clearChat = (): void => {
    setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.user === "RJ" || msg.system === true));
    const clearMsg: Message = { 
      id: Date.now(), 
      user: "SYSTEM", 
      text: "Chat cleared", 
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
      system: true 
    };
    setMessages((prev: Message[]) => [clearMsg, ...prev.filter((msg: Message) => msg.user === "RJ" || msg.system === true)]);
  };

  const pinMessage = (message: Message) => {
    setPinnedMessage(message);
    const pinMsg: Message = { 
      id: Date.now(), 
      user: "SYSTEM", 
      text: `📌 Message from ${message.user} pinned by RJ`, 
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
      system: true 
    };
    setMessages((prev: Message[]) => [...prev, pinMsg]);
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
    banUser,
    unbanUser,
    clearChat,
    pinMessage,
    handleScroll,
    simulateTyping,    
  };
};