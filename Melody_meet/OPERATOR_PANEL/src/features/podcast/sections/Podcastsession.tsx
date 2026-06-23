import React, { useState, useEffect, useRef } from 'react';
import { useRecording } from '../hooks/useRecording';
import { useLiveStream } from '../hooks/useLiveStream';

type SessionStatus = "recording" | "paused" | "stopped" | "ready";

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
}

function StatCard({ icon, iconBg, iconColor, label, value, sub }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 bg-[#131720] px-4 py-3 border-r border-[#1f2937] last:border-r-0">
      <div
        className="flex items-center justify-center flex-shrink-0 text-xl rounded-full w-11 h-11"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
        <div className="text-[15px] font-semibold text-gray-100 leading-tight">{value}</div>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const heights = [6, 12, 18, 10, 16, 8, 14, 20, 11, 15, 7, 13];
  return (
    <div className="flex items-center gap-0.5 h-5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 transition-all bg-red-500 rounded-sm"
          style={{
            height: `${h}px`,
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

interface PodcastSessionProps {
  onSegmentAdded?: (time: string) => void;
  onChapterAdded?: (time: string, label: string) => void;
  onSaveRecording?: (recording: {
    id: number;
    name: string;
    duration: string;
    size: string;
    chapters: { time: string; label: string }[];
    segments: string[];
    timestamp: number;
  }) => void;
}

export default function PodcastSession({ onSegmentAdded, onChapterAdded, onSaveRecording }: PodcastSessionProps) {
  const MAX_SECS = 14400;
  
  // ─── Recording hook ──────────────────────────────────────────────────────────
  const {
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
  } = useRecording();

  // ─── Live stream hook ──────────────────────────────────────────────────────
  const {
    isLive,
    liveViewers,
  } = useLiveStream();

  // ─── Local state ────────────────────────────────────────────────────────────
  const [chapters, setChapters] = useState<{ time: string; label: string }[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<SessionStatus>("ready");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Timer logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && !isPaused) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setElapsed((prev) => Math.min(prev + 1, MAX_SECS));
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // ─── Sync elapsed with recordingSeconds ────────────────────────────────────
  useEffect(() => {
    if (isRecording && recordingSeconds > 0) {
      setElapsed(recordingSeconds);
    }
  }, [recordingSeconds, isRecording]);

  const remaining = Math.max(0, MAX_SECS - elapsed);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleStartRecording = () => {
    setElapsed(0);
    setChapters([]);
    setSegments([]);
    setIsPaused(false);
    setStatus("recording");
    startRecording();
  };

  const handlePauseResume = () => {
    if (isRecording) {
      setIsPaused(true);
      setStatus("paused");
      stopRecording();
    } else if (isPaused) {
      setIsPaused(false);
      setStatus("recording");
      startRecording();
    }
  };

  const handleStop = () => {
    setIsPaused(false);
    setStatus("stopped");
    stopRecording();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleSave = () => {
    if (elapsed === 0) return;

    const finalDuration = fmt(elapsed);
    const mockSize = `${((elapsed * 320) / 8 / 1024).toFixed(1)} MB`;
    const finalRecording = {
      id: Date.now(),
      name: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}_${fmt(elapsed).replace(/:/g, '')}`,
      duration: finalDuration,
      size: mockSize,
      chapters: [...chapters],
      segments: [...segments],
      timestamp: Date.now()
    };

    // Send to parent (Episode Manager) via callback
    if (onSaveRecording) {
      onSaveRecording(finalRecording);
    }

    // Reset everything back to ready state
    setElapsed(0);
    setChapters([]);
    setSegments([]);
    setIsPaused(false);
    setStatus("ready");
  };

  const handleMarkSegment = () => {
    if (status !== "recording" && status !== "paused") return;
    const time = fmt(elapsed);
    setSegments((prev) => [...prev, time]);
    onSegmentAdded?.(time);
  };

  const handleAddChapter = () => {
    if (status !== "recording" && status !== "paused") return;
    const time = fmt(elapsed);
    const label = `Chapter ${chapters.length + 1}`;
    setChapters((prev) => [...prev, { time, label }]);
    onChapterAdded?.(time, label);
  };

  return (
    <div className="bg-[#0f1117] rounded-xl p-5 font-sans select-none min-w-[680px]">
      {/* Header */}
      <p className="text-[11px] text-gray-500 font-medium tracking-widest uppercase mb-4">
        Podcast Session
      </p>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-5 rounded-lg overflow-hidden border border-[#1f2937] mb-2">
        {/* Recording Status */}
        <div className="flex items-center gap-3 bg-[#131720] px-4 py-3 border-r border-[#1f2937]">
          <div className="flex items-center justify-center flex-shrink-0 rounded-full w-11 h-11 bg-red-950/60">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm-7 9h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V21h3v2H8v-2h3v-2.08A7 7 0 0 1 5 12z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`w-2 h-2 rounded-full ${status === "recording" ? "bg-red-500" : status === "paused" ? "bg-amber-500" : status === "stopped" ? "bg-gray-500" : "bg-gray-400"}`}
                style={{ animation: status === "recording" ? "blink 1.2s ease-in-out infinite" : "none" }}
              />
              <span className={`text-[11px] font-semibold tracking-wide ${status === "recording" ? "text-red-400" : status === "paused" ? "text-amber-400" : status === "stopped" ? "text-gray-400" : "text-gray-300"}`}>
                {status === "stopped" ? "Stopped" : status === "paused" ? "Paused" : status === "recording" ? "Recording" : "Ready"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-1.5">
              {status === "stopped" ? "Session captured - Save or discard" : status === "recording" ? "Streaming track input" : status === "paused" ? "Paused" : "Ready to record"}
            </p>
            <Waveform active={status === "recording"} />
          </div>
        </div>

        {/* Session Timer */}
        <StatCard
          iconBg="rgba(124,58,237,0.15)"
          iconColor="#8b5cf6"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
            </svg>
          }
          label="Session Timer"
          value={<span className="text-[20px]">{fmt(elapsed)}</span>}
          sub={`Remaining: ${fmt(remaining)}`}
        />

        {/* Auto Save */}
        <StatCard
          iconBg="rgba(16,185,129,0.15)"
          iconColor="#10b981"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M12 2a9 9 0 0 1 9 9" /><path d="M3 12a9 9 0 0 0 9 9" /><path d="M12 16l-3-3m3 3 3-3m-3 3V8" />
              <path d="M3 12a9 9 0 0 1 9-9" strokeDasharray="3 3" /><path d="M12 21a9 9 0 0 0 9-9" strokeDasharray="3 3" />
            </svg>
          }
          label="Auto Save"
          value={<span className="text-green-400 text-[15px]">Enabled</span>}
          sub="Every 5 minutes"
        />

        {/* Live Viewers */}
        <StatCard
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#f59e0b"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          }
          label="Live Viewers"
          value={isLive ? liveViewers : 0}
          sub={isLive ? "On Air" : "Offline"}
        />

        {/* Recording Quality */}
        <StatCard
          iconBg="rgba(59,130,246,0.15)"
          iconColor="#60a5fa"
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="10" width="3" height="10" rx="1" />
              <rect x="7" y="6" width="3" height="14" rx="1" />
              <rect x="12" y="2" width="3" height="18" rx="1" />
              <rect x="17" y="7" width="3" height="13" rx="1" />
            </svg>
          }
          label="Recording Quality"
          value="High (320 kbps)"
          sub="48kHz"
        />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        {/* Dynamic Start / Pause / Resume / Save */}
        {status === "stopped" ? (
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-semibold bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Recording
          </button>
        ) : (
          <button
            onClick={status === "ready" ? handleStartRecording : handlePauseResume}
            className="flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-medium"
            style={{
              background: status === "recording" ? "#7f1d1d" : status === "paused" ? "#1a2235" : "#4F6AF0",
              color: status === "recording" ? "#fca5a5" : status === "paused" ? "#cbd5e1" : "#FFFFFF",
              border: `1px solid ${status === "recording" ? "#7f1d1d" : status === "paused" ? "#374151" : "#4F6AF0"}`,
              cursor: "pointer",
            }}
          >
            {status === "ready" ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Start
              </>
            ) : status === "recording" ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" /> 
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
          className="flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-medium bg-[#1f2937] text-gray-300 border border-[#374151] hover:bg-[#273344] transition-colors disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          Stop
        </button>

        {/* Mark Segment */}
        <button
          onClick={handleMarkSegment}
          disabled={status === "ready" || status === "stopped"}
          className="flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-medium bg-[#1f2937] text-gray-300 border border-[#374151] hover:bg-[#273344] transition-colors disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Mark Segment
        </button>

        {/* Add Chapter */}
        <button
          onClick={handleAddChapter}
          disabled={status === "ready" || status === "stopped"}
          className="flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-medium bg-[#1f2937] text-gray-300 border border-[#374151] hover:bg-[#273344] transition-colors disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Add Chapter
        </button>
      </div>

      {/* Segments & Chapters Log */}
      {(segments.length > 0 || chapters.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {segments.length > 0 && (
            <div className="bg-[#131720] rounded-lg p-3 border border-[#1f2937]">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Segments</p>
              {segments.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-gray-400 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Segment {i + 1} — {t}
                </div>
              ))}
            </div>
          )}
          {chapters.length > 0 && (
            <div className="bg-[#131720] rounded-lg p-3 border border-[#1f2937]">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Chapters</p>
              {chapters.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-gray-400 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {c.label} — {c.time}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}