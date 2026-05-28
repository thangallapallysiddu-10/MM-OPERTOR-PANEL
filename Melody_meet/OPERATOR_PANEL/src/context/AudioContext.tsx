import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

declare global {
  interface Window {
    _ytSetProgress: ((currentTime: number, duration: number) => void) | undefined;
  }
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  src: string | null;
  ytId?: string;
  type: 'local' | 'youtube';
  duration: number;
  thumbnail?: string | null;
}

interface AudioContextType {
  playlist: Track[];
  setPlaylist: React.Dispatch<React.SetStateAction<Track[]>>;
  curIdx: number;
  setCurIdx: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  soundRef: React.MutableRefObject<any>;
  playTrack: (index: number, forcePlay?: boolean) => Promise<void>;
  seekYouTube: (time: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [curIdx, setCurIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<any>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [showWebView, setShowWebView] = useState(false);

  const cur = playlist[curIdx];

  useEffect(() => {
    if (cur?.type === 'youtube' && cur.ytId) {
      setWebViewKey(prev => prev + 1);
      setShowWebView(true);
    } else {
      setShowWebView(false);
    }
  }, [curIdx, cur]);

  useEffect(() => {
    if (!webViewRef.current) return;
    if (isPlaying) {
      webViewRef.current.injectJavaScript('window.controlPlayer("play"); true;');
    } else {
      webViewRef.current.injectJavaScript('window.controlPlayer("pause"); true;');
    }
  }, [isPlaying]);

  const playTrack = async (index: number, forcePlay = false) => {
    setCurIdx(index);
    setIsPlaying(true);
  };

  const seekYouTube = (time: number) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.seekTo(${time}); true;`);
    }
  };

  const getYouTubeHTML = (videoId: string) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    #player { position: absolute; top: -100px; left: -100px; width: 1px; height: 1px; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var player;
    var lastTime = 0;
    
    function sendMessage(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
      }
    }
    
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        width: 1,
        height: 1,
        videoId: '${videoId}',
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'playsinline': 1,
          'enablejsapi': 1,
          'origin': 'https://www.youtube-nocookie.com'
        },
        events: {
          'onReady': function(e) {
            e.target.setVolume(100);
            e.target.playVideo();
            setTimeout(function() {
              var dur = e.target.getDuration();
              sendMessage('duration', dur);
            }, 1000);
          },
          'onStateChange': function(e) {
            if (e.data === YT.PlayerState.ENDED) {
              sendMessage('ended', true);
            }
          }
        }
      });
    }
    
    function updateTime() {
      if (player && player.getCurrentTime) {
        var time = player.getCurrentTime();
        if (Math.abs(time - lastTime) > 0.1) {
          lastTime = time;
          sendMessage('time', time);
        }
      }
      requestAnimationFrame(updateTime);
    }
    updateTime();
    
    window.controlPlayer = function(action) {
      if (action === 'play') player?.playVideo();
      if (action === 'pause') player?.pauseVideo();
    };
    
    window.seekTo = function(time) {
      if (player && player.seekTo) {
        player.seekTo(time, true);
      }
    };
    
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  </script>
</body>
</html>`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'duration' && window._ytSetProgress) {
        window._ytSetProgress(0, data.data);
      }
      if (data.type === 'ended') {
        setIsPlaying(false);
      }
    } catch (error) {}
  };

  return (
    <AudioContext.Provider
      value={{
        playlist,
        setPlaylist,
        curIdx,
        setCurIdx,
        isPlaying,
        setIsPlaying,
        soundRef,
        playTrack,
        seekYouTube,
      }}
    >
      {children}
      {Platform.OS !== 'web' && showWebView && cur?.ytId && (
        <View style={{ position: 'absolute', top: -100, left: -100, width: 1, height: 1 }}>
          <WebView
            ref={webViewRef}
            key={webViewKey}
            source={{ html: getYouTubeHTML(cur.ytId) }}
            style={{ width: 1, height: 1, opacity: 0.01 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onMessage={handleMessage}
            originWhitelist={['*']}
          />
        </View>
      )}
    </AudioContext.Provider>
  );
};