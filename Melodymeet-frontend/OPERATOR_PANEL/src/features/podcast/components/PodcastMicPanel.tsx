/**
 * PodcastMicPanel Component
 * 
 * Main container for all 5 podcast microphone channel strips.
 * Connects to usePodcastMicSystem hook and distributes state to channels.
 * 
 * Layout: Horizontal scrollable panel with 5 channel strips
 * - Host (mic1)
 * - Co-Host (mic2)
 * - Guest 1 (mic3)
 * - Guest 2 (mic4)
 * - Guest 3 (mic5)
 */

import React, { useCallback } from 'react';
import { usePodcastMicSystem } from '../hooks/usePodcastMicSystem';
import { PodcastChannelStrip } from './PodcastChannelStrip';
import { useSoloManager } from '../../shared/hooks/useSoloManager';

interface PodcastMicPanelProps {
  addNotification?: (
    type: 'request' | 'system' | 'alert',
    message: string
  ) => void;
}

const COLORS = {
  bg: '#080c14',
  panelBorder: '#1a2235',
  text: '#e5e7eb',
  textMuted: '#6b7280',
};

export const PodcastMicPanel: React.FC<PodcastMicPanelProps> = ({
  addNotification,
}) => {
  // Connect to microphone system
  const micSystem = usePodcastMicSystem(addNotification);
  
  // Connect to solo manager
  const soloManager = useSoloManager();

  // Handle mic activation toggle
  const handleToggleActive = useCallback(
    (micId: string) => {
      micSystem.toggleMicActive(micId);
    },
    [micSystem]
  );

  // Handle mute toggle
  const handleToggleMute = useCallback(
    (micId: string) => {
      micSystem.toggleMicMute(micId);
    },
    [micSystem]
  );

  // Handle solo toggle
  const handleToggleSolo = useCallback(
    (micId: string) => {
      micSystem.toggleMicSolo(micId);
    },
    [micSystem]
  );

  // Handle device change
  const handleDeviceChange = useCallback(
    (micId: string, device: string) => {
      micSystem.updateMicDevice(micId, device);
    },
    [micSystem]
  );

  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${COLORS.panelBorder}`,
        width: '100%',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingInline: 4,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: COLORS.text,
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
          }}
        >
          PODCAST MICROPHONES
        </span>
        <span
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            fontFamily: 'monospace',
          }}
        >
          {micSystem.allMics.filter((m) => m.isActive).length} / {micSystem.allMics.length} Active
        </span>
      </div>

      {/* CHANNEL STRIPS */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            minWidth: 'max-content',
            paddingBottom: 8,
          }}
        >
          {micSystem.allMics.map((mic, index) => (
            <PodcastChannelStrip
              key={mic.id}
              micIndex={index}
              mic={mic}
              availableDevices={micSystem.availableDevices}
              onToggleActive={() => handleToggleActive(mic.id)}
              onToggleMute={() => handleToggleMute(mic.id)}
              onToggleSolo={() => handleToggleSolo(mic.id)}
              onDeviceChange={(device) => handleDeviceChange(mic.id, device)}
              soloManager={soloManager}
            />
          ))}
        </div>
      </div>

      {/* FOOTER INFO */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${COLORS.panelBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingInline: 4,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: COLORS.textMuted,
            fontFamily: 'monospace',
          }}
        >
          {micSystem.availableDevices.length} input device
          {micSystem.availableDevices.length !== 1 ? 's' : ''} available
        </div>
        <button
          onClick={micSystem.refreshDevices}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: `1px solid ${COLORS.panelBorder}`,
            background: 'transparent',
            color: COLORS.textMuted,
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          Refresh Devices
        </button>
      </div>
    </div>
  );
};

export default PodcastMicPanel;
