// components/PlayerAudioFXPanel.tsx - Professional audio effects control panel

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';

interface PlayerAudioFXPanelProps {
  playerName: 'A' | 'B';
  playerTrack: any | null;
  volume: number;
  fx: {
    highPassFilter: number;
    lowPassFilter: number;
    eqBass: number;
    eqTreble: number;
    echoDelay: number;
  };
  isDarkMode: boolean;
  colors: any;
  onVolumeChange: (volume: number) => void;
  onEffectChange: (effectName: string, value: number) => void;
  onResetEffects: () => void;
}

const PlayerAudioFXPanel: React.FC<PlayerAudioFXPanelProps> = ({
  playerName,
  playerTrack,
  volume,
  fx,
  isDarkMode,
  onVolumeChange,
  onEffectChange,
  onResetEffects,
}) => {
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const getTextColor = () => isDarkMode ? '#F1F5F9' : '#0F172A';
  const getBgColor = () => isDarkMode ? '#0F172A' : '#F8FAFC';
  const getCardBg = () => isDarkMode ? '#1E293B' : '#FFFFFF';
  const getBorderColor = () => isDarkMode ? '#334155' : '#E2E8F0';

  const handleVolumeChange = (value: number) => {
    const rounded = Math.round(value);
    setLocalVolume(rounded);
    onVolumeChange(rounded);
  };

  const renderEffectSlider = (
    effectName: string,
    label: string,
    value: number,
    min: number,
    max: number,
    unit: string = '%',
    icon: string = '🎚️'
  ) => (
    <View key={effectName} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: getTextColor() }}>
          {label}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: '#4F6AF0', minWidth: 45, textAlign: 'right' }}>
          {effectName.includes('Rate') || effectName.includes('Decay')
            ? value.toFixed(2) + ' ' + (unit || '')
            : effectName.includes('Filter')
            ? Math.round(value) + ' Hz'
            : Math.round(value) + unit}
        </Text>
      </View>
      <Slider
        style={{ width: '100%', height: 24 }}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={(v) => {
          if (effectName === 'volume') {
            handleVolumeChange(v);
          } else {
            onEffectChange(effectName, v);
          }
        }}
        minimumTrackTintColor={'#4F6AF0'}
        maximumTrackTintColor={getBorderColor()}
        thumbTintColor={'#4F6AF0'}
        step={effectName.includes('Rate') || effectName.includes('Decay') ? 0.1 : 1}
      />
    </View>
  );

  return (
    <View style={{
      borderRadius: 14, padding: 14,
      backgroundColor: getCardBg(),
      borderWidth: 1, borderColor: getBorderColor(),
      marginBottom: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.15 : 0.04, shadowRadius: 4, elevation: 2,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: getTextColor() }}>
          Player {playerName} — Audio FX
        </Text>
        <TouchableOpacity
          onPress={onResetEffects}
          style={{
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
            backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
            borderWidth: 1, borderColor: getBorderColor(),
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: isDarkMode ? '#94A3B8' : '#475569' }}>↺ RESET</Text>
        </TouchableOpacity>
      </View>

      {/* Track Info */}
      {playerTrack ? (
        <View style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: getBorderColor() }}>
          <Text style={{ fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, color: isDarkMode ? '#64748B' : '#94A3B8', marginBottom: 3 }}>Now Playing</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: getTextColor() }} numberOfLines={1}>{playerTrack.title}</Text>
          <Text style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8' }} numberOfLines={1}>{playerTrack.artist}</Text>
        </View>
      ) : (
        <View style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: getBorderColor() }}>
          <Text style={{ fontSize: 11, color: isDarkMode ? '#64748B' : '#94A3B8' }}>No track loaded</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* VOLUME */}
        <View style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: getBorderColor() }}>
          <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 8, color: getTextColor(), textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Volume
          </Text>
          {renderEffectSlider('volume', 'Master Volume', localVolume, 0, 100, '%', '')}
        </View>

        {/* FILTERS */}
        <View style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: getBorderColor() }}>
          <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 10, color: getTextColor(), textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Filters
          </Text>
          {renderEffectSlider('highPassFilter', 'High-Pass Filter', fx.highPassFilter, 20, 20000, '', '')}
          {renderEffectSlider('lowPassFilter', 'Low-Pass Filter', fx.lowPassFilter, 20, 20000, '', '')}
        </View>

        {/* EQ BANDS */}
        <View style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: getBorderColor() }}>
          <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 10, color: getTextColor(), textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Equalizer (2-Band)
          </Text>
          {renderEffectSlider('eqBass', 'Bass (50-250Hz)', fx.eqBass, 0, 100, '%', '')}
          {renderEffectSlider('eqTreble', 'Treble (8kHz-16kHz)', fx.eqTreble, 0, 100, '%', '')}
        </View>

        {/* ECHO & DELAY */}
        <View style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: getBorderColor() }}>
          <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 10, color: getTextColor(), textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Echo & Delay
          </Text>
          {renderEffectSlider('echoDelay', 'Delay Time', fx.echoDelay, 0, 2000, 'ms', '')}
        </View>


      </ScrollView>
    </View>
  );
};
export default PlayerAudioFXPanel;
