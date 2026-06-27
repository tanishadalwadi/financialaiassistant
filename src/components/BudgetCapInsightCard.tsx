import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CapBreach } from '../lib/insightsFromData';
import { capBreachHintForIndex } from '../lib/insightsFromData';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { formatCurrency } from '../lib/displayFormat';

type Props = {
  breach: CapBreach;
  /** Picks a varied hint line (see CAP_BREACH_HINTS). */
  hintIndex: number;
};

/**
 * One card per category over cap — avoids a single long “document” list.
 */
export const BudgetCapInsightCard: React.FC<Props> = ({ breach, hintIndex }) => {
  const decS = breach.spent % 1 !== 0 ? 2 : 0;
  const decC = breach.cap % 1 !== 0 ? 2 : 0;
  return (
    <View style={styles.card} accessibilityLabel={`Budget cap: ${breach.label}`}>
      <Text style={styles.overline}>Budget cap</Text>
      <Text style={styles.title}>{breach.label}</Text>
      <Text style={styles.amounts}>
        {formatCurrency(breach.spent, decS)} spent · cap {formatCurrency(breach.cap, decC)}
      </Text>
      <Text style={styles.hint}>{capBreachHintForIndex(hintIndex)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: layout.cardPadding,
    marginBottom: layout.sectionGap,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
    marginBottom: tokens.spacing.xs,
  },
  title: {
    ...typography.titleM,
    color: colors.textPrimary,
    fontSize: 17,
    marginBottom: tokens.spacing.sm,
  },
  amounts: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: tokens.spacing.md,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
