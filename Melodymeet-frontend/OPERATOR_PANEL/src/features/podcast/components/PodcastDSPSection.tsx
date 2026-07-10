/**
 * PodcastDSPSection Component
 * 
 * Complete DSP controls for a single microphone:
 * - Gain (0-100%)
 * - EQ (Bass, Mid, Treble)
 * - High-Pass Filter (20-1000 Hz)
 * - Low-Pass Filter (1000-20000 Hz)
 * - Compressor (Threshold, Ratio, Attack, Release, Makeup)
 * - Limiter (Threshold, Release)
 * 
 * Uses collapsible sections to save vertical space.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DSPSettings {
  gain: number;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  hpfEnabled: boolean;
  hpfCutoff: number;
  lpfEnabled: boolean;
  lpfCutoff: number;
  compEnabled: boolean;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  compMakeup: number;
  limEnabled: boolean;
  limThreshold: number;
  limRelease: number;
}

interface PodcastDSPSectionProps {
  settings: DSPSettings;
  onChange: (changes: Partial<DSPSettings>) => void;
}

const COLORS = {
  bg: '#0d1119',
  sectionBg: '#1a2235',
  sectionBorder: '#2d3f5c',
  text: '#e5e7eb',
  textMuted: '#6b7280',
  cyan: '#00d4ff',
  knobBg: '#2d3f5c',
};

/**
 * Rotary Knob Component
 */
const Knob = React.memo<{
  value: number;
  onChange: (v: number) => void;
  size?: number;
  min?: number;
  max?: number;
}>(({ value, onChange, size = 44, min = 0, max = 100 }) => {
  const uid = useRef(`k${Math.random()}`).current;
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
      const delta = (startY.current - e.clientY) / 1.5;
      const newVal = startVal.current + delta;
      onChange(Math.min(max, Math.max(min, newVal)));
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
  }, [onChange, min, max]);

  const cx = size / 2;
  const cy = size / 2;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const rOuter = size / 2 - 2;
  const arcWidth = Math.max(2, size / 16);
  const arcR = rOuter;
  const MIN = -135;
  const MAX = 135;
  
  const normalizedValue = ((value - min) / (max - min)) * 100;
  const ang = MIN + (normalizedValue / 100) * (MAX - MIN);
  
  const ax1 = cx + arcR * Math.cos(toRad(MIN - 90));
  const ay1 = cy + arcR * Math.sin(toRad(MIN - 90));
  const axAll = cx + arcR * Math.cos(toRad(MAX - 90));
  const ayAll = cy + arcR * Math.sin(toRad(MAX - 90));
  const ax2 = cx + arcR * Math.cos(toRad(ang - 90));
  const ay2 = cy + arcR * Math.sin(toRad(ang - 90));
  const lg = ang - MIN > 180 ? 1 : 0;
  
  const rCollar = arcR - arcWidth - 1;
  const rBody = rCollar * 0.93;
  const rTop = rBody * 0.8;
  const rFI = rBody * 0.8;
  const rFO = rBody;
  const FLUTES = size < 44 ? 18 : 24;
  
  const flutes = Array.from({ length: FLUTES }).map((_, i) => {
    const rad = toRad((360 / FLUTES) * i);
    return (
      <line
        key={i}
        x1={cx + rFI * Math.cos(rad)}
        y1={cy + rFI * Math.sin(rad)}
        x2={cx + rFO * Math.cos(rad)}
        y2={cy + rFO * Math.sin(rad)}
        stroke={i % 2 === 0 ? '#000' : '#55555a'}
        strokeWidth={Math.max(1, size / 42)}
        strokeLinecap="round"
      />
    );
  });
  
  const pRad = toRad(ang - 90);
  const px1 = cx + rTop * 0.15 * Math.cos(pRad);
  const py1 = cy + rTop * 0.15 * Math.sin(pRad);
  const px2 = cx + rTop * 0.95 * Math.cos(pRad);
  const py2 = cy + rTop * 0.95 * Math.sin(pRad);

  return (
    <svg
      width={size}
      height={size}
      style={{
        cursor: 'ns-resize',
        userSelect: 'none',
        flexShrink: 0,
        display: 'block',
      }}
      onMouseDown={onMouseDown}
    >
      <defs>
        <radialGradient id={`c-${uid}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#7a8190" />
          <stop offset="55%" stopColor="#454b58" />
          <stop offset="100%" stopColor="#1c1f26" />
        </radialGradient>
        <radialGradient id={`b-${uid}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#34343a" />
          <stop offset="55%" stopColor="#1a1a1c" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <radialGradient id={`t-${uid}`} cx="36%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#55555c" />
          <stop offset="35%" stopColor="#252528" />
          <stop offset="100%" stopColor="#040405" />
        </radialGradient>
        <filter id={`s-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="1.5"
            stdDeviation="1.2"
            floodColor="#000"
            floodOpacity="0.6"
          />
        </filter>
      </defs>
      <path
        d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 1 1 ${axAll} ${ayAll}`}
        fill="none"
        stroke="#1e2a3a"
        strokeWidth={arcWidth}
        strokeLinecap="round"
      />
      {normalizedValue > 0 && (
        <path
          d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 ${lg} 1 ${ax2} ${ay2}`}
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={rCollar}
        fill={`url(#c-${uid})`}
        filter={`url(#s-${uid})`}
      />
      <circle cx={cx} cy={cy} r={rBody} fill={`url(#b-${uid})`} />
      <g>{flutes}</g>
      <circle cx={cx} cy={cy} r={rTop} fill={`url(#t-${uid})`} />
      <circle
        cx={cx}
        cy={cy}
        r={rTop}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      <line
        x1={px1}
        y1={py1}
        x2={px2}
        y2={py2}
        stroke="#ffffff"
        strokeWidth={Math.max(1.5, size / 24)}
        strokeLinecap="round"
      />
    </svg>
  );
});

Knob.displayName = 'Knob';

/**
 * Collapsible Section
 */
const CollapsibleSection: React.FC<{
  title: string;
  enabled: boolean;
  onToggle: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}> = ({ title, enabled, onToggle, defaultExpanded = false, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      style={{
        background: COLORS.sectionBg,
        border: `1px solid ${COLORS.sectionBorder}`,
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: expanded ? 8 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: COLORS.text,
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textMuted,
              fontSize: 12,
              cursor: 'pointer',
              padding: 2,
            }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
        <button
          onClick={onToggle}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: 'none',
            background: enabled ? COLORS.cyan : COLORS.knobBg,
            color: enabled ? '#000' : COLORS.textMuted,
            fontSize: 9,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      {expanded && <div>{children}</div>}
    </div>
  );
};

/**
 * Main DSP Section Component
 */
export const PodcastDSPSection = React.memo<PodcastDSPSectionProps>(
  ({ settings, onChange }) => {
    const updateSetting = useCallback(
      (key: keyof DSPSettings, value: number | boolean) => {
        onChange({ [key]: value });
      },
      [onChange]
    );

    return (
      <div style={{ width: '100%' }}>
        {/* GAIN */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: COLORS.text,
              fontFamily: 'monospace',
              minWidth: 38,
            }}
          >
            GAIN
          </span>
          <Knob
            value={settings.gain}
            onChange={(v) => updateSetting('gain', v)}
            size={48}
          />
          <span
            style={{
              fontSize: 15,
              color: COLORS.text,
              fontFamily: 'monospace',
              fontWeight: 700,
              minWidth: 42,
            }}
          >
            {Math.round(settings.gain)}%
          </span>
        </div>

        {/* EQ */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          {(['eqBass', 'eqMid', 'eqTreble'] as const).map((param, idx) => {
            const label = param === 'eqBass' ? 'LOW' : param === 'eqMid' ? 'MID' : 'HI';
            return (
              <div
                key={param}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: COLORS.text,
                    fontFamily: 'monospace',
                  }}
                >
                  {label}
                </span>
                <Knob
                  value={settings[param]}
                  onChange={(v) => updateSetting(param, v)}
                  size={38}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: COLORS.textMuted,
                    fontFamily: 'monospace',
                  }}
                >
                  {Math.round(settings[param])}
                </span>
              </div>
            );
          })}
        </div>

        {/* HIGH-PASS FILTER */}
        <CollapsibleSection
          title="HIGH-PASS"
          enabled={settings.hpfEnabled}
          onToggle={() => updateSetting('hpfEnabled', !settings.hpfEnabled)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            <Knob
              value={settings.hpfCutoff}
              onChange={(v) => updateSetting('hpfCutoff', v)}
              size={38}
              min={20}
              max={1000}
            />
            <span
              style={{
                fontSize: 11,
                color: COLORS.text,
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              {Math.round(settings.hpfCutoff)} Hz
            </span>
          </div>
        </CollapsibleSection>

        {/* LOW-PASS FILTER */}
        <CollapsibleSection
          title="LOW-PASS"
          enabled={settings.lpfEnabled}
          onToggle={() => updateSetting('lpfEnabled', !settings.lpfEnabled)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            <Knob
              value={settings.lpfCutoff}
              onChange={(v) => updateSetting('lpfCutoff', v)}
              size={38}
              min={1000}
              max={20000}
            />
            <span
              style={{
                fontSize: 11,
                color: COLORS.text,
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              {settings.lpfCutoff >= 1000
                ? `${(settings.lpfCutoff / 1000).toFixed(1)}k Hz`
                : `${Math.round(settings.lpfCutoff)} Hz`}
            </span>
          </div>
        </CollapsibleSection>

        {/* COMPRESSOR */}
        <CollapsibleSection
          title="COMPRESSOR"
          enabled={settings.compEnabled}
          onToggle={() => updateSetting('compEnabled', !settings.compEnabled)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Row 1: Threshold, Ratio, Makeup */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              {[
                { key: 'compThreshold' as const, label: 'THRESH', min: -60, max: 0 },
                { key: 'compRatio' as const, label: 'RATIO', min: 1, max: 20 },
                { key: 'compMakeup' as const, label: 'MAKEUP', min: 0, max: 24 },
              ].map(({ key, label, min, max }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      color: COLORS.textMuted,
                      fontFamily: 'monospace',
                    }}
                  >
                    {label}
                  </span>
                  <Knob
                    value={settings[key]}
                    onChange={(v) => updateSetting(key, v)}
                    size={32}
                    min={min}
                    max={max}
                  />
                  <span
                    style={{
                      fontSize: 8,
                      color: COLORS.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    {key === 'compRatio'
                      ? `${settings[key].toFixed(1)}:1`
                      : Math.round(settings[key])}
                  </span>
                </div>
              ))}
            </div>
            {/* Row 2: Attack, Release */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              {[
                { key: 'compAttack' as const, label: 'ATTACK', min: 0.1, max: 100 },
                { key: 'compRelease' as const, label: 'RELEASE', min: 10, max: 1000 },
              ].map(({ key, label, min, max }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      color: COLORS.textMuted,
                      fontFamily: 'monospace',
                    }}
                  >
                    {label}
                  </span>
                  <Knob
                    value={settings[key]}
                    onChange={(v) => updateSetting(key, v)}
                    size={32}
                    min={min}
                    max={max}
                  />
                  <span
                    style={{
                      fontSize: 8,
                      color: COLORS.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    {Math.round(settings[key])} ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* LIMITER */}
        <CollapsibleSection
          title="LIMITER"
          enabled={settings.limEnabled}
          onToggle={() => updateSetting('limEnabled', !settings.limEnabled)}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
            }}
          >
            {[
              { key: 'limThreshold' as const, label: 'CEILING', min: -20, max: 0 },
              { key: 'limRelease' as const, label: 'RELEASE', min: 10, max: 1000 },
            ].map(({ key, label, min, max }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: COLORS.textMuted,
                    fontFamily: 'monospace',
                  }}
                >
                  {label}
                </span>
                <Knob
                  value={settings[key]}
                  onChange={(v) => updateSetting(key, v)}
                  size={32}
                  min={min}
                  max={max}
                />
                <span
                  style={{
                    fontSize: 8,
                    color: COLORS.text,
                    fontFamily: 'monospace',
                  }}
                >
                  {key === 'limThreshold'
                    ? `${Math.round(settings[key])} dB`
                    : `${Math.round(settings[key])} ms`}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    );
  }
);

PodcastDSPSection.displayName = 'PodcastDSPSection';

export default PodcastDSPSection;
