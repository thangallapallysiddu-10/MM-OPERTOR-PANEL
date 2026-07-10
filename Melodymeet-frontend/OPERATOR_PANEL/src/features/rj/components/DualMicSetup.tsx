import { useState, useRef, useEffect, useCallback } from "react";
import { useSoloManager } from '../../shared/hooks/useSoloManager';
import { audio } from '../../../services/audio';

const C = {
  bg: "#080c14",
  strip: "#0d1119",
  stripBorder: "#1a2235",
  onAirGreen: "#16a34a",
  onAirGreenHover: "#15803d",
  offlineGray: "#374151",
  inputBg: "#1a2235",
  inputBorder: "#2d3f5c",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  textLight: "#cbd5e1",
  cyan: "#00d4ff",
  soloBg: "#1a2235",
  soloBorder: "#374151",
  soloActive: "#1a1200",
  soloActiveBorder: "#d97706",
  soloActiveText: "#fbbf24",
  muteDefault: "#ef4444",
  muteActive: "#7f1d1d",
  faderBg: "#0a0e18",
  faderGroove: "#2d3f5c",
  faderHandle: "#c0cad8",
  faderHandleBorder: "#8a94a4",
  barGreen: "#22c55e",
  barAmber: "#ca8a04",
  barRed: "#b91c1c",
  barGhostGreen: "#0a2e10",
  barGhostAmber: "#2e1a04",
  barGhostRed: "#2e0808",
  dashColor: "#9ca3af",
};

const NUM_BARS = 28, BAR_H = 5, BAR_GAP = 2;
const METER_H = NUM_BARS * (BAR_H + BAR_GAP);
const HANDLE_H = 36, HANDLE_W = 28;
const INPUT_OPTIONS = ["Input 1","Input 2","Input 3","Input 4","Call In 1","Call In 2"];
const SCALE_LABELS = ["10","5","0","-5","-10","-15","-20","-30","-40","-60"];

type Channel = {
  id: number;
  label: string;
  name: string;
  input: string;
  isOnAir: boolean;
  gain: number;
  hi: number;
  mid: number;
  low: number;
  fader: number;
  muted: boolean;
  soloed: boolean;
  vuL: number;
  vuR: number;
  compEnabled: boolean;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  compMakeupGain: number;
  limEnabled: boolean;
  limThreshold: number;
  limRelease: number;
  connected?: boolean;
  clipped?: boolean;
  rms?: number;
  noiseFloor?: number;
  signalPresent?: boolean;
};

type ChannelChanges = Partial<Channel>;

const DEFAULT_CHANNELS: Channel[] = [
  {id:1,label:"1. RJ Mic 1",     name:"Mamatha",       input:"Input 1",  isOnAir:true,  gain:45, hi:50, mid:50, low:50, fader:60, muted:false, soloed:false, vuL:0, vuR:0, compEnabled: true, compThreshold: -15, compRatio: 3, compAttack: 10, compRelease: 100, compMakeupGain: 2, limEnabled: true, limThreshold: -1.0, limRelease: 80},
  {id:2,label:"2. Guest Mic 1",  name:"Leo",         input:"Input 2",  isOnAir:false, gain:35, hi:50, mid:50, low:50, fader:58, muted:false, soloed:false, vuL:0, vuR:0, compEnabled: true, compThreshold: -15, compRatio: 3, compAttack: 10, compRelease: 100, compMakeupGain: 2, limEnabled: true, limThreshold: -1.0, limRelease: 80},
  {id:3,label:"3. Guest Mic 2",  name:"Riya",        input:"Input 3",  isOnAir:false, gain:50, hi:50, mid:50, low:50, fader:65, muted:false, soloed:false, vuL:0, vuR:0, compEnabled: true, compThreshold: -15, compRatio: 3, compAttack: 10, compRelease: 100, compMakeupGain: 2, limEnabled: true, limThreshold: -1.0, limRelease: 80},
  {id:4,label:"4. Guest Mic 3",  name:"Arjun",       input:"Input 4",  isOnAir:false, gain:40, hi:50, mid:50, low:50, fader:60, muted:false, soloed:false, vuL:0, vuR:0, compEnabled: true, compThreshold: -15, compRatio: 3, compAttack: 10, compRelease: 100, compMakeupGain: 2, limEnabled: true, limThreshold: -1.0, limRelease: 80},
  {id:5,label:"5. Call-in Mic 1",name:"Live Caller", input:"Call In 1",isOnAir:false, gain:55, hi:50, mid:50, low:50, fader:68, muted:false, soloed:false, vuL:0, vuR:0, compEnabled: true, compThreshold: -15, compRatio: 3, compAttack: 10, compRelease: 100, compMakeupGain: 2, limEnabled: true, limThreshold: -1.0, limRelease: 80},
];

// ── KNOB ──────────────────────────────────────────────────────────────────────
function Knob({ value, onChange, size = 44 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    e.preventDefault();
    e.stopPropagation();
  }, [value]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) / 1.5;
      onChange(Math.min(100, Math.max(0, startVal.current + delta)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onChange]);

  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 2;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const MIN = -135, MAX = 135;
  const ang = MIN + (value / 100) * (MAX - MIN);

  const arcWidth = Math.max(2, size / 16);
  const arcR = rOuter;

  const ax1 = cx + arcR * Math.cos(toRad(MIN - 90));
  const ay1 = cy + arcR * Math.sin(toRad(MIN - 90));
  const axAll = cx + arcR * Math.cos(toRad(MAX - 90));
  const ayAll = cy + arcR * Math.sin(toRad(MAX - 90));
  const ax2 = cx + arcR * Math.cos(toRad(ang - 90));
  const ay2 = cy + arcR * Math.sin(toRad(ang - 90));
  const lg = (ang - MIN) > 180 ? 1 : 0;

  const rCollar = arcR - arcWidth - 1;
  const rBody   = rCollar * 0.93;
  const rTop    = rBody * 0.8;
  const rFluteIn  = rBody * 0.8;
  const rFluteOut = rBody;

  const FLUTES = size < 44 ? 18 : 24;
  const flutes = Array.from({ length: FLUTES }).map((_, i) => {
    const a = (360 / FLUTES) * i;
    const rad = toRad(a);
    const x1 = cx + rFluteIn  * Math.cos(rad);
    const y1 = cy + rFluteIn  * Math.sin(rad);
    const x2 = cx + rFluteOut * Math.cos(rad);
    const y2 = cy + rFluteOut * Math.sin(rad);
    return (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={i % 2 === 0 ? "#000000" : "#55555a"}
        strokeWidth={Math.max(1, size / 42)}
        strokeLinecap="round"
      />
    );
  });

  const pointerInner = rTop * 0.15;
  const pointerOuter = rTop * 0.95;
  const pRad = toRad(ang - 90);
  const px1 = cx + pointerInner * Math.cos(pRad);
  const py1 = cy + pointerInner * Math.sin(pRad);
  const px2 = cx + pointerOuter * Math.cos(pRad);
  const py2 = cy + pointerOuter * Math.sin(pRad);
  const pointerWidth = Math.max(1.5, size / 24);

  const gid = `knob-grad-${size}-${Math.round(value)}`;

  return (
    <svg
      width={size} height={size}
      style={{ cursor: "ns-resize", userSelect: "none", flexShrink: 0, display: "block" }}
      onMouseDown={onMouseDown}
    >
      <defs>
        <radialGradient id={`collar-${gid}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%"   stopColor="#7a8190" />
          <stop offset="55%"  stopColor="#454b58" />
          <stop offset="100%" stopColor="#1c1f26" />
        </radialGradient>
        <radialGradient id={`body-${gid}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#34343a" />
          <stop offset="55%"  stopColor="#1a1a1c" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <radialGradient id={`top-${gid}`} cx="36%" cy="26%" r="80%">
          <stop offset="0%"   stopColor="#55555c" />
          <stop offset="35%"  stopColor="#252528" />
          <stop offset="100%" stopColor="#040405" />
        </radialGradient>
        <filter id={`shadow-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      <path
        d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 1 1 ${axAll} ${ayAll}`}
        fill="none" stroke="#1e2a3a" strokeWidth={arcWidth} strokeLinecap="round"
      />
      {value > 0 && (
        <path
          d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 ${lg} 1 ${ax2} ${ay2}`}
          fill="none" stroke={C.cyan} strokeWidth={arcWidth} strokeLinecap="round"
        />
      )}
      <circle cx={cx} cy={cy} r={rCollar} fill={`url(#collar-${gid})`} filter={`url(#shadow-${gid})`} />
      <circle cx={cx} cy={cy} r={rBody} fill={`url(#body-${gid})`} />
      <g>{flutes}</g>
      <circle cx={cx} cy={cy} r={rTop} fill={`url(#top-${gid})`} />
      <circle cx={cx} cy={cy} r={rTop} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <line
        x1={px1} y1={py1} x2={px2} y2={py2}
        stroke="#ffffff"
        strokeWidth={pointerWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── VU BARS ───────────────────────────────────────────────────────────────────
function VuBars({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: BAR_GAP }}>
      {Array.from({ length: NUM_BARS }).map((_, i) => {
        const pct = ((NUM_BARS - 1 - i) / (NUM_BARS - 1)) * 100;
        let color: string;
        const isRed   = pct > 85;
        const isAmber = pct > 60 && pct <= 85;

        if (pct <= level) {
          if (isRed)        color = C.barRed;
          else if (isAmber) color = C.barAmber;
          else              color = C.barGreen;
        } else {
          if (isRed)        color = C.barGhostRed;
          else if (isAmber) color = C.barGhostAmber;
          else              color = C.barGhostGreen;
        }

        return (
          <div
            key={i}
            style={{ width: 11, height: BAR_H, borderRadius: 1, backgroundColor: color, flexShrink: 0 }}
          />
        );
      })}
    </div>
  );
}

// ── SCALE COL WITH DASHES ─────────────────────────────────────────────────────
function ScaleCol({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <div style={{
      height: METER_H,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: side === "left" ? "flex-end" : "flex-start",
      minWidth: 34,
      flexShrink: 0,
    }}>
      {SCALE_LABELS.map((v, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexDirection: side === "left" ? "row" : "row-reverse",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e7eb", fontFamily: "monospace", lineHeight: "8px" }}>{v}</span>
          {/* Visible white tick dash */}
          <div style={{
            width: 8,
            height: 1.5,
            backgroundColor: "#9ca3af",
            borderRadius: 1,
            flexShrink: 0,
          }} />
        </div>
      ))}
    </div>
  );
}

// ── FADER — simple rectangle with top/bottom halves like reference ─────────────
function Fader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    e.preventDefault();
    e.stopPropagation();
  }, [value]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dy = e.clientY - startY.current;
      const delta = -(dy / METER_H) * 100;
      onChange(Math.min(100, Math.max(0, startVal.current + delta)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onChange]);

  const travel = METER_H - HANDLE_H - 4;
  const bottom = (value / 100) * travel;
  const totalW = HANDLE_W + 16;

  return (
    <div style={{ width: totalW, height: METER_H, position: "relative", flexShrink: 0 }}>
      {/* Dark thick track */}
      <div style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 0, bottom: 0,
        width: 5,
        backgroundColor: "#1a1f28",
        borderRadius: 3,
        boxShadow: "inset 0 0 4px rgba(0,0,0,0.9)",
      }} />

      {/* Fader handle — plain rectangle, top half dark-grey, bottom half light-grey */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          bottom: bottom + 2,
          left: "50%",
          transform: "translateX(-50%)",
          width: HANDLE_W + 10,
          height: HANDLE_H,
          borderRadius: 3,
          cursor: "ns-resize",
          userSelect: "none",
          border: "1px solid #555b65",
          overflow: "hidden",
          boxShadow: "0 3px 8px rgba(0,0,0,0.8)",
        }}
      >
        {/* Top half — darker */}
        <div style={{
          height: "50%",
          background: "linear-gradient(180deg, #6e757e 0%, #9ca3ac 100%)",
        }} />
        {/* Divider line */}
        <div style={{ height: 1.5, backgroundColor: "#3a3f48" }} />
        {/* Bottom half — lighter */}
        <div style={{
          height: "50%",
          background: "linear-gradient(180deg, #d0d5db 0%, #f0f2f4 100%)",
        }} />
      </div>
    </div>
  );
}

// ── CHANNEL STRIP ─────────────────────────────────────────────────────────────
function ChannelStrip({ 
  ch, 
  onChange, 
  availableDevices, 
  soloManager 
}: { 
  ch: Channel; 
  onChange: (c: ChannelChanges) => void; 
  availableDevices?: string[];
  soloManager: ReturnType<typeof useSoloManager>;
}) {
  const upd = (c: ChannelChanges) => onChange(c);
  const isMic1 = ch.id === 1;
  const bottomLabel = ch.label.replace(/^\d+\.\s*/, "");

  const [compExpanded, setCompExpanded] = useState(false);
  const [limExpanded, setLimExpanded] = useState(false);

  return (
    <div style={{
      flex: 1,
      backgroundColor: C.strip,
      border: `1px solid ${C.stripBorder}`,
      borderRadius: 10,
      padding: "14px 12px 12px",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{ch.label}</div>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>({ch.name})</div>
      </div>

      {/* ON AIR + INPUT ROW */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => upd({ isOnAir: !ch.isOnAir })}
          style={{
            backgroundColor: ch.isOnAir ? C.onAirGreen : C.offlineGray,
            border: "none",
            padding: "6px 10px",
            borderRadius: 4,
            flexShrink: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div style={{
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: ch.isOnAir ? "#ffffff" : "#9ca3af",
            boxShadow: ch.isOnAir ? "0 0 5px #ffffff" : "none",
          }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>
            {ch.isOnAir ? "ON AIR" : "OFF AIR"}
          </span>
        </button>
        <div style={{ flex: 1, position: "relative" }}>
          <select
            value={ch.input}
            onChange={e => upd({ input: e.target.value })}
            style={{
              width: "100%",
              backgroundColor: C.inputBg,
              border: `1px solid ${C.inputBorder}`,
              borderRadius: 5,
              padding: "5px 22px 5px 8px",
              fontSize: 10,
              color: ch.input === "Unassigned" ? C.offlineGray : C.textLight,
              fontFamily: "monospace",
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
              outline: "none",
            }}
          >
            {(() => {
              const opts = availableDevices?.length ? availableDevices : INPUT_OPTIONS;
              if (!opts.includes("Unassigned")) {
                return ["Unassigned", ...opts];
              }
              return opts;
            })().map(opt => (
              <option key={opt} value={opt} style={{ backgroundColor: "#1a2235" }}>{opt}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: C.textMuted, pointerEvents: "none" }}>▼</span>
        </div>
      </div>

      {/* GAIN */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: C.textLight, fontFamily: "monospace", minWidth: 28 }}>GAIN</span>
        <Knob value={ch.gain} onChange={v => upd({ gain: v })} size={48} />
        <span style={{ fontSize: 15, color: C.text, fontFamily: "monospace", fontWeight: 700, minWidth: 36 }}>
          {Math.round(ch.gain)}%
        </span>
      </div>

      {/* HI / MID / LOW */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        {(["hi","mid","low"] as const).map(band => (
          <div key={band} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: C.textLight, fontFamily: "monospace" }}>{band.toUpperCase()}</span>
            <Knob value={ch[band]} onChange={v => upd({ [band]: v } as ChannelChanges)} size={38} />
          </div>
        ))}
      </div>

      {/* COMPRESSOR */}
      <div style={{ marginBottom: 12, borderTop: `1px solid ${C.stripBorder}`, paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compExpanded ? 10 : 0 }}>
          <div 
            onClick={() => setCompExpanded(!compExpanded)} 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 4 }}
          >
            <span style={{ fontSize: 9, color: C.textLight }}>{compExpanded ? '▼' : '▶'}</span>
            <span style={{ fontSize: 10, color: C.textLight, fontFamily: 'monospace', fontWeight: 700 }}>COMPRESSOR</span>
          </div>
          <button 
             onClick={() => upd({ compEnabled: !ch.compEnabled })}
             style={{
               fontSize: 9, padding: '2px 8px', borderRadius: 4, 
               backgroundColor: ch.compEnabled ? C.onAirGreen : C.offlineGray,
               color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700
             }}
          >
            {ch.compEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {compExpanded && (
          <>
            {/* ROW 1: Threshold, Ratio, Makeup */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, opacity: ch.compEnabled ? 1 : 0.4 }}>
               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                 <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>THRESH</span>
                 <Knob value={((ch.compThreshold + 40) / 40) * 100} onChange={v => upd({ compThreshold: -40 + (v / 100) * 40 })} size={32} />
               <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{ch.compThreshold.toFixed(1)} dB</span>
             </div>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
             <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>RATIO</span>
             <Knob value={((ch.compRatio - 1) / 19) * 100} onChange={v => upd({ compRatio: 1 + (v / 100) * 19 })} size={32} />
             <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{ch.compRatio.toFixed(1)}:1</span>
           </div>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
             <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>MAKEUP</span>
             <Knob value={(ch.compMakeupGain / 12) * 100} onChange={v => upd({ compMakeupGain: (v / 100) * 12 })} size={32} />
             <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{ch.compMakeupGain.toFixed(1)} dB</span>
           </div>
        </div>

        {/* ROW 2: Attack, Release */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, opacity: ch.compEnabled ? 1 : 0.4 }}>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
             <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>ATTACK</span>
             <Knob value={(ch.compAttack / 100) * 100} onChange={v => upd({ compAttack: (v / 100) * 100 })} size={32} />
             <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{Math.round(ch.compAttack)} ms</span>
           </div>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
             <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>RELEASE</span>
             <Knob value={((ch.compRelease - 10) / 490) * 100} onChange={v => upd({ compRelease: 10 + (v / 100) * 490 })} size={32} />
             <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{Math.round(ch.compRelease)} ms</span>
           </div>
        </div>
        </>
        )}
      </div>

      {/* LIMITER */}
      <div style={{ marginBottom: 12, borderTop: `1px solid ${C.stripBorder}`, paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: limExpanded ? 10 : 0 }}>
          <div 
            onClick={() => setLimExpanded(!limExpanded)} 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 4 }}
          >
            <span style={{ fontSize: 9, color: C.textLight }}>{limExpanded ? '▼' : '▶'}</span>
            <span style={{ fontSize: 10, color: C.textLight, fontFamily: 'monospace', fontWeight: 700 }}>LIMITER</span>
          </div>
          <button 
             onClick={() => upd({ limEnabled: !ch.limEnabled })}
             style={{
               fontSize: 9, padding: '2px 8px', borderRadius: 4, 
               backgroundColor: ch.limEnabled ? '#ef4444' : C.offlineGray,
               color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700
             }}
          >
            {ch.limEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {limExpanded && (
        <div style={{ display: "flex", justifyContent: "center", gap: 20, opacity: ch.limEnabled ? 1 : 0.4 }}>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
             <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>CEILING</span>
             <Knob value={((ch.limThreshold + 12) / 12) * 100} onChange={v => upd({ limThreshold: -12 + (v / 100) * 12 })} size={32} />
             <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{ch.limThreshold.toFixed(1)} dB</span>
           </div>
           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
             <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>RELEASE</span>
             <Knob value={((ch.limRelease - 10) / 490) * 100} onChange={v => upd({ limRelease: 10 + (v / 100) * 490 })} size={32} />
             <span style={{ fontSize: 9, color: C.textLight, fontFamily: "monospace" }}>{Math.round(ch.limRelease)} ms</span>
           </div>
        </div>
        )}
      </div>

        {/* HEALTH METRICS */}
        <div style={{ marginBottom: 12, padding: '8px', backgroundColor: '#1a1f28', borderRadius: 6, border: `1px solid ${C.stripBorder}` }}>
          <div style={{ fontSize: 9, color: C.textLight, fontFamily: 'monospace', fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>HEALTH</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace', marginBottom: 2 }}>
            <span style={{ color: C.textMuted }}>Connected</span>
            <span style={{ color: ch.connected ? C.onAirGreen : '#ef4444' }}>{ch.connected ? 'YES' : 'NO'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace', marginBottom: 2 }}>
            <span style={{ color: C.textMuted }}>Signal</span>
            <span style={{ color: ch.signalPresent ? C.onAirGreen : C.offlineGray }}>{ch.signalPresent ? 'PRESENT' : 'NONE'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace', marginBottom: 2 }}>
            <span style={{ color: C.textMuted }}>Clip</span>
            <span style={{ color: ch.clipped ? '#ef4444' : C.onAirGreen }}>{ch.clipped ? 'CLIPPED' : 'CLEAN'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace' }}>
            <span style={{ color: C.textMuted }}>Noise Fl.</span>
            <span style={{ color: C.textLight }}>
              {(ch.noiseFloor ?? 0) > 0 ? (20 * Math.log10(ch.noiseFloor!)).toFixed(1) + ' dB' : '-'}
            </span>
          </div>
        </div>

      {/* SOLO / MUTE */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => {
            console.log('[RJ SOLO BUTTON] Clicked for micIndex', ch.id - 1);
            // RJ mics are: ch.id 1-5 → micIndex 0-4
            soloManager.toggleSolo({ type: 'microphone', index: ch.id - 1 });
            // Update UI state to reflect solo
            upd({ soloed: !ch.soloed });
          }}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 6, cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "monospace",
            backgroundColor: ch.soloed ? C.soloActive : C.soloBg,
            border: `1px solid ${ch.soloed ? C.soloActiveBorder : C.soloBorder}`,
            color: ch.soloed ? C.soloActiveText : "#d1d5db",
          }}
        >Solo</button>
        <button
          onClick={() => upd({ muted: !ch.muted })}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 6, cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "monospace",
            backgroundColor: ch.muted ? C.muteActive : "transparent",
            border: `1.5px solid ${C.muteDefault}`,
            color: ch.muted ? "#fca5a5" : C.muteDefault,
          }}
        >Mute</button>
      </div>

      {/* FADER + SCALE + VU METERS + BOTTOM LABEL — all in one column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
          {/* Left scale — numbers + dashes pointing right toward fader */}
          <ScaleCol side="left" />
          <Fader value={ch.fader} onChange={v => upd({ fader: v })} />
          {/* Right scale — dashes pointing left toward fader, numbers right toward VU */}
          <ScaleCol side="right" />
          <div style={{ display: "flex", gap: 3, marginLeft: 2 }}>
            <VuBars level={ch.muted ? 0 : (ch.volume ?? 0)} />
            <VuBars level={ch.muted ? 0 : (ch.volume ?? 0)} />
          </div>
        </div>

        {/* BOTTOM LABEL — centered under entire row */}
        <div style={{
          textAlign: "center",
          marginTop: 10,
          fontSize: 13,
          color: "#e5e7eb",
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.04em",
          width: "100%",
        }}>
          {bottomLabel}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
type DualMicSetupProps = {
  channels?: Channel[];
  onChannelChange?: (id: number, changes: ChannelChanges) => void;
  availableDevices?: string[];
};

export default function DualMicSetup({ channels: extChannels, onChannelChange: extChange, availableDevices }: DualMicSetupProps) {
  const [channels, setChannels] = useState<Channel[]>(extChannels || DEFAULT_CHANNELS);
  const soloManager = useSoloManager();

  useEffect(() => {
    if (!extChannels) return;

    setChannels(prev => extChannels.map(incoming => {
      const current = prev.find(ch => ch.id === incoming.id);
      return {
        ...(current || incoming),
        label: incoming.label,
        name: incoming.name,
        input: incoming.input,
        isOnAir: incoming.isOnAir,
        muted: incoming.muted,
        vuL: incoming.vuL,
        vuR: incoming.vuR,
      };
    }));
  }, [extChannels]);

  const handleChange = useCallback((id: number, changes: ChannelChanges) => {
    setChannels(prev => prev.map(ch => ch.id !== id ? ch : { ...ch, ...changes }));
    extChange?.(id, changes);
    
    const micIndex = id - 1; // ch.id 1-5 → micIndex 0-4
    
    // Wire gain knob changes to audio engine
    if (changes.gain !== undefined) {
      console.log('[RJ MIC GAIN KNOB] Setting gain for micIndex', micIndex, 'to', changes.gain / 100);
      audio.setMicrophoneGainByIndex(micIndex, changes.gain / 100).catch((err) => {
        console.error('[RJ MIC GAIN ERROR]', err);
      });
    }
    
    // Wire fader changes to audio engine (controls same gain parameter)
    // In professional mixers: gain=input sensitivity, fader=channel level
    // Since we only have one gain parameter, fader also controls it
    if (changes.fader !== undefined) {
      console.log('[RJ MIC FADER] Setting gain for micIndex', micIndex, 'to', changes.fader / 100);
      audio.setMicrophoneGainByIndex(micIndex, changes.fader / 100).catch((err) => {
        console.error('[RJ MIC FADER ERROR]', err);
      });
    }
  }, [extChange]);

  return (
    <div style={{
      backgroundColor: C.bg,
      padding: 12,
      borderRadius: 12,
      border: "1px solid #1a2235",
      overflowX: "hidden",
      width: "100%",
    }}>
      <div style={{ display: "flex", flexDirection: "row", gap: 8, width: "100%" }}>
        {channels.map(ch => (
          <ChannelStrip 
            key={ch.id} 
            ch={ch} 
            availableDevices={availableDevices} 
            onChange={changes => handleChange(ch.id, changes)}
            soloManager={soloManager}
          />
        ))}
      </div>
    </div>
  );
}
