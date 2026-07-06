import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { Recording } from '../types';
import { useAppStore } from '../../../store/useAppStore';
import { PodcastApi } from '../../../services/api/operatorApi';
import { audio } from '../../../services/audio';
import { isDesktop } from '../../../utils/platform';

export const useRecording = () => {
  const {
    podcast,
    updatePodcastState,
    addRecording,
    removeRecording,
    updateMic,
    toggleMicMute,
    setActiveMic,
  } = useAppStore();

  const recordingTimerRef = useRef<any>(null);

  const isRecording = podcast.isRecording;
  const isRecordingPaused = (podcast as any).isRecordingPaused || false;
  const recordingSeconds = podcast.recordingSeconds;
  const recordings = podcast.recordings;
  const showAfterRecordingOptions = podcast.showAfterRecordingOptions;
  const lastRecording = podcast.lastRecording;
  const mics = podcast.mics;
  const activeMic = mics.find(m => m.active);

  useEffect(() => {
    if (!isDesktop()) return;

    const handleMeters = (data: any) => {
      const currentActiveMic = useAppStore.getState().podcast.mics.find(m => m.active);
      if (!currentActiveMic) return;

      const peak = Math.max(Number(data.micPeakL ?? 0), Number(data.micPeakR ?? 0));
      updateMic(currentActiveMic.id, { level: Math.floor(peak * 100) });
    };

    audio.on('meters:update', handleMeters);
    return () => audio.off('meters:update', handleMeters);
  }, [updateMic]);

  useEffect(() => {
    if (!isRecording || isRecordingPaused) {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      return;
    }

    recordingTimerRef.current = setInterval(() => {
      const secs = useAppStore.getState().podcast.recordingSeconds || 0;
      updatePodcastState({ recordingSeconds: secs + 1 });
    }, 1000);

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, isRecordingPaused, updatePodcastState]);

  useEffect(() => {
    if (!isDesktop()) return;

    const handleDuration = (data: any) => {
      updatePodcastState({ recordingSeconds: Math.floor(data.duration) });
    };

    const handleFileReady = async (data: any) => {
      const mins = Math.floor(data.duration / 60);
      const secs = Math.floor(data.duration % 60);
      const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const filename = data.outputFile.split(/[\\/]/).pop() || `recording_${Date.now()}.wav`;

      const fileObj = {
        uri: `file://${data.outputFile}`,
        name: filename,
        type: 'audio/wav',
      };

      try {
        let backendId = Date.now();
        let uri = fileObj.uri;

        const formData = new FormData();
        formData.append('file', fileObj as any);
        formData.append('duration', durationStr);
        formData.append('durationSeconds', Math.floor(data.duration).toString());

        const saved = await PodcastApi.uploadRecording(formData);
        if (saved?.id) backendId = saved.id;
        if (saved?.fileUrl) uri = saved.fileUrl;

        const newRecording: Recording = {
          id: backendId,
          name: filename,
          duration: durationStr,
          size: `${(data.fileSize / (1024 * 1024)).toFixed(1)} MB`,
          uri,
        };

        addRecording(newRecording);
      } catch (err) {
        console.error('Native upload failed', err);
        addRecording({
          id: Date.now(),
          name: filename,
          duration: durationStr,
          size: `${(data.fileSize / (1024 * 1024)).toFixed(1)} MB`,
          uri: fileObj.uri,
        });
      }

      updatePodcastState({
        isRecording: false,
        showAfterRecordingOptions: true,
      });
    };

    audio.on('recording:duration', handleDuration);
    audio.on('recording:fileReady', handleFileReady);

    return () => {
      audio.off('recording:duration', handleDuration);
      audio.off('recording:fileReady', handleFileReady);
    };
  }, [addRecording, updatePodcastState]);

  const selectMic = (micId: number) => {
    setActiveMic(micId);
  };

  const toggleMute = (micId: number) => {
    toggleMicMute(micId);
  };

  const startRecording = async () => {
    try {
      if (!isDesktop()) {
        Alert.alert('Native Audio Required', 'Podcast recording is available only through the desktop native audio engine.');
        return;
      }

      await audio.setActiveSession('Podcast');
      await audio.setOutputSession('Podcast');
      await audio.enableMicrophone('');
      if (activeMic) {
        await audio.setMicrophoneGain(Math.max(0, activeMic.gain / 100));
      }
      await audio.startRecording();
      updatePodcastState({
        isRecording: true,
        isRecordingPaused: false,
        recordingSeconds: 0,
        showAfterRecordingOptions: false,
      } as any);
    } catch {
      Alert.alert('Error', 'Could not start recording. Please check microphone permissions.');
    }
  };

  const pauseRecording = async () => {
    try {
      if (!isDesktop()) {
        Alert.alert('Native Audio Required', 'Podcast recording controls require the desktop native audio engine.');
        return;
      }
      await audio.pauseRecording();
      updatePodcastState({ isRecordingPaused: true } as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to pause recording');
    }
  };

  const resumeRecording = async () => {
    try {
      if (!isDesktop()) {
        Alert.alert('Native Audio Required', 'Podcast recording controls require the desktop native audio engine.');
        return;
      }
      await audio.resumeRecording();
      updatePodcastState({ isRecordingPaused: false } as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to resume recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!isDesktop()) {
        Alert.alert('Native Audio Required', 'Podcast recording controls require the desktop native audio engine.');
        return;
      }

      await audio.stopRecording();
      await audio.disableMicrophone();
      await audio.setActiveSession('RJ');
      await audio.setOutputSession('RJ');
      updatePodcastState({
        isRecording: false,
        isRecordingPaused: false,
      } as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      updatePodcastState({ isRecording: false, isRecordingPaused: false } as any);
    }
  };

  const useRecordingFn = (recording: Recording) => {
    updatePodcastState({
      lastRecording: recording,
      showAfterRecordingOptions: false,
    });
  };

  const deleteRecording = async (id: number) => {
    removeRecording(id);
    try {
      await PodcastApi.deleteRecording(id);
    } catch (err: any) {
      console.error('DELETE RECORDING FAILED', err?.response?.status, err?.response?.data, err?.message);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    useRecording: useRecordingFn,
    deleteRecording,
    setShowAfterRecordingOptions: (value: boolean) => updatePodcastState({ showAfterRecordingOptions: value }),
    formatRecordingTime,
  };
};
