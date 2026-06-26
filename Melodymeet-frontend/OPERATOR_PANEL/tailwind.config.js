/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],  
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ─── MelodyMeet Design System ───────────────────────────────────────
        // Backgrounds
        "mm-bg":          "#F8FAFC",
        "mm-bg-alt":      "#F1F5F9",
        "mm-surface":     "#FFFFFF",
        "mm-card":        "#FFFFFF",
        "mm-border":      "#E2E8F0",
        // Text
        "mm-text":        "#0F172A",
        "mm-text-sec":    "#475569",
        "mm-text-muted":  "#94A3B8",
        // Primary (Slate Blue)
        "mm-primary":     "#4F6AF0",
        "mm-primary-lt":  "#EEF2FF",
        // Success (Soft Green)
        "mm-success":     "#059669",
        "mm-success-lt":  "#ECFDF5",
        // Warning (Soft Amber)
        "mm-warning":     "#D97706",
        "mm-warning-lt":  "#FFFBEB",
        // Danger (Soft Red)
        "mm-danger":      "#DC2626",
        "mm-danger-lt":   "#FEF2F2",
        // Teal
        "mm-teal":        "#0D9488",
        "mm-teal-lt":     "#F0FDFA",
        // Purple
        "mm-purple":      "#7C3AED",
        "mm-purple-lt":   "#F5F3FF",
        // Dark variants
        "mm-dark-bg":     "#0F172A",
        "mm-dark-alt":    "#1E293B",
        "mm-dark-card":   "#1E293B",
        "mm-dark-border": "#334155",
        "mm-dark-muted":  "#64748B",
      },
      borderRadius: {
        "mm": "12px",
        "mm-lg": "16px",
        "mm-xl": "20px",
      },
      boxShadow: {
        "mm-card": "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "mm-float": "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
      },
    },
  },
  plugins: [],
};