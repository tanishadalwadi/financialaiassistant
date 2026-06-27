import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { CategoryGoalLink, GoalGapAnalysis } from '../lib/goalGapEngine';
import type { GoalBehaviorRow } from '../lib/goalBehaviorRows';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';

type Props = {
  analysis: GoalGapAnalysis;
  categoryLink: CategoryGoalLink | null;
  behaviorRows: GoalBehaviorRow[];
  onCoachPlan?: () => void;
};

export const GoalBehaviorCard: React.FC<Props> = ({ analysis, categoryLink, behaviorRows, onCoachPlan }) => {
  const funded = analysis.paceStatus === 'funded' || analysis.remaining <= 0;
  const isBlocked = analysis.paceStatus === 'no_surplus' || analysis.paceStatus === 'behind';
  const cardTone = funded
    ? { bg: colors.cardMint, border: colors.cardMintBorder, text: colors.cardMintText }
    : isBlocked
      ? { bg: colors.cardPeach, border: colors.cardPeachBorder, text: colors.cardPeachText }
      : { bg: colors.cardSky, border: colors.cardSkyBorder, text: colors.cardSkyText };

  const statusLabel = funded
    ? 'Funded'
    : analysis.paceStatus === 'ahead'
      ? 'Ahead'
      : analysis.paceStatus === 'on_track'
        ? 'On track'
        : analysis.paceStatus === 'behind'
          ? 'Behind'
          : 'No timeline yet';

  const kicker = funded ? "How you're tracking" : "What's blocking this goal";

  const statusColor =
    analysis.paceStatus === 'funded' || analysis.paceStatus === 'ahead' || analysis.paceStatus === 'on_track'
      ? colors.success
      : analysis.paceStatus === 'behind'
        ? colors.warning
        : colors.textPrimary;

  return (
    <View style={[styles.card, { backgroundColor: cardTone.bg, borderColor: cardTone.border }]}>
      <Text style={[styles.kicker, !funded && styles.kickerBlocking]}>{kicker}</Text>
      <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      <Text style={[styles.summary, { color: cardTone.text }]}>{analysis.gapSummaryLine}</Text>

      {!funded && behaviorRows.length > 0 ? (
        <View style={styles.rowsSection}>
          {behaviorRows.map((row) => (
            <View key={row.key} style={styles.behaviorRow}>
              <View style={styles.rowDot} />
              <Text style={[styles.rowText, { color: cardTone.text }]}>{row.line}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {categoryLink && !funded && behaviorRows.length === 0 ? (
        <View style={styles.linkBox}>
          <Text style={styles.linkLabel}>Top category lever</Text>
          <Text style={[styles.linkBody, { color: cardTone.text }]}>{categoryLink.sentence}</Text>
        </View>
      ) : null}

      <View style={styles.behaviorBox}>
        <Text style={[styles.behaviorTitle, { color: cardTone.text }]}>{analysis.behaviorTitle}</Text>
        <Text style={[styles.behaviorBody, { color: cardTone.text }]}>{analysis.behaviorBody}</Text>
      </View>

      {!funded && onCoachPlan ? (
        <TouchableOpacity style={styles.coachCtaWrap} onPress={onCoachPlan} activeOpacity={0.85}>
          <Text style={styles.coachCta}>Talk to coach about a plan →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  kicker: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontSize: 13,
  },
  kickerBlocking: {
    color: colors.cardPeachText,
  },
  status: {
    ...typography.titleM,
    marginTop: 6,
  },
  summary: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: 8,
    fontWeight: '600',
  },
  rowsSection: {
    marginTop: 14,
  },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  rowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.coachAccent,
    marginTop: 6,
    marginRight: 10,
  },
  rowText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  linkBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  linkLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  linkBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  behaviorBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  behaviorTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
  },
  behaviorBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  coachCtaWrap: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  coachCta: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.coachAccent,
  },
});
