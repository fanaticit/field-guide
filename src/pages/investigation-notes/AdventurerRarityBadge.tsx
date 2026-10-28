import { ADVENTURER_RARITY_CONFIG, type AdventurerRarity } from '../../data/schemas/adventurer';

interface Props {
  rarity?: AdventurerRarity | null;
  className?: string;
}

/** SSR / SR / Rare pill; renders nothing until a rarity has been assigned. */
export default function AdventurerRarityBadge({ rarity, className = '' }: Props) {
  if (!rarity) return null;
  const cfg = ADVENTURER_RARITY_CONFIG[rarity];
  return (
    <span
      title={cfg.label}
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-black shadow-xs ${className}`}
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.short}
    </span>
  );
}
