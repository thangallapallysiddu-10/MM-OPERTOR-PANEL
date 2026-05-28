// components/DualPlayer.tsx - Better mobile buttons, hash symbols

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Track } from '../types';

interface DualPlayerProps {
  playerA: Track | null;
  playerB: Track | null;
  activePlayer: "A" | "B";
  crossfadeValue: number;
  isCrossfading: boolean;
  isDarkMode: boolean;
  colors: any;
  onCrossfade: (targetValue: number) => void;
  onPlayUrlInPlayer: (playerId: "A" | "B") => void;
  onPauseActive?: () => void;
  onStopActive?: () => void;
  onPauseStandby?: (playerId: "A" | "B") => void;
  onStopStandby?: (playerId: "A" | "B") => void;
}

export const DualPlayer: React.FC<DualPlayerProps> = ({
  playerA,
  playerB,
  activePlayer,
  crossfadeValue,
  isCrossfading,
  isDarkMode,
  colors,
  onCrossfade,
  onPlayUrlInPlayer,
  onPauseActive,
  onStopActive,
  onPauseStandby,
  onStopStandby,
}) => {
  const isUserRequested = (track: Track | null): boolean => {
    if (!track) return false;
    return track.artist === "Requested" || 
           track.artist === "YouTube" || 
           track.artist === "Spotify" || 
           track.artist === "SoundCloud";
  };

  const renderPlayer = (playerId: "A" | "B", track: Track | null, isActive: boolean) => {
    const isStandby = !isActive;
    const hasTrack = track !== null;
    const showPlayButton = isStandby && hasTrack && isUserRequested(track);
    const showActiveControls = isActive && hasTrack;
    const showStandbyControls = isStandby && hasTrack && isUserRequested(track);

    return (
      <View style={{
        flex: 1,
        padding: 10,
        borderRadius: 12,
        alignItems: 'center',
        minHeight: 160,
        backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? '#6B7280' : (isDarkMode ? '#4B5563' : '#D1D5DB'),
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
          <Text style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: isActive ? '#6B7280' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
          }}>Player-{playerId === "A" ? "1" : "2"}</Text>
          {isActive ? (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#6B728020' }}>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#6B7280' }}>● ACTIVE</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }}>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>STANDBY</Text>
            </View>
          )}
        </View>
        
        {/* Content */}
        {hasTrack ? (
          <>
            <Text style={{
              fontSize: 13,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 2,
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }} numberOfLines={1}>{track.title}</Text>
            <Text style={{
              fontSize: 9,
              textAlign: 'center',
              marginBottom: 10,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>{track.artist}</Text>
            
            {/* PLAY SONG button (Standby only) */}
            {showPlayButton && (
              <TouchableOpacity
                onPress={() => onPlayUrlInPlayer(playerId)}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 6, 
                  paddingVertical: 6, 
                  paddingHorizontal: 12,
                  borderRadius: 16, 
                  marginTop: 4,
                  backgroundColor: '#6B7280',
                  width: '100%',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>▶ PLAY</Text>
              </TouchableOpacity>
            )}
            
            {/* Active Controls (PAUSE and STOP) */}
            {showActiveControls && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, width: '100%' }}>
                <TouchableOpacity
                  onPress={onPauseActive}
                  style={{ 
                    flex: 1,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingVertical: 6, 
                    borderRadius: 16, 
                    backgroundColor: '#9CA3AF',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>⏸ PAUSE</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={onStopActive}
                  style={{ 
                    flex: 1,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingVertical: 6, 
                    borderRadius: 16, 
                    backgroundColor: '#6B7280',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>⏹ STOP</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Standby Controls (PAUSE and STOP for standby) */}
            {showStandbyControls && !showPlayButton && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, width: '100%' }}>
                <TouchableOpacity
                  onPress={() => onPauseStandby?.(playerId)}
                  style={{ 
                    flex: 1,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingVertical: 6, 
                    borderRadius: 16, 
                    backgroundColor: '#9CA3AF',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>⏸ PAUSE</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => onStopStandby?.(playerId)}
                  style={{ 
                    flex: 1,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingVertical: 6, 
                    borderRadius: 16, 
                    backgroundColor: '#6B7280',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>⏹ STOP</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {isActive && (
              <View style={{ marginTop: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#6B728020' }}>
                <Text style={{ fontSize: 8, fontWeight: '500', color: '#6B7280' }}>● NOW PLAYING</Text>
              </View>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 4 }}>
            <Text style={{ fontSize: 24, color: isDarkMode ? '#6B7280' : '#9CA3AF' }}>♫</Text>
            <Text style={{ fontSize: 10, textAlign: 'center', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
              Enter a song request
            </Text>
            <Text style={{ fontSize: 8, textAlign: 'center', color: isDarkMode ? '#6B7280' : '#9CA3AF' }}>
              Click "Play Now" on request
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{
      borderRadius: 12,
      padding: 10,
      marginBottom: 14,
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    }}>
      <Text style={{
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: isDarkMode ? '#FFFFFF' : '#000000',
      }}>DUAL PLAYER SYSTEM</Text>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        {renderPlayer("A", playerA, activePlayer === "A")}
        
        {/* Crossfader */}
        <View style={{ alignItems: 'center', width: 40 }}>
          <View style={{ width: 3, height: 60, borderRadius: 1.5, position: 'relative', backgroundColor: isDarkMode ? '#4B5563' : '#D1D5DB' }}>
            <View style={{ position: 'absolute', bottom: 0, width: 3, borderRadius: 1.5, height: `${crossfadeValue}%`, backgroundColor: '#6B7280' }} />
            <View style={{ position: 'absolute', width: 12, height: 12, borderRadius: 6, left: -4.5, bottom: `${crossfadeValue}%`, backgroundColor: '#6B7280', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 4, color: isDarkMode ? '#FFFFFF' : '#000000' }}>{crossfadeValue}%</Text>
          {isCrossfading && <Text style={{ fontSize: 7, marginTop: 2, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Transition...</Text>}
        </View>
        
        {renderPlayer("B", playerB, activePlayer === "B")}
      </View>
    </View>
  );
};

export default DualPlayer;