// ============================================================
// Auth Store — Zustand
// Manages Supabase session, user profile, and role
// ============================================================
import { create } from 'zustand';
import { Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DbUser, UserRole } from '../lib/supabaseTypes';

interface AuthState {
  session: Session | null;
  user: DbUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });

    try {
      // Restore existing session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        await fetchAndSetUser(session, set);
      } else {
        set({ session: null, user: null, role: null, loading: false });
      }

      // Listen for auth state changes (token refresh, sign-out, etc.)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          set({ session: null, user: null, role: null, loading: false });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchAndSetUser(session, set);
        }
      });
    } catch (e: any) {
      console.error('Supabase init failed:', e);
      Alert.alert('Init Error', e?.message ?? JSON.stringify(e));
      set({
        session: null,
        user: null,
        role: null,
        loading: false,
        error: 'Failed to connect to Supabase. Check your URL/network.',
      });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    if (!data.session) {
      set({ loading: false, error: 'Login failed. Please try again.' });
      return;
    }

    await fetchAndSetUser(data.session, set);
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null, loading: false });
  },

  clearError: () => set({ error: null }),
}));

// ─── Helper ──────────────────────────────────────────────────
async function fetchAndSetUser(
  session: Session,
  set: (state: Partial<AuthState>) => void
) {
  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !userData) {
    console.error('fetchAndSetUser error:', JSON.stringify(error));
    Alert.alert('DB Error', error?.message ?? 'User not found in users table');
    // User authenticated but not in users table — sign them out
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      role: null,
      loading: false,
      error: error?.message ?? 'Your account has not been set up by an admin yet.',
    });
    return;
  }

  set({
    session,
    user: userData as DbUser,
    role: userData.role as UserRole,
    loading: false,
    error: null,
  });
}
