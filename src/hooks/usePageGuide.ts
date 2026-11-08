// ─────────────────────────────────────────────────────────────
// React Query hooks for page guides & tutorial video links
// (e.g. YouTube video guide displayed at bottom of /challenges/adventurers)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface PageGuide {
  page_id: string;
  youtube_url: string | null;
  title: string | null;
  description: string | null;
  updated_at?: string;
}

export const PAGE_GUIDE_KEY = 'page-guide';

function getLocalGuide(pageId: string): PageGuide | null {
  try {
    const raw = localStorage.getItem(`field-guide-page-guide-${pageId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalGuide(pageId: string, guide: PageGuide) {
  try {
    localStorage.setItem(`field-guide-page-guide-${pageId}`, JSON.stringify(guide));
  } catch (e) {
    console.warn('Failed to save page guide to local storage', e);
  }
}

export function usePageGuide(pageId: string) {
  return useQuery<PageGuide | null>({
    queryKey: [PAGE_GUIDE_KEY, pageId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('page_guides')
          .select('*')
          .eq('page_id', pageId)
          .maybeSingle();

        if (error) {
          console.warn(`[usePageGuide] Database query error for ${pageId}, using local fallback:`, error.message);
          return getLocalGuide(pageId);
        }

        if (data) {
          const guide: PageGuide = {
            page_id: data.page_id,
            youtube_url: data.youtube_url || null,
            title: data.title || null,
            description: data.description || null,
            updated_at: data.updated_at,
          };
          setLocalGuide(pageId, guide);
          return guide;
        }

        return getLocalGuide(pageId);
      } catch (err) {
        console.warn(`[usePageGuide] Exception fetching guide for ${pageId}:`, err);
        return getLocalGuide(pageId);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdatePageGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      page_id: string;
      youtube_url: string | null;
      title?: string | null;
      description?: string | null;
    }) => {
      const row: PageGuide = {
        page_id: payload.page_id,
        youtube_url: payload.youtube_url?.trim() || null,
        title: payload.title?.trim() || null,
        description: payload.description?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Always persist to local cache immediately
      setLocalGuide(payload.page_id, row);

      try {
        const { data, error } = await supabase
          .from('page_guides')
          .upsert(
            {
              page_id: row.page_id,
              youtube_url: row.youtube_url,
              title: row.title,
              description: row.description,
              updated_at: row.updated_at,
            },
            { onConflict: 'page_id' },
          )
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[useUpdatePageGuide] Supabase upsert error (saved locally):', error.message);
        }

        return data ? (data as PageGuide) : row;
      } catch (err) {
        console.warn('[useUpdatePageGuide] Supabase exception (saved locally):', err);
        return row;
      }
    },
    onSuccess: (data) => {
      if (data?.page_id) {
        queryClient.setQueryData([PAGE_GUIDE_KEY, data.page_id], data);
        queryClient.invalidateQueries({ queryKey: [PAGE_GUIDE_KEY, data.page_id] });
      }
    },
  });
}
