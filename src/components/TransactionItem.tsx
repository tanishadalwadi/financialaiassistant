import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { tokens } from '../theme/tokens';
import { formatCurrency } from '../lib/displayFormat';
import { canonicalCategoryLabel, categoryColorForTx, categoryEmojiForTx } from '../lib/categoryVisuals';

interface TransactionItemProps {
  tx: Transaction;
  /** Tighter row for inside a grouped card (e.g. Home recent activity). */
  compact?: boolean;
  isLast?: boolean;
}

function trimDesc(s: string, max = 28): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return `rgba(255,255,255,${Math.max(0, Math.min(1, alpha))})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (![r, g, b].every((x) => Number.isFinite(x))) return `rgba(255,255,255,${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ tx, compact, isLast }) => {
  const isIncome = tx.isIncome && tx.amount > 0;
  const abs = Math.abs(tx.amount);
  const isSevereNegative = !isIncome && abs >= 1000;
  const amountStr = isIncome ? `+${formatCurrency(abs, abs % 1 !== 0 ? 2 : 0)}` : `-${formatCurrency(abs, abs % 1 !== 0 ? 2 : 0)}`;
  const dateShort = new Date(tx.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const cat = canonicalCategoryLabel(tx);
  const catColor = categoryColorForTx(tx);
  const emoji = categoryEmojiForTx(tx);
  const tileBg = hexToRgba(catColor, 0.15);
  const tileBorder = hexToRgba(catColor, 0.3);

  if (compact) {
    return (
      <View
        style={[
          styles.compactRow,
          !isLast && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={[styles.compactIconTile, { backgroundColor: tileBg, borderColor: tileBorder }]}>
          <Text style={styles.compactEmoji}>{emoji}</Text>
        </View>
        <View style={styles.middle}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {trimDesc(tx.description)}
          </Text>
          <Text style={styles.compactMeta}>
            {cat} · {dateShort}
          </Text>
        </View>
        <Text style={[styles.compactAmount, isIncome ? styles.amountIncome : isSevereNegative ? styles.amountNegative : styles.amountExpense]}>
          {amountStr}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={[styles.iconTile, { backgroundColor: tileBg, borderColor: tileBorder }]}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {cat}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, isIncome ? styles.amountIncome : isSevereNegative ? styles.amountNegative : styles.amountExpense]}>
          {amountStr}
        </Text>
        <Text style={styles.date}>
          {new Date(tx.date).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 0,
  },
  cardEmoji: {
    fontSize: 20,
  },
  middle: {
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    fontSize: 15,
  },
  category: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    ...typography.bodyStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  amountIncome: {
    color: colors.success,
  },
  amountExpense: {
    color: colors.primary,
  },
  amountNegative: {
    color: colors.danger,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xs,
  },
  compactIconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 0,
  },
  compactEmoji: {
    fontSize: 18,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  compactMeta: {
    fontSize: 11,
    color: colors.textMutedOnDark,
    marginTop: 2,
  },
  compactAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
});
