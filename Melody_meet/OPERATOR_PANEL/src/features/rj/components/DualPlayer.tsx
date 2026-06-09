// components/DualPlayer.tsx - Better mobile buttons, hash symbols

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Track } from '../types';

interface DualPlayerProps {
  playerA: Track | null;
  playerB: Track | null;
  isPlayingA: boolean;
  isPlayingB: boolean;
  activePlayer: "A" | "B";
  crossfadeValue: number;
  isCrossfading: boolean;
  isDarkMode: boolean;
  colors: any;
  onCrossfade: (targetValue: number) => void;
  onPlayUrlInPlayer: (playerId: "A" | "B") => void;
  onPauseActive?: () => void;
  onStopActive?: () => void;
  onSwitchAtoB?: () => void;
  onPauseStandby?: (playerId: "A" | "B") => void;
  onStopStandby?: (playerId: "A" | "B") => void;
  onClearDeck?: (playerId: "A" | "B") => void;
}

export const DualPlayer: React.FC<DualPlayerProps> = ({
  playerA,
  playerB,
  isPlayingA,
  isPlayingB,
  activePlayer,
  crossfadeValue,
  isCrossfading,
  isDarkMode,
  colors,
  onCrossfade,
  onPlayUrlInPlayer,
  onPauseActive,
  onStopActive,
  onSwitchAtoB,
  onPauseStandby,
  onStopStandby,
  onClearDeck,
}) => {
  const canPlayFromStandby = (track: Track | null): boolean => {
    if (!track) return false;
    return (
      track.artist === 'Local File' ||
      track.artist === 'Requested' ||
      track.artist === 'YouTube' ||
      track.artist === 'Spotify' ||
      track.artist === 'SoundCloud'
    );
  };

  const renderPlayer = (playerId: "A" | "B", track: Track | null | undefined, isActive: boolean) => {
    const isStandby = !isActive;
    const hasTrack = track != null && typeof track === 'object' && 'title' in track;
    const isPlaying = playerId === "A" ? isPlayingA : isPlayingB;
    const showPlayButton = isStandby && hasTrack && canPlayFromStandby(track);
    const showStartButton = isActive && hasTrack && !isPlaying;
    const showActiveControls = isActive && hasTrack && isPlaying;
    const showStandbyControls = isStandby && hasTrack && canPlayFromStandby(track);

    return (
      <View style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        alignItems: 'center',
        minHeight: 168,
        backgroundColor: isDarkMode ? '#263347' : '#F8FAFC',
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? '#4F6AF0' : (isDarkMode ? '#334155' : '#E2E8F0'),
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
          <Text style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: isActive ? '#6B7280' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
          }}>Player-{playerId === "A" ? "1" : "2"}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isActive ? (
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: isPlaying ? '#ECFDF5' : '#FEF2F2', borderWidth: 1, borderColor: isPlaying ? '#A7F3D0' : '#FECACA' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: isPlaying ? '#059669' : '#DC2626' }}>● ACTIVE</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: isDarkMode ? '#263347' : '#F1F5F9', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: isDarkMode ? '#64748B' : '#94A3B8' }}>STANDBY</Text>
              </View>
            )}
            {hasTrack && onClearDeck && (
              <TouchableOpacity 
                onPress={() => onClearDeck(playerId)}
                style={{
                  padding: 4, 
                  backgroundColor: isDarkMode ? '#374151' : '#E2E8F0',
                  borderRadius: 12,
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: isDarkMode ? '#FCA5A5' : '#EF4444' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Content */}
        {hasTrack ? (
          <>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 2,
              color: isDarkMode ? '#F1F5F9' : '#0F172A',
            }} numberOfLines={1}>{track.title}</Text>
            <Text style={{
              fontSize: 9,
              textAlign: 'center',
              marginBottom: 10,
              color: isDarkMode ? '#64748B' : '#94A3B8',
            }}>{track.artist}</Text>
            
            {/* PLAY SONG button (Standby only) */}
            {showPlayButton && (
              <TouchableOpacity
                onPress={() => onPlayUrlInPlayer(playerId)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10,
                  marginTop: 4, backgroundColor: '#0D9488', width: '100%',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>▶ PLAY</Text>
              </TouchableOpacity>
            )}

            {/* START SONG button (Active but not playing) */}
            {showStartButton && (
              <TouchableOpacity
                onPress={() => onPlayUrlInPlayer(playerId)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10,
                  marginTop: 4, backgroundColor: '#4F6AF0', width: '100%',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>▶ START</Text>
              </TouchableOpacity>
            )}
            
            {/* Active Controls */}
            {showActiveControls && (
              <View style={{ flexDirection: 'row', gap: 7, marginTop: 8, width: '100%' }}>
                <TouchableOpacity
                  onPress={onPauseActive}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#D97706' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>⏸ PAUSE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onStopActive}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#DC2626' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>⏹ STOP</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Standby Controls */}
            {showStandbyControls && !showPlayButton && (
              <View style={{ flexDirection: 'row', gap: 7, marginTop: 8, width: '100%' }}>
                <TouchableOpacity
                  onPress={() => onPauseStandby?.(playerId)}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#D97706' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>⏸ PAUSE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onStopStandby?.(playerId)}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 9, backgroundColor: '#475569' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>⏹ STOP</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {isActive && isPlaying && (
              <View style={{ marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#10B98120' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#10B981' }}>● NOW PLAYING</Text>
              </View>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 4 }}>
            <Text style={{ fontSize: 24, color: isDarkMode ? '#475569' : '#94A3B8' }}>♫</Text>
            <Text style={{ fontSize: 10, textAlign: 'center', color: isDarkMode ? '#94A3B8' : '#64748B' }}>
              No track loaded
            </Text>
            <Text style={{ fontSize: 8, textAlign: 'center', color: isDarkMode ? '#64748B' : '#94A3B8' }}>
              Upload local file → LOAD or Play
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{
      borderRadius: 14, padding: 14, marginBottom: 14,
      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
      borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
    }}>
      <Text style={{
        fontSize: 12, fontWeight: '700', marginBottom: 10, textAlign: 'center',
        letterSpacing: 0.5, color: isDarkMode ? '#94A3B8' : '#475569',
      }}>DUAL PLAYER</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        {renderPlayer("A", playerA ?? null, activePlayer === "A")}

        {/* Crossfader */}
        <View style={{ alignItems: 'center', width: 36 }}>
          <View style={{ width: 3, height: 56, borderRadius: 2, position: 'relative', backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
            <View style={{ position: 'absolute', bottom: 0, width: 3, borderRadius: 2, height: `${crossfadeValue}%`, backgroundColor: '#4F6AF0' }} />
            <View style={{ position: 'absolute', width: 12, height: 12, borderRadius: 6, left: -4.5, bottom: `${crossfadeValue}%`, backgroundColor: '#4F6AF0', borderWidth: 2, borderColor: '#FFFFFF' }} />
          </View>
          <Text style={{ fontSize: 9, fontWeight: '700', marginTop: 4, color: isDarkMode ? '#94A3B8' : '#475569' }}>{crossfadeValue}%</Text>
          {isCrossfading && <Text style={{ fontSize: 7, marginTop: 2, color: '#4F6AF0' }}>Fading…</Text>}
        </View>

        {renderPlayer("B", playerB ?? null, activePlayer === "B")}
      </View>

      <View style={{ marginTop: 10, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onSwitchAtoB}
          disabled={!playerA}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
            backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
            borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0',
            opacity: playerA ? 1 : 0.45,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: isDarkMode ? '#94A3B8' : '#475569' }}>
            Move Player A → B
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DualPlayer;