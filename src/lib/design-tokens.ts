/**
 * Design tokens — مطابقة 100% لـ DS.Color في تطبيق iOS
 * Theme: Vivid Spectrum (Blue + Emerald + Indigo)
 */

export const colors = {
  // الأساسية
  primary: "#357DED",
  primaryDark: "#2460C0",
  primaryLight: "#6AA0F2",

  secondary: "#10B981",
  secondaryDark: "#059669",
  secondaryLight: "#34D399",

  accent: "#5438DC",
  accentDark: "#3E28B0",
  accentLight: "#7A62E8",

  // semantic — مطابق iOS
  success: "#10B981",
  warning: "#D4960A",
  error: "#D32F2F",
  info: "#357DED",

  // النصوص — slate أكثر مثل iOS
  textPrimary: "#0A0E18",
  textSecondary: "#5A6070",
  textTertiary: "#8A90A0",

  // السطوح
  background: "#FFFFFF",
  surface: "#F8FAFC",
  surfaceElevated: "#FFFFFF",

  // ألوان الأدوار (pastel)
  adminRole: "#D47B7B",
  monitorRole: "#7BB8A4",
  supervisorRole: "#D4A96B",
  memberRole: "#7BA8D4",
  pendingRole: "#A0A0A0",
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
