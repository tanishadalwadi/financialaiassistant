/**
 * Safe action executor for the voice assistant.
 *
 * Takes a `ParsedVoiceCommand` and a `VoiceActionContext` and runs the
 * matching Supabase mutation. Reuses the `insertTransaction` and
 * `setCategoryBudgetCap` helpers from `useGoalsTransactions` so the voice path
 * inherits fingerprint dedupe, legacy-schema retry, and refresh logic.
 *
 * Pure of React state. The caller is responsible for showing the resulting
 * card in `KovaVoiceAssistant`.
 */
import { normalizeCategoryKey, EXPENSE_CATEGORY_OPTIONS } from '../../constants/expenseCategories';
import { goalTypeFromTitle, emojiForGoalType } from './goalTypeHints';
import { emitVoiceDataChanged } from './dataRefreshBus';
import type { Goal, GoalType, TransactionCategory } from '../../types/models';
import type {
  ParsedVoiceCommand,
  VoiceActionContext,
  VoiceActionResult,
  VoiceIntent,
} from './types';

export async function executeVoiceAction(
  command: ParsedVoiceCommand,
  ctx: VoiceActionContext,
): Promise<VoiceActionResult> {
  try {
    switch (command.intent) {
      case 'add_goal_savings':
        return await runAddGoalSavings(command, ctx);
      case 'create_goal':
        return await runCreateGoal(command, ctx);
      case 'add_transaction':
        return await runAddTransaction(command, ctx);
      case 'set_budget_cap':
        return await runSetBudgetCap(command, ctx);
      case 'ask_insight':
        return await runAskInsight(command, ctx);
      case 'unknown':
      default:
        return {
          status: 'clarification_needed',
          intent: 'unknown',
          message:
            command.clarificationPrompt ??
            'I didn\u2019t catch that. Try "Add $20 to my SF Trip goal."',
        };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Something went wrong while running that command.';
    return {
      status: 'error',
      intent: command.intent,
      message,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Intent handlers
// ──────────────────────────────────────────────────────────────────────────

async function runAddGoalSavings(
  command: ParsedVoiceCommand,
  ctx: VoiceActionContext,
): Promise<VoiceActionResult> {
  const amount = command.entities.amount;
  const spokenTitle = command.entities.goalTitle ?? '';
  if (amount == null || amount <= 0) {
    return missingAmount(command.intent);
  }
  if (!spokenTitle) {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: 'Which goal should I add to?',
    };
  }

  const match = matchGoalByTitle(spokenTitle, ctx.goals);
  if (match.status === 'none') {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: `I couldn\u2019t find a goal called "${spokenTitle}". Try saying its exact name.`,
    };
  }
  if (match.status === 'ambiguous') {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: `I found a few goals like "${spokenTitle}". Which one did you mean?`,
      ambiguousGoals: match.candidates.map((g) => ({ id: g.id, title: g.title })),
    };
  }

  const goal = match.goal;
  const nextSaved = roundTo2(goal.savedAmount + amount);
  const { error } = await ctx.supabase
    .from('goals')
    .update({ saved_amount: nextSaved, updated_at: new Date().toISOString() })
    .eq('id', goal.id)
    .eq('user_id', ctx.userId);

  if (error) {
    return {
      status: 'error',
      intent: command.intent,
      message: `Couldn\u2019t update ${goal.title}: ${error.message}`,
    };
  }

  await ctx.refresh();
  emitVoiceDataChanged();
  return {
    status: 'ok',
    intent: command.intent,
    message: `Done. ${goal.title} is now at $${fmt(nextSaved)} of $${fmt(goal.targetAmount)}.`,
    details: { amount, goalTitle: goal.title },
  };
}

async function runCreateGoal(
  command: ParsedVoiceCommand,
  ctx: VoiceActionContext,
): Promise<VoiceActionResult> {
  const amount = command.entities.amount;
  const title = command.entities.goalTitle?.trim();
  if (!title) {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: 'What should I name this goal?',
    };
  }
  if (amount == null || amount <= 0) {
    return missingAmount(command.intent);
  }

  const dueDate = command.entities.dueDate ?? defaultDueDateOneYearOut();
  const type: GoalType = goalTypeFromTitle(title);
  const emoji = emojiForGoalType(type);

  const { error } = await ctx.supabase.from('goals').insert({
    user_id: ctx.userId,
    title,
    type,
    target_amount: amount,
    saved_amount: 0,
    due_date: dueDate,
    priority: 'medium',
    emoji,
  });

  if (error) {
    return {
      status: 'error',
      intent: command.intent,
      message: `Couldn\u2019t create that goal: ${error.message}`,
    };
  }

  await ctx.refresh();
  emitVoiceDataChanged();
  return {
    status: 'ok',
    intent: command.intent,
    message: `Done. Created "${title}" for $${fmt(amount)} due ${dueDate}.`,
    details: { amount, goalTitle: title },
  };
}

async function runAddTransaction(
  command: ParsedVoiceCommand,
  ctx: VoiceActionContext,
): Promise<VoiceActionResult> {
  const amount = command.entities.amount;
  const desc = command.entities.description?.trim();
  if (amount == null || amount <= 0) {
    return missingAmount(command.intent);
  }
  if (!desc) {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: 'What was the transaction for?',
    };
  }

  const isIncome = Boolean(command.entities.isIncome);
  const category: TransactionCategory =
    command.entities.category ??
    (isIncome ? 'income' : normalizeCategoryKey(desc));

  const { error } = await ctx.insertTransaction({
    description: desc,
    amount,
    category,
    isIncome,
  });

  if (error) {
    return {
      status: 'error',
      intent: command.intent,
      message: `Couldn\u2019t log that transaction: ${error.message}`,
    };
  }

  emitVoiceDataChanged();
  const verb = isIncome ? 'income' : 'expense';
  return {
    status: 'ok',
    intent: command.intent,
    message: `Done. Logged a $${fmt(amount)} ${desc} ${verb}.`,
    details: { amount, description: desc, category },
  };
}

async function runSetBudgetCap(
  command: ParsedVoiceCommand,
  ctx: VoiceActionContext,
): Promise<VoiceActionResult> {
  const amount = command.entities.amount;
  const rawCategory = command.entities.category;
  if (amount == null || amount <= 0) {
    return missingAmount(command.intent);
  }
  if (!rawCategory) {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: 'Which category should I cap?',
    };
  }

  const category = normalizeCategoryKey(rawCategory);
  const { error } = await ctx.setCategoryBudgetCap(category, amount);
  if (error) {
    return {
      status: 'error',
      intent: command.intent,
      message: `Couldn\u2019t set that cap: ${error.message}`,
    };
  }

  emitVoiceDataChanged();
  const label = EXPENSE_CATEGORY_OPTIONS.find((o) => o.id === category)?.label ?? category;
  return {
    status: 'ok',
    intent: command.intent,
    message: `Done. ${label} cap is now $${fmt(amount)}.`,
    details: { amount, category: label },
  };
}

async function runAskInsight(
  command: ParsedVoiceCommand,
  ctx: VoiceActionContext,
): Promise<VoiceActionResult> {
  const prompt = command.raw.trim();
  if (!prompt) {
    return {
      status: 'clarification_needed',
      intent: command.intent,
      message: 'What would you like me to look into?',
    };
  }
  if (ctx.askCoach) {
    await ctx.askCoach(prompt);
  }
  return {
    status: 'ok',
    intent: command.intent,
    message: 'Opened your question in the coach.',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

type GoalMatch =
  | { status: 'exact'; goal: Goal }
  | { status: 'ambiguous'; candidates: Goal[] }
  | { status: 'none' };

/**
 * Match a spoken goal title against the user's goal list using a token
 * Jaccard similarity. Picks an exact winner when one goal scores noticeably
 * higher than the runner-up, else returns the top candidates for clarification.
 */
function matchGoalByTitle(spoken: string, goals: Goal[]): GoalMatch {
  if (!goals.length) return { status: 'none' };

  const spokenTokens = tokenize(spoken);
  if (spokenTokens.size === 0) return { status: 'none' };

  const scored = goals
    .map((g) => ({ goal: g, score: jaccard(spokenTokens, tokenize(g.title)) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { status: 'none' };

  const [top, runnerUp] = scored;
  const winnerStrong =
    top.score >= 0.6 || (runnerUp ? top.score - runnerUp.score >= 0.25 : true);

  if (winnerStrong) return { status: 'exact', goal: top.goal };

  const candidates = scored.slice(0, 3).map((row) => row.goal);
  return { status: 'ambiguous', candidates };
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && t !== 'the' && t !== 'my'),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const tok of a) if (b.has(tok)) intersect += 1;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

function missingAmount(intent: VoiceIntent): VoiceActionResult {
  return {
    status: 'clarification_needed',
    intent,
    message: 'I didn\u2019t catch the amount. How much?',
  };
}

function defaultDueDateOneYearOut(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fmt(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.005) return Math.round(n).toLocaleString('en-US');
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
