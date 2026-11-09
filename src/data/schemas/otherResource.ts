// ─────────────────────────────────────────────────────────────
// otherResource.ts — Schema for non-monster gathering resources
// (e.g. Mining Outcrops, Bonepiles)
// ─────────────────────────────────────────────────────────────

export interface DBOtherResource {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
