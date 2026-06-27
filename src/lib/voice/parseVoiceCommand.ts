/**
 * V1 local intent parser for Kova's voice assistant.
 *
 * Approach:
 *   - Regex + keyword classification for the five supported intents.
 *   - Entity extraction by intent (amount, goalTitle, category, dueDate…).
 *   - Generates the same `ParsedVoiceCommand` shape a future Gemini
 *     function-calling parser would return so the executor & UI don't change.
 *
 * Deliberately pure: no React, no Supabase, no side effects. Drop-in testable.
 */
import {
  normalizeCategoryKey,
  EXPENSE_CATEGORY_OPTIONS,
} from '../../constants/expenseCategories';
import { categoryFromKnownMerchant } from '../merchantCategoryMap';
import type { TransactionCategory } from '../../types/models';
import type { ParsedVoiceCommand, VoiceEntities, VoiceIntent } from './types';

const FILLER_WORDS = new Set([
  'please',
  'umm',
  'um',
  'uh',
  'like',
  'kova',
  'hey',
  'okay',
  'ok',
  'just',
  'maybe',
  'could',
  'you',
]);

const MONTH_LOOKUP: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  groceries: ['grocer', 'groceries', 'supermarket', 'whole foods', 'trader joe'],
  dining: ['dining', 'restaurant', 'starbucks', 'coffee', 'cafe', 'lunch', 'dinner', 'eating out', 'takeout', 'food'],
  transport: ['uber', 'lyft', 'transport', 'gas', 'fuel', 'rideshare', 'taxi', 'train', 'flight', 'travel'],
  rent: ['rent', 'mortgage', 'housing', 'utility', 'utilities'],
  subscriptions: ['subscription', 'subscriptions', 'netflix', 'spotify', 'streaming', 'saas', 'software'],
  shopping: ['shopping', 'amazon', 'target', 'shop', 'clothing', 'apparel'],
  health: ['health', 'doctor', 'pharmacy', 'medical', 'gym', 'fitness'],
  other: ['other', 'misc', 'miscellaneous'],
  income: ['paycheck', 'salary', 'income', 'deposit', 'refund'],
  savings: ['savings', 'save'],
};

const ASK_INSIGHT_TRIGGERS = [
  /^why\b/,
  /^how (?:come|did|much|many)\b/,
  /^what(?:'s|s| is)\b/,
  /^should i\b/,
  /^when (?:will|did|should)\b/,
  /\bexplain\b/,
  /\boverspend(?:ing)?\b/,
  /\bunderspend(?:ing)?\b/,
  /\bcompared to last month\b/,
  /\bsavings rate\b/,
  /\btell me\b/,
];

/** Public entry point. Always returns a ParsedVoiceCommand; never throws. */
export function parseVoiceCommand(transcript: string): ParsedVoiceCommand {
  const raw = (transcript ?? '').toString();
  const text = normalize(raw);
  if (!text) {
    return unknown(raw, 'I didn\u2019t catch that. Try again.');
  }

  const intentResult = classifyIntent(text);
  switch (intentResult.intent) {
    case 'add_goal_savings':
      return buildAddGoalSavings(raw, text, intentResult.confidence);
    case 'create_goal':
      return buildCreateGoal(raw, text, intentResult.confidence);
    case 'add_transaction':
      return buildAddTransaction(raw, text, intentResult.confidence);
    case 'set_budget_cap':
      return buildSetBudgetCap(raw, text, intentResult.confidence);
    case 'ask_insight':
      return {
        raw,
        intent: 'ask_insight',
        confidence: intentResult.confidence,
        entities: {},
        requiresConfirmation: false,
      };
    case 'unknown':
    default:
      return unknown(raw);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[?!.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFiller(s: string): string {
  return s
    .split(' ')
    .filter((tok) => !FILLER_WORDS.has(tok))
    .join(' ');
}

function classifyIntent(text: string): { intent: VoiceIntent; confidence: number } {
  const t = stripFiller(text);

  // ask_insight is detected first because it's a read-only catch-all.
  for (const re of ASK_INSIGHT_TRIGGERS) {
    if (re.test(t)) return { intent: 'ask_insight', confidence: 0.75 };
  }

  if (/\b(set|change|update)\b.*\b(budget|cap|limit)\b/.test(t)) {
    return { intent: 'set_budget_cap', confidence: 0.85 };
  }
  if (/\b(budget|cap|limit)\b.*\b(to|=)\b\s*\$?\d/.test(t)) {
    return { intent: 'set_budget_cap', confidence: 0.8 };
  }

  if (/\b(add|put|contribute|move)\b.*\bto (my )?[a-z0-9 ]+\b(?:goal|savings)/.test(t)) {
    return { intent: 'add_goal_savings', confidence: 0.85 };
  }
  if (/\b(deposit|save)\b.*\b(?:toward|to|into|in)\b/.test(t)) {
    return { intent: 'add_goal_savings', confidence: 0.75 };
  }

  if (/\b(create|make|start|new)\b.*\bgoal\b/.test(t)) {
    return { intent: 'create_goal', confidence: 0.85 };
  }
  if (/\bgoal\b.*\bfor\b\s*\$?\d/.test(t)) {
    return { intent: 'create_goal', confidence: 0.7 };
  }

  if (/\b(add|log|record|track)\b.*\b(expense|transaction|spend|charge|purchase)\b/.test(t)) {
    return { intent: 'add_transaction', confidence: 0.85 };
  }
  if (/^(?:add|log|i (?:just )?(?:spent|paid|bought))\b/.test(t) && /\$?\d/.test(t)) {
    return { intent: 'add_transaction', confidence: 0.7 };
  }
  if (/\b(spent|paid|bought)\b.*\$?\d/.test(t)) {
    return { intent: 'add_transaction', confidence: 0.65 };
  }

  return { intent: 'unknown', confidence: 0 };
}

function extractAmount(text: string): number | undefined {
  // Match "$1,200.50", "1200", "1,200", "1.2k" (rare in voice). Take the FIRST
  // money-like token so "add $200 to my $2,000 SF Trip goal" picks 200.
  const moneyMatch = text.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
  if (!moneyMatch) return undefined;
  const cleaned = moneyMatch[1].replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}

function extractDueDate(text: string, now = new Date()): string | undefined {
  // Explicit ISO: 2026-12-15
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // "by December" / "in December" / "for December 2027"
  const monthMatch = text.match(/\b(?:by|in|before|until|for|due)\s+([a-z]+)(?:\s+(20\d{2}))?\b/);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const monthIdx = MONTH_LOOKUP[monthName];
    if (monthIdx != null) {
      const year = monthMatch[2] ? Number(monthMatch[2]) : pickYearForMonth(monthIdx, now);
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      return `${year}-${pad2(monthIdx + 1)}-${pad2(lastDay)}`;
    }
  }

  // "in 6 months"
  const monthsAhead = text.match(/\bin\s+(\d{1,2})\s+months?\b/);
  if (monthsAhead) {
    const n = Number(monthsAhead[1]);
    if (Number.isFinite(n) && n > 0) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + n);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(lastDay)}`;
    }
  }

  // "next year"
  if (/\bnext year\b/.test(text)) {
    const y = now.getFullYear() + 1;
    return `${y}-12-31`;
  }

  return undefined;
}

function pickYearForMonth(monthIdx: number, now: Date): number {
  return monthIdx >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function extractCategory(text: string): TransactionCategory | undefined {
  // Try direct keyword match first (handles "dining", "groceries", etc.)
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[TransactionCategory, string[]]>) {
    for (const kw of keywords) {
      if (text.includes(kw)) return cat;
    }
  }
  return undefined;
}

function inferCategoryFromDescription(desc: string | undefined): TransactionCategory | undefined {
  if (!desc) return undefined;
  const merchant = categoryFromKnownMerchant(desc);
  if (merchant) return merchant;
  const fromKeyword = extractCategory(desc.toLowerCase());
  if (fromKeyword) return fromKeyword;
  const normalized = normalizeCategoryKey(desc);
  if (normalized !== 'other') return normalized;
  return undefined;
}

function extractGoalTitleForAdd(text: string): string | undefined {
  // Patterns:
  //   "add $X to (my) <title> goal"
  //   "add $X to (my) <title> savings"
  //   "save $X to (toward|in) <title>"
  let m = text.match(/\bto (?:my )?(.+?)\s+(?:goal|savings)\b/);
  if (m) return cleanTitle(m[1]);
  m = text.match(/\b(?:toward|towards|into|in)\s+(?:my )?(.+?)\s+(?:goal|savings)\b/);
  if (m) return cleanTitle(m[1]);
  // Fallback: take what's after "to my" / "to"
  m = text.match(/\bto (?:my )?(.+)$/);
  if (m) return cleanTitle(m[1]);
  return undefined;
}

function extractGoalTitleForCreate(text: string): string | undefined {
  // Patterns:
  //   "create a goal for <title> for $X"
  //   "create a goal called <title> for $X"
  //   "new goal: <title> $X"
  let m = text.match(/\bgoal (?:for|called|named)\s+(.+?)\s+(?:for\s+\$?\d|of\s+\$?\d|with\s+\$?\d|\$\d)/);
  if (m) return cleanTitle(m[1]);
  m = text.match(/\b(?:goal|target):\s*(.+?)\s+(?:for|with|of|by)/);
  if (m) return cleanTitle(m[1]);
  m = text.match(/\b(?:create|make|new|start)\s+(?:a |my )?goal\s+(?:for\s+)?(.+?)\s+(?:for\s+\$?\d|by|of\s+\$?\d)/);
  if (m) return cleanTitle(m[1]);
  // Last resort: between "goal" and trailing amount/date phrase
  m = text.match(/\bgoal\s+(.+?)\s+(?:for\s+\$?\d|by)/);
  if (m) return cleanTitle(m[1]);
  return undefined;
}

function extractTransactionDescription(text: string): string | undefined {
  // Capture between the amount and trailing nouns like "expense", "transaction", "charge".
  // Examples:
  //   "add a $12 starbucks expense" -> "starbucks"
  //   "log $25 for uber" -> "uber"
  //   "i spent $40 on dinner" -> "dinner"
  let m = text.match(/\$\d+(?:\.\d{1,2})?\s+(.+?)\s+(?:expense|transaction|charge|purchase|spending)\b/);
  if (m) return cleanTitle(m[1]);
  m = text.match(/\b(?:for|on|at)\s+([a-z0-9 '&\-]+?)(?:\s+(?:today|yesterday|on\s+\w+)|$)/);
  if (m) return cleanTitle(m[1]);
  m = text.match(/\bat\s+([a-z0-9 '&\-]+)$/);
  if (m) return cleanTitle(m[1]);
  return undefined;
}

function extractCategoryFromCapPhrase(text: string): TransactionCategory | undefined {
  // "set my dining budget to $150" -> dining
  let m = text.match(/\b(?:set|update|change)\s+(?:my\s+)?([a-z]+)\s+(?:budget|cap|limit)/);
  if (m) {
    const cat = normalizeCategoryKey(m[1]);
    if (cat !== 'other' || /\bother\b/.test(text)) return cat;
  }
  m = text.match(/\b([a-z]+)\s+(?:budget|cap|limit)\b/);
  if (m) {
    const cat = normalizeCategoryKey(m[1]);
    if (cat !== 'other' || /\bother\b/.test(text)) return cat;
  }
  return extractCategory(text);
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\bmy\b/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ──────────────────────────────────────────────────────────────────────────
// Per-intent builders
// ──────────────────────────────────────────────────────────────────────────

function buildAddGoalSavings(
  raw: string,
  text: string,
  confidence: number,
): ParsedVoiceCommand {
  const entities: VoiceEntities = {};
  entities.amount = extractAmount(text);
  entities.goalTitle = extractGoalTitleForAdd(text);

  if (entities.amount == null) {
    return needClarification(raw, 'add_goal_savings', confidence, entities, 'How much should I add?');
  }
  if (!entities.goalTitle) {
    return needClarification(
      raw,
      'add_goal_savings',
      confidence,
      entities,
      'Which goal should I add to?',
    );
  }
  return {
    raw,
    intent: 'add_goal_savings',
    confidence,
    entities,
    requiresConfirmation: true,
    confirmationPrompt: `Add $${formatMoneyForCopy(entities.amount)} to ${entities.goalTitle} savings?`,
  };
}

function buildCreateGoal(
  raw: string,
  text: string,
  confidence: number,
): ParsedVoiceCommand {
  const entities: VoiceEntities = {};
  entities.amount = extractAmount(text);
  entities.goalTitle = extractGoalTitleForCreate(text);
  entities.dueDate = extractDueDate(text);

  if (!entities.goalTitle) {
    return needClarification(
      raw,
      'create_goal',
      confidence,
      entities,
      'What should I name this goal?',
    );
  }
  if (entities.amount == null) {
    return needClarification(
      raw,
      'create_goal',
      confidence,
      entities,
      `How much should ${entities.goalTitle} be?`,
    );
  }
  const datePart = entities.dueDate ? ` by ${entities.dueDate}` : '';
  return {
    raw,
    intent: 'create_goal',
    confidence,
    entities,
    requiresConfirmation: true,
    confirmationPrompt: `Create a goal "${entities.goalTitle}" for $${formatMoneyForCopy(
      entities.amount,
    )}${datePart}?`,
  };
}

function buildAddTransaction(
  raw: string,
  text: string,
  confidence: number,
): ParsedVoiceCommand {
  const entities: VoiceEntities = {};
  entities.amount = extractAmount(text);
  entities.description = extractTransactionDescription(text);
  entities.category = inferCategoryFromDescription(entities.description) ?? extractCategory(text);
  entities.isIncome = /\bincome|paycheck|salary|deposit|refund\b/.test(text);

  if (entities.amount == null) {
    return needClarification(raw, 'add_transaction', confidence, entities, 'How much was the transaction?');
  }
  if (!entities.description) {
    return needClarification(
      raw,
      'add_transaction',
      confidence,
      entities,
      'What was the transaction for?',
    );
  }
  const verb = entities.isIncome ? 'Log income of' : 'Log a';
  const expensePart = entities.isIncome
    ? ` $${formatMoneyForCopy(entities.amount)} from ${entities.description}?`
    : ` $${formatMoneyForCopy(entities.amount)} ${entities.description} expense${
        entities.category && entities.category !== 'other' ? ` under ${labelForCategory(entities.category)}` : ''
      }?`;
  return {
    raw,
    intent: 'add_transaction',
    confidence,
    entities,
    requiresConfirmation: true,
    confirmationPrompt: `${verb}${expensePart}`,
  };
}

function buildSetBudgetCap(
  raw: string,
  text: string,
  confidence: number,
): ParsedVoiceCommand {
  const entities: VoiceEntities = {};
  entities.amount = extractAmount(text);
  entities.category = extractCategoryFromCapPhrase(text);

  if (entities.amount == null) {
    return needClarification(raw, 'set_budget_cap', confidence, entities, 'What amount should the cap be?');
  }
  if (!entities.category) {
    return needClarification(
      raw,
      'set_budget_cap',
      confidence,
      entities,
      'Which category should I cap?',
    );
  }
  return {
    raw,
    intent: 'set_budget_cap',
    confidence,
    entities,
    requiresConfirmation: true,
    confirmationPrompt: `Set ${labelForCategory(entities.category)} cap to $${formatMoneyForCopy(
      entities.amount,
    )}?`,
  };
}

function needClarification(
  raw: string,
  intent: VoiceIntent,
  confidence: number,
  entities: VoiceEntities,
  prompt: string,
): ParsedVoiceCommand {
  return {
    raw,
    intent,
    confidence,
    entities,
    requiresConfirmation: false,
    clarificationPrompt: prompt,
  };
}

function unknown(raw: string, override?: string): ParsedVoiceCommand {
  return {
    raw,
    intent: 'unknown',
    confidence: 0,
    entities: {},
    requiresConfirmation: false,
    clarificationPrompt:
      override ??
      'I didn\u2019t catch that. Try: "Add $20 to my SF Trip goal" or "Set dining cap to $150".',
  };
}

function labelForCategory(cat: TransactionCategory): string {
  const opt = EXPENSE_CATEGORY_OPTIONS.find((o) => o.id === cat);
  if (opt) return opt.label;
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function formatMoneyForCopy(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.005) return Math.round(n).toLocaleString('en-US');
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
