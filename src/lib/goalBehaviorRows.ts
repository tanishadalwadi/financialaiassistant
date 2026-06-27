import type { SpendingCategorySummary } from '../types/models';
import type { GoalGapAnalysis } from './goalGapEngine';
import { formatCurrency } from './displayFormat';

export type GoalBehaviorRow = {
  key: string;
  /** Full line: action → +$X/mo */
  line: string;
};

function findCat(
  spendingByCategory: SpendingCategorySummary[],
  id: string,
): SpendingCategorySummary | undefined {
  return spendingByCategory.find((c) => c.id.toLowerCase() === id.toLowerCase());
}

/**
 * 2–3 concrete behavior rows for Goal Detail (design-system: reduce top category, dining cadence, subscriptions).
 */
export function buildGoalBehaviorRows(
  spendingByCategory: SpendingCategorySummary[],
  analysis: GoalGapAnalysis,
): GoalBehaviorRow[] {
  if (analysis.remaining <= 0 || analysis.paceStatus === 'funded') return [];

  const rows: GoalBehaviorRow[] = [];
  const usedCatIds = new Set<string>();

  const top = spendingByCategory[0];
  if (top && top.total > 0) {
    const save = Math.round(top.total * 0.3);
    if (save > 0) {
      rows.push({
        key: `top-${top.id}`,
        line: `Reduce ${top.label} by 30% → +${formatCurrency(save)}/mo`,
      });
      usedCatIds.add(top.id.toLowerCase());
    }
  }

  const dining = findCat(spendingByCategory, 'dining');
  if (dining && dining.total > 0 && !usedCatIds.has('dining')) {
    const est = Math.max(Math.round(dining.total * 0.4), 20);
    rows.push({
      key: 'dining',
      line: `Cut dining to 2x/week → +${formatCurrency(est)}/mo`,
    });
    usedCatIds.add('dining');
  }

  const subscriptions = findCat(spendingByCategory, 'subscriptions');
  if (subscriptions && subscriptions.total > 0 && rows.length < 3) {
    const saveSub = Math.round(subscriptions.total * 0.3);
    if (saveSub > 0) {
      rows.push({
        key: 'subscriptions',
        line: `Review subscriptions → +${formatCurrency(saveSub)}/mo`,
      });
    }
  }

  const shopping = findCat(spendingByCategory, 'shopping');
  if (rows.length < 3 && shopping && shopping.total > 0 && !usedCatIds.has('shopping')) {
    const save = Math.round(shopping.total * 0.3);
    if (save > 0) {
      rows.push({
        key: 'shopping',
        line: `Reduce ${shopping.label} by 30% → +${formatCurrency(save)}/mo`,
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      key: 'needs-data',
      line: 'Log categorized expenses this month — we will estimate dollars you can shift toward this goal.',
    });
  }

  return rows.slice(0, 3);
}
