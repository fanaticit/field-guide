// ─────────────────────────────────────────────────────────────
// React Query hooks and helpers for Site Feedback & Admin Messaging
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore, selectIsAdmin } from '../store/authStore';

export type FeedbackType = 'bug' | 'feature' | 'data' | 'general';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed';

export interface SiteFeedback {
  id: string;
  user_id: string | null;
  user_display_name: string | null;
  contact_info: string | null;
  feedback_type: FeedbackType;
  title: string;
  description: string;
  page_url: string | null;
  game_context: string | null;
  device_info: string | null;
  status: FeedbackStatus;
  is_read: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackPayload {
  user_id?: string | null;
  user_display_name?: string | null;
  contact_info?: string | null;
  feedback_type: FeedbackType;
  title: string;
  description: string;
  page_url?: string | null;
  game_context?: string | null;
  device_info?: string | null;
}

export interface FeedbackFilters {
  status?: FeedbackStatus | 'all';
  type?: FeedbackType | 'all';
  search?: string;
}

export const ADMIN_FEEDBACK_COUNT_KEY = 'admin-feedback-count';
export const ADMIN_FEEDBACK_LIST_KEY = 'admin-feedback-list';

/**
 * Submit feedback from any player (guest or authenticated)
 */
export async function submitFeedback(payload: CreateFeedbackPayload): Promise<SiteFeedback> {
  const { data, error } = await supabase
    .from('site_feedback')
    .insert([
      {
        user_id: payload.user_id || null,
        user_display_name: payload.user_display_name || null,
        contact_info: payload.contact_info?.trim() || null,
        feedback_type: payload.feedback_type,
        title: payload.title.trim(),
        description: payload.description.trim(),
        page_url: payload.page_url || null,
        game_context: payload.game_context || null,
        device_info: payload.device_info || null,
        status: 'new',
        is_read: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as SiteFeedback;
}

/**
 * Hook to retrieve number of unhandled/new feedback messages for admins.
 * Returns 0 if user is not admin or table hasn't been migrated yet.
 */
export function useAdminFeedbackCount() {
  const isAdmin = useAuthStore(selectIsAdmin);

  return useQuery({
    queryKey: [ADMIN_FEEDBACK_COUNT_KEY],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('site_feedback')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');

        if (error) {
          // If table does not exist or user doesn't have permissions, silently fallback
          return 0;
        }
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to retrieve filtered feedback list for the Admin Dashboard
 */
export function useAdminFeedbackList(filters: FeedbackFilters = {}) {
  const isAdmin = useAuthStore(selectIsAdmin);

  return useQuery({
    queryKey: [ADMIN_FEEDBACK_LIST_KEY, filters.status, filters.type, filters.search],
    queryFn: async () => {
      let q = supabase
        .from('site_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.type && filters.type !== 'all') {
        q = q.eq('feedback_type', filters.type);
      }
      if (filters.search?.trim()) {
        const s = filters.search.trim();
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,user_display_name.ilike.%${s}%,contact_info.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SiteFeedback[];
    },
    enabled: isAdmin,
  });
}

/**
 * Mutation to update status, is_read, or admin notes on a feedback item
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<SiteFeedback, 'status' | 'is_read' | 'admin_notes'>>;
    }) => {
      const { data, error } = await supabase
        .from('site_feedback')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SiteFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_FEEDBACK_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_FEEDBACK_COUNT_KEY] });
    },
  });
}

/**
 * Mutation to delete a feedback item
 */
export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('site_feedback')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_FEEDBACK_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_FEEDBACK_COUNT_KEY] });
    },
  });
}

/**
 * Mutation to mark all messages as read
 */
export function useMarkAllFeedbackRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('site_feedback')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_FEEDBACK_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_FEEDBACK_COUNT_KEY] });
    },
  });
}
