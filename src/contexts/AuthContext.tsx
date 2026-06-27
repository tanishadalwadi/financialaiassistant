import React from 'react';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError, type Session, type User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    profile?: {
      firstName?: string;
      lastName?: string;
    },
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = React.useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUpWithEmail = React.useCallback(
    async (
      email: string,
      password: string,
      profile?: {
        firstName?: string;
        lastName?: string;
      },
    ) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }
      const first = String(profile?.firstName ?? '').trim();
      const last = String(profile?.lastName ?? '').trim();
      const fullName = [first, last].filter(Boolean).join(' ').trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: fullName ? { full_name: fullName } : undefined,
        },
      });
    if (error) {
      return { error: new Error(error.message) };
    }
    if (!data.session && data.user) {
      return { error: null, needsEmailConfirmation: true };
    }
    return { error: null };
    },
    [],
  );

  const signOut = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const deleteAccount = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      return { error: new Error('Not signed in') };
    }
    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        try {
          const body = (await error.context.json()) as { error?: string } | null;
          const detail = body?.error?.trim();
          if (detail) return { error: new Error(detail) };
        } catch {
          // Ignore JSON parsing issues; fallback to mapped message below.
        }
        return { error: new Error('Delete account request failed on server. Confirm function is deployed and reachable.') };
      }
      if (error instanceof FunctionsRelayError) {
        return { error: new Error('Delete account relay error. Verify Supabase project link and edge function routing.') };
      }
      if (error instanceof FunctionsFetchError) {
        return { error: new Error('Network error calling delete-account function. Check internet and Supabase status.') };
      }
      return { error: new Error(error.message) };
    }
    const body = data as { ok?: boolean; error?: string } | null;
    if (body && typeof body.error === 'string' && body.error.length > 0) {
      return { error: new Error(body.error) };
    }
    await supabase.auth.signOut();
    return { error: null };
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      deleteAccount,
    }),
    [session, isLoading, signInWithEmail, signUpWithEmail, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
