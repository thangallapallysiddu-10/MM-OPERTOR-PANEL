import { useState, useRef, useEffect, useCallback } from "react";

// ── COLORS ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#080c14",
  strip: "#0d1119",
  stripBorder: "#1a2235",
  onAirGreen: "#16a34a",
  waitingAmber: "#92400e",
  waitingText: "#fbbf24",
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
  barGreen: "#22c55e",
  barAmber: "#ca8a04",
  barRed: "#b91c1c",
  barGhostGreen: "#0a2e10",
  barGhostAmber: "#2e1a04",
  barGhostRed: "#2e0808",
};

const NUM_BARS = 28, BAR_H = 5, BAR_GAP = 2;
const METER_H = NUM_BARS * (BAR_H + BAR_GAP);
const HANDLE_H = 36, HANDLE_W = 28;
const SCALE_LABELS = ["10","5","0","-5","-10","-15","-20","-30","-40","-60"];

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Status = "active" | "waiting" | "offline";
type SlotId = "mic1" | "mic2" | "mic3" | "mic4" | "mic5" | "mic6";

type Channel = {
  id: number;
  slotId: SlotId;
  label: string;
  name: string;
  status: Status;
  gain: number;
  hi: number;
  mid: number;
  low: number;
  fader: number;
  muted: boolean;
  soloed: boolean;
  vuL: number;
  vuR: number;
  hasLink: boolean;
  guestName: string | null;
};

type ChannelChanges = Partial<Channel>;

function buildGuestLink(roomLink: string, slotId: SlotId): string {
  const PROD_URL = "https://operator-panel-tan.vercel.app";
  const base = typeof window !== "undefined" ? window.location.origin : PROD_URL;
  
  const roomIdMatch = roomLink.match(/roomId=([A-Z0-9]+)/i);
  const roomId = roomIdMatch ? roomIdMatch[1] : 'ROOM123';

  return `${base}/podcast/guest/${slotId}/${roomId}`;
}
// ── DEFAULT CHANNELS ──────────────────────────────────────────────────────────
const makeDefaultChannels = (roomLink: string): Channel[] => [
  {
    id: 1, slotId: "mic1", label: "1. Host Mic", name: "RJ Sidhu",
    status: "active",
    gain: 60, hi: 50, mid: 50, low: 50, fader: 62,
    muted: false, soloed: false, vuL: 0, vuR: 0,
    hasLink: false, guestName: null,
  },
  {
    id: 2, slotId: "mic2", label: "2. Guest Mic 1", name: "Guest Slot 1",
    status: "offline",
    gain: 0, hi: 50, mid: 50, low: 50, fader: 58,
    muted: true, soloed: false, vuL: 0, vuR: 0,
    hasLink: true, guestName: null,
  },
  {
    id: 3, slotId: "mic3", label: "3. Guest Mic 2", name: "Guest Slot 2",
    status: "offline",
    gain: 0, hi: 50, mid: 50, low: 50, fader: 65,
    muted: true, soloed: false, vuL: 0, vuR: 0,
    hasLink: true, guestName: null,
  },
  {
    id: 4, slotId: "mic4", label: "4. Remote Guest 1", name: "Guest Slot 3",
    status: "offline",
    gain: 0, hi: 50, mid: 50, low: 50, fader: 60,
    muted: true, soloed: false, vuL: 0, vuR: 0,
    hasLink: true, guestName: null,
  },
  {
    id: 5, slotId: "mic5", label: "5. Remote Guest 2", name: "Guest Slot 4",
    status: "offline",
    gain: 0, hi: 50, mid: 50, low: 50, fader: 58,
    muted: true, soloed: false, vuL: 0, vuR: 0,
    hasLink: true, guestName: null,
  },
  {
    id: 6, slotId: "mic6", label: "6. Call-in Guest", name: "Call-in Slot",
    status: "offline",
    gain: 0, hi: 50, mid: 50, low: 50, fader: 55,
    muted: true, soloed: false, vuL: 0, vuR: 0,
    hasLink: true, guestName: null,
  },
];

// ── KNOB ─────────────────────────────────────────────────────────────────────
let _knobUid = 0;
function Knob({ value, onChange, size = 44 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const uid = useRef(`k${_knobUid++}`).current;
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
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [onChange]);

  const cx = size / 2, cy = size / 2;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const rOuter = size / 2 - 2, arcWidth = Math.max(2, size / 16), arcR = rOuter;
  const MIN = -135, MAX = 135, ang = MIN + (value / 100) * (MAX - MIN);
  const ax1 = cx + arcR * Math.cos(toRad(MIN - 90)), ay1 = cy + arcR * Math.sin(toRad(MIN - 90));
  const axAll = cx + arcR * Math.cos(toRad(MAX - 90)), ayAll = cy + arcR * Math.sin(toRad(MAX - 90));
  const ax2 = cx + arcR * Math.cos(toRad(ang - 90)), ay2 = cy + arcR * Math.sin(toRad(ang - 90));
  const lg = (ang - MIN) > 180 ? 1 : 0;
  const rCollar = arcR - arcWidth - 1, rBody = rCollar * 0.93, rTop = rBody * 0.8;
  const rFI = rBody * 0.8, rFO = rBody, FLUTES = size < 44 ? 18 : 24;
  const flutes = Array.from({ length: FLUTES }).map((_, i) => {
    const rad = toRad((360 / FLUTES) * i);
    return <line key={i} x1={cx + rFI * Math.cos(rad)} y1={cy + rFI * Math.sin(rad)} x2={cx + rFO * Math.cos(rad)} y2={cy + rFO * Math.sin(rad)} stroke={i % 2 === 0 ? "#000" : "#55555a"} strokeWidth={Math.max(1, size / 42)} strokeLinecap="round" />;
  });
  const pRad = toRad(ang - 90);
  const px1 = cx + rTop * 0.15 * Math.cos(pRad), py1 = cy + rTop * 0.15 * Math.sin(pRad);
  const px2 = cx + rTop * 0.95 * Math.cos(pRad), py2 = cy + rTop * 0.95 * Math.sin(pRad);

  return (
    <svg width={size} height={size} style={{ cursor: "ns-resize", userSelect: "none", flexShrink: 0, display: "block" }} onMouseDown={onMouseDown}>
      <defs>
        <radialGradient id={`c-${uid}`} cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#7a8190" /><stop offset="55%" stopColor="#454b58" /><stop offset="100%" stopColor="#1c1f26" /></radialGradient>
        <radialGradient id={`b-${uid}`} cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#34343a" /><stop offset="55%" stopColor="#1a1a1c" /><stop offset="100%" stopColor="#050505" /></radialGradient>
        <radialGradient id={`t-${uid}`} cx="36%" cy="26%" r="80%"><stop offset="0%" stopColor="#55555c" /><stop offset="35%" stopColor="#252528" /><stop offset="100%" stopColor="#040405" /></radialGradient>
        <filter id={`s-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity="0.6" /></filter>
      </defs>
      <path d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 1 1 ${axAll} ${ayAll}`} fill="none" stroke="#1e2a3a" strokeWidth={arcWidth} strokeLinecap="round" />
      {value > 0 && <path d={`M ${ax1} ${ay1} A ${arcR} ${arcR} 0 ${lg} 1 ${ax2} ${ay2}`} fill="none" stroke={C.cyan} strokeWidth={arcWidth} strokeLinecap="round" />}
      <circle cx={cx} cy={cy} r={rCollar} fill={`url(#c-${uid})`} filter={`url(#s-${uid})`} />
      <circle cx={cx} cy={cy} r={rBody} fill={`url(#b-${uid})`} />
      <g>{flutes}</g>
      <circle cx={cx} cy={cy} r={rTop} fill={`url(#t-${uid})`} />
      <circle cx={cx} cy={cy} r={rTop} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <line x1={px1} y1={py1} x2={px2} y2={py2} stroke="#ffffff" strokeWidth={Math.max(1.5, size / 24)} strokeLinecap="round" />
    </svg>
  );
}

// ── VU BARS ───────────────────────────────────────────────────────────────────
function VuBars({ level }: { level: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: BAR_GAP }}>
      {Array.from({ length: NUM_BARS }).map((_, i) => {
        const pct = ((NUM_BARS - 1 - i) / (NUM_BARS - 1)) * 100;
        const isRed = pct > 85, isAmber = pct > 60 && pct <= 85;
        let color = pct <= level
          ? (isRed ? C.barRed : isAmber ? C.barAmber : C.barGreen)
          : (isRed ? C.barGhostRed : isAmber ? C.barGhostAmber : C.barGhostGreen);
        return <div key={i} style={{ width: 11, height: BAR_H, borderRadius: 1, backgroundColor: color, flexShrink: 0 }} />;
      })}
    </div>
  );
}

// ── SCALE COL ─────────────────────────────────────────────────────────────────
function ScaleCol({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <div style={{ height: METER_H, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: side === "left" ? "flex-end" : "flex-start", minWidth: 34, flexShrink: 0 }}>
      {SCALE_LABELS.map((v, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, flexDirection: side === "left" ? "row" : "row-reverse" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e7eb", fontFamily: "monospace", lineHeight: "8px" }}>{v}</span>
          <div style={{ width: 8, height: 1.5, backgroundColor: "#9ca3af", borderRadius: 1, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ── FADER ─────────────────────────────────────────────────────────────────────
function Fader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true; startY.current = e.clientY; startVal.current = value;
    e.preventDefault(); e.stopPropagation();
  }, [value]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onChange(Math.min(100, Math.max(0, startVal.current + (-(e.clientY - startY.current) / METER_H) * 100)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [onChange]);

  const travel = METER_H - HANDLE_H - 4;
  return (
    <div style={{ width: HANDLE_W + 16, height: METER_H, position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 0, bottom: 0, width: 5, backgroundColor: "#1a1f28", borderRadius: 3, boxShadow: "inset 0 0 4px rgba(0,0,0,0.9)" }} />
      <div onMouseDown={onMouseDown} style={{ position: "absolute", bottom: (value / 100) * travel + 2, left: "50%", transform: "translateX(-50%)", width: HANDLE_W + 10, height: HANDLE_H, borderRadius: 3, cursor: "ns-resize", userSelect: "none", border: "1px solid #555b65", overflow: "hidden", boxShadow: "0 3px 8px rgba(0,0,0,0.8)" }}>
        <div style={{ height: "50%", background: "linear-gradient(180deg,#6e757e 0%,#9ca3ac 100%)" }} />
        <div style={{ height: 1.5, backgroundColor: "#3a3f48" }} />
        <div style={{ height: "50%", background: "linear-gradient(180deg,#d0d5db 0%,#f0f2f4 100%)" }} />
      </div>
    </div>
  );
}

// ── SVG ICONS ─────────────────────────────────────────────────────────────────
const MicSvg = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M19 10a7 7 0 0 1-14 0" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

const LinkSvg = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// ── CHANNEL STRIP ─────────────────────────────────────────────────────────────
function ChannelStrip({
  ch, onChange, roomLink,
}: {
  ch: Channel;
  onChange: (c: ChannelChanges) => void;
  roomLink: string;
}) {
  const upd = (c: ChannelChanges) => onChange(c);
  
  // ✅ SEPARATE STATES for each
  const [showPlusLink, setShowPlusLink] = useState(false);  // For + button Copy/Share
  const [showLinkIcon, setShowLinkIcon] = useState(false);  // For link icon popup
  const [copied, setCopied] = useState(false);

  const isActive  = ch.status === "active";
  const isWaiting = ch.status === "waiting";
  const bottomLabel = ch.label.replace(/^\d+\.\s*/, "");

  const statusBg    = isActive ? C.onAirGreen : isWaiting ? C.waitingAmber : "transparent";
  const statusTxt   = isActive ? "Active" : isWaiting ? "Waiting" : "Offline";
  const statusColor = isActive ? "#fff" : isWaiting ? C.waitingText : C.textMuted;

  const guestLink = ch.hasLink ? buildGuestLink(roomLink, ch.slotId) : null;

  const copyLink = () => {
    if (guestLink) {
      navigator.clipboard.writeText(guestLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const shareLink = async () => {
    if (guestLink && navigator.share) {
      try {
        await navigator.share({ 
          title: `Join as ${ch.label}`, 
          url: guestLink 
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <>
      <div style={{ width: 210, backgroundColor: C.strip, border: `1px solid ${C.stripBorder}`, borderRadius: 10, padding: "12px 10px 10px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 8, position: "relative" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{ch.label}</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>
            ({ch.guestName ?? ch.name})
          </div>
          <div style={{ position: "absolute", right: 0, top: 2, color: C.textMuted, cursor: "pointer", fontSize: 13, letterSpacing: 2 }}>···</div>
        </div>

        {/* STATUS ROW */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{
            background: statusBg,
            border: !isActive && !isWaiting ? `1px solid ${C.offlineGray}` : "1px solid transparent",
            borderRadius: 5, padding: "5px 10px",
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: isActive ? "#fff" : isWaiting ? C.waitingText : C.offlineGray, boxShadow: isActive ? "0 0 5px #fff" : "none" }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: statusColor, fontFamily: "monospace" }}>{statusTxt}</span>
          </div>

          {/* + button with inline Copy & Share - Uses showPlusLink */}
          {ch.hasLink && guestLink && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => setShowPlusLink(!showPlusLink)}
                title="Invite guest"
                style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: showPlusLink ? C.cyan : C.inputBg,
                  border: `1px solid ${showPlusLink ? C.cyan : C.inputBorder}`,
                  color: showPlusLink ? "#000" : C.textMuted,
                  fontSize: 18, fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                +
              </button>

              {showPlusLink && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button
                    onClick={copyLink}
                    style={{
                      padding: "4px 8px", borderRadius: 5, border: "none",
                      background: copied ? C.onAirGreen : C.cyan,
                      color: "#000", fontSize: 9, fontWeight: 700,
                      cursor: "pointer", fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                  <button
                    onClick={shareLink}
                    style={{
                      padding: "4px 8px", borderRadius: 5,
                      border: `1px solid ${C.inputBorder}`,
                      background: C.inputBg,
                      color: C.textLight, fontSize: 9, fontWeight: 700,
                      cursor: "pointer", fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Share
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GAIN */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: C.textLight, fontFamily: "monospace", minWidth: 28 }}>GAIN</span>
          <Knob value={ch.gain} onChange={v => upd({ gain: v })} size={48} />
          <span style={{ fontSize: 15, color: C.text, fontFamily: "monospace", fontWeight: 700, minWidth: 36 }}>{Math.round(ch.gain)}%</span>
        </div>

        {/* HI / MID / LOW */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          {(["hi","mid","low"] as const).map(band => (
            <div key={band} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: C.textLight, fontFamily: "monospace" }}>{band.toUpperCase()}</span>
              <Knob value={ch[band]} onChange={v => upd({ [band]: v } as ChannelChanges)} size={38} />
            </div>
          ))}
        </div>

        {/* SOLO / MUTE */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => upd({ soloed: !ch.soloed })} style={{ flex: 1, padding: "8px 0", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "monospace", backgroundColor: ch.soloed ? C.soloActive : C.soloBg, border: `1px solid ${ch.soloed ? C.soloActiveBorder : C.soloBorder}`, color: ch.soloed ? C.soloActiveText : "#d1d5db" }}>Solo</button>
          <button onClick={() => upd({ muted: !ch.muted })} style={{ flex: 1, padding: "8px 0", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "monospace", backgroundColor: ch.muted ? C.muteActive : "transparent", border: `1.5px solid ${isActive ? C.muteDefault : C.offlineGray}`, color: ch.muted ? "#fca5a5" : isActive ? C.muteDefault : C.textMuted }}>Mute</button>
        </div>

        {/* FADER + SCALE + VU */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <ScaleCol side="left" />
            <Fader value={ch.fader} onChange={v => upd({ fader: v })} />
            <ScaleCol side="right" />
            <div style={{ display: "flex", gap: 3, marginLeft: 2 }}>
              <VuBars level={ch.muted || !isActive ? 0 : ch.vuL} />
              <VuBars level={ch.muted || !isActive ? 0 : ch.vuR} />
            </div>
          </div>

          {/* BOTTOM: mic icon + label + link icon - Uses showLinkIcon */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10, gap: 8 }}>
            <div onClick={() => isActive && upd({ muted: !ch.muted })} style={{ cursor: isActive ? "pointer" : "default", display: "flex" }} title={isActive ? (ch.muted ? "Unmute" : "Mute") : "Offline"}>
              <MicSvg color={isActive && !ch.muted ? C.barGreen : C.offlineGray} />
            </div>
            <span style={{ fontSize: 12, color: C.text, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.04em" }}>{bottomLabel}</span>
            
            {/* 🔗 LINK ICON AT BOTTOM - Uses showLinkIcon */}
            {ch.hasLink && guestLink && (
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setShowLinkIcon(!showLinkIcon)}
                  title="View / copy guest link"
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "3px 5px", borderRadius: 6, background: showLinkIcon ? "#1a2235" : "transparent", border: showLinkIcon ? `1px solid ${C.cyan}` : "1px solid transparent" }}
                >
                  <LinkSvg color={showLinkIcon ? C.cyan : C.textMuted} />
                </div>
                {showLinkIcon && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1a2235", border: `1px solid ${C.inputBorder}`, borderRadius: 8, padding: "10px 12px", minWidth: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.9)" }}>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace", marginBottom: 6 }}>Guest Invite Link</div>
                    <div style={{ background: "#080c14", border: `1px solid ${C.inputBorder}`, borderRadius: 5, padding: "6px 8px", fontSize: 10, color: C.textLight, fontFamily: "monospace", wordBreak: "break-all", marginBottom: 8, lineHeight: 1.5 }}>{guestLink}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={copyLink} style={{ flex: 1, padding: "6px 0", borderRadius: 5, border: "none", background: copied ? "#16a34a" : C.cyan, color: "#000", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "monospace" }}>
                        {copied ? "✓ Copied!" : "Copy Link"}
                      </button>
                      <button onClick={() => setShowLinkIcon(false)} style={{ padding: "6px 10px", borderRadius: 5, border: `1px solid ${C.offlineGray}`, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
interface PodcastAudioDeckProps {
  roomLink?: string;
}

export default function PodcastAudioDeck({ roomLink = window?.location?.href ?? "" }: PodcastAudioDeckProps) {
  const [channels, setChannels] = useState<Channel[]>(() => makeDefaultChannels(roomLink));
  const [viewFilter, setViewFilter] = useState("All Channels");

  useEffect(() => {
    const handleMetersUpdate = (snap: any) => {
      if (snap) {
        setChannels(prev => prev.map(ch => {
          const audioActive = ch.status === "active" && !ch.muted && ch.fader > 0 && ch.gain > 0;
          if (!audioActive) return { ...ch, vuL: ch.vuL > 0.5 ? ch.vuL * 0.75 : 0, vuR: ch.vuR > 0.5 ? ch.vuR * 0.75 : 0 };
          
          let dbL = -60, dbR = -60;
          // Map Native peak levels to VU pct
          // Fallback to master if individual mic peaks not natively tracked yet
          if (ch.slotId === "mic1") {
            dbL = 20 * Math.log10(Math.max(snap.masterPeakL || 0, 0.0001));
            dbR = 20 * Math.log10(Math.max(snap.masterPeakR || 0, 0.0001));
          }
          // Scale is roughly -60dB to 0dB -> 0 to 100
          const toPct = (db: number) => Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
          
          return { ...ch, vuL: ch.vuL + (toPct(dbL) - ch.vuL) * 0.4, vuR: ch.vuR + (toPct(dbR) - ch.vuR) * 0.4 };
        }));
      }
    };
    
    window.audio?.on?.('meters:update', handleMetersUpdate);
    return () => {
      window.audio?.off?.('meters:update', handleMetersUpdate);
    };
  }, []);

  // Sync with native on mount and dsp:changed
  useEffect(() => {
    const syncNative = async () => {
      if (!window.audio) return;
      const snap = await window.audio.getDSPSnapshot();
      if (snap && snap.channels && snap.channels.microphone) {
        const eq = snap.channels.microphone.eq;
        setChannels(prev => prev.map(ch => ch.slotId === "mic1" ? { ...ch, low: eq.low, mid: eq.mid, hi: eq.high } : ch));
      }
    };
    syncNative();

    const handleDspChanged = (snap: any) => {
      if (snap && snap.channels && snap.channels.microphone) {
        const eq = snap.channels.microphone.eq;
        setChannels(prev => prev.map(ch => ch.slotId === "mic1" ? { ...ch, low: eq.low, mid: eq.mid, hi: eq.high } : ch));
      }
    };
    window.audio?.on?.("dsp:changed", handleDspChanged);
    return () => {
      window.audio?.off?.("dsp:changed", handleDspChanged);
    };
  }, []);

  const handleChange = useCallback((id: number, changes: ChannelChanges) => {
    setChannels(prev => {
      const next = prev.map(ch => ch.id !== id ? ch : { ...ch, ...changes });
      const ch = next.find(c => c.id === id);
      if (ch && ch.slotId === "mic1") {
        if (changes.hi !== undefined || changes.mid !== undefined || changes.low !== undefined) {
          window.audio?.setEQ("microphone", {
            low: ch.low,
            mid: ch.mid,
            high: ch.hi
          });
        }
      }
      return next;
    });
  }, []);

  const filtered = viewFilter === "Active Only" ? channels.filter(c => c.status === "active") : channels;

  return (
    <div style={{ backgroundColor: C.bg, padding: 12, borderRadius: 12, border: "1px solid #1a2235", width: "100%" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingInline: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "monospace", letterSpacing: "0.06em" }}>MIC CHANNELS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>View:</span>
          <div style={{ position: "relative" }}>
            <select value={viewFilter} onChange={e => setViewFilter(e.target.value)} style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 6, color: C.textLight, fontSize: 11, padding: "4px 24px 4px 10px", fontFamily: "monospace", cursor: "pointer", appearance: "none", outline: "none" }}>
              <option>All Channels</option>
              <option>Active Only</option>
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: C.textMuted, pointerEvents: "none" }}>▼</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{channels.length} Channels</span>
      </div>

      {/* STRIPS */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", flexDirection: "row", gap: 8, minWidth: "max-content" }}>
          {filtered.map(ch => (
            <ChannelStrip key={ch.id} ch={ch} roomLink={roomLink} onChange={changes => handleChange(ch.id, changes)} />
          ))}
        </div>
      </div>
    </div>
  );
}