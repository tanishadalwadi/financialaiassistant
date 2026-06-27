import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { tokens } from '../theme/tokens';
import { SectionHeader } from '../components/SectionHeader';
import { TransactionItem } from '../components/TransactionItem';
import { StatChipRow } from '../components/StatChipRow';
import { CoachInsightCard } from '../components/CoachInsightCard';
import { GoalCard } from '../components/GoalCard';
import { AddTransactionSheet } from '../components/AddTransactionSheet';
import { AppButton } from '../components/ui/AppButton';
import type { MainTabParamList, RootStackParamList } from '../navigation';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import { analyzeGoalGaps } from '../lib/goalGapEngine';
import { getDisplayName, formatCurrency } from '../lib/displayFormat';
import { getCoachInsightLines, topFlexibleCategory } from '../lib/coachInsightCopy';
import { useWeeklyCoachNotification } from '../hooks/useWeeklyCoachNotification';
import { StaggerChildren } from '../components/StaggerChildren';
import { useVoiceContextRegistrar } from '../lib/voice/useVoiceContextRegistrar';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNav>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    goals,
    transactions,
    monthIncome,
    monthExpenses,
    spendingByCategory,
    loading,
    error,
    refresh,
    insertTransaction,
    setCategoryBudgetCap,
  } = useGoalsTransactions();

  useVoiceContextRegistrar({
    goals,
    refresh,
    insertTransaction,
    setCategoryBudgetCap,
  });

  const displayName = getDisplayName(profile, user);

  const primaryGoal = React.useMemo(() => {
    if (!goals.length) return null;
    const pid = profile?.primary_goal_id;
    if (pid) {
      const g = goals.find((x) => x.id === pid);
      if (g) return g;
    }
    return goals[0];
  }, [goals, profile?.primary_goal_id]);

  const profileMonthlyIncome = Number(profile?.monthly_income ?? 0);
  const incomeForSnapshot = profileMonthlyIncome > 0 ? profileMonthlyIncome : monthIncome;
  const surplusRaw = incomeForSnapshot - monthExpenses;
  const totalBalance = surplusRaw;
  const monthlySurplusForPace = Math.max(0, surplusRaw);
  const incomeChipSubtitle = profileMonthlyIncome > 0 ? 'From profile' : 'This month';

  const gapAnalyses = React.useMemo(
    () => analyzeGoalGaps({ goals, monthlySurplus: monthlySurplusForPace, spendingByCategory }),
    [goals, monthlySurplusForPace, spendingByCategory],
  );
  const analysisByGoalId = React.useMemo(() => {
    const m = new Map<string, (typeof gapAnalyses)[0]>();
    for (const a of gapAnalyses) m.set(a.goalId, a);
    return m;
  }, [gapAnalyses]);

  const flexibleTop = React.useMemo(() => topFlexibleCategory(spendingByCategory), [spendingByCategory]);

  const coachLines = React.useMemo(
    () =>
      getCoachInsightLines({
        surplusRaw,
        incomeSnapshot: incomeForSnapshot,
        monthExpenses,
        topCategory: flexibleTop,
        primaryGoal,
        monthlySurplusForPace,
      }),
    [surplusRaw, incomeForSnapshot, monthExpenses, flexibleTop, primaryGoal, monthlySurplusForPace],
  );

  const onCoachFromInsight = React.useCallback(() => {
    const top = flexibleTop?.label ?? '';
    const amt = flexibleTop?.total ?? 0;
    const pre = primaryGoal
      ? `Help me reach my ${primaryGoal.title} goal (${formatCurrency(primaryGoal.targetAmount)} by ${primaryGoal.dueDate}). My top flexible spend is ${top} at about ${formatCurrency(amt)}/mo this month.`
      : `My top spend category this month is ${top} at about ${formatCurrency(amt)}/mo. What should I trim first?`;
    navigation.navigate('Coach', { preloadedPrompt: pre });
  }, [navigation, flexibleTop, primaryGoal]);

  const homeGoals = React.useMemo(() => {
    if (!goals.length) return [];
    const pid = profile?.primary_goal_id;
    const primary = pid ? goals.find((g) => g.id === pid) : goals[0];
    const rest = goals.filter((g) => g.id !== primary?.id);
    return primary ? [primary, ...rest].slice(0, 2) : goals.slice(0, 2);
  }, [goals, profile?.primary_goal_id]);
  const recent = transactions.slice(0, 5);
  const [addSheetOpen, setAddSheetOpen] = React.useState(false);

  useWeeklyCoachNotification({
    enabled: Boolean(profile?.notifications_enabled ?? true),
    goals,
    monthlySurplus: monthlySurplusForPace,
    monthExpenses,
    incomeSnapshot: incomeForSnapshot,
    savingsTarget: Number(profile?.monthly_savings_target ?? 0),
    spendingByCategory,
    hasTransactions: transactions.length > 0,
  });

  return (
    <View style={styles.container}>
      <AppHeader eyebrow="Welcome" title={displayName} />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void refresh()}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScreenAnimatedScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + tokens.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <StaggerChildren stagger={40} initialDelay={16}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingCaption}>Syncing your data…</Text>
            </View>
          ) : null}

          <StatChipRow
            totalBalance={totalBalance}
            income={incomeForSnapshot}
            spent={monthExpenses}
            surplus={surplusRaw}
            incomeSubtitle={incomeChipSubtitle}
          />

          <CoachInsightCard lines={coachLines} onPressCoach={onCoachFromInsight} />

          <View>
            <SectionHeader
              title="Your goals"
              actionLabel="+ New"
              actionAccent
              onPressAction={() => navigation.navigate('Goals')}
            />
            {goals.length === 0 ? (
              <Text style={styles.emptyHint}>Create a goal on the Goals tab — we will track pace here.</Text>
            ) : (
              homeGoals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('GoalDetails', { goalId: g.id })}
                >
                  <GoalCard
                    goal={g}
                    monthlySurplus={monthlySurplusForPace}
                    analysis={analysisByGoalId.get(g.id)}
                    onUpdateDueDate={() =>
                      navigation.navigate('GoalDetails', { goalId: g.id, focusDueDateEditor: true })
                    }
                  />
                </TouchableOpacity>
              ))
            )}
            {goals.length > 2 ? (
              <TouchableOpacity onPress={() => navigation.navigate('Goals')} style={styles.seeAllGoals}>
                <Text style={styles.seeAllGoalsText}>See all goals</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View>
            <SectionHeader
              title="Recent activity"
              actionLabel="See all"
              actionAccent
              onPressAction={() => navigation.navigate('Transactions')}
            />
            <View style={styles.activityCard}>
              {recent.length === 0 ? (
                <Text style={styles.emptyHint}>No recent transactions. Add one or import a statement.</Text>
              ) : (
                recent.map((tx, i) => (
                  <TransactionItem key={tx.id} tx={tx} compact isLast={i === recent.length - 1} />
                ))
              )}
            </View>
          </View>

          <View style={styles.quickAddRow}>
            <AppButton
              label="Add transaction"
              onPress={() => setAddSheetOpen(true)}
              variant="primary"
              size="lg"
              flex
            />
            <AppButton
              label="Import statements"
              onPress={() => navigation.navigate('Transactions')}
              variant="secondary"
              size="lg"
              flex
            />
          </View>
        </StaggerChildren>
      </ScreenAnimatedScrollView>

      <AddTransactionSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        tabBarHeight={tabBarHeight}
        onOpenActivity={() => navigation.navigate('Transactions')}
        onSaved={() => void refresh()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorBanner: {
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    padding: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  retry: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: tokens.spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  loadingCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  seeAllGoals: {
    marginBottom: 12,
  },
  seeAllGoalsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: tokens.spacing.md,
    marginTop: layout.blockGap,
    marginBottom: layout.blockGap,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
});
