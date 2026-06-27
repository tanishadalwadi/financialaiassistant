/**
 * Monthly financial snapshots — pure helpers + Supabase upsert.
 *
 * A snapshot is a per-user, per-month aggregate that lets Kova reason about
 * "April vs March" without scanning every raw transaction. It is rebuilt after
 * every import / manual edit, so it's always consistent with `transactions`.
 */
import { supabase } from './supabase';
import { EXPENSE_CATEGORY_OPTIONS } from '../constants/expenseCategories';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CATEGORY_LABEL_LOOKUP: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORY_OPTIONS.map((c) => [c.id, c.label]),
);

/** Convert any ISO-ish date string into its first-of-month key `YYYY-MM-01`. */
export function monthKeyFromDate(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** Friendly label like "April 2026" for a `YYYY-MM-01` key. */
export function monthLabelFromKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const m = Number(monthStr) - 1;
  const name = MONTH_NAMES[m] ?? '';
  return name ? `${name} ${yearStr}` : monthKey;
}

export interface SnapshotInput {
  /** ISO date YYYY-MM-DD or longer (only first 10 chars are used). */
  date: string;
  amount: number;
  is_income: boolean;
  category: string;
  category_label?: string | null;
}

export interface ComputedMonthlySnapshot {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  surplus: number;
  savingsRate: number | null;
  topCategory: string | null;
  topCategoryAmount: number;
  transactionCount: number;
}

function prettyCategory(key: string, label?: string | null): string {
  if (label && label.trim().length > 0) return label.trim();
  if (CATEGORY_LABEL_LOOKUP[key]) return CATEGORY_LABEL_LOOKUP[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Group transactions by month and reduce them into snapshot rows.
 * Pure — safe to unit test and call from any context.
 */
export function computeMonthlySnapshots(rows: SnapshotInput[]): ComputedMonthlySnapshot[] {
  const byMonth = new Map<string, SnapshotInput[]>();
  for (const r of rows) {
    if (!r?.date) continue;
    const key = monthKeyFromDate(r.date);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(r);
    else byMonth.set(key, [r]);
  }

  const out: ComputedMonthlySnapshot[] = [];
  for (const [month, monthRows] of byMonth) {
    let income = 0;
    let expenses = 0;
    const byCat = new Map<string, { amount: number; label: string }>();

    for (const r of monthRows) {
      const abs = Math.abs(Number(r.amount) || 0);
      if (r.is_income) {
        income += abs;
        continue;
      }
      expenses += abs;
      const key = (r.category ?? 'other').toLowerCase();
      const existing = byCat.get(key);
      const label = prettyCategory(key, r.category_label);
      if (existing) {
        existing.amount += abs;
      } else {
        byCat.set(key, { amount: abs, label });
      }
    }

    let topCategory: string | null = null;
    let topCategoryAmount = 0;
    for (const v of byCat.values()) {
      if (v.amount > topCategoryAmount) {
        topCategory = v.label;
        topCategoryAmount = v.amount;
      }
    }

    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : null;

    out.push({
      month,
      monthLabel: monthLabelFromKey(month),
      totalIncome: round2(income),
      totalExpenses: round2(expenses),
      surplus: round2(surplus),
      savingsRate: savingsRate == null ? null : round4(savingsRate),
      topCategory,
      topCategoryAmount: round2(topCategoryAmount),
      transactionCount: monthRows.length,
    });
  }

  return out.sort((a, b) => (a.month < b.month ? 1 : -1));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Recompute snapshots for an explicit set of months by re-querying that user's
 * transactions in those windows, then upsert into `monthly_financial_snapshots`.
 *
 * Best-effort: failures are logged and never throw — the import path must not
 * regress if the snapshots table is missing on an unmigrated project.
 */
export async function refreshMonthlySnapshots(
  userId: string,
  monthKeys: string[],
): Promise<{ error: Error | null; count: number }> {
  const unique = [...new Set(monthKeys.filter(Boolean))];
  if (unique.length === 0) return { error: null, count: 0 };

  // Pull just the snapshot-relevant columns for these months in one query.
  const ranges = unique.map((k) => monthRangeForKey(k));
  const earliestStart = ranges.reduce((a, b) => (a < b.start ? a : b.start), ranges[0].start);
  const latestEnd = ranges.reduce((a, b) => (a > b.end ? a : b.end), ranges[0].end);

  const { data, error } = await supabase
    .from('transactions')
    .select('date, amount, is_income, category, category_label')
    .eq('user_id', userId)
    .gte('date', earliestStart)
    .lte('date', latestEnd);

  if (error) {
    return { error: new Error(error.message), count: 0 };
  }

  const filtered = (data ?? []).filter((r) => {
    const key = monthKeyFromDate(r.date);
    return unique.includes(key);
  });

  const snapshots = computeMonthlySnapshots(filtered as SnapshotInput[]);

  // Months that ended up empty after a delete still need a zeroed row so
  // historical insights don't show stale numbers.
  const computedMonths = new Set(snapshots.map((s) => s.month));
  for (const key of unique) {
    if (!computedMonths.has(key)) {
      snapshots.push({
        month: key,
        monthLabel: monthLabelFromKey(key),
        totalIncome: 0,
        totalExpenses: 0,
        surplus: 0,
        savingsRate: null,
        topCategory: null,
        topCategoryAmount: 0,
        transactionCount: 0,
      });
    }
  }

  if (snapshots.length === 0) return { error: null, count: 0 };

  const nowIso = new Date().toISOString();
  const rows = snapshots.map((s) => ({
    user_id: userId,
    month: s.month,
    month_label: s.monthLabel,
    total_income: s.totalIncome,
    total_expenses: s.totalExpenses,
    surplus: s.surplus,
    savings_rate: s.savingsRate,
    top_category: s.topCategory,
    top_category_amount: s.topCategoryAmount,
    transaction_count: s.transactionCount,
    updated_at: nowIso,
  }));

  const { error: upErr } = await supabase
    .from('monthly_financial_snapshots')
    .upsert(rows, { onConflict: 'user_id,month' });

  if (upErr) {
    return { error: new Error(upErr.message), count: 0 };
  }
  return { error: null, count: rows.length };
}

function monthRangeForKey(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split('-');
  const y = Number(yearStr);
  const m = Number(monthStr);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`,
  };
}
