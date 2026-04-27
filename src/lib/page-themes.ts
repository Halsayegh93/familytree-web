/**
 * نظام ألوان موحد لكل صفحة
 * كل صفحة لها هويتها اللونية الخاصة
 */

export type PageTheme = {
  primary: string;
  secondary: string;
  bg: string;        // خلفية فاتحة جداً للقسم
  accent: string;    // للتمييز
  gradient: string;  // gradient كامل
  gradientSoft: string; // gradient ناعم للخلفيات
  emoji: string;
};

export const themes = {
  home: {
    primary: "#357DED",
    secondary: "#10B981",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #ECFDF5 100%)",
    accent: "#3B82F6",
    gradient: "linear-gradient(135deg, #357DED 0%, #10B981 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(53,125,237,0.08) 0%, rgba(16,185,129,0.08) 100%)",
    emoji: "🏠",
  },
  tree: {
    primary: "#10B981",
    secondary: "#059669",
    bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
    accent: "#34D399",
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.08) 100%)",
    emoji: "🌳",
  },
  news: {
    primary: "#F59E0B",
    secondary: "#EA580C",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FED7AA 100%)",
    accent: "#FB923C",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,88,12,0.08) 100%)",
    emoji: "📰",
  },
  stories: {
    primary: "#8B5CF6",
    secondary: "#5438DC",
    bg: "linear-gradient(135deg, #F5F3FF 0%, #E0E7FF 100%)",
    accent: "#A78BFA",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #5438DC 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(84,56,220,0.08) 100%)",
    emoji: "📖",
  },
  diwaniyas: {
    primary: "#D97706",
    secondary: "#B45309",
    bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
    accent: "#F59E0B",
    gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(180,83,9,0.08) 100%)",
    emoji: "🏛️",
  },
  projects: {
    primary: "#06B6D4",
    secondary: "#0891B2",
    bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
    accent: "#22D3EE",
    gradient: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(8,145,178,0.08) 100%)",
    emoji: "💼",
  },
  profile: {
    primary: "#EC4899",
    secondary: "#DB2777",
    bg: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)",
    accent: "#F472B6",
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(219,39,119,0.08) 100%)",
    emoji: "👤",
  },
  admin: {
    primary: "#6366F1",
    secondary: "#4F46E5",
    bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
    accent: "#818CF8",
    gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(79,70,229,0.08) 100%)",
    emoji: "🛡️",
  },
  hr: {
    primary: "#5438DC",
    secondary: "#7C3AED",
    bg: "linear-gradient(135deg, #F5F3FF 0%, #DDD6FE 100%)",
    accent: "#8B5CF6",
    gradient: "linear-gradient(135deg, #5438DC 0%, #7C3AED 100%)",
    gradientSoft: "linear-gradient(135deg, rgba(84,56,220,0.08) 0%, rgba(124,58,237,0.08) 100%)",
    emoji: "📋",
  },
} as const;

export type ThemeKey = keyof typeof themes;
