import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, PanResponder } from 'react-native';
import { Track } from '../types';

interface DualPlayerProps {
  playerA: Track | null;
  playerB: Track | null;
  isPlayingA: boolean;
  isPlayingB: boolean;
  activePlayer: "A" | "B";
  crossfadeValue: number;
  isCrossfading: boolean;
  isDarkMode: boolean;
  colors: any;
  onCrossfade: (targetValue: number) => void;
  onPlayUrlInPlayer: (playerId: "A" | "B") => void;
  onPauseActive?: () => void;
  onStopActive?: () => void;
  onSwitchAtoB?: () => void;
  onPauseStandby?: (playerId: "A" | "B") => void;
  onStopStandby?: (playerId: "A" | "B") => void;
  onClearDeck?: (playerId: "A" | "B") => void;
  onSync?: (referenceDeck: "A" | "B", targetDeck: "A" | "B", tempoRatio: number) => void;
}

// Color tokens
const COLORS = {
  rootBg: '#0E0E12',
  deckBg: '#181820',
  deckBorder: '#2A2A36',
  activeBorderA: '#22C55E',
  activeBorderB: '#A855F7',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8FA8',
  labelA: '#22C55E',
  labelB: '#A855F7',
  activeGreen: '#22C55E',
  standbyGray: '#4B5568',
  wavePlayedA: '#22C55E',
  waveAheadA: '#3B82F6',
  wavePlayedB: '#A855F7',
  waveAheadB: '#3B82F6',
  cueMarkerA: '#F59E0B',
  cueMarkerB: '#C084FC',
  btnBg: '#23232F',
  btnBorder: '#2E2E3E',
  btnText: '#C0C4D6',
  playBg: '#22C55E',
  playText: '#FFFFFF',
  stopBg: '#C0392B',
  stopText: '#FFFFFF',
  pauseBg: '#D97706',
  pauseText: '#FFFFFF',
  faderTrack: '#2A2A36',
  faderFill: '#4F6AF0',
  faderThumb: '#4F6AF0',
  moveBtnBg: '#1E1E2A',
  moveBtnBorder: '#2E2E3E',
  moveBtnText: '#8B8FA8',
  timeText: '#8B8FA8',
};

export const DualPlayer: React.FC<DualPlayerProps> = ({
  playerA,
  playerB,
  isPlayingA,
  isPlayingB,
  activePlayer,
  crossfadeValue,
  isCrossfading,
  isDarkMode,
  colors,
  onCrossfade,
  onPlayUrlInPlayer,
  onPauseActive,
  onStopActive,
  onSwitchAtoB,
  onPauseStandby,
  onStopStandby,
  onClearDeck,
  onSync,
}) => {
  // Progress state for each deck (0 to 100)
  const [progressA, setProgressA] = useState(0);
  const [progressB, setProgressB] = useState(0);

  // Store saved progress for when song stops (so it resumes from same position)
  const [savedProgressA, setSavedProgressA] = useState(0);
  const [savedProgressB, setSavedProgressB] = useState(0);

  // Draggable cue marker position
  const [cueMarkerA, setCueMarkerA] = useState(0);
  const [cueMarkerB, setCueMarkerB] = useState(0);
  const [isDraggingCueA, setIsDraggingCueA] = useState(false);
  const [isDraggingCueB, setIsDraggingCueB] = useState(false);

  // Saved cue points
  const [savedCuesA, setSavedCuesA] = useState<number[]>([]);
  const [savedCuesB, setSavedCuesB] = useState<number[]>([]);

  // Loop state
  const [loopActiveA, setLoopActiveA] = useState(false);
  const [loopActiveB, setLoopActiveB] = useState(false);
  const [loopStartA, setLoopStartA] = useState(0);
  const [loopEndA, setLoopEndA] = useState(25);
  const [loopStartB, setLoopStartB] = useState(0);
  const [loopEndB, setLoopEndB] = useState(25);

  // Sync state
  const [syncActive, setSyncActive] = useState(false);
  const [syncedDeck, setSyncedDeck] = useState<'A' | 'B' | null>(null);
  const [tempoRatioA, setTempoRatioA] = useState(1);
  const [tempoRatioB, setTempoRatioB] = useState(1);

  // Pitch/tempo
  const [pitchA, setPitchA] = useState(0);
  const [pitchB, setPitchB] = useState(0);

  // Waveform animation pulse (only when playing AND active)
  const [pulseA, setPulseA] = useState(0);
  const [pulseB, setPulseB] = useState(0);

  // Progress animation refs
  const progressAnimA = useRef(new Animated.Value(0)).current;
  const progressAnimB = useRef(new Animated.Value(0)).current;

  // Refs for measurements
  const progressBarRefA = useRef<any>(null);
  const progressBarRefB = useRef<any>(null);

  // Animate waveform ONLY when deck is playing AND active
  useEffect(() => {
    if (!isPlayingA || activePlayer !== 'A') return;
    const interval = setInterval(() => {
      setPulseA((p) => p + 0.18);
    }, 80);
    return () => clearInterval(interval);
  }, [isPlayingA, activePlayer]);

  useEffect(() => {
    if (!isPlayingB || activePlayer !== 'B') return;
    const interval = setInterval(() => {
      setPulseB((p) => p + 0.18);
    }, 80);
    return () => clearInterval(interval);
  }, [isPlayingB, activePlayer]);

  // Get song duration in seconds
  const getSongDuration = (track: Track | null): number => {
    if (!track) return 180;
    const parts = track.duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 180;
  };

  // Format time
  const formatTimeFromSeconds = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = (track: Track | null, progress: number): string => {
    if (!track) return '-00:00';
    const duration = getSongDuration(track);
    const remaining = duration * (1 - progress / 100);
    return `-${formatTimeFromSeconds(remaining)}`;
  };

  const getElapsedTime = (track: Track | null, progress: number): string => {
    if (!track) return '00:00';
    const duration = getSongDuration(track);
    const elapsed = duration * (progress / 100);
    return formatTimeFromSeconds(elapsed);
  };

  // Pan responder for draggable cue marker
  const createCuePanResponder = (playerId: 'A' | 'B', progressBarRef: React.RefObject<any>) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (playerId === 'A') setIsDraggingCueA(true);
        else setIsDraggingCueB(true);
      },
      onPanResponderMove: (evt) => {
        if (progressBarRef.current) {
          progressBarRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            const touchX = evt.nativeEvent.pageX;
            const percentage = Math.min(100, Math.max(0, ((touchX - pageX) / width) * 100));
            if (playerId === 'A') setCueMarkerA(percentage);
            else setCueMarkerB(percentage);
          });
        }
      },
      onPanResponderRelease: () => {
        if (playerId === 'A') setIsDraggingCueA(false);
        else setIsDraggingCueB(false);
      },
    });
  };

  // Animation for progress - uses saved progress when resuming
  useEffect(() => {
    if (isPlayingA && activePlayer === 'A') {
      // Start from saved progress (where it left off)
      const startProgress = savedProgressA;
      progressAnimA.setValue(startProgress);
      setProgressA(startProgress);
      
      Animated.timing(progressAnimA, {
        toValue: 100,
        duration: (getSongDuration(playerA) * 1000 * tempoRatioA) * ((100 - startProgress) / 100),
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnimA.stopAnimation();
      // Save current progress when paused/stopped
      if (isPlayingA === false && activePlayer === 'A') {
        setSavedProgressA(progressA);
      }
    }
  }, [isPlayingA, activePlayer, playerA, tempoRatioA]);

  useEffect(() => {
    if (isPlayingB && activePlayer === 'B') {
      // Start from saved progress (where it left off)
      const startProgress = savedProgressB;
      progressAnimB.setValue(startProgress);
      setProgressB(startProgress);
      
      Animated.timing(progressAnimB, {
        toValue: 100,
        duration: (getSongDuration(playerB) * 1000 * tempoRatioB) * ((100 - startProgress) / 100),
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnimB.stopAnimation();
      // Save current progress when paused/stopped
      if (isPlayingB === false && activePlayer === 'B') {
        setSavedProgressB(progressB);
      }
    }
  }, [isPlayingB, activePlayer, playerB, tempoRatioB]);

  useEffect(() => {
    const listenerA = progressAnimA.addListener((value) => {
      setProgressA(value.value);
      if (loopActiveA && value.value >= loopEndA) {
        progressAnimA.setValue(loopStartA);
      }
    });
    const listenerB = progressAnimB.addListener((value) => {
      setProgressB(value.value);
      if (loopActiveB && value.value >= loopEndB) {
        progressAnimB.setValue(loopStartB);
      }
    });

    return () => {
      progressAnimA.removeListener(listenerA);
      progressAnimB.removeListener(listenerB);
    };
  }, [loopActiveA, loopActiveB, loopEndA, loopEndB, loopStartA, loopStartB]);

  // Reset saved progress when new track is loaded or track changes
  useEffect(() => {
    if (playerA) {
      // Reset saved progress when new track loads
      setSavedProgressA(0);
      setProgressA(0);
      progressAnimA.setValue(0);
    }
  }, [playerA?.id]);

  useEffect(() => {
    if (playerB) {
      setSavedProgressB(0);
      setProgressB(0);
      progressAnimB.setValue(0);
    }
  }, [playerB?.id]);

  // Handle Play - sets this deck as active and moves crossfader
  const handlePlay = (playerId: 'A' | 'B') => {
    onPlayUrlInPlayer(playerId);
    
    // Don't reset progress - it will start from saved position
    // Only reset if song is at end
    if (playerId === 'A' && progressA >= 99) {
      setProgressA(0);
      setSavedProgressA(0);
      progressAnimA.setValue(0);
    }
    if (playerId === 'B' && progressB >= 99) {
      setProgressB(0);
      setSavedProgressB(0);
      progressAnimB.setValue(0);
    }
    
    // Move crossfader to this deck's side
    if (playerId === 'A') {
      onCrossfade(0);
    } else {
      onCrossfade(100);
    }
  };

  // Jump to cue marker position (saves position and plays from there)
  const handleJumpToCue = (playerId: 'A' | 'B') => {
    const cuePosition = playerId === 'A' ? cueMarkerA : cueMarkerB;
    if (playerId === 'A') {
      setProgressA(cuePosition);
      setSavedProgressA(cuePosition);
      progressAnimA.setValue(cuePosition);
      // If playing, continue from cue point
      if (isPlayingA && activePlayer === 'A') {
        progressAnimA.stopAnimation();
        Animated.timing(progressAnimA, {
          toValue: 100,
          duration: (getSongDuration(playerA) * 1000 * tempoRatioA) * ((100 - cuePosition) / 100),
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
      }
    } else {
      setProgressB(cuePosition);
      setSavedProgressB(cuePosition);
      progressAnimB.setValue(cuePosition);
      if (isPlayingB && activePlayer === 'B') {
        progressAnimB.stopAnimation();
        Animated.timing(progressAnimB, {
          toValue: 100,
          duration: (getSongDuration(playerB) * 1000 * tempoRatioB) * ((100 - cuePosition) / 100),
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  // Save current cue marker as a saved cue point
  const handleSaveCuePoint = (playerId: 'A' | 'B') => {
    const cuePosition = playerId === 'A' ? cueMarkerA : cueMarkerB;
    if (playerId === 'A') {
      setSavedCuesA([...savedCuesA, cuePosition].sort((a, b) => a - b));
    } else {
      setSavedCuesB([...savedCuesB, cuePosition].sort((a, b) => a - b));
    }
  };

  // Jump to saved cue point
  const handleJumpToSavedCue = (playerId: 'A' | 'B', cuePoint: number) => {
    if (playerId === 'A') {
      setProgressA(cuePoint);
      setSavedProgressA(cuePoint);
      progressAnimA.setValue(cuePoint);
      if (isPlayingA && activePlayer === 'A') {
        progressAnimA.stopAnimation();
        Animated.timing(progressAnimA, {
          toValue: 100,
          duration: (getSongDuration(playerA) * 1000 * tempoRatioA) * ((100 - cuePoint) / 100),
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
      }
    } else {
      setProgressB(cuePoint);
      setSavedProgressB(cuePoint);
      progressAnimB.setValue(cuePoint);
      if (isPlayingB && activePlayer === 'B') {
        progressAnimB.stopAnimation();
        Animated.timing(progressAnimB, {
          toValue: 100,
          duration: (getSongDuration(playerB) * 1000 * tempoRatioB) * ((100 - cuePoint) / 100),
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  // Handle Loop
  const handleLoop = (playerId: 'A' | 'B') => {
    const currentProgress = playerId === 'A' ? progressA : progressB;
    if (playerId === 'A') {
      if (!loopActiveA) {
        setLoopStartA(currentProgress);
        setLoopEndA(Math.min(currentProgress + 25, 100));
      }
      setLoopActiveA(!loopActiveA);
    } else {
      if (!loopActiveB) {
        setLoopStartB(currentProgress);
        setLoopEndB(Math.min(currentProgress + 25, 100));
      }
      setLoopActiveB(!loopActiveB);
    }
  };

  // Handle Sync - syncs STANDBY deck to ACTIVE deck
  const handleSync = () => {
    if (activePlayer === 'A' && playerB) {
      const ratio = playerA && playerA.bpm ? playerA.bpm / playerB.bpm : 1;
      setSyncActive(true);
      setSyncedDeck('B');
      setProgressB(progressA);
      setSavedProgressB(progressA);
      progressAnimB.setValue(progressA);
      setCueMarkerB(cueMarkerA);
      setTempoRatioB(ratio || 1);
      onSync?.('A', 'B', ratio || 1);
    } else if (activePlayer === 'B' && playerA) {
      const ratio = playerB && playerB.bpm ? playerB.bpm / playerA.bpm : 1;
      setSyncActive(true);
      setSyncedDeck('A');
      setProgressA(progressB);
      setSavedProgressA(progressB);
      progressAnimA.setValue(progressB);
      setCueMarkerA(cueMarkerB);
      setTempoRatioA(ratio || 1);
      onSync?.('B', 'A', ratio || 1);
    }
    setTimeout(() => setSyncActive(false), 2000);
  };

  // Handle Pitch
  const handlePitch = (playerId: 'A' | 'B', delta: number) => {
    if (playerId === 'A') {
      const newPitch = Math.max(-50, Math.min(50, pitchA + delta));
      setPitchA(newPitch);
    } else {
      const newPitch = Math.max(-50, Math.min(50, pitchB + delta));
      setPitchB(newPitch);
    }
  };

  // Handle Clear
  const handleClearDeck = (playerId: 'A' | 'B') => {
    if (playerId === 'A') {
      setProgressA(0);
      setSavedProgressA(0);
      progressAnimA.setValue(0);
      setCueMarkerA(0);
      setSavedCuesA([]);
      setLoopActiveA(false);
      setPitchA(0);
      setTempoRatioA(1);
      onClearDeck?.(playerId);
    } else {
      setProgressB(0);
      setSavedProgressB(0);
      progressAnimB.setValue(0);
      setCueMarkerB(0);
      setSavedCuesB([]);
      setLoopActiveB(false);
      setPitchB(0);
      setTempoRatioB(1);
      onClearDeck?.(playerId);
    }
  };

  // Waveform pattern generator
  const generateWaveformPattern = (seed: number, barCount: number): number[] => {
    const heights: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const t = i / barCount;
      let envelope;
      if (t < 0.08) {
        envelope = t / 0.08;
      } else if (t > 0.92) {
        envelope = (1 - t) / 0.08;
      } else {
        envelope = 1;
      }

      const fast = Math.sin((i + seed) * 1.7) * 0.35;
      const med = Math.sin((i + seed) * 0.45) * 0.3;
      const slow = Math.sin((i + seed) * 0.12) * 0.25;
      const spike = (i + seed) % 9 === 0 ? 0.4 : 0;

      let amp = 0.45 + fast + med + slow + spike;
      amp = Math.max(0.12, Math.min(1, amp)) * envelope;
      amp = Math.max(amp, 0.08);
      heights.push(amp);
    }
    return heights;
  };

  // Render waveform - only animates when deck is playing AND active
  const renderWaveform = (
    playerId: 'A' | 'B',
    progress: number,
    cueMarker: number,
    isPlaying: boolean,
    isActive: boolean,
    pulse: number,
    waveformData?: number[],
  ) => {
    const barCount = 80;
    const playedColor = playerId === 'A' ? COLORS.wavePlayedA : COLORS.wavePlayedB;
    const unplayedColor = playerId === 'A' ? COLORS.waveAheadA : COLORS.waveAheadB;
    const cueColor = playerId === 'A' ? COLORS.cueMarkerA : COLORS.cueMarkerB;

    const shouldAnimate = isPlaying && isActive;

    let amplitudes: number[];
    if (waveformData && waveformData.length > 0) {
      amplitudes = [];
      for (let i = 0; i < barCount; i++) {
        const srcIdx = Math.floor((i / barCount) * waveformData.length);
        amplitudes.push(Math.max(0.08, Math.min(1, waveformData[srcIdx])));
      }
    } else {
      const seed = playerId === 'A' ? 3 : 11;
      amplitudes = generateWaveformPattern(seed, barCount);
    }

    const maxBarHeight = 72;
    const cueBarIndex = Math.round((cueMarker / 100) * barCount);

    const bars = amplitudes.map((amp, i) => {
      const barPosition = (i / barCount) * 100;
      const isPlayed = barPosition <= progress;
      const isNearCue = Math.abs(i - cueBarIndex) <= 0;

      let liveAmp = amp;
      if (shouldAnimate) {
        const wobble = Math.sin(pulse * 2 + i * 0.6) * 0.12;
        liveAmp = Math.max(0.06, Math.min(1, amp + wobble));
      }

      const height = Math.max(4, liveAmp * maxBarHeight);

      return (
        <View
          key={i}
          style={{
            width: 3,
            height,
            backgroundColor: isNearCue ? cueColor : (isPlayed ? playedColor : unplayedColor),
            borderRadius: 1.5,
            opacity: isPlayed || isNearCue ? 1 : 0.4,
            marginHorizontal: 0.5,
          }}
        />
      );
    });

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 76 }}>
        {bars}
      </View>
    );
  };

  // Crossfader handler
  const handleCrossfaderTouch = (event: any) => {
    const { locationY, layout } = event.nativeEvent;
    if (layout && layout.height) {
      const percentage = Math.min(100, Math.max(0, (1 - locationY / layout.height) * 100));
      onCrossfade(percentage);
    }
  };

  // Render single deck
  const renderPlayer = (playerId: "A" | "B", track: Track | null | undefined, isActive: boolean) => {
    const hasTrack = track != null;
    const isPlaying = playerId === "A" ? isPlayingA : isPlayingB;
    const deckLabel = playerId === "A" ? COLORS.labelA : COLORS.labelB;
    const activeBorder = playerId === "A" ? COLORS.activeBorderA : COLORS.activeBorderB;
    const progress = playerId === "A" ? progressA : progressB;
    const cueMarker = playerId === "A" ? cueMarkerA : cueMarkerB;
    const savedCues = playerId === "A" ? savedCuesA : savedCuesB;
    const loopActive = playerId === "A" ? loopActiveA : loopActiveB;
    const pitch = playerId === "A" ? pitchA : pitchB;
    const isSynced = syncActive && syncedDeck === playerId;
    const progressBarRef = playerId === "A" ? progressBarRefA : progressBarRefB;
    
    // Create cuePanResponder for this player
    const cuePanResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (playerId === 'A') setIsDraggingCueA(true);
        else setIsDraggingCueB(true);
      },
      onPanResponderMove: (evt) => {
        if (progressBarRef.current) {
          progressBarRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            const touchX = evt.nativeEvent.pageX;
            const percentage = Math.min(100, Math.max(0, ((touchX - pageX) / width) * 100));
            if (playerId === 'A') setCueMarkerA(percentage);
            else setCueMarkerB(percentage);
          });
        }
      },
      onPanResponderRelease: () => {
        if (playerId === 'A') setIsDraggingCueA(false);
        else setIsDraggingCueB(false);
      },
    });
    
    const tempoRatio = playerId === "A" ? tempoRatioA : tempoRatioB;
    const pulse = playerId === "A" ? pulseA : pulseB;

    return (
      <View
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 14,
          backgroundColor: COLORS.deckBg,
          borderWidth: isActive ? 1.5 : 1,
          borderColor: isActive ? activeBorder : COLORS.deckBorder,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: deckLabel }}>DECK {playerId}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isActive ? (
              <>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.activeGreen }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.activeGreen }}>ACTIVE</Text>
              </>
            ) : (
              <>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.standbyGray }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.textSecondary }}>STANDBY</Text>
              </>
            )}
            {isSynced && <View style={{ backgroundColor: '#4F6AF0', paddingHorizontal: 4, borderRadius: 4 }}><Text style={{ fontSize: 8, color: '#FFF' }}>SYNCED</Text></View>}
            {tempoRatio !== 1 && <View style={{ backgroundColor: '#4F6AF0', paddingHorizontal: 4, borderRadius: 4 }}><Text style={{ fontSize: 8, color: '#FFF' }}>{tempoRatio > 1 ? '+' : ''}{((tempoRatio - 1) * 100).toFixed(1)}%</Text></View>}
            {loopActive && <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 4, borderRadius: 4 }}><Text style={{ fontSize: 8, color: '#FFF' }}>LOOP</Text></View>}
          </View>
        </View>

        {hasTrack ? (
          <>
            {/* Track Info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: playerId === "A" ? '#1C3A2A' : '#2A1A40', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{playerId === "A" ? '🎧' : '🎵'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }} numberOfLines={1}>{track.title}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary }} numberOfLines={1}>{track.artist}{track.bpm ? ` • ${track.bpm} BPM` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: COLORS.timeText }}>{getRemainingTime(track, progress)}</Text>
                <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{getElapsedTime(track, progress)}</Text>
              </View>
            </View>

            {/* WAVEFORM */}
            {renderWaveform(playerId, progress, cueMarker, isPlaying, isActive, pulse, (track as any)?.waveformData)}

            {/* PROGRESS BAR WITH DRAGGABLE CUE MARKER */}
            <View
              ref={progressBarRef}
              style={{ marginVertical: 8, position: 'relative' }}
              {...cuePanResponder.panHandlers}
            >
              <View style={{ height: 4, borderRadius: 2, backgroundColor: COLORS.deckBorder, position: 'relative' }}>
                <View style={{ height: 4, borderRadius: 2, width: `${progress}%`, backgroundColor: playerId === "A" ? COLORS.wavePlayedA : COLORS.wavePlayedB }} />

                {/* DRAGGABLE CUE MARKER */}
                <View style={{ position: 'absolute', left: `${cueMarker}%`, top: -8, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => handleJumpToCue(playerId)}
                    style={{ width: 16, height: 20, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{ width: 3, height: 20, backgroundColor: '#F59E0B', borderRadius: 1.5 }} />
                    <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: '#F59E0B', position: 'absolute', top: -2 }} />
                  </TouchableOpacity>
                  {isDraggingCueA && playerId === 'A' && <Text style={{ fontSize: 9, color: '#F59E0B', position: 'absolute', top: -18 }}>{Math.round(cueMarker)}%</Text>}
                  {isDraggingCueB && playerId === 'B' && <Text style={{ fontSize: 9, color: '#F59E0B', position: 'absolute', top: -18 }}>{Math.round(cueMarker)}%</Text>}
                </View>

                {/* Saved Cue Point Markers */}
                {savedCues.map((cue, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleJumpToSavedCue(playerId, cue)}
                    style={{ position: 'absolute', left: `${cue}%`, top: -12, alignItems: 'center' }}
                  >
                    <View style={{ width: 2, height: 16, backgroundColor: '#22C55E', borderRadius: 1 }} />
                    <Text style={{ fontSize: 7, color: '#22C55E', position: 'absolute', bottom: -12 }}>{idx + 1}</Text>
                  </TouchableOpacity>
                ))}

                {/* Loop Markers */}
                {loopActive && (
                  <>
                    <View style={{ position: 'absolute', left: `${playerId === 'A' ? loopStartA : loopStartB}%`, top: -6, width: 2, height: 16, backgroundColor: '#22C55E' }} />
                    <View style={{ position: 'absolute', left: `${playerId === 'A' ? loopEndA : loopEndB}%`, top: -6, width: 2, height: 16, backgroundColor: '#EF4444' }} />
                  </>
                )}
              </View>
            </View>

            {/* BUTTONS */}
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              {/* PLAY/PAUSE */}
              {isPlaying && isActive ? (
                <TouchableOpacity onPress={onPauseActive} style={{ width: 38, height: 34, borderRadius: 8, backgroundColor: COLORS.pauseBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: COLORS.pauseText }}>⏸</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => handlePlay(playerId)} style={{ width: 38, height: 34, borderRadius: 8, backgroundColor: COLORS.playBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: COLORS.playText }}>▶</Text>
                </TouchableOpacity>
              )}

              {/* STOP */}
              <TouchableOpacity onPress={isActive ? onStopActive : () => onStopStandby?.(playerId)} style={{ width: 38, height: 34, borderRadius: 8, backgroundColor: COLORS.stopBg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: COLORS.stopText }}>⏹</Text>
              </TouchableOpacity>

              {/* SET CUE */}
              <TouchableOpacity onPress={() => handleSaveCuePoint(playerId)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 8, backgroundColor: COLORS.btnBg, borderWidth: 1, borderColor: COLORS.btnBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.btnText }}>Set Cue</Text>
              </TouchableOpacity>

              {/* PITCH */}
              <View style={{ flexDirection: 'row', gap: 2, backgroundColor: COLORS.btnBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.btnBorder }}>
                <TouchableOpacity onPress={() => handlePitch(playerId, -1)} style={{ paddingHorizontal: 8, height: 34, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: COLORS.btnText }}>−</Text>
                </TouchableOpacity>
                <View style={{ justifyContent: 'center', alignItems: 'center', minWidth: 45 }}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: COLORS.btnText }}>Pitch</Text>
                  <Text style={{ fontSize: 9, color: COLORS.textSecondary }}>{pitch > 0 ? `+${pitch}` : pitch}%</Text>
                </View>
                <TouchableOpacity onPress={() => handlePitch(playerId, 1)} style={{ paddingHorizontal: 8, height: 34, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: COLORS.btnText }}>+</Text>
                </TouchableOpacity>
              </View>

              {/* SYNC */}
              <TouchableOpacity onPress={handleSync} style={{ paddingHorizontal: 12, height: 34, borderRadius: 8, backgroundColor: syncActive ? '#4F6AF0' : COLORS.btnBg, borderWidth: 1, borderColor: COLORS.btnBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: syncActive ? '#FFF' : COLORS.btnText }}>Sync</Text>
              </TouchableOpacity>

              {/* LOOP */}
              <TouchableOpacity onPress={() => handleLoop(playerId)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 8, backgroundColor: loopActive ? '#F59E0B' : COLORS.btnBg, borderWidth: 1, borderColor: loopActive ? '#F59E0B' : COLORS.btnBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: loopActive ? '#FFF' : COLORS.btnText }}>Loop</Text>
              </TouchableOpacity>

              {/* CLEAR */}
              <TouchableOpacity onPress={() => handleClearDeck(playerId)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 8, backgroundColor: '#2A1A1A', borderWidth: 1, borderColor: '#4A2A2A', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>Clear</Text>
              </TouchableOpacity>
            </View>

            {/* SAVED CUE POINTS LIST */}
            {savedCues.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {savedCues.map((cue, idx) => (
                  <TouchableOpacity key={idx} onPress={() => handleJumpToSavedCue(playerId, cue)} style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, backgroundColor: '#4F6AF0' }}>
                    <Text style={{ fontSize: 10, color: '#FFF' }}>Cue {idx + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>No track loaded</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ borderRadius: 16, padding: 12, marginBottom: 16, backgroundColor: COLORS.rootBg }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
        {renderPlayer("A", playerA, activePlayer === "A")}

        {/* Crossfader */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 46 }}>
          <View style={{ width: 4, height: 110, borderRadius: 2, backgroundColor: COLORS.faderTrack, position: 'relative' }}
            onStartShouldSetResponder={() => true}
            onResponderMove={handleCrossfaderTouch}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${crossfadeValue}%`, backgroundColor: COLORS.faderFill, borderRadius: 2 }} />
            <View style={{ position: 'absolute', bottom: `${crossfadeValue}%`, left: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.faderThumb, borderWidth: 2, borderColor: '#FFF' }} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginTop: 10 }}>{crossfadeValue}%</Text>
          <Text style={{ fontSize: 9, marginTop: 4, color: COLORS.faderFill }}>{crossfadeValue < 30 ? 'A ↓' : crossfadeValue > 70 ? '↑ B' : '⚖️ MIX'}</Text>
        </View>

        {renderPlayer("B", playerB, activePlayer === "B")}
      </View>

      <View style={{ marginTop: 14, alignItems: 'center' }}>
        <TouchableOpacity onPress={onSwitchAtoB} disabled={!playerA} style={{ paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.moveBtnBg, borderWidth: 1, borderColor: COLORS.moveBtnBorder, opacity: playerA ? 1 : 0.4 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.moveBtnText }}>Move A → B</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DualPlayer;