import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Goal } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { ProgressRing } from './ProgressRing';
import type { GoalGapAnalysis } from '../lib/goalGapEngine';
import { formatCurrency } from '../lib/displayFormat';
import { monthlyShortfallForGoal } from '../lib/coachInsightCopy';

interface GoalCardProps {
  goal: Goal;
  monthlySurplus: number;
  analysis?: GoalGapAnalysis | null;
  onUpdateDueDate?: () => void;
}

function daysUntilDue(goal: Goal): number {
  const due = new Date(goal.dueDate + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

function badgeContent(
  goal: Goal,
  analysis: GoalGapAnalysis | null | undefined,
): { label: string; labelColor: string; bg: string } {
  const days = daysUntilDue(goal);
  if (days < 0) {
    return { label: 'Past due', labelColor: colors.cardCoralText, bg: colors.cardCoral };
  }

  if (analysis) {
    if (analysis.paceStatus === 'funded') {
      return { label: 'Funded', labelColor: colors.cardMintText, bg: colors.cardMint };
    }
    if (analysis.paceStatus === 'behind') {
      return { label: 'Behind', labelColor: colors.cardCoralText, bg: colors.cardCoral };
    }
    if (analysis.paceStatus === 'no_surplus') {
      return { label: 'No surplus', labelColor: colors.cardPeachText, bg: colors.cardPeach };
    }
    if (analysis.paceStatus === 'ahead') {
      return { label: 'Ahead', labelColor: colors.cardMintText, bg: colors.cardMint };
    }
    if (analysis.paceStatus === 'on_track' && days <= 30) {
      const dueLabel = days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`;
      return { label: dueLabel, labelColor: colors.cardPeachText, bg: colors.cardPeach };
    }
    return { label: 'On track', labelColor: colors.cardMintText, bg: colors.cardMint };
  }

  if (days <= 30) {
    const dueLabel = days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`;
    return { label: dueLabel, labelColor: colors.cardPeachText, bg: colors.cardPeach };
  }
  return { label: 'On track', labelColor: colors.cardMintText, bg: colors.cardMint };
}

function paceLine(goal: Goal, analysis: GoalGapAnalysis | null | undefined): { text: string; color: string } {
  if (!analysis) {
    return { text: '', color: colors.textSecondary };
  }
  if (analysis.paceStatus === 'funded') {
    return { text: 'Completed! \uD83C\uDF89', color: colors.success };
  }
  if (analysis.paceStatus === 'no_surplus') {
    return { text: analysis.gapSummaryLine, color: colors.textPrimary };
  }

  const hasProjection =
    analysis.projectedCompletion != null && analysis.remaining > 0 && analysis.monthlySurplus > 0;
  const dateStr = analysis.projectedCompletion
    ? analysis.projectedCompletion.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  if (hasProjection && analysis.paceStatus === 'behind') {
    const need = monthlyShortfallForGoal(goal, analysis.monthlySurplus);
    if (need > 0) {
      return { text: `Needs ${formatCurrency(need)}/mo more to hit deadline`, color: colors.warning };
    }
    return { text: `At current pace: ${dateStr}`, color: colors.warning };
  }

  if (hasProjection && dateStr) {
    if (analysis.paceStatus === 'ahead' || analysis.paceStatus === 'on_track') {
      return { text: `At current pace: ${dateStr}`, color: colors.success };
    }
  }

  return { text: analysis.gapSummaryLine, color: colors.textSecondary };
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  monthlySurplus,
  analysis,
  onUpdateDueDate,
}) => {
  const progress = goal.targetAmount > 0 ? Math.min(goal.savedAmount / goal.targetAmount, 1) : 0;
  const dueStr = new Date(goal.dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const { text: paceText, color: paceColor } = paceLine(goal, analysis);
  const ringFill = progress > 0 || monthlySurplus > 0 ? colors.primary : colors.textDisabled;
  const badge = badgeContent(goal, analysis);
  const isPastDue = daysUntilDue(goal) < 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ProgressRing
          progress={progress}
          size={52}
          strokeWidth={5}
          trackColor={colors.progressRingTrack}
          fillColor={ringFill}
        />
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={2}>
            {goal.emoji ? `${goal.emoji} ` : ''}
            {goal.title}
          </Text>
          <Text style={styles.meta}>
            {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)} · due {dueStr}
          </Text>
          {paceText ? <Text style={[styles.paceLine, { color: paceColor }]}>{paceText}</Text> : null}
          {isPastDue && onUpdateDueDate ? (
            <TouchableOpacity onPress={onUpdateDueDate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.updateDueDateLink}>Update due date →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.labelColor }]}>{badge.label}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: layout.cardPadding,
    marginBottom: tokens.spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  main: {
    flex: 1,
    minWidth: 0,
    paddingRight: 110,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMutedOnDark,
    marginTop: 4,
  },
  paceLine: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  updateDueDateLink: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
});
