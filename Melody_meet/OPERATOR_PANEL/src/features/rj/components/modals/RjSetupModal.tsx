import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Track } from '../../types';
import { DualPlayer } from '../DualPlayer';
import { LocalFilesUploader } from '../LocalFilesUploader';
import { DualMicSetup } from '../DualMicSetup';
import PlayerAudioFXPanel from '../PlayerAudioFXPanel';
import { useAudioEffects } from '../../../../hooks/useAudioEffects';
import { NowPlaying } from '../NowPlaying';
import { LiveChat } from '../LiveChat';
import { PlaylistModal } from './PlaylistModal';
import { GiftModal } from './GiftModal';
import { StickerModal } from './StickerModal';
import {
  RjChatBridge,
  RjGiftStickerBridge,
  RjNowPlayingBridge,
  RjPlaylistBridge,
} from './rjSetupModal.types';

interface RjSetupModalProps {
  visible: boolean;
  isDarkMode: boolean;
  isMobile: boolean;
  colors: any;
  isLive: boolean;
  activeChannel: number;
  studioId: string | null;
  timerFormatted: string;
  timerIsPaused: boolean;
  onClose: () => void;
  onToggleLive: () => void;
  onToggleTimerPause: () => void;
  onPlayLocalTrack: (track: Track) => void;
  onLoadLocalToStandby: (track: Track, playerId: 'A' | 'B') => void;
  playerA: Track | null;
  playerB: Track | null;
  isPlayingA: boolean;
  isPlayingB: boolean;
  isLocalAudioMuted: boolean;
  onToggleLocalAudioMuted: () => void;
  activePlayer: 'A' | 'B';
  crossfadeValue: number;
  isCrossfading: boolean;
  onCrossfade: (targetValue: number) => void;
  onPlayUrlInPlayer: (playerId: 'A' | 'B') => void;
  onPauseActive: () => void;
  onTogglePlayActive: () => void;
  onStopActive: () => void;
  onSwitchAtoB: () => void;
  onPauseStandby: (playerId: 'A' | 'B') => void;
  onStopStandby: (playerId: 'A' | 'B') => void;
  onClearDeck: (playerId: 'A' | 'B') => void;
  allMics: any[];
  onToggleMicActive: (id: string) => void;
  onToggleMicMute: (id: string) => void;
  onRemoveMic: (id: string) => void;
  onAddMic: (name: string) => Promise<boolean> | boolean;
  nowPlaying: RjNowPlayingBridge;
  playlist: RjPlaylistBridge;
  chat: RjChatBridge;
  giftSticker: RjGiftStickerBridge;
}

const EMPTY_TRACK: Track = {
  id: 0,
  title: '',
  artist: '',
  duration: '0:00',
  bpm: 0,
  channel: 1,
  beatIntensity: 0,
  shortTitle: '',
  gain: 0,
  eq: { low: 0, mid: 0, high: 0 },
  fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
};

export const RjSetupModal: React.FC<RjSetupModalProps> = ({
  visible,
  isDarkMode,
  colors,
  isLive,
  studioId,
  timerFormatted,
  timerIsPaused,
  onClose,
  onToggleLive,
  onToggleTimerPause,
  onPlayLocalTrack,
  onLoadLocalToStandby,
  playerA,
  playerB,
  isPlayingA,
  isPlayingB,
  isLocalAudioMuted,
  onToggleLocalAudioMuted,
  activePlayer,
  crossfadeValue,
  isCrossfading,
  onCrossfade,
  onPlayUrlInPlayer,
  onPauseActive,
  onStopActive,
  onSwitchAtoB,
  onClearDeck,
  onPauseStandby,
  onStopStandby,
  allMics,
  onToggleMicActive,
  onToggleMicMute,
  onRemoveMic,
  onAddMic,
  nowPlaying,
  playlist,
  chat,
  giftSticker,
}) => {
  const playerAEffects = useAudioEffects(studioId, 'A');
  const playerBEffects = useAudioEffects(studioId, 'B');
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [showAddMicInline, setShowAddMicInline] = useState(false);
  const [newMicName, setNewMicName] = useState('');
  const [showLiveChatPanel, setShowLiveChatPanel] = useState(false);

  const bg = isDarkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const border = isDarkMode ? '#334155' : '#E2E8F0';
  const textPrimary = isDarkMode ? '#F1F5F9' : '#0F172A';
  const textMuted = isDarkMode ? '#94A3B8' : '#475569';
  const accent = '#4F6AF0';

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: bg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: Platform.OS === 'ios' ? 52 : 40,
              paddingHorizontal: 16,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: border,
              backgroundColor: cardBg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#EEF2FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="record-player" size={22} color="#4F6AF0" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary }}>RJ Setup</Text>
                <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                  Dual player · FX controls · Local files · Mics · Now Playing · Playlist · Live Chat
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDarkMode ? '#243044' : '#F1F5F9',
              }}
            >
              <Feather name="x" size={22} color={textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 32,
              maxWidth: 1200,
              alignSelf: 'center',
              width: '100%',
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                padding: 14,
                borderRadius: 14,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <TouchableOpacity
                onPress={onToggleLive}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: isLive ? '#DC2626' : '#16A34A',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {isLive ? 'STOP LIVE' : 'GO LIVE'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onToggleLocalAudioMuted}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: !isLocalAudioMuted ? '#4F6AF0' : isDarkMode ? '#263347' : '#F1F5F9',
                }}
              >
                <Feather
                  name={isLocalAudioMuted ? 'volume-x' : 'volume-2'}
                  size={16}
                  color={!isLocalAudioMuted ? '#FFFFFF' : textPrimary}
                />
                <View>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: !isLocalAudioMuted ? '#E0F2FE' : textMuted,
                    }}
                  >
                    {isLocalAudioMuted ? 'LOCAL MUTED' : 'MONITORING'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: !isLocalAudioMuted ? '#FFFFFF' : textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    Local Audio
                  </Text>
                </View>
              </TouchableOpacity>

              {isLive && (
                <TouchableOpacity
                  onPress={onToggleTimerPause}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: isDarkMode ? '#243044' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>
                    {timerIsPaused ? 'RESUME' : 'PAUSE'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowLiveChatPanel(!showLiveChatPanel)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: showLiveChatPanel ? '#4F6AF0' : isDarkMode ? '#263347' : '#F1F5F9',
                }}
              >
                <Feather
                  name="message-circle"
                  size={16}
                  color={showLiveChatPanel ? '#FFFFFF' : textPrimary}
                />
                <View>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: showLiveChatPanel ? '#E0F2FE' : textMuted,
                    }}
                  >
                    LIVE CHAT
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: showLiveChatPanel ? '#FFFFFF' : textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {showLiveChatPanel ? 'Hide' : 'Show'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text
                style={{
                  marginLeft: 'auto',
                  fontSize: 14,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontWeight: '700',
                  color: '#4F6AF0',
                }}
              >
                {timerFormatted}
              </Text>
            </View>

            {showLiveChatPanel && (
              <View style={{ marginBottom: 16 }}>
                <LiveChat
                  messages={chat.chatMessages}
                  filteredMessages={chat.filteredChatMessages}
                  newMessage={chat.chatNewMessage}
                  replyTo={chat.chatReplyTo}
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
                  onSendMessage={chat.onSendChatMessage}
                  onNewMessageChange={chat.onChatMessageChange}
                  onLikeMessage={chat.onLikeChatMessage}
                  onReply={chat.onReplyChat}
                  onShareMessage={chat.onShareMessage}
                  onBanUser={chat.onBanUser}
                  onRestrictUser={chat.onRestrictUser}
                  onUnbanUser={chat.onUnbanUser}
                  onClearChat={chat.onClearChat}
                  onPinMessage={chat.onPinMessage}
                  onToggleEmojiPicker={chat.onToggleEmojiPicker}
                  onAddEmoji={chat.onAddEmoji}
                  onSetActiveEmojiCategory={chat.onSetActiveEmojiCategory}
                  onCancelReply={chat.onCancelReply}
                  onOpenGiftModal={chat.onOpenGiftModal}
                  onOpenStickerModal={chat.onOpenStickerModal}
                  onToggleBanList={chat.onToggleBanList}
                  onScroll={chat.onChatScroll}
                />
              </View>
            )}

            <View style={{ marginBottom: 16 }}>
              <NowPlaying
                track={nowPlaying.localCurrentTrack || EMPTY_TRACK}
                mood={nowPlaying.currentMood}
                isDarkMode={isDarkMode}
                colors={colors}
                playlistLength={nowPlaying.playlistLength}
                isPlaylistActive={nowPlaying.isPlaylistActive}
                onOpenPlaylist={nowPlaying.onOpenPlaylist}
              />
            </View>

            <View
              style={{
                flexDirection: isWide ? 'row' : 'column',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <View style={{ flex: isWide ? 1.2 : undefined }}>
                <LocalFilesUploader
                  isDarkMode={isDarkMode}
                  colors={colors}
                  onPlayTrack={onPlayLocalTrack}
                  onLoadToStandby={onLoadLocalToStandby}
                  compact={false}
                />
              </View>
              <View style={{ flex: isWide ? 0.8 : undefined }}>
                <DualMicSetup
                  allMics={allMics}
                  isDarkMode={isDarkMode}
                  colors={colors}
                  onToggleActive={onToggleMicActive}
                  onToggleMute={onToggleMicMute}
                  onRemoveMic={onRemoveMic}
                  onAddMic={() => setShowAddMicInline((v) => !v)}
                />
                {showAddMicInline ? (
                  <View
                    style={{
                      marginTop: 10,
                      borderRadius: 12,
                      padding: 10,
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor: border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary, marginBottom: 8 }}>
                      Add mic in RJ frame
                    </Text>
                    <TextInput
                      value={newMicName}
                      onChangeText={setNewMicName}
                      placeholder="Enter mic name"
                      placeholderTextColor={textMuted}
                      style={{
                        borderWidth: 1,
                        borderColor: border,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        color: textPrimary,
                        backgroundColor: isDarkMode ? '#111827' : '#F8FAFC',
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowAddMicInline(false);
                          setNewMicName('');
                        }}
                        style={{
                          flex: 1,
                          borderRadius: 10,
                          paddingVertical: 9,
                          alignItems: 'center',
                          backgroundColor: isDarkMode ? '#243044' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          const ok = await onAddMic(newMicName);
                          if (ok) {
                            setShowAddMicInline(false);
                            setNewMicName('');
                          }
                        }}
                        style={{
                          flex: 1,
                          borderRadius: 10,
                          paddingVertical: 9,
                          alignItems: 'center',
                          backgroundColor: accent,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Add Mic</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <DualPlayer
              playerA={playerA}
              playerB={playerB}
              isPlayingA={isPlayingA}
              isPlayingB={isPlayingB}
              activePlayer={activePlayer}
              crossfadeValue={crossfadeValue}
              isCrossfading={isCrossfading}
              isDarkMode={isDarkMode}
              colors={colors}
              onCrossfade={onCrossfade}
              onPlayUrlInPlayer={onPlayUrlInPlayer}
              onPauseActive={onPauseActive}
              onStopActive={onStopActive}
              onSwitchAtoB={onSwitchAtoB}
              onClearDeck={onClearDeck}
              onPauseStandby={onPauseStandby}
              onStopStandby={onStopStandby}
            />

            <View style={{ marginTop: 16, paddingHorizontal: 0, paddingBottom: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  marginBottom: 12,
                  marginLeft: 16,
                  color: textPrimary,
                }}
              >
                🎚️ Professional Audio Effects
              </Text>

              {activePlayer === 'A' ? (
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                  <PlayerAudioFXPanel
                    playerName="A"
                    playerTrack={playerA}
                    volume={playerAEffects.volume}
                    fx={playerAEffects.fx}
                    isDarkMode={isDarkMode}
                    colors={colors}
                    onVolumeChange={(vol) => playerAEffects.updateVolume(vol)}
                    onEffectChange={(effectName, value) =>
                      playerAEffects.updateEffect(effectName, value)
                    }
                    onResetEffects={() => playerAEffects.resetEffects()}
                  />
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                  <PlayerAudioFXPanel
                    playerName="B"
                    playerTrack={playerB}
                    volume={playerBEffects.volume}
                    fx={playerBEffects.fx}
                    isDarkMode={isDarkMode}
                    colors={colors}
                    onVolumeChange={(vol) => playerBEffects.updateVolume(vol)}
                    onEffectChange={(effectName, value) =>
                      playerBEffects.updateEffect(effectName, value)
                    }
                    onResetEffects={() => playerBEffects.resetEffects()}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <PlaylistModal
        visible={playlist.showPlaylistModal}
        playlist={playlist.playlist}
        uploadedLocalFiles={playlist.uploadedLocalFiles}
        playlistDuration={playlist.playlistDuration}
        customDuration={playlist.customDuration}
        timerRemaining={playlist.timerRemaining}
        isPlaylistActive={playlist.isPlaylistActive}
        isPlaylistPaused={playlist.isPlaylistPaused}
        isDarkMode={isDarkMode}
        colors={colors}
        monitorData={playlist.monitorData}
        currentPlaylistIndex={playlist.currentPlaylistIndex}
        isSongInPlaylist={playlist.isSongInPlaylist}
        isListening={playlist.isListening}
        onListenToggle={playlist.onListenToggle}
        onClose={playlist.onClosePlaylist}
        onAddLocalFile={playlist.onAddLocalFile}
        onUploadAndAddLocalFile={playlist.onUploadAndAddLocalFile}
        onClearPlaylist={playlist.onClearPlaylist}
        onRemoveSong={playlist.onRemoveSong}
        onPausePlaylist={playlist.onPausePlaylist}
        onResumePlaylist={playlist.onResumePlaylist}
        onStopPlaylist={playlist.onStopPlaylist}
        onSkipToNext={playlist.onSkipToNext}
        onStartPlaylist={playlist.onStartPlaylist}
        onSetDuration={playlist.onSetDuration}
        onSetCustomDuration={playlist.onSetCustomDuration}
        formatTimer={playlist.formatTimer}
      />

      <GiftModal
        visible={giftSticker.showGiftModal}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={giftSticker.onCloseGiftModal}
        onSendGift={giftSticker.onSendGift}
      />

      <StickerModal
        visible={giftSticker.showStickerModal}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={giftSticker.onCloseStickerModal}
        onSendSticker={giftSticker.onSendSticker}
      />
    </>
  );
};

export default RjSetupModal;
