import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Track, PlaylistTrack } from '../../types';
import DualMicSetup from '../DualMicSetup';
import { DualPlayer } from '../DualPlayer';
import { LiveChat } from '../LiveChat';
import { PlaylistModal } from './PlaylistModal';
import { StickerModal } from './StickerModal';
import { PlayerAudioFXPanel } from '../PlayerAudioFXPanel';
import { SongRequests, SongRequest } from '../SongRequests';
import { useAppStore } from '../../../../store/useAppStore';
import { audio } from '../../../../services/audio';
import SpeakRequests, { SpeakRequest } from '../SpeakRequests';
import { rjSocket } from '../../../../services/socketService';
import {
  RjChatBridge,
  RjGiftStickerBridge,
  RjNowPlayingBridge,
  RjPlaylistBridge,
} from './rjSetupModal.types';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface LegacyMic {
  id: string;
  name?: string;
  label?: string;
  isActive?: boolean;
  isMuted?: boolean;
  input?: string;
  gain?: number;
  hi?: number;
  mid?: number;
  low?: number;
  fader?: number;
  volume?: number;
}

// LocalFileItem shape used by PlaylistModal's upload callback
interface LocalFileItem {
  id: string;
  name: string;
  duration: string;
  uri?: string;
  filePath?: string;
}

interface PlaylistMonitorData {
  currentTrackTitle: string;
  currentTrackArtist: string;
  trackPosition: string;
  trackDuration: string;
  sessionRuntime: string;
  sessionTarget: string;
  tracksPlayed: number;
  remainingTracks: number;
  playlistStatus: 'Playing' | 'Paused' | 'Stopped';
  totalTracks: number;
  currentTrackAudioUrl?: string | null;
}

interface RjSetupModalProps {
  visible: boolean;
  isDarkMode: boolean;
  isMobile: boolean;
  colors: any;
  isLive: boolean;
  activeChannel: number;
  studioId: string | null;
  timerFormatted: string;
  timerIsPaused: boolean;
  onClose: () => void;
  onToggleLive: () => void;
  onToggleTimerPause: () => void;
  onPlayLocalTrack: (track: Track) => void;
  onLoadLocalToStandby: (track: Track, playerId: 'A' | 'B') => void;
  playerA: Track | null;
  playerB: Track | null;
  isPlayingA: boolean;
  isPlayingB: boolean;
  isLocalAudioMuted: boolean;
  onToggleLocalAudioMuted: () => void;
  activePlayer: 'A' | 'B' | null;
  crossfadeValue: number;
  isCrossfading: boolean;
  onCrossfade: (targetValue: number) => void;
  onPlayUrlInPlayer: (playerId: 'A' | 'B') => void;
  onPauseActive: () => void;
  onTogglePlayActive: () => void;
  onStopActive: () => void;
  onSwitchAtoB: () => void;
  onPauseStandby: (playerId: 'A' | 'B') => void;
  onStopStandby: (playerId: 'A' | 'B') => void;
  onClearDeck: (playerId: 'A' | 'B') => void;
  allMics: LegacyMic[];
  onToggleMicActive: (id: string) => void;
  onToggleMicMute: (id: string) => void;
  onRemoveMic: (id: string) => void;
  onUpdateMicDevice: (id: string, deviceName: string) => void;
  onAddMic: (name: string) => Promise<boolean> | boolean;
  availableDevices?: string[];
  nowPlaying: RjNowPlayingBridge;
  playlist: RjPlaylistBridge;
  chat: RjChatBridge;
  giftSticker: RjGiftStickerBridge;
}

// ─── DEFAULT MICS ─────────────────────────────────────────────────────────────

const DEFAULT_MICS: LegacyMic[] = [
  { id: '1', name: 'Sejal',       label: 'RJ Mic 1',      isActive: true,  isMuted: true, gain: 51, hi: 50, mid: 50, low: 50, fader: 65, input: 'Input 1'   },
  { id: '2', name: 'Leo',         label: 'Guest Mic 1',   isActive: false, isMuted: true, gain: 35, hi: 50, mid: 50, low: 50, fader: 65, input: 'Input 2'   },
  { id: '3', name: 'Riya',        label: 'Guest Mic 2',   isActive: false, isMuted: true, gain: 73, hi: 50, mid: 50, low: 50, fader: 65, input: 'Input 3'   },
  { id: '4', name: 'Arjun',       label: 'Guest Mic 3',   isActive: false, isMuted: true, gain: 40, hi: 50, mid: 50, low: 50, fader: 65, input: 'Input 4'   },
  { id: '5', name: 'Live Caller', label: 'Call-in Mic 1', isActive: false, isMuted: true, gain: 50, hi: 50, mid: 50, low: 50, fader: 65, input: 'Call In 1' },
];

// ─── MIC CHANNEL TYPE ─────────────────────────────────────────────────────────

export interface MicChannel {
  id: number;
  label: string;
  name: string;
  input: string;
  isOnAir: boolean;
  gain: number;
  hi: number;
  mid: number;
  low: number;
  fader: number;
  muted: boolean;
  soloed: boolean;
  vuL: number;
  vuR: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function legacyToMicChannels(allMics: LegacyMic[], availableDevices?: string[]): MicChannel[] {
  const inputSlots = ['Input 1', 'Input 2', 'Input 3', 'Input 4', 'Call In 1'];
  const baseLabels = ['RJ Mic 1', 'Guest Mic 1', 'Guest Mic 2', 'Guest Mic 3', 'Call-in Mic 1'];
  const baseNames = ['Sejal', 'Leo', 'Riya', 'Arjun', 'Live Caller'];

  return Array.from({ length: 5 }).map((_, idx) => {
    // Try to find an existing mic state, otherwise fall back to empty object
    const mic = allMics[idx] || ({} as LegacyMic);

    const label = mic.label ?? baseLabels[idx];
    const name = mic.name ?? baseNames[idx];
    
    // Assign device based on index if available, otherwise fall back to previous assignment or "Unassigned"
    let input = mic.input;
    if (!input) {
      if (availableDevices && availableDevices.length > 0) {
        input = availableDevices[idx] ?? 'Unassigned';
      } else {
        input = inputSlots[idx];
      }
    }

    return {
      id: idx + 1,
      label,
      name,
      input,
      isOnAir: !!mic.isActive,
      gain: mic.gain ?? 50,
      hi: mic.hi ?? 50,
      mid: mic.mid ?? 50,
      low: mic.low ?? 50,
      fader: mic.fader ?? 65,
      muted: mic.isMuted !== undefined ? !!mic.isMuted : true,
      soloed: false,
      vuL: mic.volume ?? 0,
      vuR: mic.volume ?? 0,
    };
  });
}

function applyChannelChange(
  channelId: number,
  changes: Partial<MicChannel>,
  allMics: LegacyMic[],
  onToggleMicMute: (id: string) => void,
  onToggleMicActive: (id: string) => void,
  onUpdateMicDevice: (id: string, deviceName: string) => void,
) {
  const micId = allMics[channelId - 1]?.id || `mic${channelId}`;
  const mic = allMics.find(m => m.id === micId);

  if (mic) {
    if ('muted' in changes && changes.muted !== !!mic.isMuted) onToggleMicMute(mic.id);
    if ('isOnAir' in changes && changes.isOnAir !== !!mic.isActive) onToggleMicActive(mic.id);
    if ('input' in changes && changes.input !== mic.input) onUpdateMicDevice(mic.id, changes.input!);
  } else {
    if ('input' in changes && changes.input) {
      onUpdateMicDevice(micId, changes.input);
    }
    if ('muted' in changes) {
      onToggleMicMute(micId);
    }
    if ('isOnAir' in changes) {
      onToggleMicActive(micId);
    }
  }
}

const percentToMicGain = (value: number) => Math.max(0, value / 50);
const percentToEqDb = (value: number) => ((value - 50) / 50) * 12;
const dbToLinearGain = (valueDb: number) => (valueDb <= -60 ? 0 : Math.pow(10, valueDb / 20));

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const RjSetupModal: React.FC<RjSetupModalProps> = ({
  visible,
  isDarkMode,
  colors,
  isLive,
  studioId,
  timerFormatted,
  timerIsPaused,
  onClose,
  onToggleLive,
  onToggleTimerPause,
  onPlayLocalTrack,
  onLoadLocalToStandby,
  playerA,
  playerB,
  isPlayingA,
  isPlayingB,
  isLocalAudioMuted,
  onToggleLocalAudioMuted,
  activePlayer,
  crossfadeValue,
  isCrossfading,
  onCrossfade,
  onPlayUrlInPlayer,
  onPauseActive,
  onStopActive,
  onSwitchAtoB,
  onClearDeck,
  onPauseStandby,
  onStopStandby,
  allMics,
  onToggleMicActive,
  onToggleMicMute,
  onRemoveMic,
  onUpdateMicDevice,
  onAddMic,
  availableDevices,
  nowPlaying,
  playlist,
  chat,
  giftSticker,
}) => {

  // ─── THEME ────────────────────────────────────────────────────
  const bg         = '#0D0F1A';
  const border     = '#1E2440';
  const textPrimary = '#E8ECF5';
  const textMuted  = '#6B7A9E';
  const accent     = '#4F6AF0';

  const { rjStudio, updateRjStudioState, addRjNotification } = useAppStore();
  const speakRequests = rjStudio.speakRequests || [];

  const handleAcceptSpeakRequest = useCallback((request: SpeakRequest) => {
    const sid = studioId ? String(studioId) : '';
    const slotId = (request as any).slotId || 'mic2';
    rjSocket.acceptSpeakRequest(sid, slotId, request.id, request.userName);
  }, [studioId]);

  const handleRejectSpeakRequest = useCallback((request: SpeakRequest) => {
    const sid = studioId ? String(studioId) : '';
    const slotId = (request as any).slotId || 'mic2';
    rjSocket.rejectSpeakRequest(sid, slotId, request.id);
  }, [studioId]);

  // ─── MIC STATE ────────────────────────────────────────────────
  const micsToUse = (allMics && allMics.length > 0) ? allMics : DEFAULT_MICS;
  const micChannels = useMemo(() => legacyToMicChannels(micsToUse, availableDevices), [micsToUse, availableDevices]);
  const handleChannelChange = useCallback(
    (id: number, changes: Partial<MicChannel>) => {
      applyChannelChange(id, changes, micsToUse, onToggleMicMute, onToggleMicActive, onUpdateMicDevice);

      if (id !== 1) return;

      if (typeof changes.gain === 'number') {
        void audio.setMicrophoneGain(percentToMicGain(changes.gain));
      }

      if (
        typeof changes.low === 'number' ||
        typeof changes.mid === 'number' ||
        typeof changes.hi === 'number'
      ) {
        const current = micChannels.find((channel) => channel.id === id);
        const low = typeof changes.low === 'number' ? changes.low : current?.low ?? 50;
        const mid = typeof changes.mid === 'number' ? changes.mid : current?.mid ?? 50;
        const hi = typeof changes.hi === 'number' ? changes.hi : current?.hi ?? 50;

        void audio.setEQ('Mic', {
          eqBass: percentToEqDb(low),
          eqMid: percentToEqDb(mid),
          eqTreble: percentToEqDb(hi),
        });
      }
    },
    [micsToUse, micChannels, onToggleMicMute, onToggleMicActive, onUpdateMicDevice],
  );

  // ─────────────────────────────────────────────────────────────
  // PLAYLIST STATE
  //
  // KEY DESIGN: ONE unified `playlistTracks` array for everything.
  //
  // Previously there were TWO arrays:
  //   • playlistTracks  (URL / api tracks)
  //   • uploadedLocalFiles (uploaded audio files)
  //
  // That meant Shuffle, Remove, and Clear only touched ONE array
  // while the other stayed untouched → buttons appeared broken.
  //
  // Fix: uploaded files are immediately converted to PlaylistTrack
  // and pushed into the SAME playlistTracks array.  PlaylistModal
  // receives an empty uploadedLocalFiles=[].
  // ─────────────────────────────────────────────────────────────
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [isPlaylistActive, setIsPlaylistActive] = useState(false);
  const [isPlaylistPaused, setIsPlaylistPaused] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [monitorData, setMonitorData] = useState<PlaylistMonitorData | undefined>();
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showDeckFullAlert, setShowDeckFullAlert] = useState(false);

  // ─── SONG REQUESTS ────────────────────────────────────────────
  const [songRequests, setSongRequests] = useState<SongRequest[]>([
    { id: '1', userName: 'Rahul', songName: 'Believer',     artistName: 'Imagine Dragons', timestamp: '16:34', status: 'pending' },
    { id: '2', userName: 'Priya', songName: 'Kesariya',     artistName: 'Arijit Singh',    timestamp: '16:33', status: 'pending' },
  ]);

  // ─── NOW PLAYING BADGE ────────────────────────────────────────
  // Derives which playlist row gets the green badge by matching
  // the active-and-playing deck's title+artist against playlistTracks.
  const currentlyPlayingTrackId = useMemo<number | null>(() => {
    const activeTrack =
      activePlayer === 'A' ? (isPlayingA ? playerA : null)
                           : (isPlayingB ? playerB : null);
    if (!activeTrack) return null;
    const match = playlistTracks.find(
      (t) =>
        t.title.trim().toLowerCase() === activeTrack.title.trim().toLowerCase() &&
        t.artist.trim().toLowerCase() === activeTrack.artist.trim().toLowerCase(),
    );
    return match?.id ?? null;
  }, [activePlayer, isPlayingA, isPlayingB, playerA, playerB, playlistTracks]);

  // ─── LOAD TO STANDBY ──────────────────────────────────────────
  // Converts PlaylistTrack → Track and sends to appropriate deck.
  const handleLoadToStandby = useCallback(
    (track: PlaylistTrack) => {
      let standbyDeck: 'A' | 'B' | null = null;
      if (!playerA) {
        standbyDeck = 'A';
      } else if (!playerB) {
        standbyDeck = 'B';
      } else {
        setShowDeckFullAlert(true);
        return;
      }

      const fullTrack: Track = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        bpm: track.bpm ?? 120,
        beatIntensity: 5,
        duration: track.duration ?? '03:30',
        channel: 1,
        audioUrl: (track as any).url ?? (track as any).uri ?? (track as any).filePath ?? '',
        artwork: '',
        shortTitle: track.title.substring(0, 20),
        gain: 0.8,
        eq: { low: 0.5, mid: 0.5, high: 0.5 },
        fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
      };
      onLoadLocalToStandby(fullTrack, standbyDeck);
    },
    [playerA, playerB, onLoadLocalToStandby],
  );

  // ─── UPLOAD: converts LocalFileItem → PlaylistTrack ───────────
  // FIX: push directly into playlistTracks so Shuffle/Remove/Clear
  // all work on the one unified list.
  const handleAddLocalFile = useCallback((file: LocalFileItem) => {
      const track: PlaylistTrack = {
        id: parseInt(file.id, 10) || Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local File',
        bpm: 120,
        duration: file.duration,
        isLocal: true,
        uri: file.uri,
        filePath: file.filePath,
      } as PlaylistTrack;
    setPlaylistTracks((prev) => [...prev, track]);
  }, []);

  // ─── ADD TRACK (via URL input) ────────────────────────────────
  // FIX: was console.log only — now adds to unified list.
  const handleAddTrack = useCallback((track: PlaylistTrack) => {
    setPlaylistTracks((prev) => [...prev, track]);
  }, []);

  // ─── REMOVE SONG ──────────────────────────────────────────────
  // FIX: one handler, one list — works for both local files and URL tracks.
  const handleRemoveSong = useCallback((id: number) => {
    const item = playlistTracks.find((t) => t.id === id);
    const trackA = rjStudio.playerATrack;
    const trackB = rjStudio.playerBTrack;

    const hasA = item && trackA && item.title.toLowerCase() === trackA.title.toLowerCase();
    const hasB = item && trackB && item.title.toLowerCase() === trackB.title.toLowerCase();

    setPlaylistTracks((prev) => prev.filter((t) => t.id !== id));

    if (hasA) {
      onClearDeck('A');
    }
    if (hasB) {
      onClearDeck('B');
    }
  }, [playlistTracks, rjStudio.playerATrack, rjStudio.playerBTrack, onClearDeck]);

  // ─── SHUFFLE ──────────────────────────────────────────────────
  // FIX: now shuffles the unified list — local files included.
  const handleShuffle = useCallback(() => {
    setPlaylistTracks((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  // ─── LOOP ─────────────────────────────────────────────────────
  // FIX: was console.log — now stores real state in parent so
  // both PlaylistModal's visual AND any future playback logic share it.
  const handleLoop = useCallback(() => {
    setLoopEnabled((prev) => !prev);
  }, []);

  // ─── CLEAR ────────────────────────────────────────────────────
  // FIX: clears the unified list — previously only cleared playlistTracks,
  // leaving uploadedLocalFiles in place so tracks "came back".
  const handleClearPlaylist = useCallback(() => {
    const pl = [...playlistTracks];
    const trackA = rjStudio.playerATrack;
    const trackB = rjStudio.playerBTrack;

    const hasA = trackA && pl.some((t) => t.title.toLowerCase() === trackA.title.toLowerCase());
    const hasB = trackB && pl.some((t) => t.title.toLowerCase() === trackB.title.toLowerCase());

    setPlaylistTracks([]);
    setIsPlaylistActive(false);
    setIsPlaylistPaused(false);

    if (hasA) {
      onClearDeck('A');
    }
    if (hasB) {
      onClearDeck('B');
    }
  }, [playlistTracks, rjStudio.playerATrack, rjStudio.playerBTrack, onClearDeck]);

  // ─── URL SUBMIT ───────────────────────────────────────────────
  // FIX: was console.log — PlaylistModal also calls onAddTrack which
  // adds to the list; this is just an extra hook for parent-level logic.
  const handleUrlSubmit = useCallback((_url: string) => {
    // onAddTrack already fired by PlaylistModal before this is called
  }, []);

  // ─── OTHER PLAYLIST HANDLERS ──────────────────────────────────
  const isSongInPlaylist = useCallback(
    (title: string, artist: string) =>
      playlistTracks.some((t) => t.title === title && t.artist === artist),
    [playlistTracks],
  );
  const handleUploadAndAddLocalFile = useCallback(() => {}, []);
  const handleStartPlaylist  = useCallback(() => { setIsPlaylistActive(true);  setIsPlaylistPaused(false); }, []);
  const handlePausePlaylist  = useCallback(() => { setIsPlaylistPaused(true);  }, []);
  const handleResumePlaylist = useCallback(() => { setIsPlaylistPaused(false); }, []);
  const handleStopPlaylist   = useCallback(() => { setIsPlaylistActive(false); setIsPlaylistPaused(false); }, []);
  const handleSkipToNext     = useCallback(async () => {}, []);
  const handleSetDuration    = useCallback((_d: number) => {}, []);
  const handleSetCustomDuration = useCallback((_v: string) => {}, []);
  const handlePlayTrack      = useCallback((_t: PlaylistTrack) => {}, []);
  const handleRemoveTrack    = useCallback((id: number) => {
    const item = playlistTracks.find((t) => t.id === id);
    const trackA = rjStudio.playerATrack;
    const trackB = rjStudio.playerBTrack;

    const hasA = item && trackA && item.title.toLowerCase() === trackA.title.toLowerCase();
    const hasB = item && trackB && item.title.toLowerCase() === trackB.title.toLowerCase();

    setPlaylistTracks((p) => p.filter((t) => t.id !== id));

    if (hasA) {
      onClearDeck('A');
    }
    if (hasB) {
      onClearDeck('B');
    }
  }, [playlistTracks, rjStudio.playerATrack, rjStudio.playerBTrack, onClearDeck]);
  const handleCue            = useCallback(() => {}, []);
  const handleListenToggle   = useCallback(() => { setIsListening((p) => !p); }, []);
  const formatTimer          = useCallback((minutes: number) => {
    const m = Math.floor(minutes);
    const s = Math.floor((minutes % 1) * 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  // ─── SONG REQUESTS ────────────────────────────────────────────
  const handlePlayNextRequest = useCallback((request: SongRequest) => {
    const track: Track = {
      id: parseInt(request.id, 10) || Date.now(),
      title: request.songName,
      artist: request.artistName,
      bpm: 120,
      beatIntensity: 5,
      duration: '03:30',
      channel: 1,
      audioUrl: '',
      artwork: '',
      shortTitle: request.songName.substring(0, 20),
      gain: 0.8,
      eq: { low: 0.5, mid: 0.5, high: 0.5 },
      fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
    };
    const standbyDeck: 'A' | 'B' = activePlayer === 'A' ? 'B' : 'A';
    onLoadLocalToStandby(track, standbyDeck);
    setSongRequests((prev) => prev.filter((r) => r.id !== request.id));
  }, [onLoadLocalToStandby, activePlayer]);

  const handleHoldRequest   = useCallback((id: string) => {
    setSongRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'held' as const } : r));
  }, []);
  const handleRejectRequest = useCallback((id: string) => {
    setSongRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const currentPlayingSong = useMemo(() => {
    if (isPlayingA && playerA) return { title: playerA.title, artist: playerA.artist };
    if (isPlayingB && playerB) return { title: playerB.title, artist: playerB.artist };
    return null;
  }, [isPlayingA, isPlayingB, playerA, playerB]);

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: bg }}>

          {/* HEADER */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingHorizontal: 20,
            paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: '#0D0F1A',
          }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, letterSpacing: 0.5 }}>
              RJ Studio
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {isLive ? (
                <>
                  <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 }}>ON AIR</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', color: accent }}>
                    {timerFormatted}
                  </Text>
                  <Text style={{ fontSize: 12, color: textMuted }}>Listeners: Listeners: {(nowPlaying as any).listeners || 0}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: textMuted }}>Bitrate: 192 kbps</Text>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#22c55e' }}>Server: Online</Text>
                  <TouchableOpacity onPress={onToggleLive} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#DC2626' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>STOP LIVE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onToggleTimerPause} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1E2440' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{timerIsPaused ? 'RESUME' : 'PAUSE'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>Server: Offline</Text>
                  <TouchableOpacity onPress={onToggleLive} style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: '#16A34A' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>GO LIVE</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={onClose} style={{ width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1F35' }}>
                <Feather name="x" size={18} color={textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* MAIN CONTENT */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 16 }}>

              {/* LEFT COLUMN */}
              <View style={{ flex: 2.3 }}>
                <DualMicSetup 
                  channels={micChannels} 
                  onChannelChange={handleChannelChange} 
                  availableDevices={availableDevices}
                />
                <View style={{ marginTop: 35 }}>
                  <DualPlayer
                    playerA={playerA} playerB={playerB}
                    isPlayingA={isPlayingA} isPlayingB={isPlayingB}
                    activePlayer={activePlayer}
                    crossfadeValue={crossfadeValue} isCrossfading={isCrossfading}
                    isDarkMode={isDarkMode} colors={colors}
                    onCrossfade={onCrossfade}
                    onPlayUrlInPlayer={onPlayUrlInPlayer}
                    onPauseActive={onPauseActive} onStopActive={onStopActive}
                    onSwitchAtoB={onSwitchAtoB}
                    onPauseStandby={onPauseStandby} onStopStandby={onStopStandby}
                    onClearDeck={onClearDeck}
                    onSync={(referenceDeck, targetDeck, tempoRatio) => {
                      audio.setPitch(targetDeck, (tempoRatio - 1) * 100).catch(() => {});
                    }}
                  />
                </View>
                <View style={{ marginTop: 16 }}>
                  <PlayerAudioFXPanel
                    isDarkMode={isDarkMode}
                    colors={colors}
                    onMasterVolumeChange={(valueDb) => {
                      void audio.setMasterGain(dbToLinearGain(valueDb));
                    }}
                  />
                </View>
              </View>

              {/* RIGHT COLUMN */}
              <View style={{ flex: 0.8,gap: 40 }}>

                <LiveChat
                  messages={chat.chatMessages}
                  filteredMessages={chat.filteredChatMessages}
                  newMessage={chat.chatNewMessage}
                  replyTo={chat.chatReplyTo}
                  bannedUsers={chat.bannedUsers}
                  showBanList={chat.showBanList}
                  showEmojiPicker={chat.showEmojiPicker}
                  activeEmojiCategory={chat.activeEmojiCategory}
                  isDarkMode={isDarkMode} colors={colors}
                  flatListRef={chat.flatListRef}
                  isAtBottom={chat.isAtBottom}
                  typingUsers={chat.typingUsers}
                  pinnedMessage={chat.pinnedMessage}
                  onSendMessage={chat.onSendChatMessage}
                  onNewMessageChange={chat.onChatMessageChange}
                  onLikeMessage={chat.onLikeChatMessage}
                  onReply={chat.onReplyChat}
                  onShareMessage={chat.onShareMessage}
                  onBanUser={chat.onBanUser}
                  onRestrictUser={chat.onRestrictUser}
                  onUnbanUser={chat.onUnbanUser}
                  onClearChat={chat.onClearChat}
                  onPinMessage={chat.onPinMessage}
                  onToggleEmojiPicker={chat.onToggleEmojiPicker}
                  onAddEmoji={chat.onAddEmoji}
                  onSetActiveEmojiCategory={chat.onSetActiveEmojiCategory}
                  onCancelReply={chat.onCancelReply}
                  onOpenStickerModal={chat.onOpenStickerModal}
                  onToggleBanList={chat.onToggleBanList}
                  onScroll={chat.onChatScroll}
                />

                {/* ── PLAYLIST ── */}
                <PlaylistModal
                  playlist={playlistTracks}
                  uploadedLocalFiles={[]}          
                  playlistDuration={0}
                  customDuration=""
                  timerRemaining={0}
                  isPlaylistActive={isPlaylistActive}
                  isPlaylistPaused={isPlaylistPaused}
                  isDarkMode={isDarkMode}
                  colors={colors}
                  monitorData={monitorData}
                  currentPlaylistIndex={currentPlaylistIndex}
                  isListening={isListening}
                  onListenToggle={handleListenToggle}
                  isSongInPlaylist={isSongInPlaylist}
                 
                  onAddLocalFile={handleAddLocalFile}
                  onUploadAndAddLocalFile={handleUploadAndAddLocalFile}
                  
                  onClearPlaylist={handleClearPlaylist}
                  onRemoveSong={handleRemoveSong}
                  onRemoveTrack={handleRemoveTrack}
                  onShuffle={handleShuffle}
                  onLoop={handleLoop}
                 
                  onAddTrack={handleAddTrack}
                  onUrlSubmit={handleUrlSubmit}
                  
                  onStartPlaylist={handleStartPlaylist}
                  onPausePlaylist={handlePausePlaylist}
                  onResumePlaylist={handleResumePlaylist}
                  onStopPlaylist={handleStopPlaylist}
                  onSkipToNext={handleSkipToNext}
                  onSetDuration={handleSetDuration}
                  onSetCustomDuration={handleSetCustomDuration}
                  formatTimer={formatTimer}
                  onPlayTrack={handlePlayTrack}
                  onCue={handleCue}
                  
                  onLoadToStandby={handleLoadToStandby}
                  currentlyPlayingTrackId={currentlyPlayingTrackId}
                />

                <SpeakRequests
                  requests={speakRequests}
                  onAccept={handleAcceptSpeakRequest}
                  onReject={handleRejectSpeakRequest}
                  isDarkMode={isDarkMode}
                  colors={colors}
                />

                <SongRequests
                  requests={songRequests}
                  onPlayNext={handlePlayNextRequest}
                  onHold={handleHoldRequest}
                  onReject={handleRejectRequest}
                  isDarkMode={isDarkMode} colors={colors}
                  currentPlayingSong={currentPlayingSong}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <StickerModal
        visible={giftSticker.showStickerModal}
        isDarkMode={isDarkMode} colors={colors}
        onClose={giftSticker.onCloseStickerModal}
        onSendSticker={giftSticker.onSendSticker}
      />

      {/* DECK FULL ALERT */}
      <Modal visible={showDeckFullAlert} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1E2440', padding: 24, borderRadius: 12, alignItems: 'center', width: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}>
            <Feather name="alert-circle" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#E8ECF5', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>Decks are full!</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Please clear a deck before loading a new track.</Text>
            <TouchableOpacity onPress={() => setShowDeckFullAlert(false)} style={{ backgroundColor: '#4F6AF0', paddingVertical: 10, paddingHorizontal: 32, borderRadius: 8 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default RjSetupModal;
