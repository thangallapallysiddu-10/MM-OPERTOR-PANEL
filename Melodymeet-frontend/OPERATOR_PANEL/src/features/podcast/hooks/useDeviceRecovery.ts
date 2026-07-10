/**
 * useDeviceRecovery Hook
 * 
 * Handles audio device disconnections and automatic recovery.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { audio } from '../../../services/audio';
import { useErrorHandler } from './useErrorHandler';
import { PodcastMic } from './usePodcastMicSystem';

interface DeviceRecoveryState {
  disconnectedMics: Set<string>;
  recoveryAttempts: Map<string, number>;
  lastDeviceChange: number;
}

const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_DELAY_MS = 2000;

export const useDeviceRecovery = (
  allMics: PodcastMic[],
  availableDevices: string[],
  updateMicDevice: (micId: string, device: string) => Promise<void>,
  refreshDevices: () => Promise<void>
) => {
  const { handleError } = useErrorHandler();
  const [recoveryState, setRecoveryState] = useState<DeviceRecoveryState>({
    disconnectedMics: new Set(),
    recoveryAttempts: new Map(),
    lastDeviceChange: 0,
  });

  const recoveryTimeoutRef = useRef<any>(null);

  /**
   * Check if a mic's device is still available
   */
  const isDeviceAvailable = useCallback((deviceName: string): boolean => {
    return availableDevices.includes(deviceName);
  }, [availableDevices]);

  /**
   * Attempt to recover a disconnected microphone
   */
  const attemptRecovery = useCallback(async (mic: PodcastMic) => {
    const attempts = recoveryState.recoveryAttempts.get(mic.id) || 0;

    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
      handleError(
        'device',
        `Unable to recover ${mic.label}. Please reconnect the device manually.`,
        'error'
      );
      return false;
    }

    console.log(`[DEVICE RECOVERY] Attempting to recover ${mic.label} (attempt ${attempts + 1}/${MAX_RECOVERY_ATTEMPTS})`);

    try {
      // Try to reconnect to the same device
      if (isDeviceAvailable(mic.input)) {
        await updateMicDevice(mic.id, mic.input);
        console.log(`[DEVICE RECOVERY] ✓ Successfully reconnected ${mic.label} to ${mic.input}`);
        
        // Clear from disconnected set
        setRecoveryState(prev => {
          const newDisconnected = new Set(prev.disconnectedMics);
          newDisconnected.delete(mic.id);
          const newAttempts = new Map(prev.recoveryAttempts);
          newAttempts.delete(mic.id);
          return {
            ...prev,
            disconnectedMics: newDisconnected,
            recoveryAttempts: newAttempts,
          };
        });

        Alert.alert('Device Recovered', `${mic.label} has been reconnected successfully.`);
        return true;
      }

      // Try to fallback to default device
      const defaultDevice = availableDevices[0];
      if (defaultDevice) {
        await updateMicDevice(mic.id, defaultDevice);
        console.log(`[DEVICE RECOVERY] ✓ ${mic.label} switched to default device: ${defaultDevice}`);
        
        setRecoveryState(prev => {
          const newDisconnected = new Set(prev.disconnectedMics);
          newDisconnected.delete(mic.id);
          const newAttempts = new Map(prev.recoveryAttempts);
          newAttempts.delete(mic.id);
          return {
            ...prev,
            disconnectedMics: newDisconnected,
            recoveryAttempts: newAttempts,
          };
        });

        Alert.alert(
          'Device Changed',
          `${mic.label} switched to ${defaultDevice} because the original device is unavailable.`
        );
        return true;
      }

      // No devices available
      handleError('device', `No audio devices available for ${mic.label}`, 'error');
      
      // Increment attempt counter
      setRecoveryState(prev => {
        const newAttempts = new Map(prev.recoveryAttempts);
        newAttempts.set(mic.id, attempts + 1);
        return { ...prev, recoveryAttempts: newAttempts };
      });

      return false;
    } catch (error: any) {
      handleError('device', `Recovery failed for ${mic.label}: ${error.message}`, 'warning');
      
      // Increment attempt counter
      setRecoveryState(prev => {
        const newAttempts = new Map(prev.recoveryAttempts);
        newAttempts.set(mic.id, attempts + 1);
        return { ...prev, recoveryAttempts: newAttempts };
      });

      return false;
    }
  }, [recoveryState, isDeviceAvailable, updateMicDevice, availableDevices, handleError]);

  /**
   * Check all active mics for device availability
   */
  const checkDeviceHealth = useCallback(async () => {
    console.log('[DEVICE RECOVERY] Checking device health...');

    for (const mic of allMics) {
      if (!mic.isActive || !mic.input) continue;

      const deviceAvailable = isDeviceAvailable(mic.input);

      if (!deviceAvailable && !recoveryState.disconnectedMics.has(mic.id)) {
        // Device just disconnected
        console.log(`[DEVICE RECOVERY] ⚠️ Device disconnected for ${mic.label}`);
        
        setRecoveryState(prev => {
          const newDisconnected = new Set(prev.disconnectedMics);
          newDisconnected.add(mic.id);
          return { ...prev, disconnectedMics: newDisconnected };
        });

        handleError(
          'device',
          `${mic.label} device disconnected. Attempting recovery...`,
          'warning'
        );

        // Schedule recovery attempt
        if (recoveryTimeoutRef.current) {
          clearTimeout(recoveryTimeoutRef.current);
        }
        recoveryTimeoutRef.current = setTimeout(() => {
          attemptRecovery(mic);
        }, RECOVERY_DELAY_MS);
      } else if (deviceAvailable && recoveryState.disconnectedMics.has(mic.id)) {
        // Device reconnected
        console.log(`[DEVICE RECOVERY] ✓ Device reconnected for ${mic.label}`);
        
        setRecoveryState(prev => {
          const newDisconnected = new Set(prev.disconnectedMics);
          newDisconnected.delete(mic.id);
          const newAttempts = new Map(prev.recoveryAttempts);
          newAttempts.delete(mic.id);
          return {
            ...prev,
            disconnectedMics: newDisconnected,
            recoveryAttempts: newAttempts,
          };
        });

        Alert.alert('Device Reconnected', `${mic.label} device is back online.`);
      }
    }
  }, [allMics, isDeviceAvailable, recoveryState, handleError, attemptRecovery]);

  /**
   * Handle device change events
   */
  useEffect(() => {
    const handleDeviceChange = async () => {
      console.log('[DEVICE RECOVERY] Device change detected');
      
      setRecoveryState(prev => ({
        ...prev,
        lastDeviceChange: Date.now(),
      }));

      // Refresh device list
      await refreshDevices();

      // Check health after refresh
      setTimeout(() => {
        checkDeviceHealth();
      }, 500);
    };

    // Listen for device events
    audio.on('device:changed', handleDeviceChange);
    audio.on('device:removed', handleDeviceChange);
    audio.on('device:added', handleDeviceChange);

    return () => {
      audio.off('device:changed', handleDeviceChange);
      audio.off('device:removed', handleDeviceChange);
      audio.off('device:added', handleDeviceChange);
      
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, [refreshDevices, checkDeviceHealth]);

  /**
   * Periodic health check (every 5 seconds)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      checkDeviceHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, [checkDeviceHealth]);

  return {
    disconnectedMics: Array.from(recoveryState.disconnectedMics),
    isRecovering: recoveryState.disconnectedMics.size > 0,
    checkDeviceHealth,
    attemptRecovery,
  };
};
