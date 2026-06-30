import React, { useState, useCallback, useEffect } from "react";
import { useAppStore } from "../../../store/useAppStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GuestStatus = "connected" | "waiting" | "offline";

export interface GuestSeat {
  id: string;
  label: string;      
  name: string;       
  status: GuestStatus;
  inviteUrl?: string; 
  signalStrength?: 0 | 1 | 2 | 3;
  slotId?: string;    // mic2, mic3, mic4, mic5, mic6
}

export interface RemoteGuestsPanelProps {
  roomId?: string;           // The actual room ID from useLiveStream
  baseJoinUrl?: string;
  initialSeats?: GuestSeat[];
  onGenerateLink?: (seat: GuestSeat, inviteUrl: string) => void;
  onDisconnect?: (seat: GuestSeat) => void;
  onCancelInvite?: (seat: GuestSeat) => void;
  onAddGuest?: (name: string) => void;
}

function buildGuestLink(roomId: string, slotId: string, guestName: string): string {
  const PROD_URL = "https://operator-panel-tan.vercel.app";
  const base = typeof window !== "undefined" ? window.location.origin : PROD_URL;
  // Unique link for each slot with the room ID and name prefill
  // Example: https://operator-panel-tan.vercel.app/podcast/guest/mic3/ABC123?name=Vivek
  return `${base}/podcast/guest/${slotId}/${roomId}?name=${encodeURIComponent(guestName)}`;
}

// ── DEFAULT SEATS - Updated with local links ──────────────────────────────
const DEFAULT_SEATS: GuestSeat[] = [
  {
    id: "seat-1",
    label: "Guest Mic 1",
    name: "Ananya",
    status: "connected",
    signalStrength: 3,
    slotId: "mic2",
    inviteUrl: "https://operator-panel-tan.vercel.app/podcast/guest/mic2/ROOM123?name=Ananya",
  },
  {
    id: "seat-2",
    label: "Guest Mic 2",
    name: "Vivek",
    status: "connected",
    signalStrength: 2,
    slotId: "mic3",
    inviteUrl: "https://operator-panel-tan.vercel.app/podcast/guest/mic3/ROOM123?name=Vivek",
  },
  {
    id: "seat-3",
    label: "Remote Guest 1",
    name: "Arjun",
    status: "waiting",
    slotId: "mic4",
    inviteUrl: "https://operator-panel-tan.vercel.app/podcast/guest/mic4/ROOM123?name=Arjun",
  },
  {
    id: "seat-4",
    label: "Remote Guest 2",
    name: "Neha",
    status: "offline",
    slotId: "mic5",
  },
  {
    id: "seat-5",
    label: "Call-in Guest",
    name: "Listener",
    status: "offline",
    slotId: "mic6",
  },
];

function initialsFor(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

const AVATAR_PALETTE = ["#7c5cff", "#2dd4bf", "#f59e0b", "#f472b6", "#60a5fa", "#34d399"];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIndicatorDot({ status }: { status: GuestStatus }) {
  const color = status === "connected" ? "#22c55e" : status === "waiting" ? "#eab308" : "#6b7280";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: status !== "offline" ? `0 0 8px ${color}` : "none",
        flexShrink: 0,
      }}
    />
  );
}

function SignalBars({ strength = 0 }: { strength?: 0 | 1 | 2 | 3 }) {
  const heights = [6, 10, 14];
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, marginLeft: 6 }}>
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 1,
            backgroundColor: i < strength ? "#22c55e" : "rgba(34,197,94,0.25)",
          }}
        />
      ))}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant: "ghost" | "danger" | "neutral";
}) {
  const styles: Record<string, React.CSSProperties> = {
    ghost: {
      color: "#4f6af0",
      border: "1px solid rgba(79,106,240,0.4)",
      background: "rgba(79,106,240,0.08)",
    },
    danger: {
      color: "#f87171",
      border: "1px solid rgba(248,113,113,0.4)",
      background: "rgba(248,113,113,0.08)",
    },
    neutral: {
      color: "#cbd5e1",
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.04)",
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: "7px 16px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "filter 120ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.25)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RemoteGuestsPanel({
  roomId,
  baseJoinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/podcast/guest`
    : "https://operator-panel-tan.vercel.app/podcast/guest",
  initialSeats,
  onGenerateLink,
  onDisconnect,
  onCancelInvite,
}: RemoteGuestsPanelProps) {
  const [seats, setSeats] = useState<GuestSeat[]>(initialSeats ?? DEFAULT_SEATS);
  const [copiedSeatId, setCopiedSeatId] = useState<string | null>(null);
  const [showMicRequestConfirm, setShowMicRequestConfirm] = useState(false);
  const [activeSeatForConfirm, setActiveSeatForConfirm] = useState<GuestSeat | null>(null);

  const confirmAccept = useCallback((seat: GuestSeat) => {
    setSeats((prev) =>
      prev.map((s) =>
        s.id === seat.id ? { ...s, status: "connected", signalStrength: 3 } : s
      )
    );
    if (seat.slotId) {
      const idx = seat.slotId === "mic2" ? 1 : seat.slotId === "mic3" ? 2 : seat.slotId === "mic4" ? 3 : 4;
      useAppStore.getState().updateMic(idx, { active: true, muted: false });
    }
  }, []);

  const confirmCancel = useCallback(
    (seat: GuestSeat) => {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id ? { ...s, status: "offline", inviteUrl: undefined } : s
        )
      );
      onCancelInvite?.(seat);
    },
    [onCancelInvite]
  );

  const { podcast } = useAppStore();
  const guestSlots = podcast.guestSlots;

  // Real-time synchronization of guest seat details from the store
  useEffect(() => {
    setSeats((prev) =>
      prev.map((seat) => {
        if (!seat.slotId) return seat;
        const slot = guestSlots.find((s) => s.slotId === seat.slotId);
        if (!slot) return seat;

        let status = seat.status;
        if (slot.status === "connected") {
          status = "connected";
        } else if (slot.status === "empty" && seat.status === "connected") {
          status = seat.inviteUrl ? "waiting" : "offline";
        }

        return {
          ...seat,
          status,
          name: slot.guestName || seat.name,
          signalStrength: slot.micHealth === "connected" ? 3 : slot.micHealth === "reconnecting" ? 1 : undefined,
        };
      })
    );
  }, [guestSlots]);

  const addGuestSeat = useCallback(() => {
    const guestName = prompt("Enter guest name:");
    if (!guestName || !guestName.trim()) return;

    const nextNumber = seats.length + 1;
    const slotMap: Record<string, string> = {
      '2': 'mic2', '3': 'mic3', '4': 'mic4', '5': 'mic5', '6': 'mic6'
    };
    const nextSlot = slotMap[String(nextNumber + 1)] || `mic${nextNumber + 1}`;
    
    setSeats((prev) => [
      ...prev,
      {
        id: `seat-${Date.now()}`,
        label: `Remote Guest ${nextNumber}`,
        name: guestName.trim(),
        status: "offline",
        slotId: nextSlot,
      },
    ]);
  }, [seats.length]);

  // ✅ FIXED: Generate link using roomId from useLiveStream
  const generateInviteLink = useCallback(
    (seat: GuestSeat) => {
      // Use the roomId from props (from useLiveStream)
      const effectiveRoomId = roomId || 'ROOM123';
      const slotId = seat.slotId || `mic${seats.indexOf(seat) + 2}`;
      const url = buildGuestLink(effectiveRoomId, slotId, seat.name); // Pass the name to prefill

      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id ? { ...s, status: "waiting", inviteUrl: url } : s
        )
      );
      onGenerateLink?.(seat, url);
    },
    [roomId, seats, onGenerateLink]
  );

  const cancelInvite = useCallback(
    (seat: GuestSeat) => {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id ? { ...s, status: "offline", inviteUrl: undefined } : s
        )
      );
      onCancelInvite?.(seat);
    },
    [onCancelInvite]
  );

  const disconnectSeat = useCallback(
    (seat: GuestSeat) => {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id ? { ...s, status: "offline", inviteUrl: undefined, signalStrength: undefined } : s
        )
      );
      onDisconnect?.(seat);
    },
    [onDisconnect]
  );

  const copyLink = useCallback(async (seat: GuestSeat) => {
    if (!seat.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(seat.inviteUrl);
    } catch (e) {}
    setCopiedSeatId(seat.id);
    window.setTimeout(() => setCopiedSeatId((id) => (id === seat.id ? null : id)), 1500);
  }, []);

  return (
    <section
      style={{
        backgroundColor: "#15151c",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "18px 20px 14px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#e5e7eb",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .rg-row {
          display: grid;
          grid-template-columns: 24px 36px minmax(60px, 1.2fr) minmax(50px, 1fr) minmax(80px, 1fr) 60px auto;
          align-items: center;
          gap: 12px;
          padding: 12px 4px;
          border-top: 1px solid rgba(255,255,255,0.05);
          width: 100%;
          box-sizing: border-box;
        }
        .rg-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        @media (max-width: 1024px) {
          .rg-row {
            grid-template-columns: 24px 36px 1fr 1fr;
            row-gap: 14px;
            padding: 16px 4px;
          }
          .rg-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
            border-top: 1px solid rgba(255,255,255,0.03);
            padding-top: 8px;
            margin-top: 2px;
          }
        }
        @media (max-width: 600px) {
          .rg-row {
            grid-template-columns: 24px 1fr;
            row-gap: 10px;
          }
          .rg-actions {
            grid-column: 1 / -1;
          }
        }
      `}</style>

      {/* Header Info Panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", color: "#f3f4f6" }}>
            REMOTE GUESTS &amp; INVITE LINKS
          </h2>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Share links with your guests to invite them to the podcast
          </span>
        </div>
        <ActionButton variant="ghost" onClick={addGuestSeat}>
          + Add Guest
        </ActionButton>
      </div>

      {/* Rows container */}
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {seats.map((seat) => (
          <div key={seat.id} className="rg-row">
            
            {/* Column 1: Status Dot */}
            <StatusIndicatorDot status={seat.status} />

            {/* Column 2: Initials Avatar Circle */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                backgroundColor: avatarColorFor(seat.id),
                opacity: seat.status === "offline" ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {initialsFor(seat.name)}
            </div>

            {/* Column 3: Slot Label Title */}
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f3f4f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {seat.label}
            </span>

            {/* Column 4: Assigned Guest Name Label */}
            <span style={{ fontSize: 13, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {seat.name}
            </span>

            {/* Column 5: Realtime Connection Status Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {seat.status === "connected" && (
                <>
                  <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 13 }}>Connected</span>
                  <SignalBars strength={seat.signalStrength} />
                </>
              )}
              {seat.status === "waiting" && (
                <span style={{ color: "#eab308", fontWeight: 600, fontSize: 13 }}>Waiting to Join</span>
              )}
              {seat.status === "offline" && (
                <span style={{ color: "#9ca3af", fontWeight: 500, fontSize: 13 }}>Offline</span>
              )}
            </div>

            {/* Column 6: Subtitle Status Label context */}
            <span style={{ color: "#6b7280", fontSize: 13 }}>
              {seat.status === "offline" ? "Not Invited" : "Invited"}
            </span>

            {/* Column 7 & 8 Combined Action Block */}
            <div className="rg-actions">
              {seat.inviteUrl && (
                <ActionButton variant="ghost" onClick={() => copyLink(seat)}>
                  {copiedSeatId === seat.id ? "Copied!" : "Copy Link"}
                </ActionButton>
              )}

              {seat.status === "connected" && (
                <ActionButton variant="danger" onClick={() => disconnectSeat(seat)}>
                  Disconnect
                </ActionButton>
              )}
              {seat.status === "waiting" && (
                <ActionButton variant="ghost" onClick={() => {
                  setActiveSeatForConfirm(seat);
                  setShowMicRequestConfirm(true);
                }}>
                  Accept Invite
                </ActionButton>
              )}
              {seat.status === "offline" && (
                <ActionButton variant="ghost" onClick={() => generateInviteLink(seat)}>
                  Generate Link
                </ActionButton>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* ─── CUSTOM MIC REQUEST & INVITE CONFIRMATION MODAL ─── */}
      {showMicRequestConfirm && activeSeatForConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.82)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: "#1E293B",
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "#334155",
            padding: 24,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)",
          }}>
            {/* Warning Circle Icon */}
            <div style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
              color: "#22c55e",
              fontSize: 22,
            }}>
              🎙️
            </div>

            <h3 style={{
              margin: "0 0 8px 0",
              fontSize: 17,
              fontWeight: 700,
              color: "#f8fafc",
              textAlign: "center",
            }}>
              Guest Mic Request
            </h3>

            <p style={{
              margin: "0 0 24px 0",
              fontSize: 14,
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.5,
              fontWeight: 500,
            }}>
              Really want to accept?
            </p>

            <div style={{
              display: "flex",
              gap: 12,
              width: "100%",
            }}>
              {/* Cancel the Request Button (Red) */}
              <button
                type="button"
                onClick={() => {
                  setShowMicRequestConfirm(false);
                  confirmCancel(activeSeatForConfirm);
                }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 6,
                  backgroundColor: "#ef4444",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background-color 150ms ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ef4444"}
              >
                Cancel the Request
              </button>

              {/* Accept Invite Button (Green) */}
              <button
                type="button"
                onClick={() => {
                  setShowMicRequestConfirm(false);
                  confirmAccept(activeSeatForConfirm);
                }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 6,
                  backgroundColor: "#22c55e",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background-color 150ms ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#16a34a"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#22c55e"}
              >
                Accept Invite
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}