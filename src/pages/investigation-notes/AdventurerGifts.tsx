// ─────────────────────────────────────────────────────────────
// AdventurerGifts — Bond gift table for the adventurer details
//   Description colour: Disliked = Fine, Neutral = Rare, Favourite = Epic,
//   1500+ bond = Superior (best gift). The game's Recommend icon marks gifts
//   whose multiplier is above 100%.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Gift } from 'lucide-react';
import { useAdventurerGifts, type AdventurerGiftRow, type FavouriteGift } from '../../hooks/useAdminAdventurers';
import { cn } from '../../lib/utils';

const BEST_BOND = 1500;

const PREFERENCE_LABEL: Record<AdventurerGiftRow['preference'], string> = {
  favourite: 'Favourite',
  neutral: 'Neutral',
  disliked: 'Disliked',
};

function giftTheme(g: AdventurerGiftRow): 'superior' | 'epic' | 'rare' | 'fine' {
  if (g.bond_gained >= BEST_BOND) return 'superior';
  if (g.preference === 'favourite') return 'epic';
  if (g.preference === 'neutral') return 'rare';
  return 'fine';
}

function GiftIcon({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-500">
        <Gift size={16} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border-rarity-current)] bg-[var(--bg-rarity-current)] object-contain p-0.5"
    />
  );
}

const RECOMMEND_ICON = '/img/ui/Common_Icon_Recommend1.png';

/** The game's "Recommend" icon, used to mark gifts with bonus bond. */
export function RecommendIcon({ className }: { className?: string }) {
  return (
    <img
      src={RECOMMEND_ICON}
      alt="Bonus bond"
      title="Bonus bond"
      draggable={false}
      className={cn('inline-block shrink-0 object-contain', className)}
    />
  );
}

function SmallGiftIcon({ gift, size }: { gift: FavouriteGift; size: 'sm' | 'md' }) {
  const [failed, setFailed] = useState(false);
  const box = size === 'sm' ? 'h-6 w-6' : 'h-9 w-9';
  const label = `${gift.name} · +${gift.bond_gained.toLocaleString()} bond`;
  const best = gift.bond_gained >= BEST_BOND;
  return (
    <span
      title={label}
      className={cn(
        box,
        'relative inline-flex shrink-0 items-center justify-center rounded-md border p-0.5',
        best ? 'rarity-theme-superior' : 'rarity-theme-epic',
        'border-[var(--border-rarity-current)] bg-[var(--bg-rarity-current)]',
      )}
    >
      {gift.icon && !failed ? (
        <img src={gift.icon} alt={gift.name} loading="lazy" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-contain" />
      ) : (
        <Gift size={size === 'sm' ? 12 : 16} className="text-[var(--rarity-current)]" aria-label={gift.name} />
      )}
    </span>
  );
}

/** A row of favourite-gift icons (best bond first). `size="sm"` for cards, `"md"` for the details panel. */
export function FavouriteGiftIcons({ gifts, size = 'sm', className }: { gifts: FavouriteGift[]; size?: 'sm' | 'md'; className?: string }) {
  if (!gifts.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)} aria-label="Favourite gifts">
      {gifts.map((g) => (
        <SmallGiftIcon key={g.gift_id} gift={g} size={size} />
      ))}
    </div>
  );
}

export default function AdventurerGifts({ adventurerId, open }: { adventurerId: string; open: boolean }) {
  const { data: gifts = [], isLoading } = useAdventurerGifts(open ? adventurerId : null);

  if (isLoading || gifts.length === 0) return null;

  return (
    <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
          <Gift size={13} className="text-mh-gold-400" />
          <span>Bond Gifts</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-mh-slate-500">
          <span className="rarity-theme-superior text-[var(--rarity-current)]">Best ({BEST_BOND}+)</span>
          <span className="rarity-theme-epic text-[var(--rarity-current)]">Favourite</span>
          <span className="rarity-theme-rare text-[var(--rarity-current)]">Neutral</span>
          <span className="rarity-theme-fine text-[var(--rarity-current)]">Disliked</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-mh-slate-800 text-[10px] uppercase tracking-wider text-mh-slate-500">
              <th className="py-1.5 pr-2 text-left font-semibold w-12">Gift</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Description</th>
              <th className="py-1.5 text-right font-semibold whitespace-nowrap">Bond</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mh-slate-800/80">
            {gifts.map((g) => {
              const theme = giftTheme(g);
              const boosted = g.multiplier > 100;
              return (
                <tr key={g.gift_id} className={cn(`rarity-theme-${theme}`, theme === 'superior' && 'bg-[var(--bg-rarity-current)]')}>
                  <td className="py-2 pr-2 align-top">
                    <GiftIcon src={g.icon} name={g.name} />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--rarity-current)]">{g.name}</span>
                      <span className="text-[10px] text-mh-slate-500">
                        {PREFERENCE_LABEL[g.preference]} · {g.multiplier}%{g.category ? ` · ${g.category}` : ''}
                      </span>
                    </div>
                    {g.description && (
                      <p className="mt-0.5 leading-relaxed text-[var(--rarity-current)] opacity-90">{g.description}</p>
                    )}
                  </td>
                  <td className="py-2 align-top text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-[var(--rarity-current)]">
                      {boosted && <RecommendIcon className="h-4 w-4" />}
                      +{g.bond_gained.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
