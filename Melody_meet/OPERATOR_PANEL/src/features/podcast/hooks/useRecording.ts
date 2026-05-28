// hooks/useRecording.ts

import { useState, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Recording, Mic } from '../types';
import { useAppStore } from '../../../store/useAppStore';
import { PodcastApi } from '../../../services/api/operatorApi';

export const useRecording = () => {
  // Get from Zustand store
  const {
    podcast,
    updatePodcastState,
    addRecording,
    removeRecording,
    updateMic,
    toggleMicMute,
    setActiveMic,
  } = useAppStore();

  // Local refs for timers (don't need persistence)
  const recordingTimerRef = useRef<any>(null);
  const levelIntervalRef = useRef<any>(null);
  const [mediaStream, setMediaStream] = useState<any>(null);
  const [mediaRecorder, setMediaRecorder] = useState<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const [mobileRecording, setMobileRecording] = useState<Audio.Recording | null>(null);

  // Get values from store
  const isRecording = podcast.isRecording;
  const recordingSeconds = podcast.recordingSeconds;
  const recordings = podcast.recordings;
  const showAfterRecordingOptions = podcast.showAfterRecordingOptions;
  const lastRecording = podcast.lastRecording;
  const mics = podcast.mics;
  const activeMic = mics.find(m => m.active);

  // Update mic levels when recording
  useEffect(() => {
    if (isRecording || activeMic?.active) {
      if (!levelIntervalRef.current && Platform.OS !== 'web') {
        levelIntervalRef.current = setInterval(() => {
          // Simulate mic levels - update each mic's level in store
          const currentMics = podcast.mics;
          currentMics.forEach((mic: Mic) => {
            if (mic.active) {
              updateMic(mic.id, { level: Math.floor(Math.random() * 100) });
            } else {
              updateMic(mic.id, { level: 0 });
            }
          });
        }, 100);
      }
    } else {
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
        levelIntervalRef.current = null;
      }
    }
    return () => {
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
    };
  }, [isRecording, activeMic?.active]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        updatePodcastState({ recordingSeconds: recordingSeconds + 1 });
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, recordingSeconds]);

  const selectMic = (micId: number) => {
    setActiveMic(micId);
  };

  const toggleMute = (micId: number) => {
    toggleMicMute(micId);
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);

        // Web MediaRecorder setup
        const recorder = new (window as any).MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(1000);
        setMediaRecorder(recorder);
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Microphone access required for recording");
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        setMobileRecording(recording);
      }
      updatePodcastState({ 
        isRecording: true, 
        recordingSeconds: 0,
        showAfterRecordingOptions: false 
      });
    } catch (error) {
      Alert.alert("Error", "Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = async () => {
    try {
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const recordingName = `recording_${new Date().toLocaleTimeString().replace(/:/g, '-')}.mp3`;

      // Helper to handle the actual upload
      const handleUploadAndSave = async (fileObj: any, sizeMBStr: string) => {
        let backendId: number = Date.now();
        let uri = fileObj.uri;
        try {
          const formData = new FormData();
          formData.append('file', fileObj);
          formData.append('duration', durationStr);
          formData.append('durationSeconds', recordingSeconds.toString());
          
          const saved = await PodcastApi.uploadRecording(formData);
          if (saved?.id) backendId = saved.id;
          if (saved?.fileUrl) uri = saved.fileUrl; // Use backend URL for playback
        } catch (_) {
          // Backend unreachable — fallback to local
        }

        const newRecording: Recording = {
          id: backendId,
          name: recordingName,
          duration: durationStr,
          size: sizeMBStr,
          uri,
        };

        addRecording(newRecording);
        updatePodcastState({
          isRecording: false,
          showAfterRecordingOptions: true,
        });
      };

      if (Platform.OS === 'web') {
        if (mediaRecorder) {
          mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const file = new File([blob], recordingName, { type: 'audio/webm' });
            const sizeMBStr = `${(blob.size / (1024 * 1024)).toFixed(1)} MB`;
            await handleUploadAndSave(file, sizeMBStr);
            
            // Cleanup stream
            if (mediaStream) {
              mediaStream.getTracks().forEach((track: any) => track.stop());
              setMediaStream(null);
            }
          };
          mediaRecorder.stop();
          setMediaRecorder(null);
        } else {
          // Fallback if recorder didn't start properly
          updatePodcastState({ isRecording: false });
        }
      } else {
        if (mobileRecording) {
          await mobileRecording.stopAndUnloadAsync();
          const uri = mobileRecording.getURI();
          setMobileRecording(null);
          
          const sizeMBStr = `${(Math.random() * 5 + 2).toFixed(1)} MB`; // Dummy size for mobile fallback
          const fileObj = {
            uri: uri || '',
            name: recordingName,
            type: 'audio/m4a'
          } as any;
          
          await handleUploadAndSave(fileObj, sizeMBStr);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      updatePodcastState({ isRecording: false });
    }
  };

  const useRecordingFn = (recording: Recording) => {
    updatePodcastState({ 
      lastRecording: recording,
      showAfterRecordingOptions: false 
    });
  };

  const deleteRecording = async (id: number) => {
    // Optimistic local remove first
    removeRecording(id);
    // Then sync to backend (best-effort)
    try {
      await PodcastApi.deleteRecording(id);
    } catch (_) {
      // Already removed locally — no crash on API failure
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Add guest mic
  const addGuestMic = (guest: { id: string; name: string }) => {
    const currentMics = useAppStore.getState().podcast.mics;
    if (currentMics.some((mic: Mic) => mic.guestId === guest.id)) return;

    const newMicId = 100 + currentMics.length;
    const newMic: Mic = {
      id: newMicId,
      name: guest.name,
      type: "GUEST",
      active: false,
      phantom: false,
      gain: 50,
      volume: 70,
      level: 0,
      muted: true,
      icon: "👤",
      isGuest: true,
      guestId: guest.id,
    };
    updatePodcastState({ mics: [...currentMics, newMic] });
  };

  // Remove guest mic
  const removeGuestMic = (guestId: string) => {
    const updatedMics = mics.filter((mic: Mic) => mic.guestId !== guestId);
    updatePodcastState({ mics: updatedMics });
  };

  return {
    isRecording,
    recordingSeconds,
    recordings,
    lastRecording,
    showAfterRecordingOptions,
    mics,
    activeMic,
    selectMic,
    toggleMute,
    setRecordings: (fn: any) => {
      console.warn('setRecordings is deprecated, use addRecording/removeRecording');
    },
    startRecording,
    stopRecording,
    useRecording: useRecordingFn,
    deleteRecording,
    setShowAfterRecordingOptions: (value: boolean) => updatePodcastState({ showAfterRecordingOptions: value }),
    formatRecordingTime,
    addGuestMic,
    removeGuestMic,
  };
};
