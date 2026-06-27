/**
 * Public types for the voice assistant pipeline.
 *
 * Designed so the V1 local parser and a future Gemini function-calling parser
 * can both produce the same `ParsedVoiceCommand` shape, and so the executor
 * doesn't have to know which produced it.
 */
import type { Goal, TransactionCategory } from '../../types/models';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export type VoiceIntent =
  | 'add_goal_savings'
  | 'create_goal'
  | 'add_transaction'
  | 'set_budget_cap'
  | 'ask_insight'
  | 'unknown';

export interface VoiceEntities {
  /** Positive number in dollars. */
  amount?: number;
  /** Free-form spoken goal title — match against existing goals client-side. */
  goalTitle?: string;
  /** Canonical TransactionCategory key after normalization. */
  category?: TransactionCategory;
  /** Used for transaction descriptions and goal creation labels. */
  description?: string;
  /** ISO YYYY-MM-DD. */
  dueDate?: string;
  /** Forced from intent when present (e.g. "log income $1200"). Defaults to false in executor. */
  isIncome?: boolean;
}

export interface ParsedVoiceCommand {
  /** Original transcript / typed text. Preserved for debugging + audit. */
  raw: string;
  intent: VoiceIntent;
  /** 0..1 — used by the modal to decide whether to demand clarification. */
  confidence: number;
  entities: VoiceEntities;
  /** True for any intent that mutates Supabase. Ask-insight is always false. */
  requiresConfirmation: boolean;
  /**
   * Short copy the UI shows in the "Confirm?" state. Always populated for
   * mutating intents that have enough entities to act on.
   * Example: "Add $200 to SF Trip savings?"
   */
  confirmationPrompt?: string;
  /**
   * Populated when the parser detected an intent but is missing info,
   * e.g. "I didn't catch the amount. How much should I add?"
   */
  clarificationPrompt?: string;
}

export type VoiceActionStatus = 'ok' | 'error' | 'clarification_needed';

export interface VoiceActionResult {
  status: VoiceActionStatus;
  /** Copy shown in the modal's success / error / clarification card. */
  message: string;
  intent: VoiceIntent;
  /** Optional context the modal can render (e.g. resolved goal title, amount). */
  details?: {
    amount?: number;
    goalTitle?: string;
    category?: string;
    description?: string;
  };
  /**
   * Populated when the executor needs the user to choose between several
   * candidate goals. The modal can render these as chips/buttons.
   */
  ambiguousGoals?: Array<{ id: string; title: string }>;
}

/**
 * Everything the executor needs to perform Supabase writes safely.
 *
 * The hook helpers (`insertTransaction`, `setCategoryBudgetCap`) are reused
 * verbatim so the voice path benefits from the same fingerprinting + legacy
 * fallback logic the rest of the app uses.
 */
export interface VoiceActionContext {
  userId: string;
  goals: Goal[];
  supabase: SupabaseClient<Database>;
  insertTransaction: (input: {
    description: string;
    amount: number;
    category: TransactionCategory;
    isIncome: boolean;
    date?: string;
    categoryLabel?: string | null;
  }) => Promise<{ error: Error | null }>;
  setCategoryBudgetCap: (
    category: string,
    capAmount: number | null,
  ) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
  /** Routes ask_insight to the AI coach without writing to Supabase. */
  askCoach?: (prompt: string) => Promise<void> | void;
}

/** UI state machine for the voice assistant modal. */
export type VoiceModalState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'confirmation_required'
  | 'success'
  | 'error'
  | 'clarification_needed';
