import { tokens } from './tokens';

const t = tokens.colors;

/**
 * App theme colors — aligned with design-system.md.
 * Legacy keys preserved so existing screens continue to compile.
 */
export const colors = {
  // ── Page / surface ─────────────────────────────────────────────
  background: t.bgPage,
  backgroundSecondary: t.bgPageSecondary,
  foreground: t.textPrimary,

  card: t.bgCard,
  cardForeground: t.textPrimary,
  cardElevated: t.bgCardElevated,

  surface: t.bgCard,
  surfaceAlt: t.bgCardElevated,
  surfaceElevated: t.bgCardElevated,

  // ── Brand ──────────────────────────────────────────────────────
  primary: t.accent,
  primaryHover: t.accentHover,
  primaryForeground: '#FFFFFF',
  primarySoft: t.accentDim,

  // ── Pastel accents (design-system.md §2.4) ─────────────────────
  pastelPink: t.pastelPink,
  pastelPinkText: t.pastelPinkText,
  pastelPinkBorder: t.pastelPinkBorder,
  pastelYellow: t.pastelYellow,
  pastelYellowText: t.pastelYellowText,
  pastelYellowBorder: t.pastelYellowBorder,
  pastelBlue: t.pastelBlue,
  pastelBlueText: t.pastelBlueText,
  pastelBlueBorder: t.pastelBlueBorder,
  pastelGreen: t.pastelGreen,
  pastelGreenText: t.pastelGreenText,
  pastelGreenBorder: t.pastelGreenBorder,
  pastelOrange: t.pastelOrange,
  pastelOrangeText: t.pastelOrangeText,
  pastelOrangeBorder: t.pastelOrangeBorder,

  // ── Legacy "card*" aliases (mapped to new pastel palette) ──────
  spotlightPink: t.pastelPink,
  spotlightLime: t.pastelGreen,
  spotlightLavender: t.pastelPink,
  spotlightLavenderDeep: t.pastelPinkText,
  textOnSpotlight: t.pastelPinkText,
  textOnSpotlightMuted: 'rgba(45, 31, 110, 0.72)',

  premiumPillBg: t.accent,
  premiumPillText: '#FFFFFF',

  searchBarFill: t.bgInput,

  popover: t.bgCard,
  popoverForeground: t.textPrimary,

  blue: t.info,
  purple: t.aiAccent,
  emerald: t.success,
  amber: t.warning,
  coral: t.danger,

  secondary: t.bgCardElevated,
  secondaryForeground: t.textPrimary,

  muted: t.bgCardElevated,
  mutedForeground: t.textSecondary,

  accent: t.accent,
  accentForeground: '#FFFFFF',

  destructive: t.danger,
  destructiveForeground: t.textPrimary,

  border: t.borderDefault,
  borderHover: t.borderHover,
  borderStrong: t.borderStrong,
  inputBackground: t.bgInput,
  switchBackground: t.accent,
  ring: t.borderFocus,

  // ── Chart palette ──────────────────────────────────────────────
  chart1: t.warning,
  chart2: t.aiAccent,
  chart3: t.success,
  chart4: t.info,
  chart5: t.textTertiary,

  // ── Text ───────────────────────────────────────────────────────
  textPrimary: t.textPrimary,
  textSecondary: t.textSecondary,
  textTertiary: t.textTertiary,
  textOnDark: t.textPrimary,
  textMutedOnDark: t.textSecondary,
  textDisabled: t.textDisabled,

  // ── Functional ─────────────────────────────────────────────────
  success: t.success,
  successDim: t.successDim,
  warning: t.warning,
  warningDim: t.warningDim,
  danger: t.danger,
  dangerDim: t.dangerDim,
  info: t.info,
  aiAccent: t.aiAccent,

  // ── Coach surface (lavender pastel per design-system.md) ───────
  coachAccent: t.coachAccent,
  coachSurface: t.coachSurface,
  coachText: t.coachText,
  coachBorder: t.coachBorder,

  // ── Hero / chip backgrounds ────────────────────────────────────
  heroBg: t.bgPage,
  heroCard: t.bgCard,
  chipBg: t.bgChip,
  chipBgWarm: t.bgChip,
  cardShadow: '#000000',
  borderSubtle: t.borderSubtle,

  chipIncomeBg: t.pastelGreen,
  chipIncomeFg: t.pastelGreenText,
  chipExpenseBg: t.pastelOrange,
  chipExpenseFg: t.pastelOrangeText,
  chipSavingsBg: t.pastelBlue,
  chipSavingsFg: t.pastelBlueText,

  // ── Legacy "cardXxx" aliases (kept for back-compat) ────────────
  cardMint: t.cardMint,
  cardMintText: t.cardMintText,
  cardMintBorder: t.cardMintBorder,
  cardPeach: t.cardPeach,
  cardPeachText: t.cardPeachText,
  cardPeachBorder: t.cardPeachBorder,
  cardLavender: t.cardLavender,
  cardLavText: t.cardLavText,
  cardLavBorder: t.cardLavBorder,
  cardSky: t.cardSky,
  cardSkyText: t.cardSkyText,
  cardSkyBorder: t.cardSkyBorder,
  cardYellow: t.cardYellow,
  cardYellowText: t.cardYellowText,
  cardYellowBorder: t.cardYellowBorder,
  cardLilac: t.cardLilac,
  cardLilacText: t.cardLilacText,
  cardLilacBorder: t.cardLilacBorder,
  cardCoral: t.cardCoral,
  cardCoralText: t.cardCoralText,
  cardCoralBorder: t.cardCoralBorder,

  progressRingTrack: t.borderDefault,
} as const;

export type AppColors = typeof colors;
