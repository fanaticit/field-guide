// ─────────────────────────────────────────────────────────────
// BuddyPairings — which adventurers suit a buddy, and why
//   Data: buddy_pairings (import/MHO_buddy_pairings.csv)
//   Colour: Best = Superior, Good = Epic, General = Rare, Trigger only = Fine
//   Adventurers hidden as spoilers are left out; Fated Adventurer styles use
//   the default adventurer's portrait with the weapon icon.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Users, User, ChevronDown } from 'lucide-react';
import { useBuddyPairings, type BuddyPairing, type BuddyPairingRating } from '../../hooks/useAdminBuddies';
import { usePublicAdventurers } from '../../hooks/useAdminAdventurers';
import type { DBAdventurer } from '../../data/schemas/adventurer';
import ElementIcon from '../../components/ElementIcon';
import { WEAPON_ICON_MAP } from './AdventurerCard';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export const PAIRING_RATINGS: {
  rating: BuddyPairingRating;
  label: string;
  theme: 'superior' | 'epic' | 'rare' | 'fine';
  hint: string;
  open: boolean;
}[] = [
  { rating: 'best', label: 'Best', theme: 'superior', hint: 'Triggers the Core Passive with 2+ skills and the element boost applies.', open: true },
  { rating: 'good', label: 'Good', theme: 'epic', hint: 'Triggers the Core Passive with 1 skill and the element boost applies.', open: true },
  { rating: 'general', label: 'General', theme: 'rare', hint: 'Squad-wide boost that suits this adventurer.', open: false },
  { rating: 'trigger_only', label: 'Trigger only', theme: 'fine', hint: 'Triggers the Core Passive, but the adventurer deals a different element so the boost is wasted.', open: false },
];

type KindFilter = 'all' | 'adventurer' | 'fated';

export interface ResolvedPairing extends BuddyPairing {
  name: string;
  image: string | null;
}

const weaponLabel = (w: string | null) => (w ? w.split('_').map((s) => s[0].toUpperCase() + s.slice(1)).join(' ') : '');

/** Attach a name/portrait to each pairing and drop adventurers the visitor can't see (spoilers). */
export function resolvePairings(pairings: BuddyPairing[], adventurers: DBAdventurer[]): ResolvedPairing[] {
  const byId = new Map(adventurers.map((a) => [a.id, a]));
  const fatedImage = adventurers.find((a) => a.is_default)?.image ?? null;
  const out: ResolvedPairing[] = [];
  for (const p of pairings) {
    if (p.kind === 'fated') {
      out.push({ ...p, name: `Fated · ${weaponLabel(p.weapon_type)}`, image: fatedImage });
      continue;
    }
    const a = p.adventurer_id ? byId.get(p.adventurer_id) : undefined;
    if (!a) continue;
    out.push({ ...p, name: a.name, image: a.image });
  }
  return out;
}

/** Round portrait with the weapon icon in the corner. */
export function PairingAvatar({ pairing, size = 'md' }: { pairing: ResolvedPairing; size?: 'sm' | 'md' }) {
  const [failed, setFailed] = useState(false);
  const box = size === 'sm' ? 'h-6 w-6' : 'h-10 w-10';
  const weaponIcon = pairing.weapon_type ? WEAPON_ICON_MAP[pairing.weapon_type] : null;
  return (
    <span className={cn('relative inline-flex shrink-0', box)}>
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[var(--border-rarity-current)] bg-[var(--bg-rarity-current)]">
        {pairing.image && !failed ? (
          <img src={pairing.image} alt={pairing.name} loading="lazy" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <User size={size === 'sm' ? 12 : 18} className="text-[var(--rarity-current)]" />
        )}
      </span>
      {weaponIcon && size === 'md' && (
        <img
          src={weaponIcon}
          alt={weaponLabel(pairing.weapon_type)}
          title={weaponLabel(pairing.weapon_type)}
          draggable={false}
          className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-mh-slate-950 object-contain p-px ring-1 ring-mh-slate-700"
        />
      )}
    </span>
  );
}

function PairingRow({ p }: { p: ResolvedPairing }) {
  return (
    <li className="flex gap-3 py-2.5">
      <PairingAvatar pairing={p} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[var(--rarity-current)]">{p.kind === 'fated' ? p.style_name : p.name}</span>
          {p.adventurer_element && <ElementIcon element={p.adventurer_element} size={14} />}
          <span className="text-[10px] text-mh-slate-500">{weaponLabel(p.weapon_type)}</span>
          {p.trigger_type && (
            <span className="rounded border border-mh-slate-700 bg-mh-slate-950/70 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-mh-slate-300">
              {p.trigger_type}
            </span>
          )}
          {p.element_match === false && (
            <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-px text-[10px] font-bold text-red-300">Element wasted</span>
          )}
        </div>
        {p.trigger_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.trigger_skills.map((s) => (
              <span key={s} className="rounded bg-mh-slate-800/80 px-1.5 py-px text-[10px] text-mh-slate-300">
                {s}
              </span>
            ))}
          </div>
        )}
        {p.reason && <p className="text-xs leading-relaxed text-mh-slate-400">{p.reason}</p>}
        {p.bonus_links.length > 0 && (
          <p className="text-[10px] text-mh-gold-400/90">Bonus: {p.bonus_links.join(' · ')}</p>
        )}
      </div>
    </li>
  );
}

/** Rows that share the same reason (e.g. squad-wide boosts) are shown once with all their portraits. */
function groupByReason(list: ResolvedPairing[]) {
  const groups = new Map<string, ResolvedPairing[]>();
  for (const p of list) {
    const key = p.trigger_type ? `${p.style_id}` : `reason:${p.reason ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()];
}

export default function BuddyPairings({ buddyId, open }: { buddyId: string; open: boolean }) {
  const { data: pairings = [], isLoading } = useBuddyPairings(open ? buddyId : null);
  const showSpoilers = useAuthStore((s) => Boolean(s.profile?.show_spoilers));
  const { data: adventurers = [] } = usePublicAdventurers({ showSpoilers });
  const [kind, setKind] = useState<KindFilter>('all');

  const resolved = useMemo(() => resolvePairings(pairings, adventurers), [pairings, adventurers]);
  const hasFated = resolved.some((p) => p.kind === 'fated');
  const hasAdventurers = resolved.some((p) => p.kind === 'adventurer');
  const shown = resolved.filter((p) => kind === 'all' || p.kind === kind);

  if (isLoading || resolved.length === 0) return null;

  return (
    <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-slate-300">
          <Users size={13} className="text-mh-gold-400" />
          <span>Adventurer Pairings</span>
        </div>
        {hasFated && hasAdventurers && (
          <div className="flex rounded-lg border border-mh-slate-700 bg-mh-slate-950/70 p-0.5 text-[10px] font-bold">
            {(['all', 'adventurer', 'fated'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-md px-2 py-0.5 transition-colors',
                  kind === k ? 'bg-mh-gold-500 text-mh-slate-950' : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                {k === 'all' ? 'All' : k === 'adventurer' ? 'Adventurers' : 'Fated'}
              </button>
            ))}
          </div>
        )}
      </div>

      {PAIRING_RATINGS.map(({ rating, label, theme, hint, open: defaultOpen }) => {
        const list = shown.filter((p) => p.rating === rating);
        if (list.length === 0) return null;
        return (
          <details key={`${rating}-${kind}`} open={defaultOpen} className={cn(`rarity-theme-${theme}`, 'group rounded-lg border border-mh-slate-800 bg-mh-slate-950/40')}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <ChevronDown size={13} className="shrink-0 text-mh-slate-500 transition-transform group-open:rotate-0 -rotate-90" />
              <span className="text-xs font-bold text-[var(--rarity-current)]">{label}</span>
              <span className="rounded-full bg-[var(--bg-rarity-current)] px-1.5 text-[10px] font-bold text-[var(--rarity-current)]">{list.length}</span>
              <span className="hidden sm:inline truncate text-[10px] text-mh-slate-500">{hint}</span>
              {/* Collapsed preview */}
              <span className="ml-auto flex -space-x-1.5 group-open:hidden">
                {list.slice(0, 6).map((p) => (
                  <PairingAvatar key={p.style_id} pairing={p} size="sm" />
                ))}
              </span>
            </summary>
            <div className="border-t border-mh-slate-800 px-3">
              <p className="pt-2 text-[10px] text-mh-slate-500 sm:hidden">{hint}</p>
              <ul className="divide-y divide-mh-slate-800/80">
                {groupByReason(list).map((group) =>
                  group.length === 1 ? (
                    <PairingRow key={group[0].style_id} p={group[0]} />
                  ) : (
                    <li key={group[0].style_id} className="space-y-1.5 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {group.map((p) => (
                          <span key={p.style_id} className="inline-flex items-center gap-1 rounded-full border border-mh-slate-800 bg-mh-slate-900/80 py-0.5 pl-0.5 pr-2 text-[11px] text-[var(--rarity-current)]">
                            <PairingAvatar pairing={p} size="sm" />
                            {p.name}
                          </span>
                        ))}
                      </div>
                      {group[0].reason && <p className="text-xs leading-relaxed text-mh-slate-400">{group[0].reason}</p>}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** Small weapon-icon badge used on cards for a Fated Adventurer style. */
function FatedWeaponBadge({ pairing }: { pairing: ResolvedPairing }) {
  const icon = pairing.weapon_type ? WEAPON_ICON_MAP[pairing.weapon_type] : null;
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-rarity-current)] bg-[var(--bg-rarity-current)] p-0.5">
      {icon ? (
        <img src={icon} alt={pairing.style_name} draggable={false} className="h-full w-full object-contain" />
      ) : (
        <User size={12} className="text-[var(--rarity-current)]" />
      )}
    </span>
  );
}

/**
 * A row of top-pairing icons for cards: adventurer portraits, and the weapon icon for
 * Fated Adventurer styles. Pass pairings already resolved with resolvePairings().
 */
export function BestPairingIcons({
  pairings,
  rating = 'best',
  max = 6,
  className,
}: {
  pairings: ResolvedPairing[];
  rating?: 'best' | 'good';
  max?: number;
  className?: string;
}) {
  if (!pairings.length) return null;
  const extra = pairings.length - max;
  return (
    <div
      className={cn(rating === 'best' ? 'rarity-theme-superior' : 'rarity-theme-epic', 'flex items-center gap-1.5 min-w-0', className)}
      aria-label={`${rating === 'best' ? 'Best' : 'Good'} adventurer pairings`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-500 shrink-0">
        {rating === 'best' ? 'Best with' : 'Good with'}
      </span>
      <span className="flex flex-wrap items-center gap-1">
        {pairings.slice(0, max).map((p) => (
          <span key={p.style_id} title={p.kind === 'fated' ? p.style_name : p.name}>
            {p.kind === 'fated' ? <FatedWeaponBadge pairing={p} /> : <PairingAvatar pairing={p} size="sm" />}
          </span>
        ))}
        {extra > 0 && <span className="text-[10px] font-bold text-mh-slate-400">+{extra}</span>}
      </span>
    </div>
  );
}
