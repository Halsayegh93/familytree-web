/**
 * Design tokens — مطابقة لـ DS.Color في تطبيق iOS
 * Theme: Vivid Spectrum (Blue + Emerald + Indigo)
 */

export const colors = {
  primary: "#357DED",
  primaryDark: "#1E5BB8",
  primaryLight: "#5C9AF2",

  secondary: "#10B981",
  secondaryDark: "#0D9488",

  accent: "#5438DC",
  accentLight: "#7A62E8",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  textPrimary: "#1A2A3A",
  textSecondary: "#3A4A5A",
  textTertiary: "#6B7B8D",

  background: "#F0F6FA",
  surface: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  full: 999,
} as const;
