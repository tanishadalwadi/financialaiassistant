import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SpendingCategorySummary } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { tokens } from '../theme/tokens';
import { formatCurrency } from '../lib/displayFormat';

export const CategoryRow: React.FC<{
  item: SpendingCategorySummary;
  /** When set, red pill for cap breach (spent − cap). */
  capOverBy?: number;
}> = ({ item, capOverBy }) => {
  const dec = item.total % 1 !== 0 ? 2 : 0;
  const showBreach = capOverBy != null && capOverBy > 0;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <View style={styles.mid}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          {showBreach ? (
            <View style={styles.breachPill}>
              <Text style={styles.breachPillText}>Over by {formatCurrency(capOverBy, 0)}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.value}>{formatCurrency(item.total, dec)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  breachPill: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    marginLeft: 8,
    flexShrink: 0,
  },
  breachPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  value: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginLeft: 8,
  },
});
