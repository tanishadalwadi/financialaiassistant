/**
 * Typography system — aligned with `design-system.md` §3.
 * Uses default system font: San Francisco on iOS, Roboto on Android.
 */
export const typography = {
  // ── Display & headings ──────────────────────────────────────
  /** Hero titles, onboarding (32 / 800). */
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    letterSpacing: -0.64,
  },
  /** Page titles (30 / 700, tracking -0.02em). */
  h1: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  /** Section headers (24 / 700). */
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  /** Card headers (18 / 600). */
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  /** Small headers, labels (15 / 600). */
  h4: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // ── Body & labels ───────────────────────────────────────────
  /** Standard body text (15 / 400). */
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  /** Secondary body (13 / 400). */
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  /** Labels & captions (12 / 500). */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  /** Micro text, timestamps (11 / 500). */
  tiny: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  /** Uppercase labels (10 / 700, tracking +0.05em). */
  overline: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },

  // ── Data display ────────────────────────────────────────────
  numberHero: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  numberLarge: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  numberMedium: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },

  // ── Legacy aliases (existing call sites) ────────────────────
  hero: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    letterSpacing: -0.64,
  },
  titleXL: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  titleL: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  titleM: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  chipLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  chipValue: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  screenTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
};
