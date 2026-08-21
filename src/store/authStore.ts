// ─────────────────────────────────────────────────────────────
// Auth Store — Zustand
// Manages the Supabase session, user object, and DB profile.
// Initialised once in main.tsx via initAuth().
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  game_ids: string[];
  locale: string;
}

export type AuthError = string | null;

interface AuthState {
  /** Supabase session (null = unauthenticated) */
  session: Session | null;
  /** Supabase auth user */
  user: User | null;
  /** Row from public.profiles */
  profile: UserProfile | null;
  /** True while loading the initial session on app start */
  loading: boolean;
  /** True while an auth action (sign in/up/out) is in flight */
  authLoading: boolean;
  /** Last auth error message, cleared on next action */
  authError: AuthError;

  // Internal setters
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  clearAuthError: () => void;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  authLoading: false,
  authError: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) => set({ profile }),

  clearAuthError: () => set({ authError: null }),

  // ── Google OAuth ────────────────────────────────────────────
  signInWithGoogle: async () => {
    set({ authLoading: true, authError: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      set({ authError: error.message, authLoading: false });
    }
    // If no error, the browser redirects — authLoading stays true until redirect
  },

  // ── Email + Password sign-in ────────────────────────────────
  signInWithEmail: async (email, password) => {
    set({ authLoading: true, authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Map Supabase error codes to friendly messages
      const msg =
        error.message.toLowerCase().includes('invalid login')
          ? 'Incorrect email or password. Please try again.'
          : error.message.toLowerCase().includes('email not confirmed')
          ? 'Please check your inbox and confirm your email first.'
          : error.message;
      set({ authError: msg, authLoading: false });
      return false;
    }
    set({ authLoading: false });
    return true;
  },

  // ── Email + Password sign-up ────────────────────────────────
  signUpWithEmail: async (email, password) => {
    set({ authLoading: true, authError: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After email confirmation, redirect back to the app
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      const msg =
        error.message.toLowerCase().includes('already registered')
          ? 'An account with this email already exists. Try signing in instead.'
          : error.message;
      set({ authError: msg, authLoading: false });
      return { needsConfirmation: false };
    }
    set({ authLoading: false });
    // Supabase returns a session immediately if email confirmation is disabled,
    // or a null session + user if confirmation is required.
    const needsConfirmation = !!data.user && !data.session;
    return { needsConfirmation };
  },

  // ── Password reset ──────────────────────────────────────────
  resetPassword: async (email) => {
    set({ authLoading: true, authError: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      set({ authError: error.message, authLoading: false });
      return false;
    }
    set({ authLoading: false });
    return true;
  },

  // ── Sign out ────────────────────────────────────────────────
  signOut: async () => {
    set({ authLoading: true, authError: null });
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[Auth] Sign-out error:', error.message);
    set({ session: null, user: null, profile: null, authLoading: false });
  },

  // ── Profile fetch ───────────────────────────────────────────
  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, game_ids, locale')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Failed to fetch profile:', error.message);
      return;
    }
    set({ profile: data as UserProfile });
  },
}));

/**
 * Call once at app startup (in main.tsx).
 * 1. Loads the persisted session from localStorage.
 * 2. Subscribes to auth state changes for the lifetime of the app.
 * 3. Fetches the DB profile whenever a user signs in.
 */
export function initAuth() {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const store = useAuthStore.getState();
    store.setSession(session);
    if (session?.user) {
      store.fetchProfile(session.user.id).finally(() => {
        useAuthStore.setState({ loading: false });
      });
    } else {
      useAuthStore.setState({ loading: false });
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const store = useAuthStore.getState();
    store.setSession(session);
    if (session?.user) {
      store.fetchProfile(session.user.id);
    } else {
      store.setProfile(null);
    }
  });
}
