import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const rawUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const rawKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

function isValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = rawKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && isValidHttpsUrl(supabaseUrl));

if (__DEV__) {
  if (!rawUrl || !rawKey) {
    console.warn(
      '[Supabase] Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file in the project root, then restart Expo.',
    );
  } else if (!isValidHttpsUrl(supabaseUrl)) {
    console.warn(
      `[Supabase] EXPO_PUBLIC_SUPABASE_URL must be a full https URL (got: ${JSON.stringify(rawUrl.slice(0, 48))}…).`,
    );
  }
}

/**
 * Typed Supabase client. When env is missing, uses a no-op placeholder URL so the app still boots;
 * auth/data calls will fail until you configure the project.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  },
);
