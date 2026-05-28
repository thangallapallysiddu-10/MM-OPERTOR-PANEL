// components/Mixer.tsx - Channel names above boxes, responsive layout

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';

interface MixerProps {
  channels: { [key: number]: any };
  activeChannel: number;
  selectedFX: string;
  masterGain: number;
  crossfader: number;
  isDarkMode: boolean;
  isMobile: boolean;
  colors: any;
  onSelectChannel: (channel: number) => void;
  onToggleMute: (channel: number) => void;
  onToggleSolo: (channel: number) => void;
  onToggleCue: (channel: number) => void;
  onSelectFX: (fx: string) => void;
  onFXValueChange: (fxName: string, value: number, activeChannel: number) => void;
  onMasterGainChange: (value: number) => void;
  onCrossfaderChange: (value: number) => void;
  onChannelVolumeChange: (channelId: number, value: number) => void;
  getChannelColor: (ch: number, colors: any) => string;
}

const CAR_FX_OPTIONS = ['BEAT WHEELS', 'BASS ENGINE', 'EQ STEERING', 'TRANSITION', 'TURBO BOOST'];

export const Mixer: React.FC<MixerProps> = ({
  channels,
  activeChannel,
  selectedFX,
  masterGain,
  crossfader,
  isDarkMode,
  isMobile,
  onSelectChannel,
  onToggleMute,
  onToggleSolo,
  onToggleCue,
  onSelectFX,
  onFXValueChange,
  onMasterGainChange,
  onCrossfaderChange,
  onChannelVolumeChange,
}) => {
  const [localFXValue, setLocalFXValue] = useState(0);
  const [localMasterGain, setLocalMasterGain] = useState(masterGain);
  const [localCrossfader, setLocalCrossfader] = useState(crossfader);
  const [localChannelVolumes, setLocalChannelVolumes] = useState<{ [key: number]: number }>({});
  const [isDragging, setIsDragging] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    setLocalMasterGain(masterGain);
    setLocalCrossfader(crossfader);
  }, [masterGain, crossfader]);

  useEffect(() => {
    if (selectedFX && channels[activeChannel]) {
      setLocalFXValue(channels[activeChannel]?.fx?.[selectedFX] || 0);
    }
  }, [selectedFX, activeChannel, channels]);

  // Initialize volumes from channels
  useEffect(() => {
    const volumes: { [key: number]: number } = {};
    [1, 2, 3, 4, 5, 6].forEach(ch => {
      volumes[ch] = channels[ch]?.gain || 0;
    });
    setLocalChannelVolumes(volumes);
  }, []); // Only run once on mount

  // Update from channels ONLY if not currently dragging that channel
  useEffect(() => {
    [1, 2, 3, 4, 5, 6].forEach(ch => {
      if (!isDragging[ch]) {
        const channelGain = channels[ch]?.gain || 0;
        if (localChannelVolumes[ch] !== channelGain) {
          setLocalChannelVolumes(prev => ({ ...prev, [ch]: channelGain }));
        }
      }
    });
  }, [channels, isDragging]);

  const handleFXChange = (value: number) => {
    setLocalFXValue(Math.round(value));
  };

  const handleFXComplete = (value: number) => {
    onFXValueChange(selectedFX, Math.round(value), activeChannel);
  };

  // Volume handling - NO inversion: slider bottom = 0%, top = 100%
  const handleVolumeChange = (chNum: number, value: number) => {
    const roundedValue = Math.round(value);
    setIsDragging(prev => ({ ...prev, [chNum]: true }));
    setLocalChannelVolumes(prev => ({ ...prev, [chNum]: roundedValue }));
  };

  const handleVolumeComplete = (chNum: number, value: number) => {
    const roundedValue = Math.round(value);
    onChannelVolumeChange(chNum, roundedValue);
    setIsDragging(prev => ({ ...prev, [chNum]: false }));
  };

  const handleChannelPress = (chNum: number) => {
    onSelectChannel(chNum);
  };

  const getTextColor = () => isDarkMode ? '#FFFFFF' : '#000000';
  const getBgColor = () => isDarkMode ? '#1A1A1A' : '#F5F5F5';
  const getCardBg = () => isDarkMode ? '#000000' : '#FFFFFF';
  const getBorderColor = () => isDarkMode ? '#333333' : '#CCCCCC';
  const getButtonActiveBg = () => getTextColor();
  const getButtonActiveText = () => isDarkMode ? '#000000' : '#FFFFFF';

  // Get channel width based on device
  const getChannelWidth = () => {
    if (isMobile) return '30%'; // 3 columns on mobile
    return '15%'; 
  };

  // Define rows for mobile (2 rows of 3) and desktop (1 row of 6)
  const channelRows = isMobile ? [
    [1, 2, 3],
    [4, 5, 6]
  ] : [[1, 2, 3, 4, 5, 6]];

  return (
    <View style={{
      borderRadius: 12,
      padding: 12,
      backgroundColor: getCardBg(),
      borderWidth: 1,
      borderColor: getBorderColor(),
    }}>
      <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: getTextColor(), textAlign: 'center' }}>
        
      </Text>

      {/* Channel Rows - Each row has channel names + boxes */}
      {channelRows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ marginBottom: 16 }}>
          {/* Channel Names Row (above boxes) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 2 }}>
            {row.map(chNum => (
              <TouchableOpacity 
                key={chNum} 
                onPress={() => handleChannelPress(chNum)} 
                style={{ width: getChannelWidth(), alignItems: 'center' }}
              >
                <Text style={{ 
                  fontSize: isMobile ? 12 : 13, 
                  fontWeight: 'bold', 
                  color: activeChannel === chNum ? getTextColor() : getBorderColor(),
                }}>
                  CH{chNum}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Channel Boxes Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {row.map(chNum => {
              const gainValue = localChannelVolumes[chNum] !== undefined ? localChannelVolumes[chNum] : 0;
              const isActive = activeChannel === chNum;
              
              return (
                <View 
                  key={chNum} 
                  style={{
                    width: getChannelWidth(),
                    alignItems: 'center',
                    paddingVertical: isMobile ? 12 : 12,
                    paddingHorizontal: isMobile ? 6 : 4,
                    borderRadius: 10,
                    backgroundColor: getBgColor(),
                    borderWidth: 1.5,
                    borderColor: isActive ? getTextColor() : getBorderColor(),
                    minHeight: isMobile ? 220 : 200,
                  }}
                >
                  {/* Volume Percentage */}
                  <Text style={{ 
                    fontSize: isMobile ? 16 : 16, 
                    fontWeight: 'bold', 
                    marginBottom: 8, 
                    color: getTextColor() 
                  }}>
                    {gainValue}%
                  </Text>
                  
                  {/* Vertical Volume Slider - BIGGER on mobile */}
                  <View style={{ height: isMobile ? 100 : 80, justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
                    <Slider
                      style={{ 
                        width: isMobile ? 70 : 70, 
                        height: isMobile ? 70 : 70, 
                        transform: [{ rotate: '-90deg' }] 
                      }}
                      minimumValue={0}
                      maximumValue={100}
                      value={gainValue}
                      onValueChange={(value) => handleVolumeChange(chNum, value)}
                      onSlidingComplete={(value) => handleVolumeComplete(chNum, value)}
                      minimumTrackTintColor={getTextColor()}
                      maximumTrackTintColor={getBorderColor()}
                      thumbTintColor={getTextColor()}
                    />
                  </View>
                  
                  {/* M, S, C Buttons - FIXED for mobile */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: isMobile ? 8 : 8, 
                    marginTop: 12,
                    marginBottom: 4,
                    paddingHorizontal: 4,
                  }}>
                    <TouchableOpacity 
                      onPress={() => onToggleMute(chNum)} 
                      style={{
                        flex: 1,
                        maxWidth: isMobile ? 32 : 50,
                        height: isMobile ? 32 : 32,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: channels[chNum]?.muted ? getButtonActiveBg() : getBgColor(),
                        borderWidth: 0.5,
                        borderColor: getBorderColor(),
                      }}
                    >
                      <Text style={{ fontSize: isMobile ? 12 : 12, fontWeight: 'bold', color: channels[chNum]?.muted ? getButtonActiveText() : getTextColor() }}>M</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => onToggleSolo(chNum)} 
                      style={{
                        flex: 1,
                        maxWidth: isMobile ? 32 : 50,
                        height: isMobile ? 32 : 32,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: channels[chNum]?.solo ? getButtonActiveBg() : getBgColor(),
                        borderWidth: 0.5,
                        borderColor: getBorderColor(),
                      }}
                    >
                      <Text style={{ fontSize: isMobile ? 12 : 12, fontWeight: 'bold', color: channels[chNum]?.solo ? getButtonActiveText() : getTextColor() }}>S</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => onToggleCue(chNum)} 
                      style={{
                        flex: 1,
                        maxWidth: isMobile ? 32 : 50,
                        height: isMobile ? 32 : 32,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: channels[chNum]?.cue ? getButtonActiveBg() : getBgColor(),
                        borderWidth: 0.5,
                        borderColor: getBorderColor(),
                      }}
                    >
                      <Text style={{ fontSize: isMobile ? 12 : 12, fontWeight: 'bold', color: channels[chNum]?.cue ? getButtonActiveText() : getTextColor() }}>C</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* FX Section */}
      <View style={{ borderTopWidth: 1, borderTopColor: getBorderColor(), paddingTop: 12, marginTop: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '500', marginBottom: 8, color: getTextColor() }}>
          SELECT FX - CH{activeChannel}
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CAR_FX_OPTIONS.map(fx => (
              <TouchableOpacity 
                key={fx} 
                onPress={() => onSelectFX(fx)} 
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: selectedFX === fx ? getButtonActiveBg() : getBgColor(),
                  borderWidth: 0.5,
                  borderColor: getBorderColor(),
                }}
              >
                <Text style={{
                  fontSize: 10,
                  fontWeight: selectedFX === fx ? 'bold' : 'normal',
                  color: selectedFX === fx ? getButtonActiveText() : getTextColor(),
                }}>{fx}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Selected FX Slider */}
        {selectedFX && (
          <View style={{
            backgroundColor: getBgColor(),
            borderWidth: 0.5,
            borderColor: getBorderColor(),
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: getTextColor() }}>{selectedFX}</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: getTextColor() }}>{localFXValue}%</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 30 }}
              minimumValue={0}
              maximumValue={100}
              value={localFXValue}
              onValueChange={handleFXChange}
              onSlidingComplete={handleFXComplete}
              minimumTrackTintColor={getTextColor()}
              maximumTrackTintColor={getBorderColor()}
              thumbTintColor={getTextColor()}
            />
          </View>
        )}

        {/* Master Controls Row */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          borderRadius: 10,
          padding: 10,
          backgroundColor: getBgColor(),
          borderWidth: 0.5,
          borderColor: getBorderColor(),
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, marginBottom: 4, color: getTextColor() }}>CROSSFADER</Text>
            <Slider
              style={{ width: '100%', height: 25 }}
              minimumValue={0}
              maximumValue={100}
              value={localCrossfader}
              onValueChange={setLocalCrossfader}
              onSlidingComplete={onCrossfaderChange}
              minimumTrackTintColor={getTextColor()}
              maximumTrackTintColor={getBorderColor()}
              thumbTintColor={getTextColor()}
            />
            <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2, color: getTextColor() }}>
              {Math.round(localCrossfader)}%
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, marginBottom: 4, color: getTextColor() }}>MASTER</Text>
            <Slider
              style={{ width: '100%', height: 25 }}
              minimumValue={0}
              maximumValue={100}
              value={localMasterGain}
              onValueChange={setLocalMasterGain}
              onSlidingComplete={onMasterGainChange}
              minimumTrackTintColor={getTextColor()}
              maximumTrackTintColor={getBorderColor()}
              thumbTintColor={getTextColor()}
            />
            <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2, color: getTextColor() }}>
              {Math.round(localMasterGain)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Mixer;