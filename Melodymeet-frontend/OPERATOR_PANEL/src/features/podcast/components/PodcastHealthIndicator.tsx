/**
 * PodcastHealthIndicator Component
 * 
 * Displays microphone health metrics:
 * - Device connection status
 * - Signal presence
 * - Clip detection
 * - Noise floor
 */

import React from 'react';

interface PodcastHealthIndicatorProps {
  connected: boolean;
  signalPresent: boolean;
  clipped: boolean;
  noiseFloor?: string;
}

const COLORS = {
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
  muted: '#6b7280',
  text: '#e5e7eb',
  bg: '#0a0e15',
  border: '#1a2235',
};

export const PodcastHealthIndicator = React.memo<PodcastHealthIndicatorProps>(
  ({ connected, signalPresent, clipped, noiseFloor }) => {
    return (
      <div
        style={{
          padding: '8px 10px',
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        {/* Connection Status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: COLORS.muted,
              fontFamily: 'monospace',
            }}
          >
            Device:
          </span>
          <span
            style={{
              fontSize: 9,
              color: connected ? COLORS.success : COLORS.error,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            {connected ? '✓ Connected' : '✗ Disconnected'}
          </span>
        </div>

        {/* Signal Presence */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: COLORS.muted,
              fontFamily: 'monospace',
            }}
          >
            Signal:
          </span>
          <span
            style={{
              fontSize: 9,
              color: signalPresent ? COLORS.success : COLORS.muted,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            {signalPresent ? '🎙️ Present' : 'Silent'}
          </span>
        </div>

        {/* Clip Warning */}
        {clipped && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '3px 6px',
              borderRadius: 4,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: COLORS.error,
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              ⚠️ CLIPPING
            </span>
          </div>
        )}

        {/* Noise Floor */}
        {noiseFloor && noiseFloor !== '-' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: COLORS.muted,
                fontFamily: 'monospace',
              }}
            >
              Noise Floor:
            </span>
            <span
              style={{
                fontSize: 9,
                color: COLORS.text,
                fontFamily: 'monospace',
              }}
            >
              {noiseFloor}
            </span>
          </div>
        )}
      </div>
    );
  }
);

PodcastHealthIndicator.displayName = 'PodcastHealthIndicator';

export default PodcastHealthIndicator;
