import type { Goal, SpendingCategorySummary } from '../types/models';
import type { GoalGapAnalysis } from './goalGapEngine';
import { formatCurrency } from './displayFormat';

/**
 * Coach tab prompt from Goal Detail CTA (goal, gap, top blocking category).
 */
export function buildGoalDetailCoachPrompt(
  goal: Goal,
  remaining: number,
  monthlySurplus: number,
  topBlocking: SpendingCategorySummary | undefined,
): string {
  const topLabel = topBlocking?.label ?? 'my top spend category';
  const topAmt = topBlocking?.total ?? 0;
  const topPart =
    topAmt > 0
      ? ` My top spend category this month is ${topLabel} at ${formatCurrency(topAmt)}/mo.`
      : '';
  return `Help me reach my ${goal.title} goal of ${formatCurrency(goal.targetAmount)} by ${goal.dueDate}. I still need ${formatCurrency(remaining)} to fully fund it. My current monthly surplus is about ${formatCurrency(monthlySurplus)}/mo.${topPart} What plan should I follow?`;
}

/**
 * Goal Detail "AI suggestion" card — specific to remaining balance and top category.
 */
export function buildGoalDetailAiBlurb(
  goal: Goal,
  remaining: number,
  spendingByCategory: SpendingCategorySummary[],
  gapAnalysis: GoalGapAnalysis,
): string {
  if (remaining <= 0) {
    return `You have reached the target for "${goal.title}" on paper. If you move more cash into this bucket, log it under Add to savings so progress stays accurate.`;
  }

  const top = spendingByCategory[0];
  const topLabel = top?.label ?? null;
  const topAmt = top?.total ?? 0;
  const topSentence =
    topAmt > 0
      ? `This month your largest expense category is ${topLabel} at ${formatCurrency(topAmt)} — that is the first place to look if you want more room for this goal.`
      : `Add a few more categorized expenses so we can name your biggest category and size realistic trims.`;

  if (gapAnalysis.paceStatus === 'no_surplus') {
    return `You still need ${formatCurrency(remaining)} for "${goal.title}", but monthly surplus is about ${formatCurrency(gapAnalysis.monthlySurplus)}/mo right now, so the timeline is blocked until income rises or spending falls. ${topSentence}`;
  }

  const proj = gapAnalysis.projectedCompletion;
  const due = gapAnalysis.dueDate;
  if (proj && proj.getTime() <= due.getTime()) {
    const fmt = proj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `About ${formatCurrency(remaining)} left for "${goal.title}". At roughly ${formatCurrency(gapAnalysis.monthlySurplus)}/mo from surplus, you are on track to finish around ${fmt}, before the due date. ${topSentence}`;
  }
  if (proj && proj.getTime() > due.getTime()) {
    const fmt = proj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `About ${formatCurrency(remaining)} left for "${goal.title}", but at ${formatCurrency(gapAnalysis.monthlySurplus)}/mo you would finish around ${fmt}, after the deadline. ${topSentence}`;
  }

  return `About ${formatCurrency(remaining)} left for "${goal.title}". ${topSentence}`;
}
