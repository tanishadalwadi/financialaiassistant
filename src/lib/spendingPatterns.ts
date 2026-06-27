import type { Transaction } from '../types/models';

export type RecurringCharge = {
  label: string;
  avgAmount: number;
  count: number;
  cadenceDays: number | null;
};

export type CategorySpike = {
  category: string;
  label: string;
  currentMonth: number;
  priorAvg: number;
  ratio: number;
};

export type MonthExpenseAnomaly = {
  monthLabel: string;
  totalExpenses: number;
  zAboveMean: number;
};

export type SpendingPatternSignals = {
  recurring_charges: RecurringCharge[];
  category_spikes: CategorySpike[];
  unusual_expense_month: MonthExpenseAnomaly | null;
};

function normDesc(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\d{4,}/g, '#')
    .replace(/#\d+/g, '#')
    .trim();
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (86400 * 1000));
}

/** Same merchant/description pattern, ≥3 charges, similar amounts (expenses only). */
export function detectRecurringCharges(transactions: Transaction[], maxDays = 120): RecurringCharge[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const ymd = (d: string) => new Date(d + 'T12:00:00');
  const expenses = transactions.filter((t) => !t.isIncome && ymd(t.date) >= cutoff);
  const byKey = new Map<string, { amounts: number[]; dates: string[]; sample: string }>();
  for (const t of expenses) {
    const key = normDesc(t.description);
    if (key.length < 4) continue;
    const cur = byKey.get(key) ?? { amounts: [], dates: [], sample: t.description };
    cur.amounts.push(Math.abs(t.amount));
    cur.dates.push(t.date);
    byKey.set(key, cur);
  }
  const out: RecurringCharge[] = [];
  for (const v of byKey.values()) {
    if (v.amounts.length < 3) continue;
    const mean = v.amounts.reduce((a, b) => a + b, 0) / v.amounts.length;
    const variance = v.amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / v.amounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    if (cv > 0.35) continue;
    v.dates.sort();
    const gaps: number[] = [];
    for (let i = 1; i < v.dates.length; i++) {
      gaps.push(daysBetween(v.dates[i - 1]!, v.dates[i]!));
    }
    const cadence =
      gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    out.push({
      label: v.sample.slice(0, 48),
      avgAmount: Math.round(mean * 100) / 100,
      count: v.amounts.length,
      cadenceDays: cadence && cadence > 0 && cadence < 120 ? cadence : null,
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out.slice(0, 8);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Current calendar month vs average of prior 3 full months per category. */
export function detectCategorySpikes(transactions: Transaction[]): CategorySpike[] {
  const now = new Date();
  const curKey = monthKey(now);
  const totals = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    if (t.isIncome) continue;
    const mk = monthKey(new Date(t.date + 'T12:00:00'));
    const cat = t.category;
    if (!totals.has(cat)) totals.set(cat, new Map());
    const m = totals.get(cat)!;
    m.set(mk, (m.get(mk) ?? 0) + Math.abs(t.amount));
  }
  const out: CategorySpike[] = [];
  for (const [category, byMonth] of totals) {
    const cur = byMonth.get(curKey) ?? 0;
    if (cur < 50) continue;
    const priorKeys: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      priorKeys.push(monthKey(d));
    }
    const priorVals = priorKeys.map((k) => byMonth.get(k) ?? 0).filter((v) => v > 0);
    if (priorVals.length < 2) continue;
    const priorAvg = priorVals.reduce((a, b) => a + b, 0) / priorVals.length;
    if (priorAvg < 30) continue;
    const ratio = cur / priorAvg;
    if (ratio >= 1.45) {
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      out.push({
        category,
        label,
        currentMonth: Math.round(cur),
        priorAvg: Math.round(priorAvg),
        ratio: Math.round(ratio * 100) / 100,
      });
    }
  }
  out.sort((a, b) => b.ratio - a.ratio);
  return out.slice(0, 5);
}

/** Highest total-expense month in last 6 vs mean (simple z). */
export function detectUnusualExpenseMonth(transactions: Transaction[]): MonthExpenseAnomaly | null {
  const byMonth = new Map<string, number>();
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth.set(monthKey(d), 0);
  }
  for (const t of transactions) {
    if (t.isIncome) continue;
    const mk = monthKey(new Date(t.date + 'T12:00:00'));
    if (!byMonth.has(mk)) continue;
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + Math.abs(t.amount));
  }
  const entries = [...byMonth.entries()].map(([k, v]) => ({
    key: k,
    total: v,
    label: new Date(k + '-01T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  }));
  const vals = entries.map((e) => e.total);
  if (vals.length < 4 || vals.every((v) => v === 0)) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length) || 1;
  let best: (typeof entries)[0] | null = null;
  let bestZ = 0;
  for (const e of entries) {
    const z = (e.total - mean) / std;
    if (e.total > mean && z > bestZ) {
      bestZ = z;
      best = e;
    }
  }
  if (!best || bestZ < 1.25) return null;
  return {
    monthLabel: best.label,
    totalExpenses: Math.round(best.total),
    zAboveMean: Math.round(bestZ * 100) / 100,
  };
}

export function buildSpendingPatternSignals(transactions: Transaction[]): SpendingPatternSignals {
  return {
    recurring_charges: detectRecurringCharges(transactions),
    category_spikes: detectCategorySpikes(transactions),
    unusual_expense_month: detectUnusualExpenseMonth(transactions),
  };
}
