/**
 * PodcastMasterPanel Component
 * 
 * Global master controls for the podcast studio:
 * - Master gain fader
 * - Master compressor (optional)
 * - Master limiter (optional)
 * - Recording status indicator
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { audio } from '../../../services/audio';
import { useRecording } from '../hooks/useRecording';

interface PodcastMasterPanelProps {
  // No recording props needed - using hook directly
}

const COLORS = {
  bg: '#080c14',
  panelBg: '#0d1119',
  panelBorder: '#1a2235',
  text: '#e5e7eb',
  textMuted: '#6b7280',
  cyan: '#00d4ff',
  recordRed: '#ef4444',
  recordActive: '#7f1d1d',
};

/**
 * Vertical Fader Component
 */
const Fader: React.FC<{
  value: number;
  onChange: (v: number) => void;
  height?: number;
}> = ({ value, onChange, height = 200 }) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;
      e.preventDefault();
      e.stopPropagation();
    },
    [value]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (-(e.clientY - startY.current) / height) * 100;
      onChange(Math.min(100, Math.max(0, startVal.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onChange, height]);

  const handleHeight = 40;
  const handleWidth = 32;
  const travel = height - handleHeight - 4;

  return (
    <div
      style={{
        width: handleWidth + 16,
        height: height,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Track */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 0,
          bottom: 0,
          width: 6,
          backgroundColor: '#1a1f28',
          borderRadius: 3,
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.9)',
        }}
      />
      
      {/* Handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          bottom: (value / 100) * travel + 2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: handleWidth + 10,
          height: handleHeight,
          borderRadius: 3,
          cursor: 'ns-resize',
          userSelect: 'none',
          border: '1px solid #555b65',
          overflow: 'hidden',
          boxShadow: '0 3px 8px rgba(0,0,0,0.8)',
        }}
      >
        <div
          style={{
            height: '50%',
            background: 'linear-gradient(180deg,#6e757e 0%,#9ca3ac 100%)',
          }}
        />
        <div
          style={{
            height: 1.5,
            backgroundColor: '#3a3f48',
          }}
        />
        <div
          style={{
            height: '50%',
            background: 'linear-gradient(180deg,#d0d5db 0%,#f0f2f4 100%)',
          }}
        />
      </div>
    </div>
  );
};

export const PodcastMasterPanel: React.FC<PodcastMasterPanelProps> = () => {
  const [masterGain, setMasterGain] = useState(75);
  
  // Master Compressor State
  const [compressorEnabled, setCompressorEnabled] = useState(true);
  const [compressorSettings, setCompressorSettings] = useState({
    threshold: -18,
    ratio: 3,
    attack: 10,
    release: 120,
    makeup: 2,
  });

  // Master Limiter State
  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [limiterSettings, setLimiterSettings] = useState({
    threshold: -1,
    release: 80,
  });
  
  // Connect to recording system
  const {
    isRecording,
    recordingSeconds,
    formatRecordingTime,
    startRecording,
    stopRecording,
  } = useRecording();

  // Apply master gain changes to native engine
  const handleGainChange = useCallback(async (value: number) => {
    console.log('[PODCAST MASTER GAIN]', value, '→', value / 100);
    setMasterGain(value);
    try {
      await audio.setMasterGain(value / 100);
      console.log('[PODCAST MASTER GAIN] ✓ Native call succeeded');
    } catch (error) {
      console.error('[PODCAST MASTER] Failed to set master gain:', error);
    }
  }, []);

  // Handle recording toggle
  const handleRecordingToggle = useCallback(async () => {
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (error) {
      console.error('[PODCAST MASTER] Recording toggle failed:', error);
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle compressor toggle
  const handleCompressorToggle = useCallback(async () => {
    const newEnabled = !compressorEnabled;
    setCompressorEnabled(newEnabled);
    
    try {
      console.log('[PODCAST MASTER COMPRESSOR]', newEnabled ? 'ENABLED' : 'DISABLED');
      await audio.setCompressor({
        enabled: newEnabled,
        threshold: compressorSettings.threshold,
        ratio: compressorSettings.ratio,
        attack: compressorSettings.attack,
        release: compressorSettings.release,
        makeup: compressorSettings.makeup,
      });
    } catch (error) {
      console.error('[PODCAST MASTER] Compressor toggle failed:', error);
    }
  }, [compressorEnabled, compressorSettings]);

  // Handle compressor settings change
  const handleCompressorChange = useCallback(async (changes: Partial<typeof compressorSettings>) => {
    const newSettings = { ...compressorSettings, ...changes };
    setCompressorSettings(newSettings);
    
    try {
      console.log('[PODCAST MASTER COMPRESSOR SETTINGS]', newSettings);
      await audio.setCompressor({
        enabled: compressorEnabled,
        ...newSettings,
      });
    } catch (error) {
      console.error('[PODCAST MASTER] Compressor settings failed:', error);
    }
  }, [compressorEnabled, compressorSettings]);

  // Handle limiter toggle
  const handleLimiterToggle = useCallback(async () => {
    const newEnabled = !limiterEnabled;
    setLimiterEnabled(newEnabled);
    
    try {
      console.log('[PODCAST MASTER LIMITER]', newEnabled ? 'ENABLED' : 'DISABLED');
      await audio.setLimiter({
        enabled: newEnabled,
        threshold: limiterSettings.threshold,
        release: limiterSettings.release,
      });
    } catch (error) {
      console.error('[PODCAST MASTER] Limiter toggle failed:', error);
    }
  }, [limiterEnabled, limiterSettings]);

  // Handle limiter settings change
  const handleLimiterChange = useCallback(async (changes: Partial<typeof limiterSettings>) => {
    const newSettings = { ...limiterSettings, ...changes };
    setLimiterSettings(newSettings);
    
    try {
      console.log('[PODCAST MASTER LIMITER SETTINGS]', newSettings);
      await audio.setLimiter({
        enabled: limiterEnabled,
        ...newSettings,
      });
    } catch (error) {
      console.error('[PODCAST MASTER] Limiter settings failed:', error);
    }
  }, [limiterEnabled, limiterSettings]);

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
          MASTER OUTPUT
        </span>
        {isRecording && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: COLORS.recordRed,
              fontFamily: 'monospace',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '4px 8px',
              borderRadius: 4,
              animation: 'pulse 1s ease-in-out infinite',
            }}
          >
            ● RECORDING {formatRecordingTime(recordingSeconds)}
          </span>
        )}
      </div>

      {/* CONTENT */}
      <div
        style={{
          background: COLORS.panelBg,
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: 8,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* MASTER FADER */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontFamily: 'monospace',
            }}
          >
            MASTER GAIN
          </span>
          <Fader value={masterGain} onChange={handleGainChange} height={200} />
          <span
            style={{
              fontSize: 15,
              color: COLORS.text,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            {Math.round(masterGain)}%
          </span>
        </div>

        {/* RECORDING CONTROL */}
        <button
          onClick={handleRecordingToggle}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 6,
            border: `2px solid ${
              isRecording ? COLORS.recordRed : COLORS.panelBorder
            }`,
            background: isRecording ? COLORS.recordActive : 'transparent',
            color: isRecording ? '#fca5a5' : COLORS.text,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          {isRecording ? '⏹ STOP RECORDING' : '⏺ START RECORDING'}
        </button>

        {/* MASTER COMPRESSOR */}
        <div style={{ width: '100%', borderTop: `1px solid ${COLORS.panelBorder}`, paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.text, fontFamily: 'monospace' }}>
              MASTER COMPRESSOR
            </span>
            <button
              onClick={handleCompressorToggle}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                background: compressorEnabled ? COLORS.cyan : COLORS.panelBorder,
                color: compressorEnabled ? '#000' : COLORS.textMuted,
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {compressorEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {compressorEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Threshold:</span>
                <span style={{ color: COLORS.text }}>{compressorSettings.threshold} dB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Ratio:</span>
                <span style={{ color: COLORS.text }}>{compressorSettings.ratio}:1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Attack:</span>
                <span style={{ color: COLORS.text }}>{compressorSettings.attack} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Release:</span>
                <span style={{ color: COLORS.text }}>{compressorSettings.release} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Makeup:</span>
                <span style={{ color: COLORS.text }}>{compressorSettings.makeup} dB</span>
              </div>
            </div>
          )}
        </div>

        {/* MASTER LIMITER */}
        <div style={{ width: '100%', borderTop: `1px solid ${COLORS.panelBorder}`, paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.text, fontFamily: 'monospace' }}>
              MASTER LIMITER
            </span>
            <button
              onClick={handleLimiterToggle}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                background: limiterEnabled ? COLORS.cyan : COLORS.panelBorder,
                color: limiterEnabled ? '#000' : COLORS.textMuted,
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {limiterEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {limiterEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Ceiling:</span>
                <span style={{ color: COLORS.text }}>{limiterSettings.threshold} dB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
                <span style={{ color: COLORS.textMuted }}>Release:</span>
                <span style={{ color: COLORS.text }}>{limiterSettings.release} ms</span>
              </div>
            </div>
          )}
        </div>
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
};

export default PodcastMasterPanel;
