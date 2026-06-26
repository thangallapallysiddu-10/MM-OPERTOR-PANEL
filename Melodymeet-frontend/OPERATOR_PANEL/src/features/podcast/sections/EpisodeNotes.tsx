import { useState, useRef } from "react";

type NoteStatus = "done" | "active" | "pending";

interface Note {
  id: number;
  text: string;
  status: NoteStatus;
}

const initialNotes: Note[] = [
  { id: 1, text: "Introduction & Welcome", status: "pending" },
  { id: 2, text: "Guest Introduction", status: "pending" },
  { id: 3, text: "Topic 1: The Future of Voice Technology", status: "pending" },
  { id: 4, text: "Topic 2: AI in Content Creation", status: "pending" },
  { id: 5, text: "Audience Questions", status: "pending" },
  { id: 6, text: "Closing Remarks", status: "pending" },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#a855f7">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function DotIcon() {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#6b7280",
        display: "inline-block",
      }}
    />
  );
}

function StatusIcon({ status }: { status: NoteStatus }) {
  if (status === "done") return <CheckIcon />;
  if (status === "active") return <PlayIcon />;
  return <DotIcon />;
}

interface NoteItemProps {
  note: Note;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  showReorder: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function NoteItem({ note, onToggle, onDelete, showReorder, onMoveUp, onMoveDown, isFirst, isLast }: NoteItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 6px",
        borderRadius: 6,
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {showReorder && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              background: "none",
              border: "none",
              cursor: isFirst ? "default" : "pointer",
              color: isFirst ? "#374151" : "#6b7280",
              fontSize: 9,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              background: "none",
              border: "none",
              cursor: isLast ? "default" : "pointer",
              color: isLast ? "#374151" : "#6b7280",
              fontSize: 9,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ▼
          </button>
        </div>
      )}

      <span
        style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
        onClick={() => onToggle(note.id)}
      >
        <StatusIcon status={note.status} />
      </span>

      <span
        onClick={() => onToggle(note.id)}
        style={{
          flex: 1,
          fontSize: 14,
          color: note.status === "done" ? "#6b7280" : "#e5e7eb",
          textDecoration: note.status === "done" ? "line-through" : "none",
          cursor: "pointer",
          transition: "color 0.2s",
          userSelect: "none",
        }}
      >
        {note.text}
      </span>

      {hovered && (
        <button
          onClick={() => onDelete(note.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
            fontSize: 18,
            lineHeight: 1,
            padding: "0 2px",
            display: "flex",
            alignItems: "center",
          }}
          title="Delete note"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function EpisodeNotes() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newText, setNewText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const nextId = useRef(initialNotes.length + 1);

  const cycleStatus = (id: number) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const next: NoteStatus =
          n.status === "pending" ? "active" : n.status === "active" ? "done" : "pending";
        return { ...n, status: next };
      })
    );
  };

  const deleteNote = (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const addNote = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setNotes((prev) => [
      ...prev,
      { id: nextId.current++, text: trimmed, status: "pending" },
    ]);
    setNewText("");
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setNotes((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index: number) => {
    setNotes((prev) => {
      if (index === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const clearDone = () => {
    setNotes((prev) => prev.filter((n) => n.status !== "done"));
    setShowMenu(false);
  };

  const markAllDone = () => {
    setNotes((prev) => prev.map((n) => ({ ...n, status: "done" })));
    setShowMenu(false);
  };

  const resetAll = () => {
    setNotes((prev) => prev.map((n) => ({ ...n, status: "pending" })));
    setShowMenu(false);
  };

  return (
    <div
      style={{
        background: "#161b27",
        borderRadius: 12,
        border: "1px solid #1f2937",
        padding: "18px 20px 16px",
        width: 360,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#f9fafb", letterSpacing: "0.1em" }}>
          EPISODE NOTES
        </span>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: 18,
              letterSpacing: 3,
              padding: "2px 4px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            •••
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 30,
                background: "#1e2533",
                border: "1px solid #2d3748",
                borderRadius: 8,
                zIndex: 20,
                minWidth: 160,
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              {[
                { label: "Clear done notes", action: clearDone },
                { label: "Mark all as done", action: markAllDone },
                { label: "Reset all", action: resetAll },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#e5e7eb",
                    fontSize: 13,
                    padding: "10px 16px",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2d3748")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#1f2937", marginBottom: 6 }} />

      {/* Notes List */}
      <div>
        {notes.length === 0 && (
          <p style={{ fontSize: 13, color: "#4b5563", textAlign: "center", padding: "16px 0" }}>
            No notes yet. Add one below!
          </p>
        )}
        {notes.map((note, index) => (
          <NoteItem
            key={note.id}
            note={note}
            onToggle={cycleStatus}
            onDelete={deleteNote}
            showReorder={showReorder}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
            isFirst={index === 0}
            isLast={index === notes.length - 1}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#1f2937", margin: "10px 0" }} />

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="+ Add Note"
          style={{
            flex: 1,
            background: "#1a2030",
            border: `1px solid ${inputFocused ? "#a855f7" : "#2d3748"}`,
            borderRadius: 8,
            padding: "9px 14px",
            fontSize: 13,
            color: "#e5e7eb",
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s",
          }}
        />

        <button
          onClick={() => setShowReorder((v) => !v)}
          title="Toggle reorder"
          style={{
            background: showReorder ? "rgba(168,85,247,0.2)" : "#1a2030",
            border: `1px solid ${showReorder ? "#a855f7" : "#2d3748"}`,
            borderRadius: 8,
            padding: "9px 12px",
            cursor: "pointer",
            color: showReorder ? "#a855f7" : "#9ca3af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10 }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}