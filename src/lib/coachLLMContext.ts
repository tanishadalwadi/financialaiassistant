import type { Database } from './database.types';
import type { Goal, SpendingCategorySummary } from '../types/models';
import { analyzeGoalGaps } from './goalGapEngine';
import type { SpendingPatternSignals } from './spendingPatterns';
import type { MonthlyFinancialSnapshot, StatementImport } from './supabaseMappers';
import type { CategoryHistoryEntry, MonthlyComparison } from './historicalContext';

export type CoachProfileSnapshot = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'monthly_income' | 'monthly_savings_target' | 'user_type' | 'coach_tone' | 'spending_weakness'
> | null;

export interface CoachMonthlySnapshot {
  month: string;
  month_label: string;
  total_income: number;
  total_expenses: number;
  surplus: number;
  savings_rate: number | null;
  top_category: string | null;
  top_category_amount: number;
  transaction_count: number;
}

export interface CoachStatementImport {
  imported_at: string;
  file_name: string | null;
  source: string;
  month_label: string | null;
  statement_start_date: string | null;
  statement_end_date: string | null;
  transaction_count: number;
  duplicate_count: number;
}

export interface MoMChange {
  from_month: string;
  to_month: string;
  income_delta: number;
  expense_delta: number;
  surplus_delta: number;
  /** Percentage change in expenses, null if previous month had zero expenses. */
  expense_pct_change: number | null;
}

export interface CoachCurrentMonth {
  /** ISO first-of-month key like `2026-05-01`. */
  month: string;
  month_label: string;
  income: number;
  expenses: number;
  surplus: number;
  /** True when there is no current-month transaction activity at all. */
  is_empty: boolean;
  top_categories: Array<{ label: string; total: number; percentage: number }>;
}

export interface CoachCategoryTrend {
  category_id: string;
  label: string;
  current_month: number;
  prior_month: number;
  prior_3_month_avg: number;
  /** Rounded integer percent. Null when prior values are zero. */
  trend_pct_vs_prior_month: number | null;
  trend_pct_vs_prior_3_avg: number | null;
  consecutive_top_months: number;
  /** Narrative one-liner the LLM can quote verbatim, or null. */
  highlight: string | null;
}

export interface CoachMonthOverMonth {
  from_month_label: string;
  to_month_label: string;
  income_delta: number;
  expense_delta: number;
  surplus_delta: number;
  expense_pct_change: number | null;
  surplus_improved: boolean;
  /** Pre-formatted phrase the LLM can quote (e.g. "Your savings improved from April to May."). */
  surplus_improvement_phrase: string | null;
}

export type CoachLLMContextPayload = {
  profile: {
    user_type: string | null;
    monthly_income: number | null;
    monthly_savings_target: number | null;
    coach_tone: string | null;
    spending_weakness: string | null;
  };
  /**
   * Explicit "current month only" block. Always live, always strict — never
   * substituted with historical data even when this month is empty.
   */
  current_month: CoachCurrentMonth;
  /**
   * Legacy mirror of `current_month` for prompts that still reference the
   * old shape. Kept identical to the data above so renaming is a no-op.
   */
  metrics: {
    month_expenses: number;
    month_income_from_transactions: number;
    income_snapshot: number;
    monthly_surplus: number;
  };
  top_categories: Array<{ label: string; total: number; percentage: number }>;
  goals: Array<{
    title: string;
    target_amount: number;
    saved_amount: number;
    due_date: string;
    type: string;
  }>;
  goal_gaps: ReturnType<typeof analyzeGoalGaps>;
  spending_patterns: SpendingPatternSignals;
  category_budget_caps: Record<string, number>;
  /** Recent statement import sessions (max 8, newest first). */
  recent_imports: CoachStatementImport[];
  /**
   * Historical layer — strictly months *before* `current_month.month`. Never
   * includes the current month, so MoM/avg/best-month logic stays consistent
   * with the two-layer rule.
   */
  historical: {
    monthly_snapshots: CoachMonthlySnapshot[];
    best_savings_month: CoachMonthlySnapshot | null;
    month_over_month: CoachMonthOverMonth | null;
    category_history: CoachCategoryTrend[];
    consistently_high_categories: CoachCategoryTrend[];
    /** Pre-rendered narrative bullets the LLM can quote as facts. */
    talking_points: string[];
  };
  /** @deprecated Mirrors `historical.monthly_snapshots`. */
  monthly_snapshots: CoachMonthlySnapshot[];
  /** @deprecated Mirrors `historical.best_savings_month`. */
  best_savings_month: CoachMonthlySnapshot | null;
  /** @deprecated Mirrors `historical.month_over_month` in the legacy shape. */
  latest_month_over_month: MoMChange | null;
};

function toCoachSnapshot(s: MonthlyFinancialSnapshot): CoachMonthlySnapshot {
  return {
    month: s.month,
    month_label: s.monthLabel,
    total_income: s.totalIncome,
    total_expenses: s.totalExpenses,
    surplus: s.surplus,
    savings_rate: s.savingsRate,
    top_category: s.topCategory,
    top_category_amount: s.topCategoryAmount,
    transaction_count: s.transactionCount,
  };
}

function toCoachImport(i: StatementImport): CoachStatementImport {
  return {
    imported_at: i.importedAt,
    file_name: i.fileName,
    source: i.source,
    month_label: i.monthLabel,
    statement_start_date: i.statementStartDate,
    statement_end_date: i.statementEndDate,
    transaction_count: i.transactionCount,
    duplicate_count: i.duplicateCount,
  };
}

function toCoachCategoryTrend(c: CategoryHistoryEntry): CoachCategoryTrend {
  return {
    category_id: c.categoryId,
    label: c.label,
    current_month: c.currentMonth,
    prior_month: c.priorMonth,
    prior_3_month_avg: c.prior3MonthAvg,
    trend_pct_vs_prior_month: c.trendPctVsPriorMonth,
    trend_pct_vs_prior_3_avg: c.trendPctVsPrior3Avg,
    consecutive_top_months: c.consecutiveTopMonths,
    highlight: c.highlight,
  };
}

function toCoachMonthOverMonth(mc: MonthlyComparison): CoachMonthOverMonth | null {
  if (!mc.prior) return null;
  return {
    from_month_label: mc.prior.label,
    to_month_label: mc.current.label,
    income_delta: mc.incomeDelta,
    expense_delta: mc.expenseDelta,
    surplus_delta: mc.surplusDelta,
    expense_pct_change: mc.expensePctChange,
    surplus_improved: mc.surplusImproved,
    surplus_improvement_phrase: mc.surplusImprovementPhrase,
  };
}

/**
 * Legacy MoM shape kept for backwards compatibility with prompts that
 * referenced `latest_month_over_month` directly. Derived from the new
 * `MonthlyComparison`, not from the snapshots array, so it follows the
 * two-layer rule (current month is always live, never a snapshot).
 */
function legacyMoMFromComparison(mc: MonthlyComparison | null): MoMChange | null {
  if (!mc || !mc.prior) return null;
  return {
    from_month: mc.prior.label,
    to_month: mc.current.label,
    income_delta: mc.incomeDelta,
    expense_delta: mc.expenseDelta,
    surplus_delta: mc.surplusDelta,
    expense_pct_change: mc.expensePctChange,
  };
}

function buildTalkingPoints(params: {
  monthlyComparison: MonthlyComparison | null;
  categoryHistory: CategoryHistoryEntry[];
  consistentlyHigh: CategoryHistoryEntry[];
  bestSavingsMonth: MonthlyFinancialSnapshot | null;
}): string[] {
  const out: string[] = [];
  if (params.monthlyComparison?.surplusImprovementPhrase) {
    out.push(params.monthlyComparison.surplusImprovementPhrase);
  }
  if (params.monthlyComparison?.expensePctChange != null) {
    const pct = params.monthlyComparison.expensePctChange;
    if (Math.abs(pct) >= 5) {
      const verb = pct >= 0 ? 'up' : 'down';
      out.push(
        `Total expenses are ${verb} ${Math.abs(pct)}% vs ${params.monthlyComparison.prior?.label ?? 'last month'}.`,
      );
    }
  }
  for (const c of params.categoryHistory) {
    if (c.highlight) out.push(c.highlight);
    if (out.length >= 6) break;
  }
  for (const c of params.consistentlyHigh) {
    out.push(
      `${c.label} has been a top spending category for ${c.consecutiveTopMonths} months running.`,
    );
    if (out.length >= 8) break;
  }
  if (params.bestSavingsMonth) {
    out.push(
      `Best savings month so far: ${params.bestSavingsMonth.monthLabel} with $${Math.round(params.bestSavingsMonth.surplus)} surplus.`,
    );
  }
  // Dedupe while preserving order in case category highlights overlap.
  return [...new Set(out)];
}

export function buildCoachLLMContextPayload(params: {
  profile: CoachProfileSnapshot;
  goals: Goal[];
  spendingByCategory: SpendingCategorySummary[];
  monthIncome: number;
  monthExpenses: number;
  spendingPatterns: SpendingPatternSignals;
  categoryBudgetCaps: Record<string, number>;
  statementImports?: StatementImport[];
  monthlySnapshots?: MonthlyFinancialSnapshot[];
  /** Live month-over-month comparison computed by the data hook. */
  monthlyComparison?: MonthlyComparison | null;
  /** Per-category historical context computed by the data hook. */
  categoryHistory?: CategoryHistoryEntry[];
  /** Categories with 3+ consecutive top-month appearances. */
  consistentlyHighCategories?: CategoryHistoryEntry[];
  /** Prior-month-only "best savings" snapshot from the data hook. */
  bestSavingsMonth?: MonthlyFinancialSnapshot | null;
}): CoachLLMContextPayload {
  const profileMonthlyIncome = Number(params.profile?.monthly_income ?? 0);
  const incomeSnapshot = profileMonthlyIncome > 0 ? profileMonthlyIncome : params.monthIncome;
  const monthlySurplus = Math.max(0, incomeSnapshot - params.monthExpenses);

  // Strict two-layer rule: snapshots used here are prior-only (the hook
  // already filters), so we never let history overwrite the current month.
  const priorSnapshots = (params.monthlySnapshots ?? [])
    .slice()
    .sort((a, b) => (a.month < b.month ? 1 : -1));
  const historicalSnapshots = priorSnapshots.slice(0, 12).map(toCoachSnapshot);

  const monthlyComparison = params.monthlyComparison ?? null;
  const categoryHistory = (params.categoryHistory ?? []).map(toCoachCategoryTrend);
  const consistentlyHigh = (params.consistentlyHighCategories ?? []).map(toCoachCategoryTrend);
  const bestSavingsMonth = params.bestSavingsMonth
    ? toCoachSnapshot(params.bestSavingsMonth)
    : null;
  const monthOverMonth = monthlyComparison ? toCoachMonthOverMonth(monthlyComparison) : null;

  const recentImports = (params.statementImports ?? [])
    .slice()
    .sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))
    .slice(0, 8)
    .map(toCoachImport);

  const currentMonthBlock: CoachCurrentMonth = monthlyComparison
    ? {
        month: monthlyComparison.current.month,
        month_label: monthlyComparison.current.label,
        income: params.monthIncome,
        expenses: params.monthExpenses,
        surplus: params.monthIncome - params.monthExpenses,
        is_empty: params.monthIncome === 0 && params.monthExpenses === 0,
        top_categories: params.spendingByCategory.slice(0, 3).map((c) => ({
          label: c.label,
          total: c.total,
          percentage: c.percentage,
        })),
      }
    : {
        month: '',
        month_label: '',
        income: params.monthIncome,
        expenses: params.monthExpenses,
        surplus: params.monthIncome - params.monthExpenses,
        is_empty: params.monthIncome === 0 && params.monthExpenses === 0,
        top_categories: params.spendingByCategory.slice(0, 3).map((c) => ({
          label: c.label,
          total: c.total,
          percentage: c.percentage,
        })),
      };

  const talkingPoints = buildTalkingPoints({
    monthlyComparison,
    categoryHistory: params.categoryHistory ?? [],
    consistentlyHigh: params.consistentlyHighCategories ?? [],
    bestSavingsMonth: params.bestSavingsMonth ?? null,
  });

  return {
    profile: {
      user_type: params.profile?.user_type ?? null,
      monthly_income: params.profile?.monthly_income ?? null,
      monthly_savings_target: params.profile?.monthly_savings_target ?? null,
      coach_tone: params.profile?.coach_tone ?? null,
      spending_weakness: params.profile?.spending_weakness ?? null,
    },
    current_month: currentMonthBlock,
    metrics: {
      month_expenses: params.monthExpenses,
      month_income_from_transactions: params.monthIncome,
      income_snapshot: incomeSnapshot,
      monthly_surplus: monthlySurplus,
    },
    top_categories: params.spendingByCategory.slice(0, 3).map((c) => ({
      label: c.label,
      total: c.total,
      percentage: c.percentage,
    })),
    goals: params.goals.map((g) => ({
      title: g.title,
      target_amount: g.targetAmount,
      saved_amount: g.savedAmount,
      due_date: g.dueDate,
      type: g.type,
    })),
    goal_gaps: analyzeGoalGaps({
      goals: params.goals,
      monthlySurplus,
      spendingByCategory: params.spendingByCategory,
    }),
    spending_patterns: params.spendingPatterns,
    category_budget_caps: params.categoryBudgetCaps,
    recent_imports: recentImports,
    historical: {
      monthly_snapshots: historicalSnapshots,
      best_savings_month: bestSavingsMonth,
      month_over_month: monthOverMonth,
      category_history: categoryHistory,
      consistently_high_categories: consistentlyHigh,
      talking_points: talkingPoints,
    },
    monthly_snapshots: historicalSnapshots,
    best_savings_month: bestSavingsMonth,
    latest_month_over_month: legacyMoMFromComparison(monthlyComparison),
  };
}
