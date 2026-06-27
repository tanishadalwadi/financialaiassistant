import { formatCurrency } from './displayFormat';
import type { Goal } from '../types/models';
import type { SpendingCategorySummary } from '../types/models';
import type { CategoryHistoryEntry, MonthlyComparison } from './historicalContext';

export type CoachInsightInput = {
  surplusRaw: number;
  incomeSnapshot: number;
  monthExpenses: number;
  topCategory: SpendingCategorySummary | undefined;
  primaryGoal: Goal | null;
  monthlySurplusForPace: number;
};

/** First non-rent category by spend (flexible spend hint). */
export function topFlexibleCategory(spendingByCategory: SpendingCategorySummary[]): SpendingCategorySummary | undefined {
  const fixed = new Set([
    'rent',
    'mortgage',
    'insurance',
    'loan',
    'loan payment',
    'Rent',
    'Mortgage',
    'Insurance',
    'Loan',
  ]);
  return [...spendingByCategory]
    .filter((c) => !fixed.has(c.id) && !fixed.has(c.label))
    .sort((a, b) => b.total - a.total)[0];
}

export function monthlyShortfallForGoal(goal: Goal, surplus: number): number {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  if (remaining <= 0) return 0;
  const due = new Date(goal.dueDate + 'T12:00:00');
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  const monthsLeft = Math.max(0.25, ms / (30.44 * 86400000));
  const required = remaining / monthsLeft;
  return Math.max(0, Math.round(required - Math.max(0, surplus)));
}

/**
 * Optional second sentence comparing a coach card's category to history.
 * Returns null when there is nothing notable to say, so the caller can keep
 * its existing copy unchanged for categories without enough historical signal.
 *
 * Threshold rules avoid noisy false positives:
 *   - Skip categories with < $25 in either month (relative changes get silly).
 *   - Skip changes < 12% — too small to be worth surfacing.
 */
export function describeCategoryVsHistory(entry: CategoryHistoryEntry | undefined | null): string | null {
  if (!entry) return null;
  if (entry.currentMonth < 25 && entry.priorMonth < 25) return null;
  if (entry.trendPctVsPriorMonth != null && Math.abs(entry.trendPctVsPriorMonth) >= 12 && entry.priorMonth >= 25) {
    const verb = entry.trendPctVsPriorMonth >= 0 ? 'up' : 'down';
    return `${entry.label} is ${verb} ${Math.abs(entry.trendPctVsPriorMonth)}% vs last month.`;
  }
  if (entry.consecutiveTopMonths >= 3) {
    return `${entry.label} has been a top category for ${entry.consecutiveTopMonths} months in a row.`;
  }
  if (
    entry.trendPctVsPrior3Avg != null &&
    Math.abs(entry.trendPctVsPrior3Avg) >= 20 &&
    entry.prior3MonthAvg >= 25
  ) {
    const verb = entry.trendPctVsPrior3Avg >= 0 ? 'up' : 'down';
    return `${entry.label} is ${verb} ${Math.abs(entry.trendPctVsPrior3Avg)}% vs your 3-month average.`;
  }
  return null;
}

/** A short summary of the latest month-over-month change suitable for hero copy. */
export function describeMonthlyComparison(mc: MonthlyComparison | null | undefined): string | null {
  if (!mc || !mc.prior) return null;
  if (mc.surplusImprovementPhrase) return mc.surplusImprovementPhrase;
  if (mc.expensePctChange != null && Math.abs(mc.expensePctChange) >= 5) {
    const verb = mc.expensePctChange >= 0 ? 'up' : 'down';
    return `Total expenses are ${verb} ${Math.abs(mc.expensePctChange)}% vs ${mc.prior.label}.`;
  }
  return null;
}

export function getCoachInsightLines(input: CoachInsightInput): [string, string] | null {
  const { surplusRaw, topCategory, primaryGoal, monthlySurplusForPace } = input;
  const topLabel = topCategory?.label ?? 'discretionary spend';
  const topAmt = topCategory?.total ?? 0;
  const saving = Math.round(topAmt * 0.3);
  const goalName = primaryGoal?.title ?? 'your top goal';

  if (!topCategory || topAmt <= 0) {
    if (surplusRaw <= 0) {
      return [
        `You're spending ${formatCurrency(Math.abs(surplusRaw))} more than you earn this month based on your plan and logged expenses.`,
        'Add a few categorized transactions so we can point to your biggest flexible category.',
      ];
    }
    return null;
  }

  let line1: string;
  if (surplusRaw <= 0) {
    line1 = `You're spending ${formatCurrency(Math.abs(surplusRaw))} more than you earn. ${topLabel} (${formatCurrency(topAmt)}) is where to look first.`;
  } else if (primaryGoal) {
    const short = monthlyShortfallForGoal(primaryGoal, monthlySurplusForPace);
    if (short > 0) {
      line1 = `You're about ${formatCurrency(short)}/mo short of your ${goalName} target at your current pace. ${topLabel} is your biggest flexible spend.`;
    } else {
      line1 = `${topLabel} is your biggest variable cost this month (${formatCurrency(topAmt)}). Small trims there keep your goals on pace.`;
    }
  } else {
    line1 = `${topLabel} is your biggest variable cost this month (${formatCurrency(topAmt)}).`;
  }

  const remaining = primaryGoal ? Math.max(0, primaryGoal.targetAmount - primaryGoal.savedAmount) : 0;
  const monthsToClose =
    monthlySurplusForPace > 0 && remaining > 0 && saving > 0
      ? Math.ceil(remaining / (monthlySurplusForPace + saving))
      : null;

  const line2 =
    monthsToClose != null && monthsToClose > 0
      ? `Cut ${topLabel} by 30% → saves ~${formatCurrency(saving)}/mo → ${goalName} funded ~${monthsToClose} month${monthsToClose === 1 ? '' : 's'} sooner.`
      : `Cut ${topLabel} by 30% → frees ~${formatCurrency(saving)}/mo for ${goalName}.`;

  return [line1, line2];
}
