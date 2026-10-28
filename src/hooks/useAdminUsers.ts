// ─────────────────────────────────────────────────────────────
// React Query hook for the admin users report
// ─────────────────────────────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: 'member' | 'admin' | 'moderator';
  created_at: string;
  last_sign_in_at: string | null;
}

export const ADMIN_USERS_KEY = 'admin-users';

export function useAdminUsers() {
  return useQuery({
    queryKey: [ADMIN_USERS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });
}
