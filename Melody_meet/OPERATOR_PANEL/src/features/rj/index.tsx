import React, { useState, useEffect, useRef } from 'react';
import { 
  View, ScrollView, Dimensions, Platform, TouchableOpacity, Text, 
  StyleSheet, KeyboardAvoidingView, useWindowDimensions 
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useOperator } from '../../context/OperatorContext';
import { useAppStore } from '../../store/useAppStore';

import { ProfileModal } from './components/modals/ProfileModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { NotificationsModal } from './components/modals/NotificationsModal';

import { Track, Message } from './types';
import { lightTheme, darkTheme } from './themes';
import { trackLibrary, rjProfile, availableSongs, songData } from './constants';

import { useTimer } from './hooks/useTimer';
import { useStats } from './hooks/useStats';
import { useNotifications } from './hooks/useNotifications';
import { usePlayer } from './hooks/usePlayer';
import { useMixer } from './hooks/useMixer';
import { useMicSystem } from './hooks/useMicSystem';
import { usePlaylist } from './hooks/usePlaylist';
import { useChat } from './hooks/useChat';
import { useRequests } from './hooks/useRequests';

import { NowPlaying } from './components/NowPlaying';
import { LocalFilesUploader } from './components/LocalFilesUploader';
import { DualMicSetup } from './components/DualMicSetup';
import { LiveChat } from './components/LiveChat';
import { SongRequests } from './components/SongRequests';
import { DualPlayer } from './components/DualPlayer';
import { Mixer } from './components/Mixer';
import { PinnedMessage } from './components/PinnedMessage';

import { PlaylistModal } from './components/modals/PlaylistModal';
import { AddMicModal } from './components/modals/AddMicModal';
import { GiftModal } from './components/modals/GiftModal';
import { StickerModal } from './components/modals/StickerModal';

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const isNative = isIOS || isAndroid;

const RJStudio = ({ navigation }: any) => {
  const { isLive, toggleLive, setCurrentTrack, activeChannel, setActiveChannel } = useOperator();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
 
  const { profileDarkMode, setProfileDarkMode, rjStudio } = useAppStore();

  const [isDarkMode, setIsDarkMode] = useState(profileDarkMode);
  const colors = isDarkMode ? darkTheme : lightTheme;

  const [localCurrentTrack, setLocalCurrentTrack] = useState<Track | null>(() => {
  
    const savedTrack = rjStudio.localPlayback?.currentTrack;
    return savedTrack || null; 
  });
  
  const [currentMood, setCurrentMood] = useState<string>("chill");
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [autoAcceptRequests, setAutoAcceptRequests] = useState(false);
 
  const keyboardOpenRef = useRef(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    setProfileDarkMode(isDarkMode);
  }, [isDarkMode]);

  const handleLocalFilePlayTrack = (track: Track) => {
    setLocalCurrentTrack(track);
    setCurrentTrack(track);
    notifications.addNotification("system", `🎵 Now playing local file: ${track.title}`);
  };

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      const savedTrack = state.rjStudio.localPlayback?.currentTrack;
      if (savedTrack && savedTrack !== localCurrentTrack) {
        setLocalCurrentTrack(savedTrack);
        setCurrentTrack(savedTrack);
      }
    });
    
    return () => unsubscribe();
  }, []);
 
  useEffect(() => {
    if (localCurrentTrack) {
      const trackMood = songData[localCurrentTrack.title as keyof typeof songData]?.mood || "chill";
      setCurrentMood(trackMood);
    } else {
      setCurrentMood("chill");
    }
  }, [localCurrentTrack]);

  useEffect(() => {
    if (localCurrentTrack) {
      setActiveChannel(localCurrentTrack.channel);
    }
  }, [localCurrentTrack]);

  const timer = useTimer(isLive);
  const stats = useStats(localCurrentTrack?.title || "No Song");
  const notifications = useNotifications();
  const player = usePlayer({ 
    setCurrentTrack: (track: Track | null) => {
      if (track) {
        setCurrentTrack(track);
      }
    },
    setLocalCurrentTrack: (track: Track | null) => {
      if (track) {
        setLocalCurrentTrack(track);
      }
    },
    addNotification: notifications.addNotification 
  });
  const mixer = useMixer();
  const micSystem = useMicSystem(notifications.addNotification);
  const playlist = usePlaylist({ 
    setCurrentTrack, 
    setLocalCurrentTrack, 
    addNotification: notifications.addNotification 
  });
  const chat = useChat(notifications.addNotification);

  const loadIntoStandbyPlayer = (track: Track) => {
    player.loadIntoStandby(track);
  };
  
  const requests = useRequests({ 
    activeChannel, 
    setLocalCurrentTrack, 
    setCurrentTrack, 
    addNotification: notifications.addNotification,
    loadIntoStandbyPlayer: player.loadIntoStandby  
  });

  const getChannelColor = (ch: number) => {
    return mixer.getChannelColor(ch, colors);
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingBottom: isNative ? 140 : 100,
      paddingTop: Platform.OS === 'ios' ? 50 : 40,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 14,
      padding: 14,
      borderRadius: 12,
      flexWrap: 'wrap' as const,
      gap: 10,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
    headerLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    nameText: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    statusText: {
      fontSize: 11,
      marginTop: 2,
      color: isDarkMode ? '#9CA3AF' : '#6B7280',
    },
    statPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
    },
    statValue: {
      fontSize: 12,
      fontWeight: 'bold' as const,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    menuButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
    },
    menuButtonText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    row: {
      flexDirection: isMobile ? 'column' as const : 'row' as const,
      gap: 14,
    },
    leftColumn: {
      width: isMobile ? '100%' : 380,
      gap: 14,
    },
    rightColumn: {
      flex: 1,
      gap: 14,
    },
    topRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 12,
      marginBottom: 40,
    },
    announcementBanner: {
      marginBottom: 12,
      padding: 8,
      borderRadius: 10,
      alignItems: 'center' as const,
      backgroundColor: isDarkMode ? '#374151' : '#6B7280',
    },
    announcementText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    liveBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
    },
    liveText: {
      fontSize: 10,
      fontWeight: 'bold' as const,
      color: isDarkMode ? '#000000' : '#FFFFFF',
    },
    notificationIconContainer: {
      position: 'relative' as const,
    },
    notificationBadge: {
      position: 'absolute' as const,
      top: -6,
      right: -8,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 4,
      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
    },
    notificationBadgeText: {
      fontSize: 9,
      fontWeight: 'bold' as const,
      color: isDarkMode ? '#000000' : '#FFFFFF',
    },
    masterControls: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      flexWrap: 'wrap' as const,
      borderRadius: 12,
      padding: 14,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
    controlButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 60,
      alignItems: 'center' as const,
    },
    timerText: {
      fontSize: 14,
      fontFamily: 'monospace',
      marginLeft: 'auto' as const,
      fontWeight: '500' as const,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
  });

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={isIOS ? 'padding' : isAndroid ? 'height' : undefined}
        keyboardVerticalOffset={isIOS ? 90 : isAndroid ? 0 : 0}
        enabled={isNative}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEnabled={!keyboardOpenRef.current}
          removeClippedSubviews={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>DJ</Text>
                {rjProfile.isOnline && (
                  <View style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFFFFF' }} />
                )}
              </View>
              <View>
                <Text style={styles.nameText}>{rjProfile.name}</Text>
                <Text style={styles.statusText}>LIVE STUDIO • {localCurrentTrack?.bpm || 0} BPM</Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={styles.statPill}>
                <Ionicons name="people" size={14} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={styles.statValue}>{stats.rjStats.listeners}</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="heart" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.likes}</Text>
              </View>
              <View style={styles.statPill}>
                <MaterialIcons name="subscriptions" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.subscribers}</Text>
              </View>
              <View style={styles.statPill}>
                <Feather name="users" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.followers}</Text>
              </View>
              <View style={styles.statPill}>
                <Feather name="share-2" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.statValue}>{stats.rjStats.shares}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.menuButton}>
                <Feather name="user" size={16} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                <Text style={styles.menuButtonText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.menuButton}>
                <Feather name="settings" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={styles.menuButtonText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowNotificationsModal(true)} style={[styles.menuButton, { position: 'relative' }]}>
                <View style={styles.notificationIconContainer}>
                  <Feather name="bell" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  {notifications.unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuButtonText}>Alerts</Text>
              </TouchableOpacity>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
          </View>

          {showAnnouncement && (
            <View style={styles.announcementBanner}>
              <Text style={styles.announcementText}>{announcementMessage}</Text>
            </View>
          )}

          <View style={styles.topRow}>
            {/* Column 1: NOW PLAYING */}
            <NowPlaying 
              track={localCurrentTrack || {
                id: 0,
                title: "",
                artist: "",
                duration: "0:00",
                bpm: 0,
                channel: 1,
                beatIntensity: 0,
                shortTitle: "",
                gain: 0,
                eq: { low: 0, mid: 0, high: 0 },
                fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
              }}
              mood={currentMood}
              isDarkMode={isDarkMode}
              colors={colors}
              playlistLength={playlist.playlist.length}
              isPlaylistActive={playlist.isPlaylistActive}
              onOpenPlaylist={() => playlist.setShowPlaylistModal(true)}
            />
         
            <LocalFilesUploader 
              isDarkMode={isDarkMode}
              colors={colors}
              onPlayTrack={handleLocalFilePlayTrack}
            />
          
            <DualMicSetup 
              allMics={micSystem.allMics}
              isDarkMode={isDarkMode}
              colors={colors}
              onToggleActive={micSystem.toggleMicActive}
              onToggleMute={micSystem.toggleMicMute}
              onRemoveMic={micSystem.removeExtraMic}
              onAddMic={() => micSystem.setShowAddMicModal(true)}
            />
          </View>

          {/* PINNED MESSAGE */}
          <PinnedMessage 
            pinnedMessage={chat.pinnedMessage}
            isDarkMode={isDarkMode}
            colors={colors}
            onUnpin={() => chat.setPinnedMessage(null)}
          />

          {/* MAIN COLUMNS */}
          <View style={styles.row}>
            {/* LEFT COLUMN */}
            <View style={styles.leftColumn}>

              <LiveChat 
                messages={chat.messages}
                filteredMessages={chat.filteredMessages}
                newMessage={chat.newMessage}
                replyTo={chat.replyTo}
                bannedUsers={chat.bannedUsers}
                showBanList={chat.showBanList}
                showEmojiPicker={chat.showEmojiPicker}
                activeEmojiCategory={chat.activeEmojiCategory}
                isDarkMode={isDarkMode}
                colors={colors}
                flatListRef={chat.flatListRef}
                isAtBottom={chat.isAtBottom}
                typingUsers={chat.typingUsers}
                pinnedMessage={chat.pinnedMessage}
                onSendMessage={chat.handleSendMessage}
                onNewMessageChange={chat.setNewMessage}
                onLikeMessage={chat.handleLikeMessage}
                onReply={chat.handleReply}
                onShareMessage={() => {}}
                onBanUser={chat.banUser}
                onUnbanUser={chat.unbanUser}
                onClearChat={chat.clearChat}
                onPinMessage={chat.pinMessage}
                onToggleEmojiPicker={() => chat.setShowEmojiPicker(!chat.showEmojiPicker)}
                onAddEmoji={chat.addEmoji}
                onSetActiveEmojiCategory={chat.setActiveEmojiCategory}
                onCancelReply={() => chat.setReplyTo(null)}
                onOpenGiftModal={() => chat.setShowGiftModal(true)}
                onOpenStickerModal={() => chat.setShowStickerModal(true)}
                onToggleBanList={() => chat.setShowBanList(!chat.showBanList)}
                onScroll={chat.handleScroll}
              />

              <SongRequests 
                requests={requests.requests}  
                newRequest={requests.newRequest}
                songUrl={requests.songUrl}
                showSongUrlInput={requests.showSongUrlInput}
                isDarkMode={isDarkMode}
                colors={colors}
                onNewRequestChange={requests.setNewRequest}
                onSendRequest={requests.handleNewRequest}
                onVoteRequest={requests.voteRequest}
                onPlayRequest={requests.playRequest}
                onUrlChange={requests.setSongUrl}
                onUrlSubmit={requests.handleUrlSubmit}
                onToggleUrlInput={() => requests.setShowSongUrlInput(true)}
                onCancelUrlInput={() => {
                  requests.setShowSongUrlInput(false);
                  requests.setSongUrl("");
                }}
              />
            </View>

            {/* RIGHT COLUMN */}
            <View style={styles.rightColumn}>
              <DualPlayer 
                playerA={player.playerA}
                playerB={player.playerB}
                activePlayer={player.activePlayer}
                crossfadeValue={player.crossfadeValue}
                isCrossfading={player.isCrossfading}
                isDarkMode={isDarkMode}
                colors={colors}
                onCrossfade={player.animateCrossfade}
                onPlayUrlInPlayer={(playerId) => player.playStandbyTrack(playerId)}
                onPauseActive={player.pauseActiveTrack}
                onStopActive={player.stopActiveTrack}
                onPauseStandby={player.pauseStandby}
                onStopStandby={player.stopStandby}
              />

              <Mixer 
                channels={mixer.channels}
                activeChannel={activeChannel}
                selectedFX={mixer.selectedFX}
                masterGain={mixer.masterGain}
                crossfader={mixer.crossfader}
                isDarkMode={isDarkMode}
                isMobile={isMobile}
                colors={colors}
                onSelectChannel={setActiveChannel}
                onToggleMute={mixer.toggleMute}
                onToggleSolo={mixer.toggleSolo}
                onToggleCue={mixer.toggleCue}
                onSelectFX={mixer.toggleFX}
                onFXValueChange={(fxName, value) => mixer.onFXValueChange(fxName, value, activeChannel)}
                onMasterGainChange={mixer.onMasterGainChange}
                onCrossfaderChange={mixer.onCrossfaderChange}
                onChannelVolumeChange={mixer.onChannelVolumeChange}
                getChannelColor={mixer.getChannelColor}
              />

              {/* Master Controls */}
              <View style={{ gap: 14 }}>
                <View style={styles.masterControls}>
                  <TouchableOpacity 
                    onPress={toggleLive} 
                    style={[styles.controlButton, { backgroundColor: '#6B7280' }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>{isLive ? "STOP" : "GO LIVE"}</Text>
                  </TouchableOpacity>
                  {isLive && (
                    <TouchableOpacity 
                      onPress={() => timer.setIsPaused(!timer.isPaused)} 
                      style={[styles.controlButton, { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>{timer.isPaused ? "RESUME" : "PAUSE"}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    onPress={player.handlePrevTrack} 
                    disabled={!isLive} 
                    style={[styles.controlButton, { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000', opacity: !isLive ? 0.5 : 1 }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDarkMode ? '#000000' : '#FFFFFF' }}>PREV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={player.handleNextTrack} 
                    disabled={!isLive} 
                    style={[styles.controlButton, { backgroundColor: '#6B7280', opacity: !isLive ? 0.5 : 1 }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>NEXT</Text>
                  </TouchableOpacity>
                  <Text style={styles.timerText}>{timer.formatTime()}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <ProfileModal 
        visible={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        isDarkMode={isDarkMode}
        colors={colors}
      />
      
      <SettingsModal 
        visible={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        isDarkMode={isDarkMode}
        colors={colors}                         
        onToggleDarkMode={setIsDarkMode}
      />

      <NotificationsModal 
        visible={showNotificationsModal} 
        onClose={() => setShowNotificationsModal(false)} 
        isDarkMode={isDarkMode}
        colors={colors}                          
        notifications={notifications.notifications}
        unreadCount={notifications.unreadCount}
        onMarkAsRead={notifications.markNotificationAsRead}
        onMarkAllAsRead={notifications.markAllNotificationsAsRead}
      />
      
      <PlaylistModal 
        visible={playlist.showPlaylistModal}
        playlist={playlist.playlist}
        availableSongs={playlist.availableSongs}
        playlistDuration={playlist.playlistDuration}
        customDuration={playlist.customDuration}
        timerRemaining={playlist.timerRemaining}
        isPlaylistActive={playlist.isPlaylistActive}
        isPlaylistPaused={playlist.isPlaylistPaused} 
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => playlist.setShowPlaylistModal(false)}
        onAddSong={playlist.addToPlaylistFromLibrary}
        onRemoveSong={playlist.removeFromPlaylist}
        onPausePlaylist={playlist.pausePlaylist}            
        onResumePlaylist={playlist.resumePlaylist}          
        onStopPlaylist={playlist.stopPlaylist}       
        onStartPlaylist={playlist.startPlaylist}
        onSetDuration={(dur) => {
          playlist.setPlaylistDuration(dur);
          playlist.setCustomDuration("");
        }}
        onSetCustomDuration={playlist.handleSetCustomDuration}
        formatTimer={playlist.formatTimer}
      />
      
      <AddMicModal 
        visible={micSystem.showAddMicModal}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => micSystem.setShowAddMicModal(false)}
        onAddMic={(name) => {
          micSystem.setNewMicName(name);
          return micSystem.addNewMic();
        }}
      />
      
      <GiftModal 
        visible={chat.showGiftModal}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => chat.setShowGiftModal(false)}
        onSendGift={(gift) => {
          const giftMsg: Message = {
            id: Date.now(),
            user: "RJ",
            text: `${gift} Sent a gift to everyone! 🎉`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            system: false,
            likeCount: 0,
            isLiked: false,
            avatar: "R",
            isVIP: true,
            giftAmount: 1
          };
          chat.setMessages((prev: Message[]) => [...prev, giftMsg]);
          notifications.addNotification("system", `🎁 RJ sent a ${gift} gift to everyone!`);
          setTimeout(() => chat.flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }}
      />
      
      <StickerModal 
        visible={chat.showStickerModal}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => chat.setShowStickerModal(false)}
        onSendSticker={(sticker) => {
          const stickerMsg: Message = {
            id: Date.now(),
            user: "RJ",
            text: sticker.emoji.repeat(3),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            system: false,
            likeCount: 0,
            isLiked: false,
            avatar: "R",
            isVIP: true
          };
          chat.setMessages((prev: Message[]) => [...prev, stickerMsg]);
          notifications.addNotification("system", `🎨 RJ sent a ${sticker.name} sticker!`);
          setTimeout(() => chat.flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }}
      />
    </View>
  );
};

export default RJStudio;