import { Platform, type ViewStyle } from "react-native";

// ===== Warm Modern Guardian — design tokens (khớp @theme trong src/index.css của web) =====

export const colors = {
  // Brand
  primary: "#ff7a00",
  primaryDark: "#994700",
  primaryTint: "#fff3e6",
  secondary: "#00a896",
  secondaryDark: "#006b5f",
  secondaryTint: "#e6f7f5",
  navy: "#1e293b",
  navySoft: "#545f73",
  navyTint: "#e8edf7",

  // Trạng thái nguy hiểm (báo cáo, từ chối, lỗi)
  danger: "#ba1a1a",
  dangerDark: "#93000a",
  dangerTint: "#ffdad6",

  // Surfaces
  canvas: "#fffdf9",
  surface: "#fdf8f0",
  outline: "#f1e8dc",
  muted: "#8c7263",

  white: "#ffffff",
  amber: "#b45309",
  star: "#fbbf24",
} as const;

/** "#1e293b" + 0.6 → "rgba(30,41,59,0.6)" — thay cho text-navy/60 của Tailwind. */
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Các mức chữ navy hay dùng trên web (text-navy/xx). */
export const ink = {
  strong: colors.navy,
  body: alpha(colors.navy, 0.8),
  soft: alpha(colors.navy, 0.7),
  muted: alpha(colors.navy, 0.6),
  faint: alpha(colors.navy, 0.5),
  ghost: alpha(colors.navy, 0.4),
} as const;

export const fonts = {
  display: "Comfortaa_700Bold",
  displayMedium: "Comfortaa_600SemiBold",
  sans: "NunitoSans_400Regular",
  semibold: "NunitoSans_600SemiBold",
  bold: "NunitoSans_700Bold",
  extrabold: "NunitoSans_800ExtraBold",
} as const;

export const radius = {
  sm: 12,
  md: 16, // rounded-2xl
  card: 24, // --radius-card
  stage: 32, // --radius-stage
  full: 999,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

// Bóng ấm (warm ambient shadows) — iOS dùng shadow*, Android dùng elevation
const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: { shadowColor: colors.navy, shadowOffset: { width: 0, height: y }, shadowRadius: blur / 2, shadowOpacity: opacity },
    android: { elevation, shadowColor: colors.navy },
    default: { boxShadow: `0 ${y}px ${blur}px -2px rgba(30,41,59,${opacity})` } as ViewStyle,
  }) ?? {};

export const shadows = {
  low: shadow(4, 16, 0.06, 2),
  mid: shadow(12, 28, 0.1, 5),
  high: shadow(20, 40, 0.14, 10),
  glow: Platform.select<ViewStyle>({
    ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, shadowOpacity: 0.3 },
    android: { elevation: 6, shadowColor: colors.primary },
    default: { boxShadow: "0 0 32px rgba(255,122,0,0.15)" } as ViewStyle,
  }) ?? {},
} as const;

/** Bộ màu cho các "tone" dùng chung (StatCard, SectionCard, badge). */
export const tones = {
  orange: { bg: colors.primaryTint, fg: colors.primary },
  teal: { bg: colors.secondaryTint, fg: colors.secondary },
  navy: { bg: "#f1f5f9", fg: colors.navySoft },
  danger: { bg: colors.dangerTint, fg: colors.danger },
} as const;

export type Tone = keyof typeof tones;
