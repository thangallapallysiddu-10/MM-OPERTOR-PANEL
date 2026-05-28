import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  StatusBar,
  BackHandler,
} from "react-native";
import { Audio } from "expo-av";
import * as Clipboard from 'expo-clipboard';
import { io as socketIo } from 'socket.io-client';

const { width } = Dimensions.get("window");
const isMobile = width < 768;
const API_BASE =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');
const SOCKET_SERVER_URL = API_BASE.replace(/\/api$/, '');

// Black & White Theme
const lightColors = {
  background: "#FFFFFF",
  card: "#F5F5F5",
  border: "#CCCCCC",
  primary: "#000000",
  success: "#2E7D32",
  warning: "#F57C00",
  error: "#C62828",
  text: "#000000",
  textSecondary: "#666666",
  textMuted: "#999999",
};

const darkColors = {
  background: "#121212",
  card: "#1E1E1E",
  border: "#444444",
  primary: "#FFFFFF",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#EF5350",
  text: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textMuted: "#808080",
};

interface GuestRoomProps {
  route?: {
    params?: {
      link?: string;
      roomId?: string;
    };
  };
  navigation?: any;
}

const GuestRoom: React.FC<GuestRoomProps> = ({ route, navigation }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const colors = isDarkMode ? darkColors : lightColors;

  const [roomId, setRoomId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(true);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [listeners, setListeners] = useState<number>(0);
  const [liveSeconds, setLiveSeconds] = useState<number>(0);
  const [requestStatus, setRequestStatus] = useState<"pending" | "approved" | "denied">("pending");
  const [guestId, setGuestId] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<Array<{id: string; user: string; text: string}>>([]);
  const [newChatMessage, setNewChatMessage] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const meterIntervalRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const podcastSocketRef = useRef<any>(null);

  // Get roomId from route params or URL
  useEffect(() => {
    if (route?.params?.roomId) {
      setRoomId(route.params.roomId);
    } else if (route?.params?.link) {
      const match = route.params.link.match(/[?&]roomId=([^&]+)/);
      if (match && match[1]) setRoomId(match[1]);
    } else if (Platform.OS === 'web') {
      const match = window.location.search.match(/[?&]roomId=([^&]+)/);
      if (match && match[1]) setRoomId(match[1]);
    }
  }, [route]);

  // Request microphone permissions
  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Needed", "Microphone access is required to speak");
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      setHasPermission(true);
      return true;
    } catch (error) {
      console.log("Permission error:", error);
      Alert.alert("Error", "Could not access microphone");
      return false;
    }
  };

  // Start recording and monitoring volume
  const startRecording = async () => {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      
      // Simulate volume meter
      startVolumeSimulation();
      
      return recording;
    } catch (error) {
      console.log("Recording error:", error);
      return null;
    }
  };

  const stopRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    setMicLevel(0);
  };

  const startVolumeSimulation = () => {
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    meterIntervalRef.current = setInterval(() => {
      if (!isMicMuted && requestStatus === "approved") {
        // Simulate voice activity with random levels
        const randomLevel = Math.random() * 100;
        setMicLevel(randomLevel);
        setTimeout(() => {
          if (Math.random() > 0.6) setMicLevel(0);
        }, 150);
      } else {
        setMicLevel(0);
      }
    }, 100);
  };

  // Connect to room
  const connectToRoom = async () => {
    if (!guestName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!roomId.trim()) {
      Alert.alert("Error", "Room ID is missing");
      return;
    }
    
    setIsConnecting(true);
    
    const socket = socketIo(`${SOCKET_SERVER_URL}/podcast`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    podcastSocketRef.current = socket;
    socket.on('connect_error', (error: any) => {
      setIsConnecting(false);
      Alert.alert('Connection Error', error?.message || 'Could not connect to the podcast backend');
    });
    socket.on('connect', () => {
      socket.emit('guest_request', {
        roomId,
        name: guestName.trim(),
        device: Platform.OS === 'web' ? 'Web Browser' : 'Mobile App',
      });
    });
    socket.on('guest_status', async (guest: any) => {
      const nextStatus = guest.status === 'approved' && !guest.approvedByHost ? 'pending' : guest.status;
      setGuestId(String(guest.id));
      setRequestStatus(nextStatus);
      setShowNameInput(false);
      setIsConnecting(false);

      if (nextStatus === 'approved') {
        setChatMessages([{ id: "1", user: "System", text: `Welcome ${guestName}! You are connected to the host.` }]);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => setLiveSeconds(prev => prev + 1), 1000);
        setIsMicMuted(true);
        await stopRecording();
      }
    });
    socket.on('viewer_count', ({ viewerCount }: any) => {
      setListeners(Number(viewerCount || 0));
    });
    socket.on('live_ended', async () => {
      await stopRecording();
      setRequestStatus('denied');
      Alert.alert('Live Ended', 'The host ended this live podcast.');
    });
    socket.on('podcast_error', ({ message }: any) => {
      setIsConnecting(false);
      Alert.alert('Connection Error', message || 'Could not connect to this podcast room');
      socket.disconnect();
    });
  };

  const toggleMute = async () => {
    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);
    podcastSocketRef.current?.emit('guest_mic_state', {
      roomId,
      guestId,
      muted: newMuteState,
      level: newMuteState ? 0 : micLevel,
    });
    
    if (!newMuteState) {
      const micGranted = hasPermission || (await requestMicrophonePermission());
      if (!micGranted) {
        setIsMicMuted(true);
        podcastSocketRef.current?.emit('guest_mic_state', {
          roomId,
          guestId,
          muted: true,
          level: 0,
        });
        return;
      }
      await startRecording();
    } else {
      await stopRecording();
    }
  };

  const sendMessage = () => {
    if (!newChatMessage.trim()) return;
    setChatMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      user: guestName, 
      text: newChatMessage 
    }]);
    setNewChatMessage("");
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const performLeaveRoom = async () => {
    podcastSocketRef.current?.emit('guest_leave');
    podcastSocketRef.current?.disconnect();
    podcastSocketRef.current = null;

    await stopRecording();
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setGuestId(null);
    setRequestStatus("pending");
    setShowNameInput(true);
    setChatMessages([]);
    setLiveSeconds(0);
    setListeners(0);
    setIsConnecting(false);
    setIsMicMuted(true);

    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  const leaveRoom = async () => {
    if (Platform.OS === 'web') {
      await performLeaveRoom();
      return;
    }

    Alert.alert(
      "Leave Room",
      "Are you sure you want to leave the podcast?",
      [
        { text: "Stay", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive", 
          onPress: async () => {
            await performLeaveRoom();
            return;
            // Clean up audio resources
            await stopRecording();
            if (soundRef.current) {
              try {
                await soundRef.current?.unloadAsync();
              } catch (e) {}
              soundRef.current = null;
            }
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            
            // Handle navigation based on platform
            if (navigation && navigation.goBack) {
              navigation.goBack();
            } else {
              // Fallback for web
              if (Platform.OS === 'web') {
                document.body.innerHTML = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Thank You - MelodyMeet</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                      }
                      .container { text-align: center; padding: 20px; }
                      .emoji { font-size: 80px; margin-bottom: 20px; animation: bounce 1s ease infinite; }
                      h1 { color: white; font-size: 32px; margin-bottom: 10px; }
                      p { color: rgba(255,255,255,0.9); font-size: 18px; margin-bottom: 30px; }
                      .message { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 10px; display: inline-block; }
                      @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="emoji">🎧</div>
                      <h1>Thank You for Listening!</h1>
                      <p>You have successfully left the podcast room.</p>
                      <div class="message">✨ We hope you enjoyed the show! ✨</div>
                    </div>
                  </body>
                  </html>
                `;
              } else {
                Alert.alert("Thank You!", "You've left the podcast room.");
              }
            }
          }
        }
      ]
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
      podcastSocketRef.current?.emit('guest_leave');
      podcastSocketRef.current?.disconnect();
      stopRecording();
    };
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!showNameInput) {
        leaveRoom();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [showNameInput]);

  // Name Input Screen
  if (showNameInput) {
    return (
      <View className={`flex-1 bg-[${colors.background}]`}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className="items-center justify-center flex-1 p-5">
          <Text className={`text-6xl mb-2 text-[${colors.text}]`}>🎙️</Text>
          <Text className={`text-3xl font-bold mb-7.5 text-[${colors.text}]`}>MelodyMeet</Text>
          <Text className={`text-xs mb-5 text-[${colors.textSecondary}]`}>Room ID: {roomId || "Loading..."}</Text>
          <TextInput
            className={`w-4/5 rounded-3xl px-4.5 py-3 text-sm text-center mb-4 border bg-[${colors.card}] border-[${colors.border}] text-[${colors.text}]`}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={guestName}
            onChangeText={setGuestName}
          />
          <TouchableOpacity
            className={`w-11/20 rounded-3xl py-3 items-center ${!guestName.trim() ? 'opacity-50' : ''} bg-[${colors.primary}]`}
            onPress={connectToRoom}
            disabled={!guestName.trim() || isConnecting}
          >
            {isConnecting ? <ActivityIndicator color={colors.background} /> : <Text className={`text-sm font-semibold text-[${colors.background}]`}>Join Room</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pending Screen
  if (requestStatus === "pending") {
    return (
      <View className={`flex-1 bg-[${colors.background}]`}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className={`flex-row items-center justify-between px-4 py-3 border-b bg-[${colors.card}] border-[${colors.border}]`}>
          <View className="w-10" />
          <Text className={`text-sm font-medium text-[${colors.text}]`}>Guest Studio</Text>
          <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)}>
            <Text className={`text-lg text-[${colors.text}]`}>{isDarkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>
        <View className="justify-center flex-1 p-5">
          <View className={`p-6 rounded-3xl items-center border bg-[${colors.card}] border-[${colors.border}]`}>
            <View className={`w-15 h-15 rounded-2xl justify-center items-center mb-4 bg-[${colors.text}]/10`}>
              <Text className={`text-4xl text-[${colors.textSecondary}]`}>⏰</Text>
            </View>
            <Text className={`text-xl font-bold mb-1.5 text-[${colors.text}]`}>Waiting for Host</Text>
            <Text className={`text-sm mb-4 text-[${colors.textSecondary}]`}>Please wait...</Text>
            <View className="flex-row gap-1.5">
              <View className={`w-1.5 h-1.5 rounded-0.75 opacity-30 bg-[${colors.textSecondary}]`} />
              <View className={`w-1.5 h-1.5 rounded-0.75 opacity-60 bg-[${colors.textSecondary}]`} />
              <View className={`w-1.5 h-1.5 rounded-0.75 opacity-100 bg-[${colors.textSecondary}]`} />
            </View>
          </View>
          <TouchableOpacity className={`absolute bottom-5 left-5 flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-[${colors.border}]`} onPress={leaveRoom}>
            <Text className={`text-xs font-medium text-[${colors.textMuted}]`}>🚪 Leave</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (requestStatus === "denied") {
    return (
      <View className={`flex-1 bg-[${colors.background}]`}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className="items-center justify-center flex-1 p-5">
          <Text className={`text-5xl mb-4 text-[${colors.text}]`}>Session ended</Text>
          <Text className={`text-sm text-center mb-6 text-[${colors.textSecondary}]`}>
            Your guest connection is no longer active.
          </Text>
          <TouchableOpacity className={`px-5 py-3 rounded-3xl bg-[${colors.primary}]`} onPress={leaveRoom}>
            <Text className={`text-sm font-semibold text-[${colors.background}]`}>Leave Room</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main Split Screen - LEFT: CHAT | RIGHT: MIC
  return (
    <View className={`flex-1 bg-[${colors.background}]`}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header - No back button */}
      <View className={`flex-row items-center justify-between px-4 py-3 border-b bg-[${colors.card}] border-[${colors.border}]`}>
        <View className="w-10" />
        <Text className={`text-sm font-medium text-[${colors.text}]`}>Guest Studio</Text>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)}>
          <Text className={`text-lg text-[${colors.text}]`}>{isDarkMode ? "☀️" : "🌙"}</Text>
        </TouchableOpacity>
      </View>

      {/* Live Status Bar */}
      <View className={`flex-row items-center justify-center gap-3 px-4 py-2 border-b bg-[${colors.card}] border-[${colors.border}]`}>
        <View className={`flex-row items-center gap-1 px-2 py-0.75 rounded-2xl bg-[${colors.error}]`}>
          <View className={`w-1.25 h-1.25 rounded-full bg-[${colors.background}]`} />
          <Text className={`text-[9px] font-bold text-[${colors.background}]`}>LIVE</Text>
        </View>
        <Text className={`text-xs font-mono text-[${colors.textSecondary}]`}>{formatTime(liveSeconds)}</Text>
        <View className="flex-row items-center gap-1">
          <Text className={`text-[10px] text-[${colors.textSecondary}]`}>👥</Text>
          <Text className={`text-[10px] text-[${colors.textSecondary}]`}>{listeners} listening</Text>
        </View>
      </View>

      {/* SPLIT SCREEN - Side by Side */}
      <View className={`flex-1 flex-row p-3.5 gap-3.5 ${isMobile ? 'flex-col' : ''}`}>
        
        {/* LEFT SIDE - CHAT */}
        <View className={`flex-1 rounded-2xl overflow-hidden border bg-[${colors.card}] border-[${colors.border}]`}>
          <View className={`flex-row items-center gap-2 p-3 border-b border-[${colors.border}]`}>
            <Text className={`text-sm text-[${colors.text}]`}>💬</Text>
            <Text className={`text-sm font-semibold flex-1 text-[${colors.text}]`}>Live Chat</Text>
            <View className="flex-row items-center gap-0.75">
              <Text className={`text-[10px] text-[${colors.textSecondary}]`}>👥</Text>
              <Text className={`text-[10px] text-[${colors.textSecondary}]`}>{listeners}</Text>
            </View>
          </View>
          
          <ScrollView ref={chatScrollRef} className="flex-1 p-2.5 max-h-70" showsVerticalScrollIndicator={false}>
            {chatMessages.map(msg => (
              <View key={msg.id} className="mb-2.5">
                <Text className={`text-[10px] font-semibold mb-0.5 ${msg.user === "System" ? 'text-[${colors.textMuted}]' : 'text-[${colors.primary}]'}`}>
                  {msg.user}
                </Text>
                <Text className={`text-xs text-[${colors.text}]`}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>
          
          <View className={`flex-row items-center gap-2 p-2.5 border-t border-[${colors.border}]`}>
            <TextInput
              className={`flex-1 rounded-2xl px-3 py-2 text-xs border bg-[${colors.background}] border-[${colors.border}] text-[${colors.text}]`}
              placeholder="Type your message..."
              placeholderTextColor={colors.textSecondary}
              value={newChatMessage}
              onChangeText={setNewChatMessage}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity onPress={sendMessage} className={`p-2 rounded-2xl justify-center items-center bg-[${colors.primary}]`}>
              <Text className={`text-sm text-[${colors.background}]`}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT SIDE - MIC SECTION */}
        <View className={`flex-1 rounded-2xl overflow-hidden border bg-[${colors.card}] border-[${colors.border}]`}>
          <View className={`flex-row items-center gap-2 p-3 border-b border-[${colors.border}]`}>
            <Text className={`text-sm text-[${colors.text}]`}>🎤</Text>
            <Text className={`text-sm font-semibold flex-1 text-[${colors.text}]`}>Microphone</Text>
            <View className={`px-2 py-0.5 rounded-xl bg-[${colors.text}]/10`}>
              <Text className={`text-[9px] font-semibold ${isMicMuted ? 'text-[${colors.textMuted}]' : 'text-[${colors.primary}]'}`}>
                {isMicMuted ? "OFF" : "ON"}
              </Text>
            </View>
          </View>
          
          <View className="p-3.5">
            <View className="flex-row justify-between mb-2">
              <Text className={`text-xs text-[${colors.textSecondary}]`}>Input Level</Text>
              <Text className={`text-xs font-semibold ${isMicMuted ? 'text-[${colors.textMuted}]' : 'text-[${colors.primary}]'}`}>
                {isMicMuted ? 0 : Math.floor(micLevel)}%
              </Text>
            </View>
            <View className={`h-1 rounded-0.5 overflow-hidden bg-[${colors.border}]`}>
              <View className={`h-full rounded-0.5 bg-[${colors.primary}]`} style={{ width: `${isMicMuted ? 0 : micLevel}%` }} />
            </View>
          </View>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-center gap-2 mx-3.5 my-1.5 py-3 rounded-2xl ${isMicMuted ? 'bg-[${colors.textMuted}]' : 'bg-[${colors.primary}]'}`} 
            onPress={toggleMute}
          >
            <Text className={`text-sm text-[${colors.background}]`}>{isMicMuted ? "🔴" : "🎤"}</Text>
            <Text className={`text-xs font-semibold text-[${colors.background}]`}>{isMicMuted ? "Unmute" : "Mute"}</Text>
          </TouchableOpacity>
          
          <Text className={`text-[10px] text-center mx-3.5 mb-3.5 text-[${colors.textMuted}]`}>
            {isMicMuted ? "Tap to unmute and speak" : "Tap to mute when not speaking"}
          </Text>
        </View>
      </View>

      {/* Leave Button - Bottom Left */}
      <TouchableOpacity className={`absolute bottom-4 left-4 flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-[${colors.border}]`} onPress={leaveRoom}>
        <Text className={`text-xs text-[${colors.textMuted}]`}>🚪</Text>
        <Text className={`text-xs font-medium text-[${colors.textMuted}]`}>Leave Room</Text>
      </TouchableOpacity>
    </View>
  );
};

export default GuestRoom;
