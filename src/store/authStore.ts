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
export const pageToPath: Record<string, string> = {
  'field-guide': '/',
  'home': '/',
  '/': '/',
  'armory': '/armory',
  'build-planner': '/armory/planner',
  'armour': '/armory/armour',
  'gallery': '/gallery',
  'visage-set': '/gallery/set',
  'visage-builder': '/gallery/set',
  'visage-collection': '/gallery/collection',
  'challenges': '/challenges',
  'adventurers': '/challenges/adventurers',
  'buddies': '/challenges/buddies',
  'weapons': '/challenges/weapons',
  'admin': '/admin/feedback',
  'settings': '/settings',
  'profile': '/settings',
  'spoilers': '/spoilers',
  'community-hub': '/armory',
  'investigation-notes': '/armory/armour',
};

/** Resolves a user's chosen default landing page to a client path, with admin permission safeguards */
export function getLandingPagePath(profile?: UserProfile | null): string {
  const localDefault = typeof localStorage !== 'undefined' ? localStorage.getItem('fg_user_default_page') : null;
  const page = (profile?.default_page && profile.default_page !== 'field-guide')
    ? profile.default_page
    : (localDefault ?? profile?.default_page);
  if (!page) return '/';
  const path = pageToPath[page] ?? '/';
  if (path.startsWith('/admin') && profile?.role !== 'admin') {
    return '/';
  }
  return path;
}

export type EquipmentGender = 'male' | 'female';

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
  equipment_gender?: EquipmentGender;
  show_spoilers?: boolean;
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
  signUpWithEmail: (email: string, password: string, equipmentGender?: EquipmentGender) => Promise<{ needsConfirmation: boolean }>;
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
      const target = getLandingPagePath(profile);
      if (target !== '/' && window.location.pathname === '/') {
        router.navigate(target);
      }
    }
    return true;
  },

  // ── Email + Password sign-up ────────────────────────────────
  signUpWithEmail: async (email, password, equipmentGender = 'male') => {
    set({ authLoading: true, authError: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { equipment_gender: equipmentGender },
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
      .select('id, username, display_name, avatar_url, game_ids, locale, role, default_game, default_page, equipment_gender, show_spoilers')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Failed to fetch profile:', error.message);
      return;
    }
    const profile = data as UserProfile;
    const localDefault = typeof localStorage !== 'undefined' ? localStorage.getItem('fg_user_default_page') : null;
    if (localDefault && (!profile.default_page || profile.default_page === 'field-guide')) {
      profile.default_page = localDefault;
    }
    set({ profile });
    if (profile.default_game) {
      useUIStore.getState().setDefaultGame(profile.default_game);
    }
  },

  // ── Profile update ──────────────────────────────────────────
  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user, profile } = useAuthStore.getState();

    if (updates.default_page && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('fg_user_default_page', updates.default_page);
      } catch {}
    }

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
      // If the remote DB has an outdated profiles_default_page_check constraint,
      // fallback to 'field-guide' in the DB while preserving the user's choice in local storage & client state.
      if (error.message.includes('profiles_default_page_check')) {
        console.warn('[Auth] Remote DB check constraint rejected default_page. Preserving setting locally and saving fallback.');
        const fallbackUpdates = { ...updates, default_page: 'field-guide' };
        const { error: retryError } = await supabase
          .from('profiles')
          .update(fallbackUpdates)
          .eq('id', user.id);

        if (!retryError) {
          set((state) => ({
            profile: state.profile ? { ...state.profile, ...updates } : null,
            authLoading: false,
            authError: null,
          }));
          if (updates.default_game) {
            useUIStore.getState().setDefaultGame(updates.default_game);
          }
          return true;
        }
      }

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

  supabase.auth
    .getSession()
    .then(async ({ data: { session } }) => {
      const store = useAuthStore.getState();
      store.setSession(session);
      if (session?.user) {
        await store.fetchProfile(session.user.id);
        if (isOAuthCallback) {
          const profile = useAuthStore.getState().profile;
          const target = getLandingPagePath(profile);
          if (target !== '/') {
            router.navigate(target);
          }
        }
      }
    })
    .catch((err) => {
      console.error('[Auth] Failed to get session on init:', err);
    })
    .finally(() => {
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
