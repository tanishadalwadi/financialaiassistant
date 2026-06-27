import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Insight } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';

export type InsightGroup = { label: string; items: Insight[] };

function toneColor(tone: Insight['tone']): string {
  if (tone === 'positive') return colors.success;
  if (tone === 'warning') return colors.warning;
  return colors.textSecondary;
}

type Props = {
  groups: InsightGroup[];
  paceTitle?: string;
  paceBody: string;
  paceFooterHint: string;
  onPressPace?: () => void;
};

/**
 * Single surface grouping AI perspective rows by impact label to cut vertical scroll.
 */
export const InsightPerspectiveCard: React.FC<Props> = ({
  groups,
  paceTitle = 'If you keep this pace…',
  paceBody,
  paceFooterHint,
  onPressPace,
}) => {
  const paceEnabled = Boolean(onPressPace);

  return (
    <LinearGradient
      colors={['rgba(217, 245, 74, 0.1)', 'rgba(139, 124, 255, 0.08)', colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {groups.map((g, gi) => (
        <View key={g.label} style={gi > 0 ? styles.groupBlock : undefined}>
          {gi > 0 ? <View style={styles.groupRule} /> : null}
          <Text style={styles.overline}>{g.label}</Text>
          {g.items.map((ins) => (
            <View key={ins.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: toneColor(ins.tone) }]} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{ins.title}</Text>
                <Text style={styles.rowBody}>{ins.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}

      {groups.length > 0 ? <View style={styles.groupRule} /> : null}
      <Text style={styles.overline}>Lead goal</Text>
      <TouchableOpacity
        style={[styles.paceBlock, !paceEnabled && styles.paceBlockDisabled]}
        onPress={onPressPace}
        disabled={!paceEnabled}
        activeOpacity={paceEnabled ? 0.85 : 1}
        accessibilityRole={paceEnabled ? 'button' : 'text'}
        accessibilityLabel={paceEnabled ? `${paceTitle}. ${paceFooterHint}` : undefined}
      >
        <Text style={styles.paceTitle}>{paceTitle}</Text>
        <Text style={styles.paceBody}>{paceBody}</Text>
        <View style={styles.paceFooter}>
          <Text style={styles.paceFooterText}>{paceFooterHint}</Text>
          {paceEnabled ? <Ionicons name="arrow-forward" size={16} color={colors.primary} /> : null}
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  groupBlock: {
    marginTop: tokens.spacing.md,
  },
  groupRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginBottom: tokens.spacing.md,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
    marginBottom: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: tokens.spacing.sm,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    fontSize: 14,
  },
  rowBody: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  paceBlock: {
    paddingTop: tokens.spacing.xs,
  },
  paceBlockDisabled: {
    opacity: 0.95,
  },
  paceTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
    fontSize: 15,
  },
  paceBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
  paceFooter: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paceFooterText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
});
