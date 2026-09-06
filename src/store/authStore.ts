// ─────────────────────────────────────────────────────────────
// Auth Store — Zustand
// Manages the Supabase session, user object, and DB profile.
// Initialised once in main.tsx via initAuth().
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useUIStore } from './uiStore';
import { router } from '../router';

// Map the stored Page identifier to a route path
const pageToPath: Record<string, string> = {
  'field-guide': '/',
  'build-planner': '/build-planner',
  'community-hub': '/community-hub',
  'investigation-notes': '/investigation-notes/monster-guide',
  'admin': '/admin/monsters',
  'settings': '/settings',
  'profile': '/settings',
};

export type UserRole = 'member' | 'admin' | 'moderator';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  game_ids: string[];
  locale: string;
  role: UserRole;
  default_game?: string;
  default_page?: string;
}

/** Convenience selector — true if the signed-in user is admin */
export const selectIsAdmin = (state: { profile: UserProfile | null }) =>
  state.profile?.role === 'admin';

/** Convenience selector — true if admin or moderator */
export const selectCanModerate = (state: { profile: UserProfile | null }) =>
  state.profile?.role === 'admin' || state.profile?.role === 'moderator';

export type AuthError = string | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authLoading: boolean;
  authError: AuthError;

  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  clearAuthError: () => void;

  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
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
    // If no error, browser redirects — authLoading stays true until redirect
  },

  // ── Email + Password sign-in ────────────────────────────────
  signInWithEmail: async (email, password) => {
    set({ authLoading: true, authError: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg =
        error.message.toLowerCase().includes('invalid login')
          ? 'Incorrect email or password. Please try again.'
          : error.message.toLowerCase().includes('email not confirmed')
          ? 'Please check your inbox and confirm your email first.'
          : error.message;
      set({ authError: msg, authLoading: false });
      return false;
    }
    set({ session: data.session, user: data.user, authLoading: false });
    if (data.user) {
      await useAuthStore.getState().fetchProfile(data.user.id);
      const profile = useAuthStore.getState().profile;
      if (profile?.default_page) {
        router.navigate(pageToPath[profile.default_page] ?? '/');
      }

    }
    return true;
  },

  // ── Email + Password sign-up ────────────────────────────────
  signUpWithEmail: async (email, password) => {
    set({ authLoading: true, authError: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
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
      .select('id, username, display_name, avatar_url, game_ids, locale, role, default_game, default_page')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Failed to fetch profile:', error.message);
      return;
    }
    const profile = data as UserProfile;
    set({ profile });
    if (profile.default_game) {
      useUIStore.getState().setDefaultGame(profile.default_game);
    }
  },

  // ── Profile update ──────────────────────────────────────────
  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user, profile } = useAuthStore.getState();
    if (!user) {
      // Local/guest mode
      if (profile) {
        set({ profile: { ...profile, ...updates } });
      }
      if (updates.default_game) {
        useUIStore.getState().setDefaultGame(updates.default_game);
      }
      return true;
    }

    set({ authLoading: true, authError: null });
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('[Auth] Failed to update profile:', error.message);
      set({ authError: error.message, authLoading: false });
      return false;
    }

    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
      authLoading: false,
    }));

    if (updates.default_game) {
      useUIStore.getState().setDefaultGame(updates.default_game);
    }
    return true;
  },
}));

/**
 * Call once at app startup (in main.tsx).
 * Loads the persisted session and subscribes to auth state changes.
 */
export function initAuth() {
  const isOAuthCallback =
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=');

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    const store = useAuthStore.getState();
    store.setSession(session);
    if (session?.user) {
      await store.fetchProfile(session.user.id);
      if (isOAuthCallback) {
        const profile = useAuthStore.getState().profile;
        if (profile?.default_page) {
          router.navigate(pageToPath[profile.default_page] ?? '/');
        }
      }
    }
    useAuthStore.setState({ loading: false });
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
