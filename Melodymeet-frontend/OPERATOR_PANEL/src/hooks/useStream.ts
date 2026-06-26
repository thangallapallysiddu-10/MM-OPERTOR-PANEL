import { useState, useEffect } from 'react';
import { useOperator } from '../context/OperatorContext';
import { audio } from '../services/audio';

export const useStream = () => {
  const { isLive, listeners } = useOperator();
  
  // Stream specific states
  const [streamHealth, setStreamHealth] = useState<'stable' | 'unstable' | 'offline'>('offline');
  const [bitrate, setBitrate] = useState(320);
  const [networkLatency, setNetworkLatency] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [audioQuality, setAudioQuality] = useState<'low' | 'medium' | 'high' | 'lossless'>('high');
  const [bufferHealth, setBufferHealth] = useState(100);
  const [droppedFrames, setDroppedFrames] = useState(0);
  
  // Desktop-only stream health monitoring is driven by native broadcast stats.
  useEffect(() => {
    if (!isLive) {
      setStreamHealth('offline');
      setBufferHealth(0);
      setDroppedFrames(0);
      return;
    }
    
    setStreamHealth('stable');
    setBufferHealth(100);

    // If native broadcast is available, use real stats instead of simulation
    const handleStats = (data: any) => {
      setStreamHealth(data.reconnecting ? 'unstable' : 'stable');
      setBitrate(data.bitrate || 128);
      setBufferHealth(100);
      setNetworkLatency(0);
    };

    audio.on('broadcast:stats', handleStats);
    return () => {
      audio.off('broadcast:stats', handleStats);
    };
  }, [isLive, streamHealth, bitrate]);
  
  // Auto-reconnect logic
  const handleReconnect = () => {
    setReconnectAttempts(prev => prev + 1);
    setStreamHealth('stable');
    setBufferHealth(100);
    setNetworkLatency(0);
    setBitrate(320);
    setAudioQuality('high');
    
  };
  
  // Manual quality adjustment
  const adjustQuality = (newBitrate: number) => {
    setBitrate(newBitrate);
    if (newBitrate >= 256) {
      setAudioQuality('lossless');
    } else if (newBitrate >= 192) {
      setAudioQuality('high');
    } else if (newBitrate >= 128) {
      setAudioQuality('medium');
    } else {
      setAudioQuality('low');
    }
  };
  
  // Get stream quality color
  const getQualityColor = () => {
    switch (streamHealth) {
      case 'stable': return '#34D399';
      case 'unstable': return '#F59E0B';
      case 'offline': return '#9A9AAA';
      default: return '#9A9AAA';
    }
  };
  
  // Get stream quality text
  const getQualityText = () => {
    switch (streamHealth) {
      case 'stable': return `${bitrate}kbps`;
      case 'unstable': return 'Unstable';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };
  
  return {
    streamHealth,
    bitrate,
    networkLatency,
    reconnectAttempts,
    audioQuality,
    bufferHealth,
    droppedFrames,
    handleReconnect,
    adjustQuality,
    getQualityColor,
    getQualityText,
  };
};
