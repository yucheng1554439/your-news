export const colors = {
  bg: "#09090b",
  surface: "#18181b",
  surfaceRaised: "#27272a",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  text: "#ffffff",
  /** All intelligence / briefing body paragraphs — single reading color */
  textBody: "rgba(255,255,255,0.88)",
  /** Timestamps, provenance counts, coverage when labeled */
  textMeta: "rgba(255,255,255,0.55)",
  /** Section tabs, eyebrows, card labels */
  textSectionLabel: "rgba(255,255,255,0.45)",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  textDim: "#52525b",
  accent: "#fbbf24",
  accentMuted: "rgba(251,191,36,0.15)",
  danger: "#f87171",
  success: "#34d399",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  hero: { fontSize: 30, lineHeight: 38, fontWeight: "700" as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 26 },
  caption: { fontSize: 13, lineHeight: 18 },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: "uppercase" as const,
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
