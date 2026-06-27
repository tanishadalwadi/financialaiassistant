/**
 * Design system tokens — single source for palette, spacing, and radii.
 * Aligned with `design-system.md` (FinanceAI dark premium + pastel accents).
 *
 * Primary color: #ed7925 (vibrant orange)
 * Background ramp: page (#0f1720) → card (#1a2430) → elevated (#1f2a38)
 */

export const tokens = {
  colors: {
    // ── Page / surface backgrounds ──────────────────────────────
    bgPage: '#0f1720',
    bgPageSecondary: '#141c26',
    bgCard: '#1a2430',
    bgCardElevated: '#1f2a38',
    bgChip: '#1f2a38',
    bgInput: '#141c26',
    bgOverlay: 'rgba(0,0,0,0.8)',

    // ── Borders ─────────────────────────────────────────────────
    borderDefault: 'rgba(255,255,255,0.05)',
    borderSubtle: 'rgba(255,255,255,0.05)',
    borderHover: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.15)',
    borderFocus: '#ed7925',

    // ── Brand accent (primary action: orange) ───────────────────
    accent: '#ed7925',
    accentHover: '#f59042',
    accentDim: 'rgba(237,121,37,0.18)',
    accentMuted: '#a8541b',

    // ── Text (foregrounds on dark) ──────────────────────────────
    textPrimary: '#e6eef6',
    textSecondary: '#9fb0c0',
    textTertiary: '#6b7c8f',
    textDisabled: '#3a4554',

    // ── Functional ──────────────────────────────────────────────
    success: '#4faf8f',
    successDim: 'rgba(79,175,143,0.18)',
    warning: '#f4a261',
    warningDim: 'rgba(244,162,97,0.18)',
    danger: '#e76f51',
    dangerDim: 'rgba(231,111,81,0.18)',
    info: '#4da3ff',
    aiAccent: '#7b61ff',

    // ── Pastel accent cards (per design-system.md §2.4) ─────────
    pastelPink: '#e9b7f5',
    pastelPinkText: '#3d0060',
    pastelPinkBorder: 'rgba(61,0,96,0.12)',

    pastelYellow: '#ffe8b4',
    pastelYellowText: '#4a3500',
    pastelYellowBorder: 'rgba(74,53,0,0.12)',

    pastelBlue: '#c9e4ff',
    pastelBlueText: '#0a2e52',
    pastelBlueBorder: 'rgba(10,46,82,0.14)',

    pastelGreen: '#b4f4d5',
    pastelGreenText: '#0a3d2b',
    pastelGreenBorder: 'rgba(10,61,43,0.14)',

    pastelOrange: '#ffd1b4',
    pastelOrangeText: '#5c2300',
    pastelOrangeBorder: 'rgba(92,35,0,0.14)',

    // ── Card aliases (used by legacy chip/insight code) ─────────
    // Mapped onto the pastel accents above to keep existing screens
    // visually consistent with the design-system.md palette.
    cardMint: '#b4f4d5',
    cardMintText: '#0a3d2b',
    cardMintBorder: 'rgba(10,61,43,0.14)',

    cardPeach: '#ffd1b4',
    cardPeachText: '#5c2300',
    cardPeachBorder: 'rgba(92,35,0,0.14)',

    cardLavender: '#e9b7f5',
    cardLavText: '#3d0060',
    cardLavBorder: 'rgba(61,0,96,0.14)',

    cardSky: '#c9e4ff',
    cardSkyText: '#0a2e52',
    cardSkyBorder: 'rgba(10,46,82,0.14)',

    cardYellow: '#ffe8b4',
    cardYellowText: '#4a3500',
    cardYellowBorder: 'rgba(74,53,0,0.12)',

    cardLilac: '#e9b7f5',
    cardLilacText: '#3d0060',
    cardLilacBorder: 'rgba(61,0,96,0.14)',

    cardCoral: '#ffd1b4',
    cardCoralText: '#5c2300',
    cardCoralBorder: 'rgba(92,35,0,0.14)',

    // Coach surface — matches lavender pastel (AI accent family)
    coachSurface: '#e9b7f5',
    coachText: '#3d0060',
    coachBorder: 'rgba(61,0,96,0.14)',
    coachAccent: '#7b61ff',
  },

  /** 4px-increment spacing scale per design-system.md §4. */
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    /** Horizontal page padding (design-system.md uses 24px). */
    screenH: 20,
    /** Internal card padding (standard cards). */
    cardPad: 20,
    /** Vertical gap between cards in a stack. */
    cardGap: 16,
    /** Vertical space between major page blocks. */
    blockGap: 24,
  },

  /** Border-radius scale per design-system.md §5.1. */
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    full: 9999,
  },
} as const;

/**
 * Pie / list / transaction icon colors — saturated palette tuned to read
 * cleanly on the dark page background.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Dining: '#ed7925',
  Groceries: '#4faf8f',
  Rent: '#7b61ff',
  Transport: '#4da3ff',
  Subscriptions: '#c026d3',
  Shopping: '#ec4899',
  Health: '#14b8a6',
  Travel: '#3b82f6',
  Income: '#4faf8f',
  Other: '#f4a261',
};

export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  Dining: '🍽',
  Groceries: '🛒',
  Rent: '🏠',
  Transport: '🚗',
  Subscriptions: '📱',
  Shopping: '🛍',
  Health: '💊',
  Travel: '✈️',
  Income: '💵',
  Other: '📦',
};
