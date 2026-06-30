import React from 'react';

type SessionStatus = "recording" | "paused" | "stopped" | "ready";

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  isLast?: boolean;
}

function StatCard({ icon, iconBg, iconColor, label, value, sub, isLast }: StatCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        gap: 12,
        backgroundColor: "#131720",
        padding: "12px 16px",
        borderRightWidth: isLast ? 0 : 1,
        borderRightColor: "#1f2937",
        borderRightStyle: "solid",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: "50%",
          width: 44,
          height: 44,
          backgroundColor: iconBg,
          color: iconColor,
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, margin: 0 }}>{label}</p>
        <div style={{ fontSize: 15, fontWeight: "600", color: "#f1f5f9", lineHeight: "20px" }}>{value}</div>
        {sub && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2, margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const heights = [6, 12, 18, 10, 16, 8, 14, 20, 11, 15, 7, 13];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            backgroundColor: "#ef4444",
            borderRadius: 2,
            height: `${h}px`,
            transition: "all 0.15s",
            animation: active ? `wave 0.8s ease-in-out ${i * 0.05}s infinite alternate` : "none",
            transform: active ? undefined : "scaleY(0.4)",
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function fmt(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

export function PodcastStatsRow({ isLive, liveViewers, status, elapsed }: { isLive: boolean; liveViewers: number; status: SessionStatus; elapsed: number }) {
  const MAX_SECS = 14400;
  const remaining = Math.max(0, MAX_SECS - elapsed);

  return (
    <div style={{ display: "flex", width: "100%", backgroundColor: "#131720", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#1f2937", borderStyle: "solid", marginTop: 8, marginBottom: 16 }}>
      {/* 1. Status Server Offline */}
      <StatCard
        iconBg={isLive ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)"}
        iconColor={isLive ? "#10b981" : "#6b7280"}
        icon={
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        label="Status"
        value={<span style={{ color: isLive ? "#4ade80" : "#9ca3af", fontSize: 15 }}>{isLive ? "Connected" : "Server Offline"}</span>}
        sub={isLive ? "Online" : "Offline"}
      />

      {/* 2. Ready (Recording Status) */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 12,
          backgroundColor: "#131720",
          padding: "12px 16px",
          borderRightWidth: 1,
          borderRightColor: "#1f2937",
          borderRightStyle: "solid",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: "50%",
            width: 44,
            height: 44,
            backgroundColor: "rgba(220,38,38,0.15)",
          }}
        >
          <svg style={{ width: 20, height: 20, color: "#ef4444" }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm-7 9h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V21h3v2H8v-2h3v-2.08A7 7 0 0 1 5 12z" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: status === "recording" ? "#ef4444" : status === "paused" ? "#f59e0b" : status === "stopped" ? "#6b7280" : "#9ca3af",
                animation: status === "recording" ? "blink 1.2s ease-in-out infinite" : "none",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: "0.5px",
                color: status === "recording" ? "#f87171" : status === "paused" ? "#fbbf24" : status === "stopped" ? "#9ca3af" : "#cbd5e1",
              }}
            >
              {status === "stopped" ? "Stopped" : status === "paused" ? "Paused" : status === "recording" ? "Recording" : "Ready"}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, margin: 0 }}>
            {status === "stopped" ? "Session captured" : status === "recording" ? "Streaming track input" : status === "paused" ? "Paused" : "Ready to record"}
          </p>
          <Waveform active={status === "recording"} />
        </div>
      </div>

      {/* 3. Session Timer */}
      <StatCard
        iconBg="rgba(124,58,237,0.15)"
        iconColor="#8b5cf6"
        icon={
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
          </svg>
        }
        label="Session Timer"
        value={<span style={{ fontSize: 20 }}>{fmt(elapsed)}</span>}
        sub={`Remaining: ${fmt(remaining)}`}
      />

      {/* 4. Live Viewers */}
      <StatCard
        iconBg="rgba(245,158,11,0.15)"
        iconColor="#f59e0b"
        icon={
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
        }
        label="Live Viewers"
        value={isLive ? liveViewers : 0}
        sub={isLive ? "On Air" : "Offline"}
      />

      {/* 5. Recording Quality */}
      <StatCard
        iconBg="rgba(59,130,246,0.15)"
        iconColor="#60a5fa"
        icon={
          <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24">
            <rect x="2" y="10" width="3" height="10" rx="1" />
            <rect x="7" y="6" width="3" height="14" rx="1" />
            <rect x="12" y="2" width="3" height="18" rx="1" />
            <rect x="17" y="7" width="3" height="13" rx="1" />
          </svg>
        }
        label="Recording Quality"
        value="High (320 kbps)"
        sub="48kHz"
        isLast={true}
      />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

export function PodcastActionButtons({ 
  status, 
  handleStartRecording, 
  handlePauseResume, 
  handleStop, 
  handleSave, 
  handleMarkSegment, 
  handleAddChapter,
  segments,
  chapters,
  recordingSeconds = 0
}: any) {
  return (
    <div className="bg-[#131720] rounded-xl p-4 font-sans select-none mb-4 border border-[#1f2937] flex flex-col gap-3.5">
      <div className="flex flex-row justify-between items-center w-full mb-1">
        <p className="text-[11px] text-gray-500 font-medium tracking-widest uppercase mb-0">
          Recording Actions
        </p>
        <div 
          className="flex items-center gap-2 bg-[#171a23] border border-[#273344] px-4 py-1.5 rounded-lg font-mono text-[22px] font-bold text-red-500 select-none"
          style={{ minWidth: "120px", justifyContent: "center" }}
        >
          <span className={`w-3 h-3 rounded-full bg-red-500 ${status === "recording" ? "animate-pulse" : ""}`} />
          {fmt(recordingSeconds)}
        </div>
      </div>
      
      {/* Action Buttons Row */}
      <div className="flex flex-row items-center gap-3 w-full">

        {/* Dynamic Start / Pause / Resume / Save */}
        {status === "stopped" ? (
          <button
            onClick={handleSave}
            className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
        ) : (
          <button
            onClick={status === "ready" ? handleStartRecording : handlePauseResume}
            className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-md text-[12px] font-medium"
            style={{
              background: status === "recording" ? "#7f1d1d" : status === "paused" ? "#1a2235" : "#4F6AF0",
              color: status === "recording" ? "#fca5a5" : status === "paused" ? "#cbd5e1" : "#FFFFFF",
              border: `1px solid ${status === "recording" ? "#7f1d1d" : status === "paused" ? "#374151" : "#4F6AF0"}`,
              cursor: "pointer",
            }}
          >
            {status === "ready" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Start
              </>
            ) : status === "recording" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" /> 
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Resume
              </>
            )}
          </button>
        )}

        {/* Stop */}
        <button
          onClick={handleStop}
          disabled={status === "ready" || status === "stopped"}
          className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-md text-[12px] font-medium bg-[#1e293b] text-gray-300 border border-[#374151] hover:bg-[#273344] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          Stop
        </button>

        {/* Mark Segment */}
        <button
          onClick={handleMarkSegment}
          disabled={status === "ready" || status === "stopped"}
          className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-md text-[12px] font-medium bg-[#1e293b] text-gray-300 border border-[#374151] hover:bg-[#273344] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Mark Seg
        </button>

        {/* Add Chapter */}
        <button
          onClick={handleAddChapter}
          disabled={status === "ready" || status === "stopped"}
          className="flex-1 h-[36px] flex items-center justify-center gap-1.5 rounded-md text-[12px] font-medium bg-[#1e293b] text-gray-300 border border-[#374151] hover:bg-[#273344] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Add Chap
        </button>
      </div>

      {/* Segments & Chapters Log */}
      {(segments.length > 0 || chapters.length > 0) && (
        <div className="flex flex-col gap-2">
          {segments.length > 0 && (
            <div className="bg-[#131720] rounded-lg p-2 border border-[#1f2937]">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Segments</p>
              {segments.map((t: any, i: any) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Seg {i + 1} — {t}
                </div>
              ))}
            </div>
          )}
          {chapters.length > 0 && (
            <div className="bg-[#131720] rounded-lg p-2 border border-[#1f2937]">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Chapters</p>
              {chapters.map((c: any, i: any) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {c.label} — {c.time}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PodcastSession() { return null; }