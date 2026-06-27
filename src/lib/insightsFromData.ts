import type { Goal, Insight, SpendingCategorySummary } from '../types/models';
import type { SpendingPatternSignals } from './spendingPatterns';
import { formatCurrency, formatNumberDisplay } from './displayFormat';

/** Rotating hints so repeated cap breaches don’t share identical copy. */
export const CAP_BREACH_HINTS = [
  'Adjust the cap above or trim this category in Transactions.',
  'A few large purchases often cause this — spot them and plan the rest of the month.',
  'If the cap is realistic, try delaying non-urgent spend until next month.',
  'Compare to your Top categories list and decide what to normalize.',
  'Raise the cap only if it was set too tight; otherwise treat this as a nudge.',
  'Ask AI Coach which cut would free the most room fastest.',
] as const;

export function capBreachHintForIndex(index: number): string {
  return CAP_BREACH_HINTS[index % CAP_BREACH_HINTS.length] ?? CAP_BREACH_HINTS[0];
}

export type CapBreach = { label: string; spent: number; cap: number; categoryId: string };

export function computeCapBreaches(
  spendingByCategory: SpendingCategorySummary[],
  categoryBudgetCaps: Record<string, number>,
): CapBreach[] {
  const out: CapBreach[] = [];
  for (const c of spendingByCategory) {
    const cap = categoryBudgetCaps[c.id];
    if (cap && c.total > cap) {
      out.push({ label: c.label, spent: c.total, cap, categoryId: c.id });
    }
  }
  return out;
}

/** Section order for Insights “AI perspective” (coach-style scan). */
export const INSIGHT_IMPACT_GROUP_ORDER = [
  'Budget cap',
  'Patterns',
  'Categories',
  'Savings',
  'Goals',
  'Data',
  'Get started',
] as const;

export function groupInsightsByImpactLabel(insights: Insight[]): { label: string; items: Insight[] }[] {
  const map = new Map<string, Insight[]>();
  for (const i of insights) {
    const list = map.get(i.impactLabel) ?? [];
    list.push(i);
    map.set(i.impactLabel, list);
  }
  const out: { label: string; items: Insight[] }[] = [];
  const seen = new Set<string>();
  for (const label of INSIGHT_IMPACT_GROUP_ORDER) {
    const items = map.get(label);
    if (items?.length) {
      out.push({ label, items });
      seen.add(label);
    }
  }
  for (const [label, items] of map.entries()) {
    if (!seen.has(label) && items.length) {
      out.push({ label, items });
    }
  }
  return out;
}

export type InsightInputs = {
  spendingByCategory: SpendingCategorySummary[];
  monthExpenses: number;
  incomeSnapshot: number;
  surplus: number;
  savingsTarget: number;
  goals: Goal[];
  patterns?: SpendingPatternSignals | null;
  capBreaches?: CapBreach[];
};

function patternInsights(patterns: SpendingPatternSignals | null | undefined): Insight[] {
  if (!patterns) return [];
  const p: Insight[] = [];
  const r = patterns.recurring_charges[0];
  if (r) {
    p.push({
      id: 'pattern-recurring',
      title: 'Recurring charge',
      description: `"${r.label}" shows up ${r.count} times in recent history (~$${formatNumberDisplay(r.avgAmount)} avg${
        r.cadenceDays ? `, about every ${r.cadenceDays} days` : ''
      }). Worth confirming it's still worth it.`,
      tone: 'neutral',
      impactLabel: 'Patterns',
    });
  }
  for (const s of patterns.category_spikes.slice(0, 2)) {
    p.push({
      id: `pattern-spike-${s.category}`,
      title: `${s.label} is up`,
      description: `This month ~$${formatNumberDisplay(s.currentMonth)} vs ~$${formatNumberDisplay(s.priorAvg)} avg in prior months (${s.ratio}×). A good place to look if cash feels tight.`,
      tone: 'warning',
      impactLabel: 'Patterns',
    });
  }
  const u = patterns.unusual_expense_month;
  if (u) {
    p.push({
      id: 'pattern-unusual-month',
      title: 'Unusual spend month',
      description: `${u.monthLabel} had higher total expenses than your recent average. Review big purchases that month if it surprised you.`,
      tone: 'warning',
      impactLabel: 'Patterns',
    });
  }
  return p;
}

export function buildInsightsFromData(input: InsightInputs): Insight[] {
  const out: Insight[] = [];
  const top = input.spendingByCategory[0];

  if (top && top.total > 0) {
    out.push({
      id: 'top-category',
      title: `Top spend: ${top.label}`,
      description: `About ${top.percentage}% of this month's expenses went to ${top.label.toLowerCase()} (${formatCurrency(top.total)}).`,
      tone: top.percentage >= 35 ? 'warning' : 'neutral',
      impactLabel: 'Categories',
    });
  }

  if (input.savingsTarget > 0) {
    const met = input.surplus >= input.savingsTarget;
    out.push({
      id: 'savings-pace',
      title: met ? 'Savings target in view' : 'Savings pace',
      description: met
        ? `Estimated surplus this month (${formatCurrency(input.surplus)}) meets or beats your ${formatCurrency(input.savingsTarget)} target.`
        : `Surplus about ${formatCurrency(input.surplus)} vs target ${formatCurrency(input.savingsTarget)} — small cuts in discretionary spend close the gap.`,
      tone: met ? 'positive' : 'warning',
      impactLabel: 'Savings',
    });
  }

  if (input.goals.length > 0) {
    const g = input.goals[0];
    const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0;
    out.push({
      id: 'primary-goal',
      title: g.title,
      description: `${pct}% funded (${formatCurrency(g.savedAmount)} of ${formatCurrency(g.targetAmount)}). Due ${new Date(g.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
      tone: pct >= 75 ? 'positive' : pct >= 40 ? 'neutral' : 'warning',
      impactLabel: 'Goals',
    });
  }

  if (input.monthExpenses === 0 && input.incomeSnapshot > 0) {
    out.push({
      id: 'no-spend',
      title: 'No spending logged yet',
      description:
        'Add expenses under Transactions so category mix and pacing reflect what you actually spend.',
      tone: 'neutral',
      impactLabel: 'Data',
    });
  }

  if (!out.length) {
    out.push({
      id: 'starter',
      title: 'Build your picture',
      description: 'Set monthly income on Profile and add a few transactions — insights update automatically.',
      tone: 'neutral',
      impactLabel: 'Get started',
    });
  }

  const capInsights: Insight[] = (input.capBreaches ?? []).map((b, i) => {
    const decS = b.spent % 1 !== 0 ? 2 : 0;
    const decC = b.cap % 1 !== 0 ? 2 : 0;
    return {
      id: `cap-breach-${b.categoryId}`,
      title: `Over cap: ${b.label}`,
      description: `${formatCurrency(b.spent, decS)} spent vs ${formatCurrency(b.cap, decC)} cap. ${capBreachHintForIndex(i)}`,
      tone: 'warning' as const,
      impactLabel: 'Budget cap',
    };
  });

  const merged = [...capInsights, ...patternInsights(input.patterns), ...out];
  return merged.slice(0, 24);
}

export function buildInsightSummaryLine(input: InsightInputs): string {
  const insights = buildInsightsFromData(input);
  return insights[0]?.description ?? 'Add activity to see personalized insights.';
}
