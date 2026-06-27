import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import AnimatedRN from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';
import { RootStackParamList } from '../navigation';
import { topFlexibleCategory } from '../lib/coachInsightCopy';
import { buildGoalBehaviorRows } from '../lib/goalBehaviorRows';
import { buildGoalDetailCoachPrompt } from '../lib/goalDetailCopy';
import { colors } from '../theme/colors';
import { tokens } from '../theme/tokens';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { mapGoalFromDb } from '../lib/supabaseMappers';
import type { Goal } from '../types/models';
import { useProfile } from '../contexts/ProfileContext';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import { analyzeGoalGaps } from '../lib/goalGapEngine';
import { formatCurrency } from '../lib/displayFormat';
import { AppButton } from '../components/ui/AppButton';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { useChartScrollAnimatedStyle } from '../scroll/useChartScrollAnimatedStyle';

type GoalRow = Database['public']['Tables']['goals']['Row'];

type Props = NativeStackScreenProps<RootStackParamList, 'GoalDetails'>;

type GoalPastelTheme = {
  heroBg: string;
  heroText: string;
  heroSubtext: string;
  backBg: string;
  backBorder: string;
};

const GOAL_PASTEL_THEMES: GoalPastelTheme[] = [
  {
    heroBg: tokens.colors.pastelOrange,
    heroText: tokens.colors.pastelOrangeText,
    heroSubtext: 'rgba(92, 35, 0, 0.62)',
    backBg: 'rgba(255, 255, 255, 0.55)',
    backBorder: 'rgba(92, 35, 0, 0.14)',
  },
  {
    heroBg: tokens.colors.pastelBlue,
    heroText: tokens.colors.pastelBlueText,
    heroSubtext: 'rgba(10, 46, 82, 0.62)',
    backBg: 'rgba(255, 255, 255, 0.55)',
    backBorder: 'rgba(10, 46, 82, 0.14)',
  },
  {
    heroBg: tokens.colors.pastelGreen,
    heroText: tokens.colors.pastelGreenText,
    heroSubtext: 'rgba(10, 61, 43, 0.62)',
    backBg: 'rgba(255, 255, 255, 0.55)',
    backBorder: 'rgba(10, 61, 43, 0.14)',
  },
  {
    heroBg: tokens.colors.pastelPink,
    heroText: tokens.colors.pastelPinkText,
    heroSubtext: 'rgba(61, 0, 96, 0.62)',
    backBg: 'rgba(255, 255, 255, 0.55)',
    backBorder: 'rgba(61, 0, 96, 0.14)',
  },
  {
    heroBg: tokens.colors.pastelYellow,
    heroText: tokens.colors.pastelYellowText,
    heroSubtext: 'rgba(74, 53, 0, 0.62)',
    backBg: 'rgba(255, 255, 255, 0.55)',
    backBorder: 'rgba(74, 53, 0, 0.14)',
  },
];

function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function monthsFromNowToDue(due: Date, now: Date): number {
  const ms = due.getTime() - now.getTime();
  return Math.max(0.25, ms / (30.44 * 86400000));
}

function buildCumulativeSavedSeries(
  createdAtIso: string,
  savedAmount: number,
  now = new Date(),
): { labels: string[]; values: number[] } | null {
  if (savedAmount <= 0) return null;

  const created = new Date(createdAtIso);
  created.setHours(12, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(created.getFullYear(), created.getMonth(), 1);

  const labels: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    labels.push(cursor.toLocaleDateString('en-US', { month: 'short' }));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  if (labels.length === 0) {
    return { labels: [now.toLocaleDateString('en-US', { month: 'short' })], values: [savedAmount] };
  }

  const n = labels.length;
  if (n === 1) {
    return { labels: ['Start', labels[0]], values: [0, savedAmount] };
  }

  const values = labels.map((_, i) => Math.round((savedAmount * i) / (n - 1)));
  return { labels, values };
}

function GoalHeroProgressRing({ progress }: { progress: number }) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - circumference * clamped;

  return (
    <View style={heroRingStyles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          stroke={tokens.colors.borderHover}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={tokens.colors.accent}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={heroRingStyles.center}>
        <Text style={heroRingStyles.percent}>{`${Math.round(clamped * 100)}%`}</Text>
        <Text style={heroRingStyles.completeLabel}>COMPLETE</Text>
      </View>
    </View>
  );
}

const heroRingStyles = StyleSheet.create({
  wrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  percent: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  completeLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export const GoalDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { spendingByCategory, monthIncome, monthExpenses } = useGoalsTransactions();
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [goalCreatedAt, setGoalCreatedAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [contribAmount, setContribAmount] = React.useState('');
  const [savingContrib, setSavingContrib] = React.useState(false);
  const [editDueOpen, setEditDueOpen] = React.useState(false);
  const [dueDateDraft, setDueDateDraft] = React.useState('');
  const [savingDueDate, setSavingDueDate] = React.useState(false);
  const { animatedStyle: chartScrollStyle, anchorRef, onLayout, hasScrollContext } = useChartScrollAnimatedStyle();
  const pastelTheme = React.useMemo(() => {
    const key = route.params.goalId ?? 'goal';
    const idx = stableHash(key) % GOAL_PASTEL_THEMES.length;
    return GOAL_PASTEL_THEMES[idx];
  }, [route.params.goalId]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.from('goals').select('*').eq('id', route.params.goalId).maybeSingle();
      if (cancelled) return;
      if (error) {
        setErr(error.message);
        setGoal(null);
        setGoalCreatedAt(null);
      } else if (!data) {
        setErr('Goal not found.');
        setGoal(null);
        setGoalCreatedAt(null);
      } else {
        const row = data as GoalRow;
        setGoal(mapGoalFromDb(row));
        setGoalCreatedAt(row.created_at);
        setDueDateDraft(row.due_date);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [route.params.goalId]);

  React.useEffect(() => {
    if (!goal) return;
    if (route.params.focusDueDateEditor) {
      setDueDateDraft(goal.dueDate);
      setEditDueOpen(true);
    }
  }, [goal?.id, route.params.focusDueDateEditor]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: pastelTheme.heroBg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!goal || err) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: pastelTheme.heroBg }]}>
        <Text style={styles.errText}>{err ?? 'Goal not found.'}</Text>
        <TouchableOpacity style={styles.backWide} onPress={() => navigation.goBack()}>
          <Text style={styles.backWideLabel}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = goal.targetAmount > 0 ? Math.min(1, goal.savedAmount / goal.targetAmount) : 0;
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);

  const profileMonthlyIncome = Number(profile?.monthly_income ?? 0);
  const incomeSnapshot = profileMonthlyIncome > 0 ? profileMonthlyIncome : monthIncome;
  const monthlySurplus = Math.max(0, incomeSnapshot - monthExpenses);
  const gapAnalysis = analyzeGoalGaps({
    goals: [goal],
    monthlySurplus,
    spendingByCategory,
  })[0];
  const topBlocking = topFlexibleCategory(spendingByCategory) ?? spendingByCategory[0];

  const behaviorRows = buildGoalBehaviorRows(spendingByCategory, gapAnalysis);

  const dueDate = new Date(goal.dueDate + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);
  const rawDaysUntil = Math.ceil((dueDay.getTime() - today.getTime()) / 86400000);
  const pastDue = rawDaysUntil < 0;

  const monthsLeft = monthsFromNowToDue(dueDate, new Date());
  const monthlyNeeded = remaining > 0 ? remaining / monthsLeft : 0;
  const savingsBlocked = remaining > 0 && monthlySurplus <= 0;
  const showBehaviorCard = remaining > 0 && (monthlySurplus <= 0 || gapAnalysis.paceStatus === 'behind');

  const filteredBehaviorRows = behaviorRows
    .filter((row) => {
      const lower = row.line.toLowerCase();
      return !lower.includes('rent');
    })
    .slice(0, 3);

  const flexCat = topBlocking;
  const flexAmt = flexCat?.total ?? 0;
  const flexLabel = flexCat?.label ?? 'discretionary';
  const trimSaving = Math.round(flexAmt * 0.3);
  const aiBody = `Your largest flexible spend is ${flexLabel} at ${formatCurrency(flexAmt)}/mo. Trimming it by 30% would free ${formatCurrency(trimSaving)}/mo toward this goal.`;

  const chartSeries =
    goalCreatedAt != null ? buildCumulativeSavedSeries(goalCreatedAt, goal.savedAmount) : null;
  const windowW = Dimensions.get('window').width;
  const chartCardInnerW = windowW - 32 - 32;
  const chartWidth = Math.max(200, chartCardInnerW);

  const onCoachPlan = () => {
    const prompt = buildGoalDetailCoachPrompt(goal, remaining, monthlySurplus, topBlocking);
    navigation.navigate('MainTabs', { screen: 'Coach', params: { preloadedPrompt: prompt } });
  };

  const addContribution = async () => {
    const add = Number(String(contribAmount).replace(/,/g, '').trim());
    if (!Number.isFinite(add) || add <= 0) {
      Alert.alert('Amount', 'Enter a positive number to add to this goal.');
      return;
    }
    const nextSaved = goal.savedAmount + add;
    setSavingContrib(true);
    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('goals')
      .update({ saved_amount: nextSaved, updated_at: now })
      .eq('id', goal.id);
    setSavingContrib(false);
    if (upErr) {
      Alert.alert('Could not save', upErr.message);
      return;
    }
    setGoal({ ...goal, savedAmount: nextSaved });
    setContribAmount('');
    Alert.alert('Saved!', `${formatCurrency(add)} added to this goal.`);
  };

  const saveDueDate = async () => {
    if (!goal) return;
    const trimmed = dueDateDraft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      Alert.alert('Due date', 'Use YYYY-MM-DD format.');
      return;
    }
    setSavingDueDate(true);
    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('goals')
      .update({ due_date: trimmed, updated_at: now })
      .eq('id', goal.id);
    setSavingDueDate(false);
    if (upErr) {
      Alert.alert('Could not save', upErr.message);
      return;
    }
    setGoal({ ...goal, dueDate: trimmed });
    setEditDueOpen(false);
    Alert.alert('Saved', 'Due date updated.');
  };

  return (
    <View style={[styles.container, { backgroundColor: pastelTheme.heroBg }]}>
      <ScreenAnimatedScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.heroTop, { paddingTop: insets.top + 12, backgroundColor: pastelTheme.heroBg }]}>
          <TouchableOpacity
            style={[styles.backRow, { backgroundColor: pastelTheme.backBg, borderColor: pastelTheme.backBorder }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to Goals"
          >
            <Ionicons name="chevron-back" size={20} color={pastelTheme.heroText} />
            <Text style={[styles.backLabel, { color: pastelTheme.heroText }]}>Back to Goals</Text>
          </TouchableOpacity>

          <View style={styles.heroContentRow}>
            <View style={styles.emojiTile}>
              <Text style={styles.emojiInTile}>{goal.emoji || '🎯'}</Text>
            </View>
            <View style={styles.heroTextCol}>
              <Text style={[styles.heroGoalName, { color: pastelTheme.heroText }]}>{goal.title}</Text>
              <Text style={[styles.heroSubtitle, { color: pastelTheme.heroSubtext }]}>
                {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} Goal
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.darkCard}>
          <View style={styles.ringWrap}>
            <GoalHeroProgressRing progress={progress} />
          </View>

          <View style={styles.chipsScrollOuter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContent}
            >
              <View style={[styles.statChip, styles.chipRemaining]}>
                <View style={styles.chipTopRow}>
                  <Text style={styles.chipIconRemaining}>⊙</Text>
                  <Text style={styles.chipOverlineRemaining}>REMAINING</Text>
                </View>
                <Text style={styles.chipValueRemaining}>{formatCurrency(remaining)}</Text>
              </View>

              <View style={[styles.statChip, styles.chipDays]}>
                <View style={styles.chipTopRow}>
                  <Text style={styles.chipIconDays}>📅</Text>
                  <Text style={styles.chipOverlineDays}>DAYS</Text>
                </View>
                {pastDue ? (
                  <Text style={styles.chipValuePastDue}>Past due</Text>
                ) : (
                  <Text style={styles.chipValueDays}>{String(Math.max(0, rawDaysUntil))}</Text>
                )}
              </View>

              <View style={[styles.statChip, styles.chipSaved]}>
                <View style={styles.chipTopRow}>
                  <Text style={styles.chipIconSaved}>✓</Text>
                  <Text style={styles.chipOverlineSaved}>SAVED</Text>
                </View>
                <Text style={styles.chipValueSaved}>{formatCurrency(goal.savedAmount)}</Text>
              </View>

              <View style={[styles.statChip, styles.chipTarget]}>
                <View style={styles.chipTopRow}>
                  <Text style={styles.chipIconTarget}>⚑</Text>
                  <Text style={styles.chipOverlineTarget}>TARGET</Text>
                </View>
                <Text style={styles.chipValueTarget}>{formatCurrency(goal.targetAmount)}</Text>
              </View>
            </ScrollView>
          </View>

          <View style={styles.recommendedCard}>
            <View style={styles.recommendedHeader}>
              <Text style={styles.recommendedTrend}>↗</Text>
              <Text style={styles.recommendedOverline}>RECOMMENDED MONTHLY SAVING</Text>
            </View>
            {savingsBlocked ? (
              <>
                <Text style={styles.recommendedBlocked}>No surplus yet</Text>
                <Text style={styles.recommendedSub}>Add income or reduce spending first</Text>
              </>
            ) : (
              <>
                <Text style={styles.recommendedAmount}>{formatCurrency(monthlyNeeded)}</Text>
                <Text style={styles.recommendedSub}>To reach your goal on time</Text>
              </>
            )}
          </View>

          <AnimatedRN.View style={hasScrollContext ? chartScrollStyle : undefined}>
            <View
              ref={hasScrollContext ? anchorRef : undefined}
              onLayout={hasScrollContext ? onLayout : undefined}
              collapsable={hasScrollContext ? false : undefined}
              style={styles.chartCard}
            >
            <Text style={styles.chartTitle}>Progress Over Time</Text>
            {chartSeries ? (
              <LineChart
                data={{
                  labels: chartSeries.labels,
                  datasets: [{ data: chartSeries.values }],
                }}
                width={chartWidth}
                height={180}
                withShadow={false}
                withInnerLines
                withOuterLines={false}
                withVerticalLines={false}
                withDots
                bezier
                chartConfig={{
                  backgroundColor: tokens.colors.bgCard,
                  backgroundGradientFrom: tokens.colors.bgCard,
                  backgroundGradientTo: tokens.colors.bgCard,
                  decimalPlaces: 0,
                  color: () => tokens.colors.accent,
                  labelColor: (opacity = 1) => `rgba(159, 176, 192, ${opacity})`,
                  propsForBackgroundLines: {
                    stroke: tokens.colors.borderHover,
                    strokeWidth: 1,
                  },
                  propsForLabels: {
                    fontSize: 12,
                  },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: tokens.colors.textPrimary,
                    fill: tokens.colors.accent,
                  },
                }}
                style={styles.lineChart}
                formatYLabel={(v) => {
                  const n = Number(v);
                  return formatCurrency(Number.isFinite(n) ? n : 0, 0);
                }}
              />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>
                  Add contributions to see your progress over time
                </Text>
                <View style={styles.chartDashed} />
                <Text style={styles.chartEmptyZero}>{formatCurrency(0)}</Text>
              </View>
            )}
            </View>
          </AnimatedRN.View>

          {showBehaviorCard ? (
            <View style={styles.behaviorCard}>
              <Text style={styles.behaviorTitle}>What's blocking this goal</Text>
              {filteredBehaviorRows.map((row, index, arr) => {
                const amountMatch = row.line.match(/\+\$[\d,]+(?:\.\d+)?\/mo/i)?.[0] ?? '';
                const action = row.line.replace(/\s*[→-]\s*\+\$[\d,]+(?:\.\d+)?\/mo/i, '').trim();
                return (
                  <View
                    key={row.key}
                    style={[styles.behaviorRow, index < arr.length - 1 ? styles.behaviorRowBorder : null]}
                  >
                    <View style={styles.behaviorDot} />
                    <Text style={styles.behaviorAction}>{action}</Text>
                    <Text style={styles.behaviorImpact}>{amountMatch}</Text>
                  </View>
                );
              })}
              <TouchableOpacity onPress={onCoachPlan}>
                <Text style={styles.behaviorCta}>Talk to coach about a plan →</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.savingsCard}>
            <Text style={styles.savingsTitle}>Add to savings</Text>
            <Text style={styles.savingsBody}>Record money you've set aside.</Text>
            <TextInput
              value={contribAmount}
              onChangeText={setContribAmount}
              placeholder="$0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={styles.input}
            />
            <AppButton
              label="Save to goal"
              onPress={() => void addContribution()}
              variant="primary"
              size="lg"
              fullWidth
              loading={savingContrib}
              disabled={savingContrib}
              style={styles.saveBtn}
            />
          </View>

          <View style={styles.aiCard}>
            <Text style={styles.aiOverline}>AI SUGGESTION</Text>
            <Text style={styles.aiBody}>{aiBody}</Text>
          </View>
        </View>
      </ScreenAnimatedScrollView>

      <Modal visible={editDueOpen} transparent animationType="fade" onRequestClose={() => setEditDueOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update due date</Text>
            <Text style={styles.modalBody}>Use YYYY-MM-DD format.</Text>
            <TextInput
              value={dueDateDraft}
              onChangeText={setDueDateDraft}
              autoFocus
              placeholder="2026-12-31"
              placeholderTextColor={colors.textSecondary}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <AppButton label="Cancel" onPress={() => setEditDueOpen(false)} variant="secondary" flex />
              <AppButton
                label="Save"
                onPress={() => void saveDueDate()}
                variant="primary"
                flex
                loading={savingDueDate}
                disabled={savingDueDate}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  errText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backWide: {
    marginTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.xxl,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    backgroundColor: colors.primary,
  },
  backWideLabel: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  heroTop: {
    backgroundColor: 'transparent',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: tokens.spacing.xxxl + tokens.spacing.xxl,
    minHeight: 240,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xxxl,
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 2,
    borderWidth: 1,
  },
  backLabel: {
    ...typography.h4,
    fontWeight: '600',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.lg,
  },
  emojiTile: {
    width: 84,
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiInTile: {
    fontSize: 44,
  },
  heroTextCol: {
    flex: 1,
  },
  heroGoalName: {
    ...typography.display,
    marginBottom: tokens.spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
  },
  darkCard: {
    backgroundColor: colors.background,
    marginTop: -36,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: tokens.spacing.xxxl,
    paddingHorizontal: layout.screenPadding,
    flexGrow: 1,
  },
  ringWrap: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xxl,
  },
  chipsScrollOuter: {
    marginHorizontal: -layout.screenPadding,
    marginBottom: tokens.spacing.xl,
  },
  chipsScrollContent: {
    paddingHorizontal: layout.screenPadding,
    gap: tokens.spacing.md,
    paddingRight: 72,
    flexDirection: 'row',
  },
  statChip: {
    minWidth: 140,
    height: 96,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
  },
  chipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipRemaining: {
    backgroundColor: tokens.colors.pastelYellow,
    borderColor: tokens.colors.pastelYellowBorder,
  },
  chipIconRemaining: {
    fontSize: 16,
    color: tokens.colors.pastelYellowText,
  },
  chipOverlineRemaining: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.pastelYellowText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipValueRemaining: {
    marginTop: tokens.spacing.sm,
    fontSize: 22,
    fontWeight: '700',
    color: tokens.colors.pastelYellowText,
  },
  chipDays: {
    backgroundColor: tokens.colors.pastelBlue,
    borderColor: tokens.colors.pastelBlueBorder,
  },
  chipIconDays: {
    fontSize: 14,
  },
  chipOverlineDays: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.pastelBlueText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipValueDays: {
    marginTop: tokens.spacing.sm,
    fontSize: 22,
    fontWeight: '700',
    color: tokens.colors.pastelBlueText,
  },
  chipValuePastDue: {
    marginTop: tokens.spacing.sm,
    fontSize: 22,
    fontWeight: '700',
    color: tokens.colors.danger,
  },
  chipSaved: {
    backgroundColor: tokens.colors.pastelGreen,
    borderColor: tokens.colors.pastelGreenBorder,
  },
  chipIconSaved: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.pastelGreenText,
  },
  chipOverlineSaved: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.pastelGreenText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipValueSaved: {
    marginTop: tokens.spacing.sm,
    fontSize: 22,
    fontWeight: '700',
    color: tokens.colors.pastelGreenText,
  },
  chipTarget: {
    backgroundColor: tokens.colors.pastelPink,
    borderColor: tokens.colors.pastelPinkBorder,
  },
  chipIconTarget: {
    fontSize: 14,
    color: tokens.colors.pastelPinkText,
  },
  chipOverlineTarget: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.pastelPinkText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipValueTarget: {
    marginTop: tokens.spacing.sm,
    fontSize: 22,
    fontWeight: '700',
    color: tokens.colors.pastelPinkText,
  },
  recommendedCard: {
    backgroundColor: tokens.colors.pastelPink,
    borderWidth: 1,
    borderColor: tokens.colors.pastelPinkBorder,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recommendedTrend: {
    fontSize: 16,
    color: tokens.colors.aiAccent,
  },
  recommendedOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.aiAccent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recommendedAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: tokens.colors.pastelPinkText,
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  recommendedBlocked: {
    fontSize: 32,
    fontWeight: '800',
    color: tokens.colors.danger,
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  recommendedSub: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(61, 0, 96, 0.72)',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
  },
  chartTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: tokens.spacing.lg,
  },
  lineChart: {
    marginLeft: -tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  chartEmpty: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
  },
  chartEmptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
  },
  chartDashed: {
    width: '100%',
    maxWidth: 220,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginBottom: tokens.spacing.sm,
  },
  chartEmptyZero: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  behaviorCard: {
    backgroundColor: tokens.colors.pastelOrange,
    borderWidth: 1,
    borderColor: tokens.colors.pastelOrangeBorder,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
  },
  behaviorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.pastelOrangeText,
    marginBottom: tokens.spacing.md,
  },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 2,
  },
  behaviorRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.pastelOrangeBorder,
  },
  behaviorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  behaviorAction: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: tokens.colors.pastelOrangeText,
  },
  behaviorImpact: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.pastelOrangeText,
    textAlign: 'right',
  },
  behaviorCta: {
    marginTop: tokens.spacing.md,
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.pastelOrangeText,
  },
  savingsCard: {
    backgroundColor: tokens.colors.pastelBlue,
    borderWidth: 1,
    borderColor: tokens.colors.pastelBlueBorder,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
  },
  savingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.pastelBlueText,
  },
  savingsBody: {
    fontSize: 12,
    color: 'rgba(10, 46, 82, 0.72)',
    marginBottom: tokens.spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: tokens.colors.pastelBlueBorder,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md + 2,
    fontSize: 18,
    color: tokens.colors.pastelBlueText,
    marginBottom: tokens.spacing.md,
  },
  saveBtn: {
    marginTop: 0,
  },
  aiCard: {
    backgroundColor: tokens.colors.pastelPink,
    borderWidth: 1,
    borderColor: tokens.colors.pastelPinkBorder,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.xxl,
  },
  aiOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.aiAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: tokens.spacing.sm,
  },
  aiBody: {
    fontSize: 13,
    fontWeight: '400',
    color: tokens.colors.pastelPinkText,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: tokens.colors.bgOverlay,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: tokens.spacing.xl,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalBody: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
  },
  modalInput: {
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md - 2,
    color: colors.textPrimary,
    fontSize: 14,
  },
  modalActions: {
    marginTop: tokens.spacing.md + 2,
    flexDirection: 'row',
    gap: tokens.spacing.md - 2,
    alignItems: 'stretch',
  },
});
