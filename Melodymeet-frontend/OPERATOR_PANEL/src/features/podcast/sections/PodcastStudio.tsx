/**
 * PodcastStudio Component
 * 
 * Complete unified podcast studio control surface.
 * Integrates all microphone, DSP, recording, and monitoring components.
 */

import React, { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import {
  PodcastMasterPanel,
  PodcastMicPanel,
  PodcastHealthDashboard,
} from '../components';
import { usePodcastMicSystem } from '../hooks/usePodcastMicSystem';
import { usePodcastPersistence } from '../hooks/usePodcastPersistence';
import { useDeviceRecovery } from '../hooks/useDeviceRecovery';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface PodcastStudioProps {
  addNotification?: (type: 'request' | 'system' | 'alert', message: string) => void;
}

const COLORS = {
  bg: '#050811',
  sectionGap: 16,
};

export const PodcastStudio: React.FC<PodcastStudioProps> = ({ addNotification }) => {
  const { handleError } = useErrorHandler();

  // Connect to microphone system
  const micSystem = usePodcastMicSystem(addNotification);

  // Build state for persistence
  const persistenceState = useMemo(() => ({
    microphones: micSystem.allMics.reduce((acc, mic, index) => {
      acc[`mic${index + 1}`] = {
        isActive: mic.isActive,
        isMuted: mic.isMuted,
        device: mic.input,
        dsp: {
          gain: 60,
          eqBass: 50,
          eqMid: 50,
          eqTreble: 50,
          hpfEnabled: false,
          hpfCutoff: 80,
          lpfEnabled: false,
          lpfCutoff: 10000,
          compEnabled: false,
          compThreshold: -20,
          compRatio: 4,
          compAttack: 5,
          compRelease: 120,
          compMakeup: 2,
          limEnabled: false,
          limThreshold: -1,
          limRelease: 80,
        },
      };
      return acc;
    }, {} as any),
    master: {
      gain: 75,
    },
    preferences: {
      autoStartEngine: true,
      defaultSampleRate: 48000,
      defaultBitDepth: 24,
    },
    version: 1,
    lastSaved: Date.now(),
  }), [micSystem.allMics]);

  // Enable persistence
  usePodcastPersistence(persistenceState, {
    autoSave: true,
    autoRestore: true,
    saveDebounceMs: 2000,
  });

  // Enable device recovery
  const deviceRecovery = useDeviceRecovery(
    micSystem.allMics,
    micSystem.availableDevices,
    micSystem.updateMicDevice,
    micSystem.refreshDevices
  );

  // Log recovery status
  useEffect(() => {
    if (deviceRecovery.isRecovering) {
      console.log('[PODCAST STUDIO] Device recovery in progress:', deviceRecovery.disconnectedMics);
    }
  }, [deviceRecovery.isRecovering, deviceRecovery.disconnectedMics]);

  // Notification wrapper with error handling
  const handleNotificationWithError = (type: 'request' | 'system' | 'alert', message: string) => {
    try {
      addNotification?.(type, message);
    } catch (error: any) {
      handleError('engine', `Notification failed: ${error.message}`, 'warning');
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
      }}
      contentContainerStyle={{
        padding: COLORS.sectionGap,
      }}
    >
      {/* MASTER SECTION */}
      <View style={{ marginBottom: COLORS.sectionGap }}>
        <PodcastMasterPanel />
      </View>

      {/* MICROPHONE CHANNELS */}
      <View style={{ marginBottom: COLORS.sectionGap }}>
        <PodcastMicPanel addNotification={handleNotificationWithError} />
      </View>

      {/* STUDIO HEALTH DASHBOARD */}
      <View style={{ marginBottom: COLORS.sectionGap }}>
        <PodcastHealthDashboard />
      </View>

      {/* DEVICE RECOVERY STATUS */}
      {deviceRecovery.isRecovering && (
        <View
          style={{
            marginBottom: COLORS.sectionGap,
            padding: 12,
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#fbbf24',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#fbbf24',
              fontFamily: 'monospace',
            }}
          >
            ⚠️ Device Recovery in Progress
          </span>
          <span
            style={{
              fontSize: 10,
              color: '#fbbf24',
              fontFamily: 'monospace',
              display: 'block',
              marginTop: 4,
            }}
          >
            Attempting to reconnect disconnected microphones...
          </span>
        </View>
      )}
    </ScrollView>
  );
};

export default PodcastStudio;
