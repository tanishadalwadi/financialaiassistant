import React from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { useAuth } from './AuthContext';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type ProfileContextValue = {
  profile: ProfileRow | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  completeOnboarding: (params: {
    userType: string;
    monthlyIncome: number;
    firstGoalName: string;
    firstGoalTargetAmount: number;
    spendingWeakness: string;
    coachTone: string;
  }) => Promise<{ error: Error | null }>;
  updateProfileFinancials: (params: {
    monthlyIncome: number;
    monthlySavingsTarget: number;
  }) => Promise<{ error: Error | null }>;
  updateDisplayName: (displayName: string) => Promise<{ error: Error | null }>;
  updateNotificationsEnabled: (enabled: boolean) => Promise<{ error: Error | null }>;
};

const ProfileContext = React.createContext<ProfileContextValue | undefined>(undefined);

const ALLOWED_USER_TYPES = new Set(['student', 'individual', 'freelancer', 'business']);
const ALLOWED_COACH_TONES = new Set(['just_starting', 'optimizing', 'freedom', 'stability']);
const ALLOWED_SPENDING_WEAKNESS = new Set(['dining', 'shopping', 'subscriptions', 'coffee', 'transport', 'other']);

function isValidSpendingWeaknessPayload(raw: string): boolean {
  const parts = raw
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return false;
  for (const part of parts) {
    if (part.startsWith('other:')) {
      if (!part.slice(6).trim()) return false;
      continue;
    }
    if (!ALLOWED_SPENDING_WEAKNESS.has(part)) {
      return false;
    }
  }
  return true;
}

async function ensureProfileRow(userId: string, displayName: string | null): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    display_name: displayName,
  });
  if (!error) return { error: null };
  if (error.code === '23505') return { error: null };
  return { error: new Error(error.message) };
}

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isConfigured } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Depends on `userId` only — avoid `user` / `session` objects (new refs each auth tick → effect loops). */
  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured || !isConfigured || !userId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    if (!data) {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData.user;
      const displayName =
        (u?.user_metadata?.full_name as string | undefined) ?? u?.email?.split('@')[0] ?? null;
      const { error: ensureError } = await ensureProfileRow(userId, displayName);
      if (ensureError) {
        setError(ensureError.message);
        setProfile(null);
        setIsLoading(false);
        return;
      }
      const { data: retry, error: retryErr } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (retryErr || !retry) {
        setError(retryErr?.message ?? 'Could not load profile');
        setProfile(null);
        setIsLoading(false);
        return;
      }
      setProfile(retry as ProfileRow);
      setIsLoading(false);
      return;
    }

    setProfile(data as ProfileRow);
    setIsLoading(false);
  }, [isConfigured, userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const completeOnboarding = React.useCallback(
    async (params: {
      userType: string;
      monthlyIncome: number;
      firstGoalName: string;
      firstGoalTargetAmount: number;
      spendingWeakness: string;
      coachTone: string;
    }) => {
      if (!isSupabaseConfigured || !isConfigured || !userId) {
        return { error: new Error('Not signed in or Supabase not configured') };
      }
      const income = Number(params.monthlyIncome);
      const goalTarget = Number(params.firstGoalTargetAmount);
      const goalTitle = params.firstGoalName.trim();
      const hasGoalTitle = goalTitle.length > 0;
      const hasGoalTarget = Number.isFinite(goalTarget) && goalTarget > 0;
      const userType = String(params.userType ?? '').trim().toLowerCase();
      const coachTone = String(params.coachTone ?? '').trim().toLowerCase();
      const spendingWeakness = String(params.spendingWeakness ?? '').trim().toLowerCase();
      if (!Number.isFinite(income) || income < 0) {
        return { error: new Error('Monthly income must be a valid number ≥ 0') };
      }
      if (!ALLOWED_USER_TYPES.has(userType)) {
        return { error: new Error('User type is invalid') };
      }
      if (!ALLOWED_COACH_TONES.has(coachTone)) {
        return { error: new Error('Coach tone is invalid') };
      }
      if (!isValidSpendingWeaknessPayload(spendingWeakness)) {
        return { error: new Error('Spending weakness selection is invalid') };
      }
      if (hasGoalTitle !== hasGoalTarget) {
        return {
          error: new Error('To add your first goal, enter both a goal name and target amount, or leave both blank'),
        };
      }

      const now = new Date().toISOString();
      const due = new Date();
      due.setMonth(due.getMonth() + 12);
      const dueDate = due.toISOString().slice(0, 10);

      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let primaryGoalId = existingGoal?.id ?? null;
      if (!primaryGoalId && hasGoalTitle && hasGoalTarget) {
        const { data: insertedGoal, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: userId,
            title: goalTitle,
            type: 'other',
            target_amount: goalTarget,
            saved_amount: 0,
            due_date: dueDate,
            priority: 'high',
            emoji: '🎯',
            updated_at: now,
          })
          .select('id')
          .single();
        if (goalError || !insertedGoal) {
          return { error: new Error(goalError?.message ?? 'Could not create your first goal') };
        }
        primaryGoalId = insertedGoal.id;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_type: userType,
          monthly_income: income,
          coach_tone: coachTone,
          spending_weakness: spendingWeakness,
          primary_goal_id: primaryGoalId,
          onboarding_completed_at: now,
          updated_at: now,
        })
        .eq('id', userId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      await load();
      return { error: null };
    },
    [isConfigured, userId, load],
  );

  const updateDisplayName = React.useCallback(
    async (displayName: string) => {
      if (!isSupabaseConfigured || !isConfigured || !userId) {
        return { error: new Error('Not signed in or Supabase not configured') };
      }
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          updated_at: now,
        })
        .eq('id', userId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      await load();
      return { error: null };
    },
    [isConfigured, userId, load],
  );

  const updateProfileFinancials = React.useCallback(
    async (params: { monthlyIncome: number; monthlySavingsTarget: number }) => {
      if (!isSupabaseConfigured || !isConfigured || !userId) {
        return { error: new Error('Not signed in or Supabase not configured') };
      }
      const income = Number(params.monthlyIncome);
      const savings = Number(params.monthlySavingsTarget);
      if (!Number.isFinite(income) || income < 0 || !Number.isFinite(savings) || savings < 0) {
        return { error: new Error('Income and savings must be valid numbers ≥ 0') };
      }
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          monthly_income: income,
          monthly_savings_target: savings,
          updated_at: now,
        })
        .eq('id', userId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      await load();
      return { error: null };
    },
    [isConfigured, userId, load],
  );

  const updateNotificationsEnabled = React.useCallback(
    async (enabled: boolean) => {
      if (!isSupabaseConfigured || !isConfigured || !userId) {
        return { error: new Error('Not signed in or Supabase not configured') };
      }
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: enabled,
          updated_at: now,
        })
        .eq('id', userId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      await load();
      return { error: null };
    },
    [isConfigured, userId, load],
  );

  const value = React.useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      error,
      refresh: load,
      completeOnboarding,
      updateProfileFinancials,
      updateDisplayName,
      updateNotificationsEnabled,
    }),
    [
      profile,
      isLoading,
      error,
      load,
      completeOnboarding,
      updateProfileFinancials,
      updateDisplayName,
      updateNotificationsEnabled,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextValue => {
  const ctx = React.useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
};
