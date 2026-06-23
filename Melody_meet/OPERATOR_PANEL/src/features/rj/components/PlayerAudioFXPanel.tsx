import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerAudioFXPanelProps {
  isDarkMode?: boolean;
  colors?: any;
  onMasterVolumeChange?: (volume: number) => void;
  onCompressorChange?: (settings: CompressorSettings) => void;
  onLimiterChange?: (settings: LimiterSettings) => void;
  streamUrl?: string;
}

interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  makeup: number;
}

interface LimiterSettings {
  threshold: number;
  release: number;
  isOn: boolean;
}

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
  size?: number;
  formatValue?: (v: number) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOB
// ─────────────────────────────────────────────────────────────────────────────

const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
  size = 64,
  formatValue,
}) => {
  const dragging = useRef(false);
  const startY   = useRef(0);
  const startVal = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startY.current   = e.clientY;
      startVal.current = value;
      e.preventDefault();
    },
    [value],
  );

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) * ((max - min) / 150);
      let next = startVal.current + delta;
      next = Math.min(max, Math.max(min, next));
      onChange(Math.round(next * 10) / 10);
    };
    const up = () => { dragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
    };
  }, [onChange, min, max]);

  const cx  = size / 2;
  const cy  = size / 2;
  const rOuter = size / 2 - 4;

  const pct = (value - min) / (max - min);
  const startAngleDeg = -135;
  const endAngleDeg   = startAngleDeg + pct * 270;
  const toRad = (d: number) => (d * Math.PI) / 180;

  // ── Arc geometry (value indicator ring) ──
  const arcWidth = Math.max(3, size / 16);
  const arcR = rOuter;

  const arcStartX  = cx + arcR * Math.cos(toRad(startAngleDeg));
  const arcStartY  = cy + arcR * Math.sin(toRad(startAngleDeg));
  const arcEndAllX = cx + arcR * Math.cos(toRad(135));
  const arcEndAllY = cy + arcR * Math.sin(toRad(135));
  const arcEndX    = cx + arcR * Math.cos(toRad(endAngleDeg));
  const arcEndY    = cy + arcR * Math.sin(toRad(endAngleDeg));

  const fullLarge   = 1;
  const activeLarge = pct * 270 > 180 ? 1 : 0;

  // ── Knob body geometry ──
  const rCollar = arcR - arcWidth - 1;   // metal base collar
  const rBody   = rCollar * 0.93;        // fluted black body
  const rTop    = rBody * 0.8;           // flat top face
  const rFluteIn  = rBody * 0.8;
  const rFluteOut = rBody;

  const FLUTES = 24;
  const flutes = Array.from({ length: FLUTES }).map((_, i) => {
    const ang = (360 / FLUTES) * i;
    const rad = toRad(ang);
    const x1 = cx + rFluteIn  * Math.cos(rad);
    const y1 = cy + rFluteIn  * Math.sin(rad);
    const x2 = cx + rFluteOut * Math.cos(rad);
    const y2 = cy + rFluteOut * Math.sin(rad);
    return (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={i % 2 === 0 ? '#000000' : '#55555a'}
        strokeWidth={Math.max(1, size / 42)}
        strokeLinecap="round"
      />
    );
  });

  // ── Pointer (white indicator line) ──
  const pointerInner = rTop * 0.15;
  const pointerOuter = rTop * 0.95;
  const pRad = toRad(endAngleDeg);
  const px1 = cx + pointerInner * Math.cos(pRad);
  const py1 = cy + pointerInner * Math.sin(pRad);
  const px2 = cx + pointerOuter * Math.cos(pRad);
  const py2 = cy + pointerOuter * Math.sin(pRad);
  const pointerWidth = Math.max(2, size / 24);

  const displayValue = formatValue
    ? formatValue(value)
    : `${value.toFixed(unit === ':1' ? 1 : unit === 'ms' ? 0 : 1)} ${unit}`;

  const gid = `${label}-${size}`.replace(/\s/g, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        style={{ width: size, height: size, cursor: 'ns-resize', userSelect: 'none' }}
        onMouseDown={onMouseDown}
      >
        <svg width={size} height={size}>
          <defs>
            {/* Metal base collar gradient */}
            <radialGradient id={`collar-${gid}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%"   stopColor="#7a8190" />
              <stop offset="55%"  stopColor="#454b58" />
              <stop offset="100%" stopColor="#1c1f26" />
            </radialGradient>

            {/* Black fluted body gradient */}
            <radialGradient id={`body-${gid}`} cx="40%" cy="35%" r="70%">
              <stop offset="0%"   stopColor="#34343a" />
              <stop offset="55%"  stopColor="#1a1a1c" />
              <stop offset="100%" stopColor="#050505" />
            </radialGradient>

            {/* Glossy top face gradient */}
            <radialGradient id={`top-${gid}`} cx="36%" cy="26%" r="80%">
              <stop offset="0%"   stopColor="#55555c" />
              <stop offset="35%"  stopColor="#252528" />
              <stop offset="100%" stopColor="#040405" />
            </radialGradient>

            <filter id={`shadow-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Background arc track */}
          <path
            d={`M ${arcStartX} ${arcStartY} A ${arcR} ${arcR} 0 ${fullLarge} 1 ${arcEndAllX} ${arcEndAllY}`}
            fill="none"
            stroke="#1c2230"
            strokeWidth={arcWidth}
            strokeLinecap="round"
          />

          {/* Active arc (green) */}
          {pct > 0 && (
            <path
              d={`M ${arcStartX} ${arcStartY} A ${arcR} ${arcR} 0 ${activeLarge} 1 ${arcEndX} ${arcEndY}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth={arcWidth}
              strokeLinecap="round"
            />
          )}

          {/* Metal base collar */}
          <circle cx={cx} cy={cy} r={rCollar} fill={`url(#collar-${gid})`} filter={`url(#shadow-${gid})`} />

          {/* Fluted black body */}
          <circle cx={cx} cy={cy} r={rBody} fill={`url(#body-${gid})`} />

          {/* Flute ridges */}
          <g>{flutes}</g>

          {/* Flat glossy top */}
          <circle cx={cx} cy={cy} r={rTop} fill={`url(#top-${gid})`} />
          <circle cx={cx} cy={cy} r={rTop} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* White pointer line */}
          <line
            x1={px1} y1={py1} x2={px2} y2={py2}
            stroke="#ffffff"
            strokeWidth={pointerWidth}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <span style={{
        fontSize: 12, fontWeight: 600, color: '#9ba3b0',
        fontFamily: 'monospace', letterSpacing: 0.3, textAlign: 'center',
      }}>
        {label}
      </span>

      <span style={{ fontSize: 12, fontWeight: 700, color: '#e6edf3', fontFamily: 'monospace', textAlign: 'center' }}>
        {displayValue}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VU METER
// ─────────────────────────────────────────────────────────────────────────────

interface HVUMeterProps {
  label: string;
  level: number;
}

const HVUMeter: React.FC<HVUMeterProps> = ({ label, level }) => {
  const SEGMENTS = 40;

  const getSegColor = (i: number) => {
    const pct = ((i + 1) / SEGMENTS) * 100;
    const isLit = pct <= level;
    if (!isLit) return '#1a2230';
    if (pct > 90) return '#ef4444';
    if (pct > 72) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: 12, fontWeight: 700, color: '#c9d1d9',
        fontFamily: 'monospace', width: 12, textAlign: 'right', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 5, height: 14,
              backgroundColor: getSegColor(i),
              borderRadius: 1, flexShrink: 0,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', fontFamily: 'monospace', flexShrink: 0 }}>
        dB
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VU SCALE
// ─────────────────────────────────────────────────────────────────────────────

const VUScale: React.FC = () => {
  const labels = ['-60', '-50', '-40', '-30', '-20', '-10', '-5', '0'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 4, paddingLeft: 20,
    }}>
      <div style={{ position: 'relative', width: 40 * 7, height: 14, flexShrink: 0 }}>
        {labels.map((lbl) => {
          const db  = parseFloat(lbl);
          const pct = (db + 60) / 60;
          const leftPx = pct * (40 * 7 - 1);
          return (
            <span
              key={lbl}
              style={{
                position: 'absolute', left: leftPx,
                transform: 'translateX(-50%)',
                fontSize: 10, color: '#8b949e',
                fontFamily: 'monospace', fontWeight: 600,
              }}
            >
              {lbl}
            </span>
          );
        })}
      </div>
      <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'monospace', fontWeight: 600 }}>
        dB
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────────────────────────────────────

export const PlayerAudioFXPanel: React.FC<PlayerAudioFXPanelProps> = ({
  onMasterVolumeChange,
  onCompressorChange,
  onLimiterChange,
}) => {
  const [isLive,       setIsLive]       = useState(false);
  const [masterVolume, setMasterVolume] = useState(-3.2);
  const [compressor,   setCompressor]   = useState<CompressorSettings>({
    threshold: -18,
    ratio:      3.0,
    attack:    10,
    release:  120,
    makeup:    2.0,
  });
  const [limiter, setLimiter] = useState<LimiterSettings>({
    threshold: -1.0,
    release:   80,
    isOn:      true,
  });
  const [vuLeft,  setVuLeft]  = useState(0);
  const [vuRight, setVuRight] = useState(0);

  // Animate VU meters only when live
  useEffect(() => {
    if (!isLive) {
      setVuLeft(0);
      setVuRight(0);
      return;
    }
    const id = setInterval(() => {
      setVuLeft (p => Math.min(97, Math.max(10, p + (Math.random() - 0.48) * 12)));
      setVuRight(p => Math.min(97, Math.max(10, p + (Math.random() - 0.48) * 12)));
    }, 110);
    return () => clearInterval(id);
  }, [isLive]);

  const handleMasterVolumeChange = (v: number) => {
    setMasterVolume(v);
    onMasterVolumeChange?.(v);
  };

  const handleComp = (key: keyof CompressorSettings, v: number) => {
    const next = { ...compressor, [key]: v };
    setCompressor(next);
    onCompressorChange?.(next);
  };

  const handleLim = (key: keyof LimiterSettings, v: number | boolean) => {
    const next = { ...limiter, [key]: v } as LimiterSettings;
    setLimiter(next);
    onLimiterChange?.(next);
  };

  const bg      = '#0d1117';
  const surface = '#161b22';
  const border  = '#21262d';
  const textPri = '#f0f6fc';
  const textMut = '#8b949e';

  const sectionStyle: React.CSSProperties = {
    backgroundColor: surface,
    borderRadius: 8,
    padding: '14px 18px',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: textMut,
    letterSpacing: 0.8,
    marginBottom: 14,
    display: 'block',
  };

  return (
    <div style={{
      backgroundColor: bg,
      borderRadius: 12,
      border: `1px solid ${border}`,
      overflow: 'hidden',
      marginTop: 16,
      fontFamily: 'monospace',
    }}>

      {/* ══ HEADER ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: `1px solid ${border}`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: textPri, letterSpacing: 0.5 }}>
          MASTER OUTPUT
        </span>
        <span style={{ fontSize: 11, color: isLive ? '#22c55e' : '#6b7280', marginLeft: 4 }}>●</span>
        <span style={{ fontSize: 11, color: textMut }}>{isLive ? 'Live' : 'Offline'}</span>

        {/* GO LIVE / STOP button */}
        <button
          onClick={() => setIsLive(v => !v)}
          style={{
            marginLeft: 10,
            padding: '5px 14px',
            borderRadius: 5,
            border: 'none',
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.5,
            backgroundColor: isLive ? '#22c55e' : '#374151',
            color: isLive ? '#fff' : '#9ca3af',
            transition: 'background 0.2s',
          }}
        >
          {isLive ? 'STOP' : 'GO LIVE'}
        </button>
      </div>

      {/* ══ SINGLE ROW: COMPRESSOR + LIMITER + MASTER VOLUME ══ */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        gap: 12, padding: '14px', flexWrap: 'nowrap',
        overflowX: 'auto',
      }}>

        {/* ── COMPRESSOR ── */}
        <div style={{ ...sectionStyle, flex: '0 0 auto' }}>
          <span style={sectionLabel}>COMPRESSOR</span>
          <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
            <Knob label="Threshold" value={compressor.threshold} min={-40} max={0}   unit="dB"  onChange={v => handleComp('threshold', v)} formatValue={v => `${v.toFixed(0)} dB`} />
            <Knob label="Ratio"     value={compressor.ratio}     min={1}   max={20}  unit=":1"  onChange={v => handleComp('ratio', v)}     formatValue={v => `${v.toFixed(1)}:1`} />
            <Knob label="Attack"    value={compressor.attack}    min={0}   max={100} unit="ms"  onChange={v => handleComp('attack', v)}    formatValue={v => `${v.toFixed(0)} ms`} />
            <Knob label="Release"   value={compressor.release}   min={10}  max={500} unit="ms"  onChange={v => handleComp('release', v)}   formatValue={v => `${v.toFixed(0)} ms`} />
            <Knob label="Makeup"    value={compressor.makeup}    min={0}   max={12}  unit="dB"  onChange={v => handleComp('makeup', v)}    formatValue={v => `${v.toFixed(1)} dB`} />
          </div>
        </div>

        {/* ── LIMITER ── */}
        <div style={{ ...sectionStyle, flex: '0 0 auto' }}>
          <span style={sectionLabel}>LIMITER</span>
          <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
            <Knob label="Threshold" value={limiter.threshold} min={-12} max={0}   unit="dB" onChange={v => handleLim('threshold', v)} formatValue={v => `${v.toFixed(1)} dB`} />
            <Knob label="Release"   value={limiter.release}   min={10}  max={500} unit="ms" onChange={v => handleLim('release', v)}   formatValue={v => `${v.toFixed(0)} ms`} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 4 }}>
              <button
                onClick={() => handleLim('isOn', !limiter.isOn)}
                style={{
                  width: 44, height: 44, borderRadius: 6, border: 'none',
                  backgroundColor: limiter.isOn ? '#ef4444' : '#374151',
                  color: '#fff', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 0.5,
                }}
              >
                {limiter.isOn ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>

        {/* ── MASTER VOLUME ── */}
        <div style={{ ...sectionStyle, flex: '1 1 520px', minWidth: 520 }}>
          <span style={sectionLabel}>MASTER VOLUME</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <Knob
              label="Volume"
              value={masterVolume}
              min={-60}
              max={6}
              unit="dB"
              onChange={handleMasterVolumeChange}
              size={92}
              formatValue={v => `${v.toFixed(1)} dB`}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
              <VUScale />
              <HVUMeter label="L" level={vuLeft}  />
              <HVUMeter label="R" level={vuRight} />
            </div>
          </div>
        </div>

      </div>

      {/* ══ FOOTER — Server status only ══ */}
      <div style={{
        backgroundColor: surface,
        borderTop: `1px solid ${border}`,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ color: isLive ? '#22c55e' : '#6b7280', fontSize: 10 }}>●</span>
        <span style={{ fontSize: 11, color: textMut }}>
          Server: {isLive ? 'Connected' : 'Offline'}
        </span>
      </div>

    </div>
  );
};

export default PlayerAudioFXPanel;