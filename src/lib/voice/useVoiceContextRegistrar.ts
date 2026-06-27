/**
 * Pushes a screen's already-fetched user / goals / Supabase helpers into the
 * global voice provider, so the universal header mic button can open the
 * assistant without re-subscribing to `useGoalsTransactions` itself.
 *
 * Drop one line into every screen that already calls `useGoalsTransactions`:
 *
 *   useVoiceContextRegistrar({ goals, refresh, insertTransaction, setCategoryBudgetCap });
 *
 * Profile / settings screens that don't fetch goals can skip it — the most
 * recently registered context stays available across navigation.
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceAssistant } from '../../contexts/VoiceAssistantContext';
import { supabase } from '../supabase';
import type { Goal, TransactionCategory } from '../../types/models';

interface RegistrarSnapshot {
  goals: Goal[];
  refresh: () => Promise<void>;
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
}

export function useVoiceContextRegistrar(snapshot: RegistrarSnapshot): void {
  const { user } = useAuth();
  const { _registerContext } = useVoiceAssistant();
  const { goals, refresh, insertTransaction, setCategoryBudgetCap } = snapshot;

  React.useEffect(() => {
    if (!user) {
      _registerContext(null);
      return;
    }
    _registerContext({
      userId: user.id,
      goals,
      supabase,
      insertTransaction,
      setCategoryBudgetCap,
      refresh,
    });
  }, [user, goals, refresh, insertTransaction, setCategoryBudgetCap, _registerContext]);
}
