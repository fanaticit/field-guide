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

interface AuthState {
  /** Supabase session (null = unauthenticated) */
  session: Session | null;
  /** Supabase auth user */
  user: User | null;
  /** Row from public.profiles */
  profile: UserProfile | null;
  /** True while loading the initial session on app start */
  loading: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) => set({ profile }),

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // After Google confirms, redirect back to the app root.
        // In production, set this to your deployed URL.
        redirectTo: window.location.origin,
        queryParams: {
          // Request offline access so Supabase can refresh the token
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) console.error('[Auth] Google sign-in error:', error.message);
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[Auth] Sign-out error:', error.message);
    set({ session: null, user: null, profile: null });
  },

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
  // Load the initial session
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

  // Subscribe to changes (sign in, sign out, token refresh)
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
