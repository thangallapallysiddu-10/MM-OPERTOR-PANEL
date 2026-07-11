/**
 * PodcastChannelStrip Component
 * 
 * Complete control strip for a single microphone:
 * - Header with mic name
 * - Enable/Mute buttons
 * - Device selector
 * - DSP controls (Gain, EQ, Filters, Compressor, Limiter)
 * - VU meter
 * - Health indicator
 */

import React, { useCallback, useMemo, useState } from 'react';
import { PodcastMic } from '../hooks/usePodcastMicSystem';
import { PodcastMeter } from './PodcastMeter';
import { PodcastHealthIndicator } from './PodcastHealthIndicator';
import { PodcastDeviceSelector } from './PodcastDeviceSelector';
import { PodcastDSPSection } from './PodcastDSPSection';
import { audio } from '../../../services/audio';
import { useSoloManager } from '../../shared/hooks/useSoloManager';

interface PodcastChannelStripProps {
  micIndex: number;
  mic: PodcastMic;
  availableDevices: string[];
  onToggleActive: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onDeviceChange: (device: string) => void;
  soloManager: ReturnType<typeof useSoloManager>;
}

const COLORS = {
  bg: '#0d1119',
  strip: '#0d1119',
  stripBorder: '#1a2235',
  text: '#e5e7eb',
  textMuted: '#6b7280',
  textLight: '#cbd5e1',
  activeGreen: '#16a34a',
  inactiveBorder: '#374151',
  muteRed: '#ef4444',
  muteActive: '#7f1d1d',
};

export const PodcastChannelStrip = React.memo<PodcastChannelStripProps>(
  ({
    micIndex,
    mic,
    availableDevices,
    onToggleActive,
    onToggleMute,
    onToggleSolo,
    onDeviceChange,
    soloManager,
  }) => {
    // Convert micIndex to channelId for EQ API (Mic1-Mic5)
    const channelId = `Mic${micIndex + 1}`;

    // DSP Settings state - MUST be useState to track changes
    const [dspSettings, setDspSettings] = useState({
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
    });

    // Handle DSP changes
    const handleDSPChange = useCallback(
      async (changes: any) => {
        console.log('[PODCAST MIC GAIN] micIndex=', micIndex, 'changes=', changes);
        
        // Update local state FIRST
        setDspSettings(prev => ({ ...prev, ...changes }));
        
        try {
          // GAIN
          if (changes.gain !== undefined) {
            console.log('[PODCAST MIC GAIN] Calling setMicrophoneGainByIndex', micIndex, changes.gain / 100);
            await audio.setMicrophoneGainByIndex(micIndex, changes.gain / 100);
          }

          // EQ (Bass, Mid, Treble)
          if (
            changes.eqBass !== undefined ||
            changes.eqMid !== undefined ||
            changes.eqTreble !== undefined
          ) {
            const currentSettings = { ...dspSettings, ...changes };
            await audio.setEQ(channelId, {
              eqBass: currentSettings.eqBass / 100,
              eqMid: currentSettings.eqMid / 100,
              eqTreble: currentSettings.eqTreble / 100,
            });
          }

          // HPF/LPF (via EQ API with filter fields)
          if (
            changes.hpfEnabled !== undefined ||
            changes.hpfCutoff !== undefined ||
            changes.lpfEnabled !== undefined ||
            changes.lpfCutoff !== undefined
          ) {
            const currentSettings = { ...dspSettings, ...changes };
            await audio.setEQ(channelId, {
              eqBass: currentSettings.eqBass / 100,
              eqMid: currentSettings.eqMid / 100,
              eqTreble: currentSettings.eqTreble / 100,
              // @ts-ignore - Testing HPF/LPF support
              highPassFilter: currentSettings.hpfEnabled
                ? currentSettings.hpfCutoff
                : undefined,
              // @ts-ignore - Testing LPF support
              lowPassFilter: currentSettings.lpfEnabled
                ? currentSettings.lpfCutoff
                : undefined,
            });
          }

          // COMPRESSOR
          if (
            changes.compEnabled !== undefined ||
            changes.compThreshold !== undefined ||
            changes.compRatio !== undefined ||
            changes.compAttack !== undefined ||
            changes.compRelease !== undefined ||
            changes.compMakeup !== undefined
          ) {
            const currentSettings = { ...dspSettings, ...changes };
            await audio.setMicrophoneCompressor(micIndex, {
              enabled: currentSettings.compEnabled,
              threshold: currentSettings.compThreshold,
              ratio: currentSettings.compRatio,
              attack: currentSettings.compAttack,
              release: currentSettings.compRelease,
              makeup: currentSettings.compMakeup,
            });
          }

          // LIMITER
          if (
            changes.limEnabled !== undefined ||
            changes.limThreshold !== undefined ||
            changes.limRelease !== undefined
          ) {
            const currentSettings = { ...dspSettings, ...changes };
            await audio.setMicrophoneLimiter(micIndex, {
              enabled: currentSettings.limEnabled,
              threshold: currentSettings.limThreshold,
              release: currentSettings.limRelease,
            });
          }
        } catch (error) {
          console.error(
            `[PODCAST CHANNEL ${micIndex}] DSP update failed:`,
            error
          );
        }
      },
      [micIndex, channelId, dspSettings]
    );

    return (
      <div
        style={{
          width: 220,
          backgroundColor: COLORS.strip,
          border: `1px solid ${COLORS.stripBorder}`,
          borderRadius: 10,
          padding: '12px 10px 10px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.text,
              fontFamily: 'monospace',
            }}
          >
            {mic.label}
          </div>
          <div
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontFamily: 'monospace',
            }}
          >
            ({mic.id.toUpperCase()})
          </div>
        </div>

        {/* ENABLE BUTTON */}
        <button
          onClick={onToggleActive}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: mic.isActive
              ? 'none'
              : `1px solid ${COLORS.inactiveBorder}`,
            background: mic.isActive ? COLORS.activeGreen : 'transparent',
            color: mic.isActive ? '#fff' : COLORS.textMuted,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'monospace',
            cursor: 'pointer',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: mic.isActive ? '#fff' : COLORS.inactiveBorder,
              boxShadow: mic.isActive ? '0 0 6px #fff' : 'none',
            }}
          />
          {mic.isActive ? 'ACTIVE' : 'DISABLED'}
        </button>

        {/* DEVICE SELECTOR */}
        <div style={{ marginBottom: 10 }}>
          <PodcastDeviceSelector
            selectedDevice={mic.input}
            availableDevices={availableDevices}
            onDeviceChange={onDeviceChange}
            disabled={!mic.isActive}
          />
        </div>

        {/* MUTE BUTTON */}
        <button
          onClick={onToggleMute}
          disabled={!mic.isActive}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: `1.5px solid ${
              mic.isActive ? COLORS.muteRed : COLORS.inactiveBorder
            }`,
            background: mic.isMuted ? COLORS.muteActive : 'transparent',
            color: mic.isMuted
              ? '#fca5a5'
              : mic.isActive
              ? COLORS.muteRed
              : COLORS.textMuted,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'monospace',
            cursor: mic.isActive ? 'pointer' : 'not-allowed',
            marginBottom: 8,
          }}
        >
          {mic.isMuted ? '🔇 MUTED' : '🎙️ LIVE'}
        </button>

        {/* SOLO BUTTON */}
        <button
          onClick={() => {
            console.log('[PODCAST SOLO BUTTON] Clicked for micIndex', micIndex);
            soloManager.toggleSolo({ type: 'microphone', index: micIndex });
            onToggleSolo();
          }}
          disabled={!mic.isActive}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: `1.5px solid ${
              mic.isActive
                ? mic.isSoloed
                  ? '#d97706'
                  : '#374151'
                : COLORS.inactiveBorder
            }`,
            background: mic.isSoloed ? '#1a1200' : 'transparent',
            color: mic.isSoloed
              ? '#fbbf24'
              : mic.isActive
              ? '#d1d5db'
              : COLORS.textMuted,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'monospace',
            cursor: mic.isActive ? 'pointer' : 'not-allowed',
            marginBottom: 12,
          }}
        >
          {mic.isSoloed ? '⭐ SOLO' : 'SOLO'}
        </button>

        {/* DSP CONTROLS */}
        <div style={{ marginBottom: 12 }}>
          <PodcastDSPSection
            settings={dspSettings}
            onChange={handleDSPChange}
            disabled={!mic.isActive}
          />
        </div>

        {/* VU METER */}
        <div style={{ marginBottom: 12 }}>
          <PodcastMeter
            peak={mic.volume}
            rms={mic.rms}
            clipped={mic.clipped}
            label={mic.label}
          />
        </div>

        {/* HEALTH INDICATOR */}
        {mic.isActive && (
          <PodcastHealthIndicator
            connected={mic.connected}
            signalPresent={mic.signalPresent}
            clipped={mic.clipped}
            noiseFloor={mic.noiseFloor}
          />
        )}
      </div>
    );
  }
);

PodcastChannelStrip.displayName = 'PodcastChannelStrip';

export default PodcastChannelStrip;
