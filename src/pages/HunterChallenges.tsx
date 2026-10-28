// ─────────────────────────────────────────────────────────────
// HunterChallenges — Personal challenge tracker for hunters.
// Desktop: two-column layout — Hunting Targets (left) + Challenge list (right).
// Mobile:  single-column compact list with monster strip at top.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Shield,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Trash2,
  LogIn,
  Crosshair,
  AlertCircle,
  Plus,
  Edit2,
  Save,
  X,
  PackageSearch,
  Package,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../config/themes';
import {
  useHunterChallenges,
  useIncrementChallenge,
  useUpdateChallengeMaterial,
  useDeleteChallenge,
  groupChallengesByMonster,
  challengeStatusLabel,
  type HunterChallenge,
  type ChallengeStatus,
} from '../hooks/useHunterChallenges';
import LoginModal from '../components/auth/LoginModal';
import { cn } from '../lib/utils';
import PageTitlePanel from '../components/layout/PageTitlePanel';

// ── Slot display helpers ──────────────────────────────────────

const SLOT_LABELS: Record<string, string> = {
  helm:    'Helm',
  chest:   'Chest',
  gloves:  'Arms',
  waist:   'Coil',
  greaves: 'Greaves',
};

const SLOT_ICONS: Record<string, string> = {
  helm:    '/images/armor/helm.png',
  chest:   '/images/armor/chest.png',
  gloves:  '/images/armor/gloves.png',
  waist:   '/images/armor/waist.png',
  greaves: '/images/armor/greaves.png',
};

// ── Helpers ───────────────────────────────────────────────────

export function toRoman(num: number): string {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
  return roman[num - 1] || num.toString();
}

// ── Status styling ────────────────────────────────────────────

function statusStyle(status: ChallengeStatus) {
  switch (status) {
    case 'crafting':  return { dot: 'bg-yellow-400',  text: 'text-yellow-300',  badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    case 'upgrading': return { dot: 'bg-blue-400',     text: 'text-blue-300',     badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 'completed': return { dot: 'bg-emerald-400',  text: 'text-emerald-300',  badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'abandoned': return { dot: 'bg-sky-600', text: 'text-sky-500', badge: 'bg-sky-800 text-sky-500 border-sky-700' };
  }
}

// ── Collection categories ─────────────────────────────────────

type ItemCategory = 'weapon' | 'armour' | 'visage' | 'adventurer' | 'buddy';
type CategoryFilter = 'all' | ItemCategory;

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'weapon',     label: 'Weapons' },
  { id: 'armour',     label: 'Armour' },
  { id: 'visage',     label: 'Visage Cards' },
  { id: 'adventurer', label: 'Adventurers' },
  { id: 'buddy',      label: 'Buddies' },
];

const CATEGORY_SINGULAR: Record<ItemCategory, string> = {
  weapon: 'Weapon', armour: 'Armour', visage: 'Visage', adventurer: 'Adventurer', buddy: 'Buddy',
};

const CATEGORY_COLLECTION_PATH: Record<ItemCategory, string> = {
  weapon: '/challenges/weapons',
  armour: '/armory/armour',
  adventurer: '/challenges/adventurers',
  buddy: '/challenges/buddies',
  visage: '/gallery/collection',
};

/** Weapons, armour and visage cards come from monsters; adventurers and buddies come from recruitment. */
const HUNT_CATEGORIES: ItemCategory[] = ['weapon', 'armour', 'visage'];
const RECRUIT_CATEGORIES: ItemCategory[] = ['adventurer', 'buddy'];

function getCategory(c: HunterChallenge): ItemCategory {
  if (c.challenge_type === 'visage_set' || c.visage_id) return 'visage';
  if (c.challenge_type === 'weapon' || c.weapon_id) return 'weapon';
  if (c.challenge_type === 'adventurer' || c.adventurer_id) return 'adventurer';
  if (c.challenge_type === 'buddy' || c.buddy_id) return 'buddy';
  return 'armour';
}

const isOpen = (c: HunterChallenge) => c.status === 'crafting' || c.status === 'upgrading';
const isHuntItem = (c: HunterChallenge) => HUNT_CATEGORIES.includes(getCategory(c));
const isRecruitItem = (c: HunterChallenge) => RECRUIT_CATEGORIES.includes(getCategory(c));
const matchesCategory = (c: HunterChallenge, category: CategoryFilter) =>
  category === 'all' || getCategory(c) === category;

const INTRO_HIDDEN_KEY = 'challenges-intro-hidden';

type Selection =
  | { kind: 'monster' | 'activity' | 'material' | 'recruit'; value: string }
  | null;

function getSlotLabel(c: HunterChallenge): string {
  switch (getCategory(c)) {
    case 'visage':     return `Visage Card · ${c.ink_type ? c.ink_type.charAt(0).toUpperCase() + c.ink_type.slice(1) : 'Ink Set'}`;
    case 'weapon':     return `Weapon · ${c.weapon_type_id ?? 'Hunter Weapon'}`;
    case 'adventurer': return 'Adventurer · Playable Hero';
    case 'buddy':      return 'Companion · Buddy';
    default:           return SLOT_LABELS[c.armour_slot ?? ''] ?? c.armour_slot ?? '—';
  }
}

// ── Challenge Card ────────────────────────────────────────────

interface ChallengeCardProps {
  challenge: HunterChallenge;
  onIncrement: (challenge: HunterChallenge) => void;
  onUpdateMaterial: (id: string, material: string | null, activity: string | null) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function ChallengeCard({ challenge: c, onIncrement, onUpdateMaterial, onDelete, compact = false }: ChallengeCardProps) {
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [editMaterial, setEditMaterial] = useState(c.missing_material ?? '');
  const [editActivity, setEditActivity] = useState(c.missing_material_activity ?? '');

  const handleSaveMaterial = () => {
    onUpdateMaterial(c.id, editMaterial.trim() || null, editActivity.trim() || null);
    setIsEditingMaterial(false);
  };

  const isVisage = c.challenge_type === 'visage_set' || Boolean(c.visage_id);
  const isAdventurer = c.challenge_type === 'adventurer' || Boolean(c.adventurer_id);
  const isBuddy = c.challenge_type === 'buddy' || Boolean(c.buddy_id);

  const slotLabel = getSlotLabel(c);
  const slotIcon  = SLOT_ICONS[c.armour_slot ?? ''] ?? null;
  const pieceImg  = c.piece_image ?? slotIcon;
  const isActive  = c.status === 'crafting' || c.status === 'upgrading';
  const isDone    = c.status === 'completed' || c.status === 'abandoned';

  // Rarity progress
  const maxR = (isAdventurer || isBuddy) ? 1 : isVisage ? 4 : (c.max_rarity || 16);
  const progressPct = maxR > 0
    ? Math.round((c.current_rarity / maxR) * 100)
    : 0;

  const currentRarityName = isVisage
    ? c.current_rarity === 0 ? 'Unowned' : c.current_rarity === 1 ? 'Fine (Green)' : c.current_rarity === 2 ? 'Rare (Blue)' : c.current_rarity === 3 ? 'Epic (Purple)' : 'Superior (Gold)'
    : (isAdventurer || isBuddy)
    ? c.current_rarity === 0 ? 'Not Recruited' : 'Recruited'
    : `R${c.current_rarity} crafted`;
  const targetRarityName = isVisage
    ? 'Superior (Gold)'
    : (isAdventurer || isBuddy)
    ? 'Recruit to Roster'
    : `Target: R${c.max_rarity}`;
  const style = statusStyle(c.status);
  const label = challengeStatusLabel(c);

  if (compact) {
    // ── Compact mobile row ─────────────────────────────────────
    return (
      <div className={cn(
        'mho-panel flex items-center gap-3 p-3',
        isDone && 'opacity-60',
      )}>
        {/* Piece icon */}
        <div className="shrink-0 flex items-center justify-center">
          {pieceImg && (
            <img src={pieceImg} alt={slotLabel} className="h-10 w-10 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-100 truncate">{c.set_name ?? 'Unknown Set'}</p>
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-sky-400 truncate">{slotLabel}</p>
              <span className={cn('rounded px-1.5 py-0.2 text-[9px] font-bold border', style.badge)}>
                {label}
              </span>
            </div>
            {isVisage ? (
              <p className="text-[10px] text-sky-400 truncate">
                {!isDone
                  ? `Search: Find ${c.current_rarity === 0 ? 'Fine' : c.current_rarity === 1 ? 'Rare' : c.current_rarity === 2 ? 'Epic' : 'Superior'} card`
                  : 'Card found in collection'}
              </p>
            ) : isAdventurer ? (
              <p className="text-[10px] text-sky-400 truncate">
                {!isDone ? 'Recruit in Aesoland' : 'Recruited to Roster'}
              </p>
            ) : isBuddy ? (
              <p className="text-[10px] text-sky-400 truncate">
                {!isDone ? 'Recruit Companion' : 'Recruited to Collection'}
              </p>
            ) : c.monster_name && !isDone ? (
              <p className="text-[10px] text-sky-400 truncate">
                Hunt {c.monster_name} at Rank {toRoman((c.current_rarity || 0) + 1)}
              </p>
            ) : c.monster_name ? (
              <p className="text-[10px] text-sky-400 truncate">{c.monster_name}</p>
            ) : null}
          </div>
          {c.missing_material && !isDone && (
            <p className="mt-1 text-[10px] text-sky-300 flex items-center gap-1">
              <PackageSearch size={10} className="text-yellow-500/70 shrink-0" />
              <span className="truncate">{c.missing_material}</span>
            </p>
          )}
        </div>

        {/* Action */}
        {isActive && (
          <button
            type="button"
            onClick={() => onIncrement(c)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25 transition-colors"
            title="Mark progress"
          >
            <Plus size={15} />
          </button>
        )}
      </div>
    );
  }

  // ── Full desktop card ──────────────────────────────────────
  return (
    <div className={cn(
      'mho-panel p-4 space-y-3',
      isDone ? 'opacity-70' : 'mho-panel-interactive',
    )}>
      {/* Card header */}
      <div className="flex items-start gap-3">
        {/* Piece image */}
        <div className="shrink-0 flex items-center justify-center">
          {pieceImg ? (
            <img src={pieceImg} alt={slotLabel} className="h-16 w-16 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          ) : (
            <Shield size={32} className="text-sky-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-sm font-bold text-white truncate">
                {c.set_name ?? 'Unknown Set'}
              </h3>
              <p className="text-xs text-sky-400 mt-0.5">
                {slotLabel}
                {isVisage ? (
                  !isDone ? (
                    <span className="text-sky-500">
                      {' · '}Search for {c.current_rarity === 0 ? 'Fine' : c.current_rarity === 1 ? 'Rare' : c.current_rarity === 2 ? 'Epic' : 'Superior'} card
                    </span>
                  ) : null
                ) : isAdventurer ? (
                  !isDone ? (
                    <span className="text-sky-500"> · Recruit in Aesoland</span>
                  ) : null
                ) : isBuddy ? (
                  !isDone ? (
                    <span className="text-sky-500"> · Recruit Companion</span>
                  ) : null
                ) : c.monster_name && !isDone ? (
                  <span className="text-sky-500">
                    {' · '}Hunt {c.monster_name} at Rank {toRoman((c.current_rarity || 0) + 1)}
                  </span>
                ) : c.monster_name ? (
                  <span className="text-sky-500"> · {c.monster_name}</span>
                ) : null}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold border', style.badge)}>
                {label}
              </span>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-sky-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remove challenge"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Rarity progress bar */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-sky-500 font-medium">
              <span>{currentRarityName}</span>
              <span>{targetRarityName}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-sky-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  c.status === 'crafting'  ? 'bg-yellow-500' :
                  c.status === 'upgrading' ? 'bg-blue-400' :
                  c.status === 'completed' ? 'bg-emerald-400' :
                  'bg-sky-600',
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Missing Materials Section */}
      {!isDone && (
        <div className="pt-2 border-t border-sky-800/60">
          {isEditingMaterial ? (
            <div className="space-y-2 bg-sky-900/60 p-2.5 rounded-xl border border-sky-700">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-sky-400">Missing Material</label>
                <input
                  type="text"
                  placeholder="e.g. Anjanath Fang"
                  value={editMaterial}
                  onChange={(e) => setEditMaterial(e.target.value)}
                  className="w-full bg-sky-950 border border-sky-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-200 placeholder:text-sky-600 focus:outline-none focus:border-yellow-500/50"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-sky-400">Activity (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Break head"
                  value={editActivity}
                  onChange={(e) => setEditActivity(e.target.value)}
                  className="w-full bg-sky-950 border border-sky-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-200 placeholder:text-sky-600 focus:outline-none focus:border-yellow-500/50"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingMaterial(false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-sky-400 hover:bg-sky-800 transition-colors"
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMaterial}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30 transition-colors"
                >
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {c.missing_material ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-sky-200 flex items-center gap-1.5">
                      <PackageSearch size={12} className="text-yellow-500/70" />
                      {c.missing_material}
                    </span>
                    {c.missing_material_activity && (
                      <span className="text-[10px] text-sky-500 pl-4.5 truncate">
                        {c.missing_material_activity}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-sky-500 flex items-center gap-1.5">
                    <PackageSearch size={12} className="opacity-40" />
                    No missing materials noted
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditMaterial(c.missing_material ?? '');
                  setEditActivity(c.missing_material_activity ?? '');
                  setIsEditingMaterial(true);
                }}
                className="shrink-0 p-1.5 rounded-lg text-sky-500 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors"
                title="Edit missing materials"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {isActive && (
        <button
          type="button"
          onClick={() => onIncrement(c)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border-active)] bg-[var(--bg-superior)] py-2 text-xs font-bold text-[var(--theme-accent)] hover:shadow-[0_0_12px_var(--accent-gold-glow)] transition-all"
        >
          <Plus size={13} />
          {isVisage
            ? c.current_rarity === 0
              ? 'Mark Found (Fine)'
              : c.current_rarity === 1
              ? 'Found Rare (Blue)'
              : c.current_rarity === 2
              ? 'Found Epic (Purple)'
              : 'Found Superior (Gold)'
            : isAdventurer || isBuddy
            ? 'Mark as Recruited'
            : c.status === 'crafting'
            ? 'Mark as Crafted (R1)'
            : `Upgrade to R${(c.current_rarity || 0) + 1}`}
        </button>
      )}

      {/* Completion date */}
      {c.completed_at && (
        <p className="text-[10px] text-sky-600 flex items-center gap-1">
          <Clock size={10} />
          Completed {new Date(c.completed_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ── Hunting Targets Panel ─────────────────────────────────────

interface HuntingTargetsPanelProps {
  monsterGroups: Map<string, { monsterName: string; setIcon: string | null; challenges: HunterChallenge[] }>;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}

function HuntingTargetsPanel({ monsterGroups, selection, onSelect }: HuntingTargetsPanelProps) {
  const [expandedMonster, setExpandedMonster] = useState<string | null>(null);
  const selectedMonster = selection?.kind === 'monster' ? selection.value : null;
  const selectedActivity = selection?.kind === 'activity' ? selection.value : null;
  const selectedMaterial = selection?.kind === 'material' ? selection.value : null;

  // Sort monster groups by count desc
  const sortedMonsters = useMemo(() => {
    return Array.from(monsterGroups.entries()).sort((a, b) => b[1].challenges.length - a[1].challenges.length);
  }, [monsterGroups]);

  // Gather and sort activities
  const sortedActivities = useMemo(() => {
    const activityCounts = new Map<string, number>();
    for (const group of monsterGroups.values()) {
      for (const c of group.challenges) {
        const act = c.missing_material_activity?.trim();
        if (act) {
          activityCounts.set(act, (activityCounts.get(act) || 0) + 1);
        }
      }
    }
    return Array.from(activityCounts.entries()).sort((a, b) => b[1] - a[1]);
  }, [monsterGroups]);

  // Gather and sort missing materials
  const sortedMaterials = useMemo(() => {
    const materialCounts = new Map<string, number>();
    for (const group of monsterGroups.values()) {
      for (const c of group.challenges) {
        const mat = c.missing_material?.trim();
        if (mat) {
          materialCounts.set(mat, (materialCounts.get(mat) || 0) + 1);
        }
      }
    }
    return Array.from(materialCounts.entries()).sort((a, b) => b[1] - a[1]);
  }, [monsterGroups]);

  if (monsterGroups.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-white/5 p-8 text-center">
        <Crosshair size={32} className="text-sky-700 mx-auto mb-3" />
        <p className="text-sm font-semibold text-sky-400">No monsters to hunt</p>
        <p className="text-xs text-sky-600 mt-1">Add weapons, armour or visage cards you want to collect and the monsters to hunt will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Monsters list */}
      <div className="space-y-2">
        {sortedMonsters.map(([monsterId, group]) => {
          const isExpanded = expandedMonster === monsterId;
          const challengeCount = group.challenges.length;

          // Ranks only apply to craftable gear; visage cards are found, not crafted
          const ranksNeeded = Array.from(new Set(
            group.challenges
              .filter(c => getCategory(c) !== 'visage')
              .map(c => (c.current_rarity || 0) + 1)
          )).sort((a, b) => a - b).map(r => toRoman(r)).join(', ');

          const breakdown = HUNT_CATEGORIES
            .map(cat => ({ cat, n: group.challenges.filter(c => getCategory(c) === cat).length }))
            .filter(x => x.n > 0)
            .map(x => `${x.n} ${CATEGORY_SINGULAR[x.cat]}`)
            .join(' · ');

          return (
            <div
              key={monsterId}
              className="rounded-2xl border border-[var(--border-subtle)] bg-white/5 overflow-hidden"
            >
              {/* Monster row */}
              <button
                type="button"
                onClick={() => {
                  setExpandedMonster(isExpanded ? null : monsterId);
                  onSelect(selectedMonster === group.monsterName ? null : { kind: 'monster', value: group.monsterName });
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors",
                  selectedMonster === group.monsterName ? "bg-sky-800" : "hover:bg-sky-800/60"
                )}
              >
                {/* Monster icon */}
                <div className="shrink-0 flex items-center justify-center">
                  {group.setIcon ? (
                    <img
                      src={group.setIcon}
                      alt={group.monsterName}
                      className="h-12 w-12 object-contain"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Shield size={24} className="text-sky-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-white truncate">
                    {group.monsterName}
                  </p>
                  <p className="text-[10px] text-sky-500">
                    {breakdown || `${challengeCount} item${challengeCount !== 1 ? 's' : ''}`}
                    {ranksNeeded && <span className="ml-1.5 text-yellow-500/80">· Needs Rank {ranksNeeded}</span>}
                  </p>
                </div>

                {isExpanded
                  ? <ChevronDown size={15} className="text-sky-500 shrink-0" />
                  : <ChevronRight size={15} className="text-sky-500 shrink-0" />}
              </button>

              {/* Expanded: list of linked piece challenges */}
              {isExpanded && (
                <div className="border-t border-sky-800 divide-y divide-sky-800/60">
                  {group.challenges.map((c) => {
                    const style = statusStyle(c.status);
                    const slotLabel = getSlotLabel(c);
                    const slotIcon = SLOT_ICONS[c.armour_slot ?? ''] ?? null;
                    const isVisageItem = getCategory(c) === 'visage';

                    return (
                      <div key={c.id} className="flex flex-col gap-1.5 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {/* Slot icon */}
                          <div className="shrink-0 flex items-center justify-center">
                            {(c.piece_image ?? slotIcon) && (
                              <img
                                src={c.piece_image ?? slotIcon!}
                                alt={slotLabel}
                                className="h-7 w-7 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-sky-200 truncate">{slotLabel}</p>
                            <p className="text-[10px] text-sky-500 truncate">{c.set_name ?? '—'}</p>
                          </div>

                          <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0', style.badge)}>
                            {isVisageItem ? 'Find' : c.status === 'crafting' ? 'Craft' : c.status === 'upgrading' ? `→R${c.max_rarity}` : 'Done'}
                          </span>
                        </div>
                        {c.missing_material && (
                          <div className="pl-9 flex items-center gap-1.5 text-[10px] text-sky-400">
                            <PackageSearch size={10} className="text-yellow-500/70" />
                            <span className="truncate">{c.missing_material}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activities list */}
      {sortedActivities.length > 0 && (
        <div className="pt-3">
          <h3 className="text-[10px] font-bold text-sky-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
            <Target size={12} className="text-sky-500" />
            Planned Activities
          </h3>
          <div className="space-y-1.5">
            {sortedActivities.map(([activity, count]) => (
              <button
                key={activity}
                onClick={() => onSelect(selectedActivity === activity ? null : { kind: 'activity', value: activity })}
                className={cn(
                  "w-full flex items-center justify-between border rounded-xl px-3 py-2 text-left transition-colors",
                  selectedActivity === activity 
                    ? "bg-sky-800 border-sky-600 shadow-md"
                    : "bg-sky-800/40 border-sky-700/50 hover:bg-sky-800/70"
                )}
              >
                <span className="text-xs font-semibold text-sky-200 truncate pr-2">{activity}</span>
                <span className="text-[10px] font-bold text-sky-500 bg-sky-800 px-2 py-0.5 rounded-full shrink-0">
                  x{count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Materials list */}
      {sortedMaterials.length > 0 && (
        <div className="pt-3">
          <h3 className="text-[10px] font-bold text-sky-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
            <Package size={12} className="text-sky-500" />
            Missing Material
          </h3>
          <div className="space-y-1.5">
            {sortedMaterials.map(([material, count]) => (
              <button
                key={material}
                onClick={() => onSelect(selectedMaterial === material ? null : { kind: 'material', value: material })}
                className={cn(
                  "w-full flex items-center justify-between border rounded-xl px-3 py-2 text-left transition-colors",
                  selectedMaterial === material 
                    ? "bg-[var(--bg-superior)] border-[var(--border-active)] shadow-md"
                    : "bg-white/5 border-[var(--border-subtle)] hover:bg-white/10"
                )}
              >
                <span className="text-xs font-semibold text-[var(--theme-accent)] truncate pr-2">{material}</span>
                <span className="text-[10px] font-bold text-[var(--theme-accent)] bg-black/30 px-2 py-0.5 rounded-full shrink-0">
                  x{count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recruitment Panel ─────────────────────────────────────────
// Adventurers and buddies are not hunted — this is just a "shopping list" for recruitment.

interface RecruitmentPanelProps {
  recruits: HunterChallenge[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
}

function RecruitmentPanel({ recruits, selection, onSelect }: RecruitmentPanelProps) {
  if (recruits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-white/5 p-6 text-center">
        <p className="text-sm font-semibold text-sky-400">Nobody to recruit</p>
        <p className="text-xs text-sky-600 mt-1">Add adventurers or buddies you want and they'll be listed here.</p>
      </div>
    );
  }

  const sections: { cat: ItemCategory; title: string }[] = [
    { cat: 'adventurer', title: 'Adventurers' },
    { cat: 'buddy',      title: 'Buddies' },
  ];

  return (
    <div className="space-y-3">
      {sections.map(({ cat, title }) => {
        const items = recruits.filter((c) => getCategory(c) === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-sky-400 px-1 uppercase tracking-wider">
              {title} <span className="text-sky-600">· {items.length}</span>
            </h3>
            {items.map((c) => {
              const isSelected = selection?.kind === 'recruit' && selection.value === c.id;
              const img = c.piece_image ?? c.set_icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : { kind: 'recruit', value: c.id })}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                    isSelected
                      ? 'bg-sky-800 border-sky-600 shadow-md'
                      : 'bg-sky-800/40 border-sky-700/50 hover:bg-sky-800/70',
                  )}
                >
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        alt={c.set_name ?? ''}
                        className="h-9 w-9 object-contain"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Shield size={20} className="text-sky-600" />
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-xs font-semibold text-sky-200 truncate">
                    {c.set_name ?? 'Unknown'}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold text-sky-500">Recruit</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function HunterChallenges() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: challenges = [], isLoading } = useHunterChallenges(user?.id);
  const deleteChallenge = useDeleteChallenge();
  const updateMaterial = useUpdateChallengeMaterial();

  const [category, setCategory]       = useState<CategoryFilter>('all');
  const [showCollected, setShowCollected] = useState(false);
  const theme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selection, setSelection]     = useState<Selection>(null);

  // ── Derived data ────────────────────────────────────────────

  const filteredChallenges = useMemo(() => {
    let list = challenges.filter((c) => matchesCategory(c, category) && (showCollected || isOpen(c)));

    if (selection) {
      list = list.filter((c) => {
        switch (selection.kind) {
          case 'monster':  return isHuntItem(c) && c.monster_name === selection.value;
          case 'activity': return c.missing_material_activity?.trim() === selection.value;
          case 'material': return c.missing_material?.trim() === selection.value;
          case 'recruit':  return c.id === selection.value;
        }
      });
    }

    return list;
  }, [challenges, category, showCollected, selection]);

  const openChallenges = useMemo(() => challenges.filter(isOpen), [challenges]);
  const completedCount = challenges.filter((c) => c.status === 'completed').length;

  // Open items per category, shown as counts on the category tabs
  const openCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = { all: 0, weapon: 0, armour: 0, visage: 0, adventurer: 0, buddy: 0 };
    for (const c of openChallenges) {
      counts.all += 1;
      counts[getCategory(c)] += 1;
    }
    return counts;
  }, [openChallenges]);

  const huntChallenges = useMemo(
    () => openChallenges.filter((c) => isHuntItem(c) && matchesCategory(c, category)),
    [openChallenges, category],
  );
  const recruitChallenges = useMemo(
    () => openChallenges.filter((c) => isRecruitItem(c) && matchesCategory(c, category)),
    [openChallenges, category],
  );
  const monsterGroups = useMemo(() => groupChallengesByMonster(huntChallenges), [huntChallenges]);
  const showHuntSection = category === 'all' || HUNT_CATEGORIES.includes(category as ItemCategory);
  const showRecruitSection = category === 'all' || RECRUIT_CATEGORIES.includes(category as ItemCategory);

  const handleCategoryChange = (next: CategoryFilter) => {
    setCategory(next);
    setSelection(null);
  };

  const incrementChallenge = useIncrementChallenge();


  const handleDelete = async (id: string) => {
    await deleteChallenge.mutateAsync(id);
  };

  // ── Guest wall ──────────────────────────────────────────────

  if (!user) {
    return (
      <>
      <div data-rarity-theme={theme} className="challenges-theme flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="mho-panel flex flex-col items-center gap-6 px-8 py-10 max-w-lg">
        <img
          src="/img/ui/Challenge%20Icon.png"
          alt=""
          draggable={false}
          className="h-16 w-16 object-contain"
        />
        <div className="text-center max-w-md">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Hunter's Challenges</h2>
          <p className="text-sm text-sky-400 mt-2 leading-relaxed">
            Track the armour pieces you want to craft and upgrade. Sign in to save your personal challenges and see which monsters to hunt.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="btn-mho-gold !px-6 !py-2.5"
          >
            <LogIn size={16} />
            Sign in to track challenges
          </button>
          <button
            type="button"
            onClick={() => navigate('/investigation-notes/armour')}
            className="btn-mho-panel !px-6 !py-2.5"
          >
            <Shield size={16} />
            Browse Armour
          </button>
        </div>
        </div>
      </div>
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </>
    );
  }

  // ── Logged in ───────────────────────────────────────────────

  return (
    <div data-rarity-theme={theme} className="challenges-theme mx-auto max-w-7xl px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-7 space-y-4 w-full text-white">
      <PageTitlePanel
        icon="/img/ui/Challenge%20Icon.png"
        title="Hunter's Challenges"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Complete your collection of weapons, armour, visage cards, adventurers and buddies to unlock better builds.
            Weapons, armour and visage cards tell you which <span className="text-sky-200 font-semibold">monsters to hunt</span>;
            adventurers and buddies go on your <span className="text-sky-200 font-semibold">recruitment list</span>.
          </>
        }
      >
        <span className="text-[11px] text-sky-500">
          {completedCount} collected · {openChallenges.length} still to get
        </span>
        <label className="flex items-center gap-2 text-xs font-semibold text-sky-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCollected}
            onChange={(e) => setShowCollected(e.target.checked)}
            className="h-3.5 w-3.5 accent-yellow-500"
          />
          {introHidden ? 'Show all' : "Also show items I've already collected"}
        </label>
      </PageTitlePanel>

      {/* Category tabs — counts are items still to collect */}
      <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleCategoryChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border',
                category === tab.id
                  ? 'bg-gradient-to-b from-[var(--theme-grad-from)] to-[var(--theme-grad-to)] text-[var(--theme-on-accent)] border-transparent shadow-[0_0_10px_var(--accent-gold-glow)]'
                  : 'border-[var(--border-subtle)] bg-black/30 text-[var(--text-secondary)] hover:text-white',
              )}
            >
              {tab.label}
              <span className={cn(
                'rounded-full px-1.5 text-[10px] font-mono',
                category === tab.id ? 'bg-black/20' : 'bg-sky-800 text-sky-400',
              )}>
                {openCounts[tab.id]}
              </span>
            </button>
          ))}

          {category !== 'all' && (
            <button
              type="button"
              onClick={() => navigate(CATEGORY_COLLECTION_PATH[category])}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--theme-accent)] transition-all hover:text-white"
              title={`Go to the ${CATEGORY_TABS.find((t) => t.id === category)?.label} collection`}
            >
              <span>Go to {CATEGORY_TABS.find((t) => t.id === category)?.label} Collection</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* ── LEFT: Monsters to hunt + Recruitment list ── */}
          <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 space-y-4">
            {showHuntSection && (
              <div className="mho-panel-deep space-y-3 p-3">
                <div className="mb-1 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--theme-accent)] text-xs">❖</span>
                    <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">Hunting Targets</h2>
                    {monsterGroups.size > 0 && (
                      <span className="ml-auto rounded-full bg-sky-800 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400">
                        {monsterGroups.size} monsters
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-sky-500">Monsters to hunt for your weapons, armour and visage cards.</p>
                </div>
                <HuntingTargetsPanel
                  monsterGroups={monsterGroups}
                  selection={selection}
                  onSelect={setSelection}
                />
              </div>
            )}

            {showRecruitSection && (
              <div className="mho-panel-deep space-y-3 p-3">
                <div className="mb-1 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--theme-accent)] text-xs">❖</span>
                    <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">Recruitment List</h2>
                    {recruitChallenges.length > 0 && (
                      <span className="ml-auto rounded-full bg-sky-800 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400">
                        {recruitChallenges.length} to recruit
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-sky-500">Adventurers and buddies to aim for when recruiting — no hunting needed.</p>
                </div>
                <RecruitmentPanel
                  recruits={recruitChallenges}
                  selection={selection}
                  onSelect={setSelection}
                />
              </div>
            )}
          </div>

            {/* ── RIGHT: Challenge list ── */}
            <div className={cn(
              "flex-1 min-w-0 space-y-3",
              !selection && category === 'all' && !showCollected
                ? "hidden lg:block"
                : "block"
            )}>
              {filteredChallenges.length === 0 ? (
                <div className="mho-panel border-dashed p-10 text-center">
                  {openChallenges.length === 0 && !showCollected ? (
                    <>
                      <Target size={32} className="text-sky-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-sky-400">Nothing on your list yet</p>
                      <p className="text-xs text-sky-600 mt-1 mb-4">
                        Open a guide, pick a weapon, armour piece, visage card, adventurer or buddy, and tap "Add to My Challenges".
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/investigation-notes/weapons')}
                          className="btn-mho-panel !px-4 !py-2 !text-xs"
                        >
                          Browse Weapons
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/investigation-notes/armour')}
                          className="btn-mho-gold !px-4 !py-2 !text-xs"
                        >
                          <Shield size={13} />
                          Browse Armour
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={32} className="text-sky-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-sky-400">Nothing to show here</p>
                      <p className="text-xs text-sky-600 mt-1">
                        {selection || category !== 'all'
                          ? 'No items match this selection. Try another category or tick "Also show items I\'ve already collected".'
                          : 'Everything on your list is collected.'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop: full cards */}
                  <div className="hidden sm:grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {filteredChallenges.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={(c) => incrementChallenge.mutateAsync(c)}
                        onUpdateMaterial={(id, material, activity) => updateMaterial.mutateAsync({ id, material, activity })}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>

                  {/* Mobile: compact rows */}
                  <div className="sm:hidden space-y-2">
                    {filteredChallenges.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={(c) => incrementChallenge.mutateAsync(c)}
                        onUpdateMaterial={(id, material, activity) => updateMaterial.mutateAsync({ id, material, activity })}
                        onDelete={handleDelete}
                        compact
                      />
                    ))}
                  </div>

                  {/* Error state */}
                  {(deleteChallenge.isError || incrementChallenge.isError) && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                      <AlertCircle size={14} />
                      <span>Something went wrong. Please try again.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
      )}

    </div>
  );
}
