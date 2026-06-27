/**
 * Historical intelligence layer for Kova.
 *
 * Strict separation from "current month" data: every function in this module
 * only consumes *prior* months (snapshots + pattern transactions filtered to
 * exclude the current calendar month) plus an opaque "current snapshot"
 * passed in by the caller. Nothing here ever mixes the current month back
 * into a historical average or a suggested cap baseline.
 *
 * Lives in src/lib (pure helpers, no React) so it can be unit-tested in
 * isolation and reused from the data hook, the Coach screen, and the LLM
 * context builder.
 */
import type { Transaction } from '../types/models';
import {
  EXPENSE_CATEGORY_OPTIONS,
  normalizeCategoryKey,
} from '../constants/expenseCategories';
import type { MonthlyFinancialSnapshot } from './supabaseMappers';

export interface CurrentMonthSnapshot {
  /** First-of-month key for the current calendar month, e.g. `2026-05-01`. */
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  surplus: number;
  /** Canonical-key map: `groceries` -> 312.45 etc. */
  expensesByCategory: Record<string, number>;
}

export interface MonthlyComparison {
  current: {
    month: string;
    label: string;
    income: number;
    expenses: number;
    surplus: number;
  };
  prior: {
    month: string;
    label: string;
    income: number;
    expenses: number;
    surplus: number;
  } | null;
  /** Same shape as `prior` but always available when at least one prior snapshot exists. */
  incomeDelta: number;
  expenseDelta: number;
  surplusDelta: number;
  /** (current - prior) / prior * 100, rounded to 1dp. Null when prior was 0. */
  expensePctChange: number | null;
  /** True only when there is a prior month AND current surplus is higher. */
  surplusImproved: boolean;
  /** Short copy-ready phrase like "improved from April to May" or null. */
  surplusImprovementPhrase: string | null;
}

export interface CategoryHistoryEntry {
  categoryId: string;
  label: string;
  currentMonth: number;
  priorMonth: number;
  /** Mean of the three prior calendar months (months with $0 still count). */
  prior3MonthAvg: number;
  /** (current - prior) / prior * 100, rounded to nearest int. Null if prior was 0. */
  trendPctVsPriorMonth: number | null;
  /** (current - prior3MonthAvg) / prior3MonthAvg * 100. Null if avg was 0. */
  trendPctVsPrior3Avg: number | null;
  /**
   * Number of *consecutive* prior months (starting from the most recent prior
   * month) in which this category was in the user's top-3 expense categories
   * by total spend. Capped at 6 to avoid unbounded computation.
   */
  consecutiveTopMonths: number;
  /**
   * Human-readable highlight for the LLM / Insights copy. Examples:
   *   - "Dining is up 28% compared to last month."
   *   - "Shopping has been in your top categories for 3 months."
   *   - null when no notable signal.
   */
  highlight: string | null;
}

export interface HistoricalContext {
  /** Snapshots strictly *before* the current calendar month, newest first. */
  priorSnapshots: MonthlyFinancialSnapshot[];
  /** Best month by surplus across `priorSnapshots`, or null. */
  bestSavingsMonth: MonthlyFinancialSnapshot | null;
  monthlyComparison: MonthlyComparison | null;
  categoryHistory: CategoryHistoryEntry[];
  /** Categories that have been top-3 by spend for 3+ consecutive prior months. */
  consistentlyHighCategories: CategoryHistoryEntry[];
}

const PAD2 = (n: number) => String(n).padStart(2, '0');

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${PAD2(now.getMonth() + 1)}-01`;
}

export function monthKeyShort(d: Date): string {
  return `${d.getFullYear()}-${PAD2(d.getMonth() + 1)}`;
}

function monthLabelFromIsoMonth(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shortMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Build the month-over-month comparison from the live current-month metrics
 * plus the most recent prior snapshot (if any).
 *
 * Current values are passed in by the caller — they are *always* derived
 * from live current-month transactions, never from a snapshot, to honour the
 * "current month is strict / never recomputed from history" rule.
 */
export function buildMonthlyComparison(
  current: CurrentMonthSnapshot,
  priorSnapshots: MonthlyFinancialSnapshot[],
): MonthlyComparison {
  const prior = priorSnapshots[0] ?? null;
  if (!prior) {
    return {
      current: {
        month: current.month,
        label: current.monthLabel,
        income: round2(current.income),
        expenses: round2(current.expenses),
        surplus: round2(current.surplus),
      },
      prior: null,
      incomeDelta: 0,
      expenseDelta: 0,
      surplusDelta: 0,
      expensePctChange: null,
      surplusImproved: false,
      surplusImprovementPhrase: null,
    };
  }
  const expensePct =
    prior.totalExpenses > 0
      ? round1(((current.expenses - prior.totalExpenses) / prior.totalExpenses) * 100)
      : null;
  const surplusImproved = current.surplus > prior.surplus;
  const improvementPhrase = surplusImproved
    ? `Your savings improved from ${shortMonthLabel(prior.month)} to ${shortMonthLabel(current.month)}.`
    : current.surplus < prior.surplus
      ? `Savings slipped from ${shortMonthLabel(prior.month)} to ${shortMonthLabel(current.month)}.`
      : null;
  return {
    current: {
      month: current.month,
      label: current.monthLabel,
      income: round2(current.income),
      expenses: round2(current.expenses),
      surplus: round2(current.surplus),
    },
    prior: {
      month: prior.month,
      label: prior.monthLabel,
      income: round2(prior.totalIncome),
      expenses: round2(prior.totalExpenses),
      surplus: round2(prior.surplus),
    },
    incomeDelta: round2(current.income - prior.totalIncome),
    expenseDelta: round2(current.expenses - prior.totalExpenses),
    surplusDelta: round2(current.surplus - prior.surplus),
    expensePctChange: expensePct,
    surplusImproved,
    surplusImprovementPhrase: improvementPhrase,
  };
}

/**
 * Build per-category history from raw transactions of the last ~120 days
 * (`patternTx`). The current month is *always* excluded from historical
 * aggregates here: prior-month and 3-month-avg numbers come exclusively from
 * months strictly before `now`.
 */
export function buildCategoryHistory(
  current: CurrentMonthSnapshot,
  patternTx: Transaction[],
  now: Date = new Date(),
): CategoryHistoryEntry[] {
  const curMonthKey = monthKeyShort(now);
  const priorMonthKeys: string[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    priorMonthKeys.push(monthKeyShort(d));
  }
  // `priorMonthKeys[0]` is the immediately prior month.

  // Build prior-only month×category totals.
  const priorByCatMonth = new Map<string, Map<string, number>>();
  // And a per-prior-month total-by-category map for top-3 detection.
  const priorMonthTotals = new Map<string, Map<string, number>>();

  for (const t of patternTx) {
    if (t.isIncome) continue;
    const mk = t.date.slice(0, 7);
    if (mk === curMonthKey) continue; // strict: never let current month leak into history
    if (!priorMonthKeys.includes(mk)) continue;
    const cat = normalizeCategoryKey(t.category);
    const bucket = priorByCatMonth.get(cat) ?? new Map<string, number>();
    bucket.set(mk, (bucket.get(mk) ?? 0) + Math.abs(t.amount));
    priorByCatMonth.set(cat, bucket);
    const monthBucket = priorMonthTotals.get(mk) ?? new Map<string, number>();
    monthBucket.set(cat, (monthBucket.get(cat) ?? 0) + Math.abs(t.amount));
    priorMonthTotals.set(mk, monthBucket);
  }

  // For each prior month, pre-compute the top-3 categories.
  const top3ByMonth = new Map<string, Set<string>>();
  for (const [mk, perCat] of priorMonthTotals) {
    const sorted = [...perCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    top3ByMonth.set(mk, new Set(sorted.map(([id]) => id)));
  }

  const out: CategoryHistoryEntry[] = [];
  for (const c of EXPENSE_CATEGORY_OPTIONS) {
    const id = c.id;
    const currentMonth = round2(current.expensesByCategory[id] ?? 0);
    const byMonth = priorByCatMonth.get(id) ?? new Map<string, number>();
    const priorMonth = round2(byMonth.get(priorMonthKeys[0]) ?? 0);
    const prior3Sum = priorMonthKeys.reduce((acc, mk) => acc + (byMonth.get(mk) ?? 0), 0);
    const prior3MonthAvg = round2(prior3Sum / 3);

    const trendPctVsPriorMonth =
      priorMonth > 0 ? Math.round(((currentMonth - priorMonth) / priorMonth) * 100) : null;
    const trendPctVsPrior3Avg =
      prior3MonthAvg > 0
        ? Math.round(((currentMonth - prior3MonthAvg) / prior3MonthAvg) * 100)
        : null;

    let consecutive = 0;
    for (const mk of priorMonthKeys) {
      const top3 = top3ByMonth.get(mk);
      if (top3 && top3.has(id)) consecutive += 1;
      else break;
    }

    let highlight: string | null = null;
    // Spike vs last month — meaningful only if the category had non-trivial
    // spend in BOTH months so we don't shout "Dining is up 1200%" off $2.
    if (
      trendPctVsPriorMonth != null &&
      Math.abs(trendPctVsPriorMonth) >= 15 &&
      currentMonth >= 25 &&
      priorMonth >= 25
    ) {
      const verb = trendPctVsPriorMonth >= 0 ? 'up' : 'down';
      highlight = `${c.label} is ${verb} ${Math.abs(trendPctVsPriorMonth)}% compared to last month.`;
    } else if (consecutive >= 3 && currentMonth >= 50) {
      highlight = `${c.label} has been a top category for ${consecutive} months running.`;
    } else if (
      trendPctVsPrior3Avg != null &&
      Math.abs(trendPctVsPrior3Avg) >= 25 &&
      currentMonth >= 50
    ) {
      const verb = trendPctVsPrior3Avg >= 0 ? 'up' : 'down';
      highlight = `${c.label} is ${verb} ${Math.abs(trendPctVsPrior3Avg)}% vs your 3-month average.`;
    }

    out.push({
      categoryId: id,
      label: c.label,
      currentMonth,
      priorMonth,
      prior3MonthAvg,
      trendPctVsPriorMonth,
      trendPctVsPrior3Avg,
      consecutiveTopMonths: consecutive,
      highlight,
    });
  }

  // Sort by most "interesting" first so consumers can take the top few.
  return out.sort((a, b) => {
    const aScore = scoreEntry(a);
    const bScore = scoreEntry(b);
    return bScore - aScore;
  });
}

/**
 * Return the prior-month snapshot with the highest surplus. Current-month
 * data never gets a chance to be "best" because we filter it out upstream.
 */
export function selectBestSavingsMonth(
  priorSnapshots: MonthlyFinancialSnapshot[],
): MonthlyFinancialSnapshot | null {
  if (priorSnapshots.length === 0) return null;
  return priorSnapshots.reduce<MonthlyFinancialSnapshot>(
    (best, s) => (s.surplus > best.surplus ? s : best),
    priorSnapshots[0],
  );
}

/**
 * One-shot historical context for both the hook and the Coach LLM context.
 * Strictly filters the current month out of `priorSnapshots`.
 */
export function buildHistoricalContext(params: {
  current: CurrentMonthSnapshot;
  snapshots: MonthlyFinancialSnapshot[];
  patternTx: Transaction[];
  now?: Date;
}): HistoricalContext {
  const now = params.now ?? new Date();
  const curKey = currentMonthKey(now);
  const prior = params.snapshots
    .filter((s) => s.month < curKey)
    .slice()
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  const monthlyComparison = buildMonthlyComparison(params.current, prior);
  const categoryHistory = buildCategoryHistory(params.current, params.patternTx, now);
  const bestSavingsMonth = selectBestSavingsMonth(prior);
  const consistentlyHighCategories = categoryHistory.filter((c) => c.consecutiveTopMonths >= 3);

  return {
    priorSnapshots: prior,
    bestSavingsMonth,
    monthlyComparison,
    categoryHistory,
    consistentlyHighCategories,
  };
}

/**
 * Suggested cap for a single category. Strict ordering:
 *   1. Current-month spend when it's a meaningful number (>= $10).
 *   2. Otherwise the average of the last 3 calendar months from snapshots /
 *      prior pattern transactions.
 *   3. Rounded to the nearest 10 in either case.
 *
 * Inputs reflect the two-layer rule: `currentMonthSpend` is the live current
 * value, `priorMonthAverages` is the historical-only average.
 */
export function suggestedCapForCategory(opts: {
  currentMonthSpend: number;
  prior3MonthAvg: number;
}): number {
  const { currentMonthSpend, prior3MonthAvg } = opts;
  if (currentMonthSpend >= 10) return roundToNearestTen(currentMonthSpend);
  if (prior3MonthAvg > 0) return roundToNearestTen(prior3MonthAvg);
  return 0;
}

export function roundToNearestTen(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(10, Math.round(n / 10) * 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Heuristic ranking for category history entries — used to sort so the most
 * "talkable" categories surface first when callers want top-N highlights.
 */
function scoreEntry(e: CategoryHistoryEntry): number {
  let score = 0;
  if (e.highlight) score += 100;
  score += e.consecutiveTopMonths * 5;
  if (e.trendPctVsPriorMonth != null) score += Math.min(40, Math.abs(e.trendPctVsPriorMonth));
  score += Math.min(40, e.currentMonth / 25);
  return score;
}

export function longMonthLabelFromMonthKey(monthKey: string): string {
  return monthLabelFromIsoMonth(monthKey);
}
