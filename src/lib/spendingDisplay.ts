import type { SpendingCategorySummary } from '../types/models';
import { CATEGORY_COLORS } from '../theme/tokens';

const PALETTE: string[] = [
  CATEGORY_COLORS.Dining,
  CATEGORY_COLORS.Groceries,
  CATEGORY_COLORS.Rent,
  CATEGORY_COLORS.Transport,
  CATEGORY_COLORS.Subscriptions,
  CATEGORY_COLORS.Shopping,
  CATEGORY_COLORS.Health,
  CATEGORY_COLORS.Travel,
  CATEGORY_COLORS.Other,
].filter(Boolean);

function colorForLabel(label: string): string {
  return CATEGORY_COLORS[label] ?? CATEGORY_COLORS.Other ?? '#6B7280';
}

function nextNonAdjacentColor(current: string, prev: string, next: string): string {
  const start = Math.max(0, PALETTE.indexOf(current));
  for (let step = 1; step <= PALETTE.length; step++) {
    const c = PALETTE[(start + step) % PALETTE.length];
    if (c !== prev && c !== next) return c;
  }
  return current;
}

/**
 * Spending by category: amount descending, then **Other** last (design-system).
 */
export function orderSpendingOtherLast(items: SpendingCategorySummary[]): SpendingCategorySummary[] {
  if (items.length === 0) return [];
  const isOther = (c: SpendingCategorySummary) => c.id.toLowerCase() === 'other';
  const rest = items.filter((c) => !isOther(c)).sort((a, b) => b.total - a.total);
  const others = items.filter(isOther).sort((a, b) => b.total - a.total);
  return [...rest, ...others];
}

/**
 * Ensures no two **adjacent** pie slices share the same fill (including wrap: first vs last).
 */
export function assignDistinctAdjacentSliceColors(items: SpendingCategorySummary[]): SpendingCategorySummary[] {
  const n = items.length;
  if (n === 0) return [];
  const preferred = items.map((item) => colorForLabel(item.label));
  const out = [...preferred];

  for (let pass = 0; pass < n + 2; pass++) {
    for (let i = 0; i < n; i++) {
      const prev = out[(i - 1 + n) % n];
      const next = out[(i + 1) % n];
      if (out[i] === prev || out[i] === next) {
        out[i] = nextNonAdjacentColor(out[i], prev, next);
      }
    }
  }

  return items.map((item, i) => ({ ...item, color: out[i] }));
}

/** Order + colors for charts and category lists (single source in hook). */
export function applySpendingChartPresentation(items: SpendingCategorySummary[]): SpendingCategorySummary[] {
  return assignDistinctAdjacentSliceColors(orderSpendingOtherLast(items));
}
