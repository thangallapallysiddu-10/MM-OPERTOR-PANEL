// hooks/useMixer.ts - Car Themed FX ONLY (No old effects)

import { useAppStore } from '../../../store/useAppStore';
import { trackLibrary } from '../constants';

// Car FX Mapping - NEW NAMES ONLY
const carFXMapping: { [key: string]: string } = {
  'BEAT WHEELS': 'beat_wheels',
  'BASS ENGINE': 'bass_engine',
  'EQ STEERING': 'eq_steering',
  'TRANSITION': 'transition',
  'TURBO BOOST': 'turbo_boost',
};

export const useMixer = () => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const mixerChannels = rjStudio.mixerChannels;
  const masterGain = rjStudio.masterGain;
  const mixerCrossfader = rjStudio.mixerCrossfader;
  const selectedFX = rjStudio.selectedFX;
  
  const setMasterGain = (value: number) => updateRjStudioState({ masterGain: value });
  const setCrossfader = (value: number) => updateRjStudioState({ mixerCrossfader: value });
  
  const toggleMute = (channelId: number): void => {
    updateRjStudioState({
      mixerChannels: mixerChannels.map(ch =>
        ch.id === channelId ? { ...ch, isMuted: !ch.isMuted } : ch
      )
    });
  };
  
  const toggleSolo = (channelId: number): void => {
    updateRjStudioState({
      mixerChannels: mixerChannels.map(ch =>
        ch.id === channelId ? { ...ch, isSolo: !ch.isSolo } : ch
      )
    });
  };
  
  const toggleCue = (channelId: number): void => {
    updateRjStudioState({
      mixerChannels: mixerChannels.map(ch =>
        ch.id === channelId ? { ...ch, isCue: !ch.isCue } : ch
      )
    });
  };
  
  const toggleFX = (fx: string): void => {
    updateRjStudioState({ selectedFX: [fx] });
  };

  // Update channel volume
  const onChannelVolumeChange = (channelId: number, value: number): void => {
    updateRjStudioState({
      mixerChannels: mixerChannels.map(ch =>
        ch.id === channelId ? { ...ch, volume: value } : ch
      )
    });
  };

  // Update FX value - Car FX ONLY
  const onFXValueChange = (fxName: string, value: number, activeChannel: number): void => {
    const fxKey = carFXMapping[fxName] || fxName.toLowerCase().replace(' ', '_');
    const currentChannel = mixerChannels.find(ch => ch.id === activeChannel);
    
    if (currentChannel) {
      let newFx = [...currentChannel.fx];
      const existingFx = newFx.find(f => f.startsWith(fxKey));
      
      if (value > 0) {
        if (existingFx) {
          newFx = newFx.map(f => f.startsWith(fxKey) ? `${fxKey}:${value}` : f);
        } else {
          newFx.push(`${fxKey}:${value}`);
        }
      } else {
        newFx = newFx.filter(f => !f.startsWith(fxKey));
      }
      
      updateRjStudioState({
        mixerChannels: mixerChannels.map(ch =>
          ch.id === activeChannel ? { ...ch, fx: newFx } : ch
        )
      });
    }
  };

  // Update master gain
  const onMasterGainChange = (value: number): void => {
    updateRjStudioState({ masterGain: value });
  };

  // Update crossfader
  const onCrossfaderChange = (value: number): void => {
    updateRjStudioState({ mixerCrossfader: value });
  };

  // Black & White only
  const getChannelColor = (channelId: number, colors: any): string => {
    return '#000000';
  };

  // Build channels object
  const channels: { [key: number]: any } = {};
  
  mixerChannels.forEach(ch => {
    // Parse FX values from store
    let fxValues = { 
      'BEAT WHEELS': 0,
      'BASS ENGINE': 0,
      'EQ STEERING': 0,
      'TRANSITION': 0,
      'TURBO BOOST': 0,
    };
    
    // Read car FX values from store
    ch.fx?.forEach(fxStr => {
      const [fxName, fxVal] = fxStr.split(':');
      const value = parseInt(fxVal) || 0;
      
      if (fxName === 'beat_wheels') fxValues['BEAT WHEELS'] = value;
      if (fxName === 'bass_engine') fxValues['BASS ENGINE'] = value;
      if (fxName === 'eq_steering') fxValues['EQ STEERING'] = value;
      if (fxName === 'transition') fxValues['TRANSITION'] = value;
      if (fxName === 'turbo_boost') fxValues['TURBO BOOST'] = value;
    });
    
    channels[ch.id] = {
      id: ch.id,
      name: ch.name,
      gain: ch.volume,
      low: 50,
      mid: 50,
      high: 50,
      fx: fxValues,
      muted: ch.isMuted,
      solo: ch.isSolo,
      cue: ch.isCue,
      track: trackLibrary[ch.id - 1] || trackLibrary[0]
    };
  });

  return {
    channels,
    masterGain,
    crossfader: mixerCrossfader,
    selectedFX: selectedFX[0] || "BEAT WHEELS",
    toggleMute,
    toggleSolo,
    toggleCue,
    toggleFX,
    getChannelColor,
    setMasterGain,
    setCrossfader,
    onChannelVolumeChange,
    onFXValueChange,
    onMasterGainChange,
    onCrossfaderChange,
  };
};