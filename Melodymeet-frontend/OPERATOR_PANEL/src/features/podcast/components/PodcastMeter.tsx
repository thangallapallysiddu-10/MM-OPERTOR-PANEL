/**
 * PodcastMeter Component
 * 
 * Displays VU meter with peak, RMS, and clip indication.
 * Optimized for 60Hz meter updates without causing re-renders.
 * 
 * Uses React.memo to prevent unnecessary re-renders.
 */

import React from 'react';

interface PodcastMeterProps {
  peak: number;      // 0-100
  rms: number;       // 0-1 (raw value)
  clipped: boolean;
  label?: string;
}

const NUM_BARS = 28;
const BAR_HEIGHT = 5;
const BAR_GAP = 2;
const METER_HEIGHT = NUM_BARS * (BAR_HEIGHT + BAR_GAP);

// Color scheme
const COLORS = {
  barGreen: '#22c55e',
  barAmber: '#ca8a04',
  barRed: '#b91c1c',
  barGhostGreen: '#0a2e10',
  barGhostAmber: '#2e1a04',
  barGhostRed: '#2e0808',
  clipRed: '#ef4444',
  bg: '#0d1119',
};

/**
 * Single VU bar component
 */
const VuBar = React.memo<{ level: number; barIndex: number }>(({ level, barIndex }) => {
  const pct = ((NUM_BARS - 1 - barIndex) / (NUM_BARS - 1)) * 100;
  const isRed = pct > 85;
  const isAmber = pct > 60 && pct <= 85;
  
  const isActive = pct <= level;
  
  const color = isActive
    ? (isRed ? COLORS.barRed : isAmber ? COLORS.barAmber : COLORS.barGreen)
    : (isRed ? COLORS.barGhostRed : isAmber ? COLORS.barGhostAmber : COLORS.barGhostGreen);
  
  return (
    <div
      style={{
        width: 11,
        height: BAR_HEIGHT,
        borderRadius: 1,
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
});

VuBar.displayName = 'VuBar';

/**
 * VU meter column
 */
const VuColumn = React.memo<{ level: number }>(({ level }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: BAR_GAP,
      }}
    >
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <VuBar key={i} level={level} barIndex={i} />
      ))}
    </div>
  );
});

VuColumn.displayName = 'VuColumn';

/**
 * Main meter component
 */
export const PodcastMeter = React.memo<PodcastMeterProps>(
  ({ peak, rms, clipped, label }) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {/* Clip indicator */}
        {clipped && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: COLORS.clipRed,
              fontFamily: 'monospace',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '2px 6px',
              borderRadius: 3,
              animation: 'pulse 0.5s ease-in-out infinite',
            }}
          >
            CLIP
          </div>
        )}

        {/* VU meter bars */}
        <div
          style={{
            display: 'flex',
            gap: 3,
          }}
        >
          <VuColumn level={peak} />
          {/* Second column for stereo (podcast mics are mono, so duplicate) */}
          <VuColumn level={peak} />
        </div>

        {/* Label */}
        {label && (
          <div
            style={{
              fontSize: 9,
              color: '#9ca3af',
              fontFamily: 'monospace',
              marginTop: 2,
            }}
          >
            {label}
          </div>
        )}

        {/* Peak value display */}
        <div
          style={{
            fontSize: 9,
            color: peak > 85 ? COLORS.clipRed : peak > 60 ? COLORS.barAmber : COLORS.barGreen,
            fontFamily: 'monospace',
            fontWeight: 700,
          }}
        >
          {Math.round(peak)}%
        </div>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
      </div>
    );
  },
  // Custom comparison to prevent re-renders when values haven't changed significantly
  (prevProps, nextProps) => {
    return (
      Math.abs(prevProps.peak - nextProps.peak) < 1 &&
      prevProps.clipped === nextProps.clipped &&
      prevProps.label === nextProps.label
    );
  }
);

PodcastMeter.displayName = 'PodcastMeter';

export default PodcastMeter;
