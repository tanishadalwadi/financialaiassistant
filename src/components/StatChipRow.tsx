import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { formatCurrency } from '../lib/displayFormat';

type Props = {
  totalBalance: number;
  income: number;
  spent: number;
  surplus: number;
  incomeSubtitle?: string;
};

export const StatChipRow: React.FC<Props> = ({
  totalBalance,
  income,
  spent,
  surplus,
  incomeSubtitle = 'This month',
}) => {
  const surplusTheme =
    surplus > 0
      ? { bg: colors.cardMint, text: colors.cardMintText, border: colors.cardMintBorder }
      : surplus === 0
        ? { bg: colors.cardSky, text: colors.cardSkyText, border: colors.cardSkyBorder }
        : { bg: colors.cardCoral, text: colors.cardCoralText, border: colors.cardCoralBorder };

  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>Total Balance</Text>
      <Text style={styles.heroValue}>{formatCurrency(totalBalance, 2)}</Text>
      <View style={styles.row}>
        <View style={[styles.chip, styles.incomeChip]}>
          <Ionicons name="trending-up" size={16} color={colors.cardMintText} style={styles.chipTrendIcon} />
          <Text style={styles.chipLabel}>Income</Text>
          <Text style={[styles.chipValue, { color: colors.cardMintText }]}>{formatCurrency(income)}</Text>
          <Text style={styles.chipMeta}>{incomeSubtitle}</Text>
        </View>
        <View style={[styles.chip, styles.expenseChip]}>
          <Ionicons name="trending-down" size={16} color={colors.cardPeachText} style={styles.chipTrendIcon} />
          <Text style={styles.chipLabel}>Spent</Text>
          <Text style={[styles.chipValue, { color: colors.cardPeachText }]}>{formatCurrency(spent)}</Text>
          <Text style={styles.chipMeta}>This month</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: surplusTheme.bg, borderColor: surplusTheme.border }]}>
          <Ionicons
            name={surplus > 0 ? 'trending-up' : surplus < 0 ? 'trending-down' : 'analytics-outline'}
            size={16}
            color={surplusTheme.text}
            style={styles.chipTrendIcon}
          />
          <Text style={styles.chipLabel}>Surplus</Text>
          <Text style={[styles.chipValue, { color: surplusTheme.text }]}>{formatCurrency(surplus)}</Text>
          <Text style={styles.chipMeta}>This month</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: tokens.spacing.lg,
    marginBottom: layout.blockGap,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 3,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: tokens.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    width: '100%',
  },
  chip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.sm,
    minWidth: 0,
    borderWidth: 1,
  },
  incomeChip: {
    backgroundColor: colors.cardMint,
    borderColor: colors.cardMintBorder,
  },
  expenseChip: {
    backgroundColor: colors.cardPeach,
    borderColor: colors.cardPeachBorder,
  },
  chipTrendIcon: { marginBottom: 2 },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textOnSpotlightMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  chipMeta: {
    fontSize: 10,
    color: colors.textOnSpotlightMuted,
    marginTop: 4,
  },
});
