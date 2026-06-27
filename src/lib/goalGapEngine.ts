import type { Goal, SpendingCategorySummary } from '../types/models';
import { formatCurrency, formatNumberDisplay } from './displayFormat';

export type GoalPaceStatus = 'funded' | 'ahead' | 'on_track' | 'behind' | 'no_surplus';

export type GoalGapAnalysis = {
  goalId: string;
  goalTitle: string;
  remaining: number;
  /** Monthly $ that could go to this goal if all current surplus went here. */
  monthlySurplus: number;
  monthsToComplete: number | null;
  projectedCompletion: Date | null;
  dueDate: Date;
  paceStatus: GoalPaceStatus;
  /** Positive = projected finish before due date (good). */
  daysAheadOfDue: number | null;
  behaviorTitle: string;
  behaviorBody: string;
  /** One line for list views. */
  gapSummaryLine: string;
};

export type GoalGapEngineInput = {
  goals: Goal[];
  monthlySurplus: number;
  spendingByCategory: SpendingCategorySummary[];
};

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const whole = Math.floor(months);
  const frac = months - whole;
  d.setMonth(d.getMonth() + whole);
  if (frac > 0) {
    d.setDate(d.getDate() + Math.round(frac * 30));
  }
  return d;
}

function paceStatusFromDates(projected: Date | null, due: Date, remaining: number, surplus: number): GoalPaceStatus {
  if (remaining <= 0) return 'funded';
  if (surplus <= 0 || !projected) return 'no_surplus';
  const msPerDay = 86400000;
  const days = Math.round((due.getTime() - projected.getTime()) / msPerDay);
  if (days >= 10) return 'ahead';
  if (days >= -7) return 'on_track';
  return 'behind';
}

function buildBehaviorCopy(
  goal: Goal,
  remaining: number,
  surplus: number,
  pace: GoalPaceStatus,
  topCat: SpendingCategorySummary | undefined,
): { title: string; body: string } {
  if (pace === 'funded') {
    return {
      title: 'Fully funded on paper',
      body: `You have reached or exceeded the target for "${goal.title}". You can still log contributions if you move more cash into this bucket.`,
    };
  }
  if (pace === 'no_surplus') {
    return {
      title: 'Free up monthly surplus',
      body: `You still need ${formatCurrency(remaining)} for "${goal.title}". Add income or trim spend on Profile, log transactions so surplus is real, or add a contribution here — then you will see a projected finish date.`,
    };
  }
  const cat = topCat?.label?.toLowerCase() ?? 'your top category';
  if (pace === 'behind' && topCat && topCat.total > 0) {
    const cut = Math.round(topCat.total * 0.2);
    return {
      title: `Trim ${topCat.label}`,
      body: `Cut about 20% from ${cat} (~$${formatNumberDisplay(cut)}/mo this month based on your log) and move that amount toward "${goal.title}" to close the gap faster.`,
    };
  }
  if (pace === 'behind') {
    return {
      title: 'Pick one bill to pause',
      body: `Pick one discretionary spend to skip twice this month and route that cash to "${goal.title}" — small repeats beat one big cut.`,
    };
  }
  if (pace === 'ahead') {
    return {
      title: 'Stay the course',
      body: `You are ahead of the due date for "${goal.title}" at your current surplus pace. Keep logging so the plan stays honest.`,
    };
  }
  return {
    title: 'Automate the transfer',
    body: `Move ${formatCurrency(Math.min(Math.round(surplus * 0.5), Math.round(remaining)))} or more this month to "${goal.title}" so progress matches your surplus.`,
  };
}

export function analyzeGoalGaps(input: GoalGapEngineInput): GoalGapAnalysis[] {
  const { goals, monthlySurplus: surplus, spendingByCategory } = input;
  const topCat = spendingByCategory[0];
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  return goals.map((goal) => {
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const due = new Date(goal.dueDate + 'T12:00:00');
    let monthsToComplete: number | null = null;
    let projected: Date | null = null;
    let daysAheadOfDue: number | null = null;

    if (remaining > 0 && surplus > 0) {
      monthsToComplete = remaining / surplus;
      projected = addMonths(now, monthsToComplete);
      daysAheadOfDue = Math.round((due.getTime() - projected.getTime()) / 86400000);
    }

    const paceStatus = paceStatusFromDates(projected, due, remaining, surplus);
    const { title, body } = buildBehaviorCopy(goal, remaining, surplus, paceStatus, topCat);

    let gapSummaryLine: string;
    if (remaining <= 0) {
      gapSummaryLine = 'Target met';
    } else if (!surplus || surplus <= 0) {
      gapSummaryLine = "No surplus yet — tap to see what's blocking this";
    } else if (projected && monthsToComplete != null) {
      const fmt = projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      gapSummaryLine =
        paceStatus === 'behind'
          ? `Behind pace — ~${monthsToComplete!.toFixed(1)} mo at ${formatCurrency(surplus)}/mo → ${fmt}`
          : paceStatus === 'ahead'
            ? `Ahead of pace — ~${monthsToComplete!.toFixed(1)} mo → ${fmt}`
            : `On track — ~${monthsToComplete!.toFixed(1)} mo → ${fmt}`;
    } else {
      gapSummaryLine = 'Add data to see pace';
    }

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      remaining,
      monthlySurplus: surplus,
      monthsToComplete,
      projectedCompletion: projected,
      dueDate: due,
      paceStatus,
      daysAheadOfDue,
      behaviorTitle: title,
      behaviorBody: body,
      gapSummaryLine,
    };
  });
}

export type CategoryGoalLink = {
  categoryLabel: string;
  monthlySaveIfReduce30Pct: number;
  weeksClosedOnPrimaryGoal: number | null;
  sentence: string;
};

export function buildTopCategoryGoalLink(
  top: SpendingCategorySummary | undefined,
  primaryGoalRemaining: number,
  monthlySurplus: number,
): CategoryGoalLink | null {
  if (!top || top.total <= 0) return null;
  const monthlySave = Math.round(top.total * 0.3);
  if (monthlySave <= 0) return null;

  let weeksClosed: number | null = null;
  if (primaryGoalRemaining > 0 && monthlySurplus > 0) {
    const oldM = primaryGoalRemaining / monthlySurplus;
    const newS = monthlySurplus + monthlySave;
    const newM = primaryGoalRemaining / newS;
    if (Number.isFinite(oldM) && Number.isFinite(newM) && oldM > newM) {
      weeksClosed = Math.round((oldM - newM) * 4.345);
    }
  }

  const weeksPart =
    weeksClosed != null && weeksClosed > 0
      ? ` That could close the gap on your top goal by about ${weeksClosed} week${weeksClosed === 1 ? '' : 's'} if it all went to savings.`
      : '';

  return {
    categoryLabel: top.label,
    monthlySaveIfReduce30Pct: monthlySave,
    weeksClosedOnPrimaryGoal: weeksClosed,
    sentence: `Reducing ${top.label} by 30% frees ~$${formatNumberDisplay(monthlySave)}/mo.${weeksPart}`,
  };
}

export type HomeNudgeInput = {
  goals: Goal[];
  monthlySurplus: number;
  monthExpenses: number;
  incomeSnapshot: number;
  savingsTarget: number;
  spendingByCategory: SpendingCategorySummary[];
  hasTransactions: boolean;
};

/**
 * Goal-linked nudges for Home (max 2 lines).
 */
export function buildHomeGoalNudges(input: HomeNudgeInput): string[] {
  const lines: string[] = [];
  const {
    goals,
    monthlySurplus: surplus,
    monthExpenses,
    incomeSnapshot,
    savingsTarget,
    spendingByCategory,
    hasTransactions,
  } = input;

  if (!hasTransactions && monthExpenses === 0) {
    return [
      'Add transactions so the goal gap engine can link spending to your targets.',
    ];
  }

  if (goals.length === 0) {
    lines.push('Create a goal on the Goals tab to unlock pace tracking and goal-linked nudges.');
  }

  const analyses = analyzeGoalGaps({ goals, monthlySurplus: surplus, spendingByCategory });
  const primary = analyses[0];
  const behind = analyses.filter((a) => a.paceStatus === 'behind');

  if (primary && goals.length > 0) {
    if (primary.paceStatus === 'funded') {
      lines.push(`"${primary.goalTitle}" is fully funded — pick a stretch goal or raise the target.`);
    } else if (primary.paceStatus === 'behind') {
      lines.push(`"${primary.goalTitle}" is behind pace: ${primary.gapSummaryLine}`);
    } else if (primary.paceStatus === 'no_surplus') {
      lines.push(
        `Surplus is tight (${formatCurrency(surplus)}/mo) — "${primary.goalTitle}" needs breathing room: trim spend or add income on Profile.`,
      );
    } else if (primary.paceStatus === 'ahead') {
      lines.push(`"${primary.goalTitle}" is ahead of schedule — great spot to lock in transfers before spend creeps up.`);
    } else {
      lines.push(`"${primary.goalTitle}": ${primary.gapSummaryLine}`);
    }
  }

  const link = buildTopCategoryGoalLink(spendingByCategory[0], primary?.remaining ?? 0, surplus);
  if (link && lines.length < 2 && (behind.length > 0 || goals.length > 0)) {
    lines.push(link.sentence);
  }

  if (savingsTarget > 0 && lines.length < 2) {
    const st = Number(savingsTarget);
    if (surplus >= st) {
      lines.push(`Savings target (${formatCurrency(st)}/mo) is covered by your current surplus.`);
    } else {
      lines.push(
        `About ${formatCurrency(Math.max(0, Math.round(st - surplus)))} left to hit your monthly savings target.`,
      );
    }
  }

  if (incomeSnapshot > 0 && monthExpenses / incomeSnapshot >= 0.85 && lines.length < 2) {
    lines.push('Spending is close to your income snapshot — discretionary cuts protect goal dates.');
  }

  if (!lines.length) {
    lines.push('Keep logging transactions so goal pace and nudges stay accurate.');
  }

  return lines.slice(0, 2);
}

export function buildWeeklyCoachNotificationBody(input: HomeNudgeInput): string {
  const n = buildHomeGoalNudges(input);
  const text = n[0] ?? 'Open the app for your weekly money check-in.';
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}
