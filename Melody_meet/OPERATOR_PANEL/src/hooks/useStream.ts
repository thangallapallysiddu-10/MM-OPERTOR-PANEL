import { useState, useEffect } from 'react';
import { useOperator } from '../context/OperatorContext';

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
  
  // Simulate stream health monitoring (web fallback)
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
    if (typeof window !== 'undefined' && (window as any).audio?.on) {
      const handleStats = (data: any) => {
        setStreamHealth(data.reconnecting ? 'unstable' : 'stable');
        setBitrate(data.bitrate || 128);
        setBufferHealth(100);
        setNetworkLatency(0);
      };

      (window as any).audio.on('broadcast:stats', handleStats);
      return () => {
        (window as any).audio.off('broadcast:stats', handleStats);
      };
    }
    
    // Simulate network fluctuations (web fallback only)
    const interval = setInterval(() => {
      const random = Math.random();
      
      // 15% chance of becoming unstable
      if (random > 0.85) {
        setStreamHealth('unstable');
        setBufferHealth(prev => Math.max(0, prev - 15));
        setNetworkLatency(prev => prev + 50);
        setDroppedFrames(prev => prev + Math.floor(Math.random() * 5));
      } else {
        setStreamHealth('stable');
        setBufferHealth(prev => Math.min(100, prev + 10));
        setNetworkLatency(prev => Math.max(0, prev - 20));
      }
      
      // Adjust bitrate based on health
      if (streamHealth === 'unstable') {
        setBitrate(prev => Math.max(96, prev - 16));
      } else {
        setBitrate(prev => Math.min(320, prev + 8));
      }
      
      // Adjust audio quality based on bitrate
      if (bitrate >= 256) {
        setAudioQuality('lossless');
      } else if (bitrate >= 192) {
        setAudioQuality('high');
      } else if (bitrate >= 128) {
        setAudioQuality('medium');
      } else {
        setAudioQuality('low');
      }
      
    }, 10000);
    
    return () => clearInterval(interval);
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