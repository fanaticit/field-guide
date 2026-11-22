// Banners as the signed-in hunter is allowed to see them. The database
// only returns spoiler / not-yet-started banners to hunters with
// "Show Spoilers" on (and admins), so this is safe to use anywhere.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { normalizeBanner, type DBBanner } from '../lib/banners';
import { useAuthStore } from '../store/authStore';

export function useBanners() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const showSpoilers = useAuthStore((s) => Boolean(s.profile?.show_spoilers));
  return useQuery({
    queryKey: ['banners', userId, showSpoilers],
    queryFn: async (): Promise<DBBanner[]> => {
      const { data, error } = await supabase.from('banners').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []).map((r) => normalizeBanner(r as Record<string, unknown>));
    },
    staleTime: 1000 * 60 * 5,
  });
}
