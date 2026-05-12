/**
 * نظام ألوان موحد — مطابق لثيم iOS Vivid Spectrum
 * - Primary: #357DED Blue
 * - Secondary: #10B981 Emerald
 * - Accent: #5438DC Indigo
 *
 * كل الصفحات تستخدم نفس العائلة اللونية لتوحيد الهوية مع التطبيق.
 */

export type PageTheme = {
  primary: string;
  secondary: string;
  bg: string;
  accent: string;
  gradient: string;
  gradientSoft: string;
  emoji: string;
};

// ألوان iOS الأساسية
const BLUE = "#357DED";
const BLUE_DARK = "#2460C0";
const BLUE_SOFT = "#6AA0F2";

const EMERALD = "#10B981";
const EMERALD_DARK = "#059669";
const EMERALD_SOFT = "#34D399";

const INDIGO = "#5438DC";
const INDIGO_DARK = "#3E28B0";
const INDIGO_SOFT = "#7A62E8";

// خلفيات soft موحّدة
const SOFT_BG = "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)";
const SOFT_BG_GREEN = "linear-gradient(135deg, #F8FAFC 0%, #ECFDF5 100%)";
const SOFT_BG_PURPLE = "linear-gradient(135deg, #F8FAFC 0%, #F5F3FF 100%)";

export const themes = {
  // الرئيسية — أزرق (هوية رئيسية)
  home: {
    primary: BLUE,
    secondary: BLUE_DARK,
    bg: SOFT_BG,
    accent: BLUE_SOFT,
    gradient: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(53,125,237,0.08) 0%, rgba(36,96,192,0.08) 100%)",
    emoji: "🏠",
  },
  // الشجرة — أخضر (يرمز للحياة والنمو)
  tree: {
    primary: EMERALD,
    secondary: EMERALD_DARK,
    bg: SOFT_BG_GREEN,
    accent: EMERALD_SOFT,
    gradient: `linear-gradient(135deg, ${EMERALD} 0%, ${EMERALD_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.08) 100%)",
    emoji: "🌳",
  },
  // الديوانيات — بنفسجي
  diwaniyas: {
    primary: INDIGO,
    secondary: INDIGO_DARK,
    bg: SOFT_BG_PURPLE,
    accent: INDIGO_SOFT,
    gradient: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(84,56,220,0.08) 0%, rgba(62,40,176,0.08) 100%)",
    emoji: "🏛️",
  },
  // المشاريع — أخضر
  projects: {
    primary: EMERALD,
    secondary: EMERALD_DARK,
    bg: SOFT_BG_GREEN,
    accent: EMERALD_SOFT,
    gradient: `linear-gradient(135deg, ${EMERALD} 0%, ${EMERALD_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.08) 100%)",
    emoji: "💼",
  },
  // حسابي — أزرق
  profile: {
    primary: BLUE,
    secondary: BLUE_DARK,
    bg: SOFT_BG,
    accent: BLUE_SOFT,
    gradient: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(53,125,237,0.08) 0%, rgba(36,96,192,0.08) 100%)",
    emoji: "👤",
  },
  // الإدارة — بنفسجي
  admin: {
    primary: INDIGO,
    secondary: INDIGO_DARK,
    bg: SOFT_BG_PURPLE,
    accent: INDIGO_SOFT,
    gradient: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(84,56,220,0.08) 0%, rgba(62,40,176,0.08) 100%)",
    emoji: "🛡️",
  },
  // شؤون العائلة — بنفسجي (خاص باللجنة)
  hr: {
    primary: INDIGO,
    secondary: INDIGO_DARK,
    bg: SOFT_BG_PURPLE,
    accent: INDIGO_SOFT,
    gradient: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(84,56,220,0.08) 0%, rgba(62,40,176,0.08) 100%)",
    emoji: "📋",
  },
  // (للتوافق مع الكود القديم لو أحد لازال يستخدمها)
  news: {
    primary: BLUE,
    secondary: BLUE_DARK,
    bg: SOFT_BG,
    accent: BLUE_SOFT,
    gradient: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(53,125,237,0.08) 0%, rgba(36,96,192,0.08) 100%)",
    emoji: "📰",
  },
  stories: {
    primary: INDIGO,
    secondary: INDIGO_DARK,
    bg: SOFT_BG_PURPLE,
    accent: INDIGO_SOFT,
    gradient: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_DARK} 100%)`,
    gradientSoft: "linear-gradient(135deg, rgba(84,56,220,0.08) 0%, rgba(62,40,176,0.08) 100%)",
    emoji: "📖",
  },
} as const;

export type ThemeKey = keyof typeof themes;
