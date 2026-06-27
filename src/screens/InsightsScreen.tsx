import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { SpendingChartCard } from '../components/SpendingChartCard';
import { LineChartCard } from '../components/LineChartCard';
import { computeCapBreaches } from '../lib/insightsFromData';
import { SectionHeader } from '../components/SectionHeader';
import { AppButton } from '../components/ui/AppButton';
import { typography } from '../theme/typography';
import { useProfile } from '../contexts/ProfileContext';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import { useVoiceContextRegistrar } from '../lib/voice/useVoiceContextRegistrar';
import { EXPENSE_CATEGORY_OPTIONS, normalizeCategoryKey } from '../constants/expenseCategories';
import { formatCurrency } from '../lib/displayFormat';
import { describeCategoryVsHistory } from '../lib/coachInsightCopy';
import { CATEGORY_COLORS } from '../theme/tokens';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation';
import { StaggerChildren } from '../components/StaggerChildren';

type InsightsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Insights'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<InsightsNav>();
  const tabBarHeight = useBottomTabBarHeight();
  const { profile } = useProfile();
  const {
    goals,
    spendingByCategory,
    monthExpenses,
    monthIncome,
    sixMonthNetSeries,
    spendingPatterns,
    categoryBudgetCaps,
    suggestedCategoryCaps,
    categoryHistory,
    loading,
    error,
    refresh,
    setCategoryBudgetCaps,
    insertTransaction,
    setCategoryBudgetCap,
  } = useGoalsTransactions();

  useVoiceContextRegistrar({
    goals,
    refresh,
    insertTransaction,
    setCategoryBudgetCap,
  });

  const categoryHistoryById = React.useMemo(() => {
    const m = new Map<string, (typeof categoryHistory)[number]>();
    for (const c of categoryHistory) m.set(c.categoryId, c);
    return m;
  }, [categoryHistory]);

  const profileMonthlyIncome = Number(profile?.monthly_income ?? 0);
  const incomeSnapshot = profileMonthlyIncome > 0 ? profileMonthlyIncome : monthIncome;
  const surplusRaw = incomeSnapshot - monthExpenses;
  const surplusForPace = Math.max(0, surplusRaw);
  const savingsTarget = Number(profile?.monthly_savings_target ?? 0);

  const capBreaches = React.useMemo(
    () => computeCapBreaches(spendingByCategory, categoryBudgetCaps),
    [spendingByCategory, categoryBudgetCaps],
  );

  const breachedCapIds = React.useMemo(
    () => new Set(capBreaches.map((b) => b.categoryId)),
    [capBreaches],
  );

  const overByCategoryId = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const b of capBreaches) {
      m.set(b.categoryId, Math.max(0, b.spent - b.cap));
    }
    return m;
  }, [capBreaches]);

  /**
   * Map of canonical category key → current-month spend. Normalizing both
   * sides (here and in the hook's aggregator) prevents a mismatch like
   * "Dining" vs "dining" from showing $0 actual under a saved cap.
   */
  const spendingByCategoryId = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of spendingByCategory) {
      const key = normalizeCategoryKey(c.id);
      m.set(key, (m.get(key) ?? 0) + c.total);
    }
    return m;
  }, [spendingByCategory]);

  const goalsOnTrack = React.useMemo(() => {
    // on track if NOT behind and NOT blocked when remaining > 0
    let onTrack = 0;
    for (const g of goals) {
      const remaining = Math.max(0, g.targetAmount - g.savedAmount);
      if (remaining <= 0) {
        onTrack += 1;
        continue;
      }
      if (surplusForPace <= 0) continue;
      const due = new Date(g.dueDate + 'T12:00:00');
      const monthsToComplete = remaining / surplusForPace;
      const projected = new Date();
      projected.setHours(12, 0, 0, 0);
      projected.setMonth(projected.getMonth() + Math.floor(monthsToComplete));
      const msPerDay = 86400000;
      const days = Math.round((due.getTime() - projected.getTime()) / msPerDay);
      const status = days >= 10 ? 'ahead' : days >= -7 ? 'on_track' : 'behind';
      if (status !== 'behind') onTrack += 1;
    }
    return { onTrack, total: goals.length };
  }, [goals, surplusForPace]);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(0, daysInMonth - now.getDate());

  const coachCards = React.useMemo(() => {
    const fixedIds = new Set<string>(EXPENSE_CATEGORY_OPTIONS.filter((c) => c.isFixedCost).map((c) => String(c.id)));
    const rows = capBreaches
      .filter((b) => !fixedIds.has(String(b.categoryId)))
      .map((b) => ({
        ...b,
        ratio: b.cap > 0 ? b.spent / b.cap : 0,
        over: Math.max(0, b.spent - b.cap),
      }))
      .filter((b) => b.over > 0 && b.cap > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3);
    return rows.map((b) => {
      const cap = Math.round(b.cap);
      const over = Math.round(b.over);
      const actual = Math.round(b.spent);
      const daysPart = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
      const baseMeta = `${formatCurrency(actual, 0)} spent · cap ${formatCurrency(cap, 0)} · ${daysPart}`;

      const id = b.categoryId.toLowerCase();
      let body = `You're ${formatCurrency(over, 0)} over your ${b.label} cap with ${daysLeft} days left. Pause spending here to avoid the gap growing.`;
      let ctaLabel: string | null = null;
      let ctaPrompt: string | null = null;

      if (id === 'groceries') {
        const dailyBudget = Math.max(0, Math.round(cap / Math.max(1, daysInMonth)));
        body = `You're ${formatCurrency(over, 0)} over with ${daysLeft} days left — aim for ${formatCurrency(dailyBudget, 0)}/day to stop the gap growing.`;
      } else if (id === 'shopping') {
        body = `You're ${formatCurrency(over, 0)} over your ${formatCurrency(cap, 0)} cap. If this is typical, raise the cap to ${formatCurrency(cap + 10, 0)} — otherwise skip one purchase this week.`;
      } else if (id === 'health') {
        body = `Health is ${formatCurrency(over, 0)} over — likely a one-off. No action needed unless this repeats next month.`;
      } else if (id === 'other') {
        body = `Other is your biggest unknown: ${formatCurrency(actual, 0)} spent against a ${formatCurrency(cap, 0)} cap. Ask the coach which transactions to recategorize first.`;
        ctaLabel = 'Ask coach →';
        ctaPrompt = `My 'Other' category has ${formatCurrency(actual, 0)} this month against a ${formatCurrency(cap, 0)} cap. Help me figure out what's in there and what to cut.`;
      } else if (id === 'transport') {
        body = `Transport went ${formatCurrency(over, 0)} over. If the cap is realistic, delay any non-urgent trips until next month.`;
      }

      // Tack on the historical comparison ("Dining is up 28% vs last month.")
      // when there is a meaningful signal. Keeps the existing UI layout and
      // just enriches the body text.
      const historicalLine = describeCategoryVsHistory(categoryHistoryById.get(b.categoryId));
      if (historicalLine) body = `${body} ${historicalLine}`;

      return {
        id: b.categoryId,
        overline: 'Budget cap',
        title: b.label,
        meta: baseMeta,
        body,
        ctaLabel,
        ctaPrompt,
      };
    });
  }, [capBreaches, daysInMonth, daysLeft, categoryHistoryById]);

  const primaryGoal = React.useMemo(() => {
    if (!goals.length) return null;
    const pid = profile?.primary_goal_id;
    if (pid) {
      const g = goals.find((x) => x.id === pid);
      if (g) return g;
    }
    return goals[0];
  }, [goals, profile?.primary_goal_id]);

  const [capDrafts, setCapDrafts] = React.useState<Record<string, string>>({});
  const [savingCaps, setSavingCaps] = React.useState(false);

  /**
   * Seed drafts from saved caps, but only when the underlying values actually
   * change. `useFocusEffect` re-runs `load()` every time Insights gets focus
   * and updates `categoryBudgetCaps` by reference even when nothing changed —
   * without this guard, the seed effect would clobber unsaved edits the user
   * is typing into a cap field.
   */
  const lastSeedRef = React.useRef<string>('');
  React.useEffect(() => {
    const seed: Record<string, string> = {};
    for (const c of EXPENSE_CATEGORY_OPTIONS) {
      const v = categoryBudgetCaps[c.id];
      seed[c.id] = v ? String(Math.round(v)) : '';
    }
    const fingerprint = JSON.stringify(seed);
    if (fingerprint === lastSeedRef.current) return;
    lastSeedRef.current = fingerprint;
    setCapDrafts(seed);
  }, [categoryBudgetCaps]);

  const saveBudgetCaps = React.useCallback(async () => {
    if (savingCaps) return;
    setSavingCaps(true);
    try {
      const payload: Record<string, number | null> = {};
      for (const c of EXPENSE_CATEGORY_OPTIONS) {
        const raw = (capDrafts[c.id] ?? '').trim().replace(/,/g, '');
        const n = raw ? Number(raw) : NaN;
        payload[c.id] = Number.isFinite(n) && n > 0 ? n : null;
      }
      const { error: e } = await setCategoryBudgetCaps(payload);
      if (e) {
        Alert.alert('Could not save', e.message);
        return;
      }
      Alert.alert('Saved', 'Monthly category caps are updated.');
    } finally {
      setSavingCaps(false);
    }
  }, [capDrafts, savingCaps, setCategoryBudgetCaps]);

  const { labels: sixLabels, values: sixValues } = sixMonthNetSeries;

  return (
    <View style={styles.container}>
      <AppHeader title="Insights" subtitle="The story behind your numbers." />
      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void refresh()}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScreenAnimatedScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + tokens.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <StaggerChildren stagger={38} initialDelay={10}>
          {loading && !spendingByCategory.length ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingCaption}>Loading your data…</Text>
            </View>
          ) : null}

          {/* 1) This month's health */}
          <View style={styles.section}>
          <SectionHeader title="This month's health" />
          <View style={styles.healthRow}>
            <View style={[styles.healthChip, styles.healthChipSpent]}>
              <Text style={styles.healthLabel}>Spent</Text>
              <Text style={[styles.healthValue, { color: colors.cardPeachText }]}>{formatCurrency(monthExpenses, 0)}</Text>
            </View>
            <View style={[styles.healthChip, surplusRaw >= 0 ? styles.healthChipSurplusGood : styles.healthChipSurplusBad]}>
              <Text style={styles.healthLabel}>Surplus</Text>
              <Text
                style={[
                  styles.healthValue,
                  { color: surplusRaw >= 0 ? colors.cardMintText : colors.cardCoralText },
                ]}
              >
                {formatCurrency(surplusRaw, 0)}
              </Text>
            </View>
            <View style={[styles.healthChip, goalsOnTrack.onTrack === goalsOnTrack.total ? styles.healthChipTrackGood : styles.healthChipTrackWarn]}>
              <Text style={styles.healthLabel}>On track</Text>
              <Text
                style={[
                  styles.healthValue,
                  { color: goalsOnTrack.onTrack === goalsOnTrack.total ? colors.cardMintText : colors.cardPeachText },
                ]}
              >
                {goalsOnTrack.onTrack} of {goalsOnTrack.total} goals
              </Text>
            </View>
          </View>
          </View>

          {/* 2) Spending by category */}
          <View style={styles.section}>
          <SectionHeader
            title="Spending by category"
            actionLabel="Add transactions"
            actionAccent
            onPressAction={() => navigation.navigate('Transactions')}
          />
          {spendingByCategory.length > 0 ? (
            <SpendingChartCard data={spendingByCategory} hideTitle />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>
                No expense categories this month yet. Add transactions to see your category mix.
              </Text>
            </View>
          )}
          </View>

          {/* 3) Coach perspective */}
          <View style={styles.section}>
          <SectionHeader title="Coach perspective" />
          {coachCards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyBody}>No cap breaches in controllable categories so far this month.</Text>
            </View>
          ) : (
            coachCards.map((card) => (
              <View key={card.id} style={styles.coachCard}>
                <Text style={styles.coachOverline}>{card.overline}</Text>
                <Text style={styles.coachTitle}>{card.title}</Text>
                <Text style={styles.coachMeta}>{card.meta}</Text>
                <Text style={styles.coachBody}>{card.body}</Text>
                {card.ctaLabel && card.ctaPrompt ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Coach', { preloadedPrompt: card.ctaPrompt! })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginTop: 10 }}
                  >
                    <Text style={styles.coachCta}>{card.ctaLabel}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
          </View>

          {/* 4) Cashflow chart */}
          <View style={styles.section}>
          <SectionHeader title="Cashflow (last 6 months)" />
          {sixValues.some((v) => v !== 0) ? (
            <LineChartCard title={undefined} labels={sixLabels} values={sixValues} />
          ) : (
            <Text style={styles.emptyCardFlat}>Not enough transaction history in the last six months for a trend line.</Text>
          )}
          </View>

          {/* 5) Budget caps (merged caps + actuals) */}
          <View style={styles.section}>
          <SectionHeader title="Budget caps" />
          <View style={styles.card}>
            {EXPENSE_CATEGORY_OPTIONS.map((c, idx) => {
              const cap = categoryBudgetCaps[c.id] ?? null;
              const spent = spendingByCategoryId.get(c.id) ?? 0;
              const over = Math.max(0, spent - (cap ?? 0));
              const isOver = cap != null && cap > 0 && over > 0;
              const fixed = c.isFixedCost;
              const labelColor = colors.textPrimary;
              const spentColor = colors.textMutedOnDark;
              const capBorder = colors.border;
              // Local-only suggested cap shown as the input placeholder — never
              // persisted unless the user explicitly types and saves.
              const suggested = suggestedCategoryCaps[c.id] ?? 0;
              const placeholder = suggested > 0 ? `Suggested ${Math.round(suggested)}` : 'Cap';

              return (
                <View key={c.id} style={[styles.capUnifiedRow, idx > 0 && styles.capUnifiedRowRule]}>
                  <View style={styles.capMain}>
                    <View style={styles.capLeft}>
                      <View style={[styles.capDot, { backgroundColor: CATEGORY_COLORS[c.label] ?? CATEGORY_COLORS.Other }]} />
                      <Text style={[styles.capName, { color: labelColor }]}>
                        {c.label}
                        {fixed ? <Text style={styles.capLock}> 🔒</Text> : null}
                      </Text>
                    </View>
                    {!fixed && isOver ? (
                      <View style={styles.overPill}>
                        <Text style={styles.overPillText}>Over by {formatCurrency(over, 0)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.capRight}>
                    <TextInput
                      value={capDrafts[c.id] ?? ''}
                      onChangeText={(t) => setCapDrafts((prev) => ({ ...prev, [c.id]: t }))}
                      placeholder={placeholder}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      style={[styles.capField, { borderColor: capBorder }]}
                    />
                    <Text style={[styles.capSpent, { color: spentColor }]}>{formatCurrency(spent, 0)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <AppButton
            label="Save caps"
            onPress={() => void saveBudgetCaps()}
            variant="primary"
            size="lg"
            fullWidth
            loading={savingCaps}
            disabled={savingCaps}
            style={styles.saveCapsBtn}
          />
          </View>
        </StaggerChildren>
      </ScreenAnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: tokens.spacing.sm,
  },
  section: {
    marginTop: layout.blockGap,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
    marginRight: 8,
  },
  retry: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingCaption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },
  healthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  healthChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardSkyBorder,
  },
  healthChipSpent: {
    backgroundColor: colors.cardPeach,
    borderColor: colors.cardPeachBorder,
  },
  healthChipSurplusGood: {
    backgroundColor: colors.cardMint,
    borderColor: colors.cardMintBorder,
  },
  healthChipSurplusBad: {
    backgroundColor: colors.cardCoral,
    borderColor: colors.cardCoralBorder,
  },
  healthChipTrackGood: {
    backgroundColor: colors.cardMint,
    borderColor: colors.cardMintBorder,
  },
  healthChipTrackWarn: {
    backgroundColor: colors.cardYellow,
    borderColor: colors.cardYellowBorder,
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyCardFlat: {
    ...typography.body,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capUnifiedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
  },
  capUnifiedRowRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  capMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  capLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  capName: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  capLock: {
    fontSize: 12,
    color: colors.textMutedOnDark,
  },
  overPill: {
    backgroundColor: colors.dangerDim,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  overPillText: {
    ...typography.caption,
    color: colors.danger,
  },
  capRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 1,
  },
  capField: {
    width: 72,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'right',
  },
  capSpent: {
    minWidth: 52,
    textAlign: 'right',
    fontSize: 13,
    color: colors.textMutedOnDark,
  },
  saveCapsBtn: {
    marginTop: 12,
  },
  coachCard: {
    backgroundColor: colors.coachSurface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.coachBorder,
    marginBottom: 12,
  },
  coachOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coachText,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  coachTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.coachText,
    marginTop: 6,
  },
  coachMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.coachText,
    marginTop: 8,
  },
  coachBody: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.coachText,
    lineHeight: 20,
    marginTop: 8,
  },
  coachCta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.coachAccent,
  },
});
