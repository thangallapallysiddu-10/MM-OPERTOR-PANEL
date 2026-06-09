// sections/MusicPlayer.tsx - Fixed for mobile AND web

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../../../store/useAppStore';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
  videoId: string;
  duration?: number;
  currentTime?: number;
}

interface MusicPlayerProps {
  showMusicPlayer: boolean;
  onTogglePlayer: () => void;
  colors: any;
}

const isWeb = Platform.OS === 'web';
const isMobile = Platform.OS !== 'web';

// Helper to extract YouTube video ID
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
    /(?:youtube\.com\/shorts\/)([^?]+)/,
    /(?:youtube\.com\/v\/)([^?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Fetch YouTube video info
const fetchYouTubeInfo = async (videoId: string) => {
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    
    return {
      title: data.title || "YouTube Track",
      artist: data.author_name || "YouTube Artist",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch (error) {
    return {
      title: "YouTube Track",
      artist: "YouTube Artist",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }
};

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  showMusicPlayer,
  onTogglePlayer,
  colors,
}) => {
  const {
    podcast,
    updatePodcastState,
    addDashboardNotification,
  } = useAppStore();

  const currentMusic = podcast.currentMusic;
  const isMusicPlaying = podcast.isMusicPlaying;
  const musicLink = podcast.musicLink;
  
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [error, setError] = useState('');
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicCurrentTime, setMusicCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  
  // For Web - use iframe
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // For Mobile - use WebView
  const webViewRef = useRef<any>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  
  const progressIntervalRef = useRef<any>(null);

  // Progress tracking
  useEffect(() => {
    if (isMusicPlaying && !isSeeking) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        if (!isSeeking) {
          setMusicCurrentTime(prev => Math.min(prev + 1, musicDuration));
        }
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isMusicPlaying, isSeeking, musicDuration]);

  // For Web: Handle iframe messages
  useEffect(() => {
    if (!isWeb) return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'duration') {
            setMusicDuration(data.data);
          } else if (data.type === 'time') {
            if (!isSeeking) {
              setMusicCurrentTime(data.currentTime);
            }
          } else if (data.type === 'ended') {
            updatePodcastState({ isMusicPlaying: false });
            setMusicCurrentTime(0);
          }
        } catch (e) {}
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isSeeking]);

  // Extract YouTube music
  const extractMusic = async () => {
    if (!musicLink.trim()) {
      setError("Please paste a YouTube link");
      Alert.alert("Error", "Please paste a YouTube link");
      return;
    }

    const videoId = extractYouTubeId(musicLink);
    if (!videoId) {
      setError("Invalid YouTube link");
      Alert.alert("Error", "Invalid YouTube link");
      return;
    }

    setLoadingMusic(true);
    setError('');

    try {
      const info = await fetchYouTubeInfo(videoId);
      
      const newMusicTrack: MusicTrack = {
        id: videoId,
        title: info?.title || "YouTube Track",
        artist: info?.artist || "YouTube",
        thumbnail: info?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        url: musicLink,
        videoId: videoId,
        duration: 0,
        currentTime: 0,
      };

      updatePodcastState({ currentMusic: newMusicTrack });
      setMusicDuration(0);
      setMusicCurrentTime(0);
      
      addDashboardNotification({
        title: "Music Added",
        message: `Added: ${newMusicTrack.title}`,
        time: "Just now",
        read: false,
      });
      
      // Auto-play after loading
      setTimeout(() => {
        handlePlay();
      }, 500);
      
    } catch (err) {
      setError("Failed to load music");
      Alert.alert("Error", "Failed to load music");
    } finally {
      setLoadingMusic(false);
    }
  };

  // Play music
  const handlePlay = () => {
    if (!currentMusic || !currentMusic.videoId) {
      Alert.alert("No Music", "Please load a YouTube link first");
      return;
    }
    
    updatePodcastState({ isMusicPlaying: true });
    
    if (isWeb) {
      // Web: Send play command to iframe
      const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
      }
    } else {
      // Mobile: Use WebView
      setShowWebView(false);
      setTimeout(() => {
        setWebViewKey(prev => prev + 1);
        setShowWebView(true);
      }, 100);
    }
  };

  const handlePause = () => {
    updatePodcastState({ isMusicPlaying: false });
    
    if (isWeb) {
      const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
      }
    } else {
      setShowWebView(false);
    }
  };

  const seekMusic = (value: number) => {
    setIsSeeking(true);
    const newTime = value * musicDuration;
    setMusicCurrentTime(newTime);
  };

  const seekMusicComplete = (value: number) => {
    const newTime = value * musicDuration;
    
    if (isWeb) {
      const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [newTime, true] }), '*');
      }
    } else if (webViewRef.current) {
      const seekScript = `
        if (player && player.seekTo) {
          player.seekTo(${newTime}, true);
        }
        true;
      `;
      webViewRef.current.injectJavaScript(seekScript);
    }
    
    setTimeout(() => {
      setIsSeeking(false);
    }, 200);
  };

  // Web YouTube Player (visible iframe)
  const WebYouTubePlayer = () => {
    if (!currentMusic) return null;
    
    const embedUrl = `https://www.youtube.com/embed/${currentMusic.videoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&autoplay=${isMusicPlaying ? 1 : 0}`;
    
    return (
      <iframe
        id="youtube-player"
        ref={iframeRef as any}
        src={embedUrl}
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: 'none'
        }}
        title="YouTube player"
        allow="autoplay"
      />
    );
  };

  // Mobile WebView YouTube Player
  const MobileYouTubePlayer = () => {
    if (!showWebView || !currentMusic) return null;
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    #player { position: absolute; top: 0; left: 0; width: 1px; height: 1px; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var player;
    var timeInterval;
    
    function sendMessage(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
      }
    }
    
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        width: 1,
        height: 1,
        videoId: '${currentMusic.videoId}',
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'playsinline': 1,
          'enablejsapi': 1,
          'origin': 'https://www.youtube-nocookie.com'
        },
        events: {
          'onReady': function(e) {
            e.target.setVolume(50);
            sendMessage('duration', e.target.getDuration());
            setTimeout(function() {
              if (player && player.playVideo) {
                player.playVideo();
              }
            }, 100);
          },
          'onStateChange': function(e) {
            if (e.data === YT.PlayerState.PLAYING) {
              sendMessage('playing', null);
              if (timeInterval) clearInterval(timeInterval);
              timeInterval = setInterval(function() {
                if (player && player.getCurrentTime) {
                  sendMessage('time', player.getCurrentTime());
                }
              }, 500);
            } else if (e.data === YT.PlayerState.PAUSED) {
              sendMessage('paused', null);
              if (timeInterval) clearInterval(timeInterval);
            } else if (e.data === YT.PlayerState.ENDED) {
              sendMessage('ended', null);
              if (timeInterval) clearInterval(timeInterval);
            }
          }
        }
      });
    }
    
    function loadYouTubeAPI() {
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    
    loadYouTubeAPI();
    
    window.controlPlayer = function(action) {
      if (action === 'play' && player && player.playVideo) player.playVideo();
      if (action === 'pause' && player && player.pauseVideo) player.pauseVideo();
      if (action === 'stop' && player && player.stopVideo) player.stopVideo();
    };
  </script>
</body>
</html>`;
    
    return (
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ html: html, baseUrl: "https://www.youtube-nocookie.com" }}
        style={{ width: 1, height: 1, opacity: 0.01, position: 'absolute', top: -100, left: -100 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        onMessage={handleWebViewMessage}
        onError={(error) => console.error('WebView error:', error)}
      />
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'duration') {
        setMusicDuration(data.data);
        if (currentMusic) {
          updatePodcastState({ currentMusic: { ...currentMusic, duration: data.data } });
        }
      } 
      else if (data.type === 'time') {
        if (!isSeeking) {
          setMusicCurrentTime(data.currentTime);
          if (currentMusic) {
            updatePodcastState({ currentMusic: { ...currentMusic, currentTime: data.currentTime } });
          }
        }
      }
      else if (data.type === 'ended') {
        updatePodcastState({ isMusicPlaying: false });
        setMusicCurrentTime(0);
        setShowWebView(false);
      }
      else if (data.type === 'playing') {
        updatePodcastState({ isMusicPlaying: true });
      }
      else if (data.type === 'paused') {
        updatePodcastState({ isMusicPlaying: false });
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Web Player */}
      {isWeb && <WebYouTubePlayer />}
      
      {/* Mobile Player */}
      {!isWeb && <MobileYouTubePlayer />}
      
      <View style={[styles.musicPlayerSection, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
        <TouchableOpacity style={styles.musicPlayerHeader} onPress={onTogglePlayer}>
          <View style={styles.musicPlayerTitleRow}>
            <Feather name="music" size={16} color={colors.textSecondary} />
            <Text style={[styles.musicPlayerTitle, { color: colors.text }]}>Background Music</Text>
          </View>
          <Feather name={showMusicPlayer ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {showMusicPlayer && (
          <View style={styles.musicPlayerContent}>
            <View style={styles.linkInputRow}>
              <TextInput
                style={[styles.linkInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                placeholder="Paste YouTube link"
                placeholderTextColor={colors.textMuted}
                value={musicLink}
                onChangeText={(text) => updatePodcastState({ musicLink: text })}
              />
              <TouchableOpacity
                onPress={extractMusic}
                style={[styles.addLinkButton, { backgroundColor: colors.text }]}
                disabled={loadingMusic}
              >
                {loadingMusic ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Feather name="plus" size={18} color={colors.background} />
                )}
              </TouchableOpacity>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
            ) : null}

            {currentMusic && (
              <View style={[styles.musicTrackInfo, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                {currentMusic.thumbnail && (
                  <Image source={{ uri: currentMusic.thumbnail }} style={styles.musicThumbnail} />
                )}
                <View style={styles.musicDetails}>
                  <Text style={[styles.musicTitle, { color: colors.text }]} numberOfLines={2}>
                    {currentMusic.title}
                  </Text>
                  <Text style={[styles.musicArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {currentMusic.artist}
                  </Text>
                  {musicDuration > 0 && (
                    <View style={styles.musicProgressContainer}>
                      <Slider
                        style={styles.musicSlider}
                        minimumValue={0}
                        maximumValue={1}
                        value={musicCurrentTime / musicDuration}
                        onValueChange={seekMusic}
                        onSlidingComplete={seekMusicComplete}
                        minimumTrackTintColor={colors.text}
                        maximumTrackTintColor={colors.cardBorder}
                        thumbTintColor={colors.text}
                      />
                      <View style={styles.musicTimeRow}>
                        <Text style={[styles.musicTimeText, { color: colors.textMuted }]}>{formatTime(musicCurrentTime)}</Text>
                        <Text style={[styles.musicTimeText, { color: colors.textMuted }]}>{formatTime(musicDuration)}</Text>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.musicControls}>
                  {!isMusicPlaying ? (
                    <TouchableOpacity onPress={handlePlay} style={styles.playMusicButton}>
                      <Feather name="play-circle" size={40} color={colors.text} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handlePause} style={styles.pauseMusicButton}>
                      <Feather name="pause-circle" size={40} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {currentMusic && isMusicPlaying && (
              <Text style={[styles.playingText, { color: colors.textSecondary }]}>
                🔴 Now playing: {currentMusic.title}
              </Text>
            )}

            {!currentMusic && !loadingMusic && (
              <View style={styles.noMusicContainer}>
                <Feather name="music" size={32} color={colors.textMuted} />
                <Text style={[styles.noMusicText, { color: colors.textMuted }]}>No music playing</Text>
                <Text style={[styles.noMusicSubText, { color: colors.textMuted }]}>Paste a YouTube link above and click +</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  musicPlayerSection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  musicPlayerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  musicPlayerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  musicPlayerTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  musicPlayerContent: {
    padding: 12,
    paddingTop: 0,
    gap: 12,
  },
  linkInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  addLinkButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 11,
    textAlign: "center",
  },
  musicTrackInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  musicThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  musicDetails: {
    flex: 1,
  },
  musicTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  musicArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  musicProgressContainer: {
    marginTop: 8,
  },
  musicSlider: {
    width: "100%",
    height: 30,
  },
  musicTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  musicTimeText: {
    fontSize: 10,
  },
  musicControls: {
    flexDirection: "row",
    gap: 12,
  },
  playMusicButton: {
    padding: 4,
  },
  pauseMusicButton: {
    padding: 4,
  },
  playingText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  noMusicContainer: {
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  noMusicText: {
    fontSize: 13,
  },
  noMusicSubText: {
    fontSize: 11,
    textAlign: "center",
  },
});