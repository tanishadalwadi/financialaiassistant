import { tokens } from './tokens';

const { spacing, radius } = tokens;

/**
 * Layout primitives — aligned with `design-system.md` §4 / §5.
 *
 * - Screen horizontal padding: 24 (design-system.md `px-6`).
 * - Card radius: 20 (standard cards) / 24 (large feature cards).
 * - Section gap: 16 / 24.
 */
export const layout = {
  /** Horizontal page padding (design-system.md uses 24px). */
  screenPadding: 24,
  /** Standard card border radius (20px). */
  cardRadius: radius.lg,
  /** Large feature card border radius (24px). */
  cardRadiusLarge: radius.xl,
  /** Spotlight / hero radius (28px). */
  spotlightRadius: radius.xxl,
  /** Pills, badges, buttons. */
  chipRadius: radius.full,
  /** Internal card padding (24px). */
  cardPadding: spacing.xxl,
  /** Large feature card padding (28px). */
  cardPaddingLarge: spacing.xxxl,
  /** Gap between stacked cards. */
  sectionGap: spacing.lg,
  /** Vertical space between major page blocks. */
  blockGap: spacing.xxl,
  /** Bottom clearance for floating tab bar (design-system.md `pb-28`). */
  tabBarClearance: 112,
};
