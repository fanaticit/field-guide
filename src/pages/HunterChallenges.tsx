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
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  useHunterChallenges,
  useIncrementChallenge,
  useDeleteChallenge,
  groupChallengesByMonster,
  challengeStatusLabel,
  type HunterChallenge,
  type ChallengeStatus,
} from '../hooks/useHunterChallenges';
import LoginModal from '../components/auth/LoginModal';
import { cn } from '../lib/utils';

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

// ── Status styling ────────────────────────────────────────────

function statusStyle(status: ChallengeStatus) {
  switch (status) {
    case 'crafting':  return { dot: 'bg-mh-gold-400',  text: 'text-mh-gold-300',  badge: 'bg-mh-gold-500/20 text-mh-gold-300 border-mh-gold-500/30' };
    case 'upgrading': return { dot: 'bg-blue-400',     text: 'text-blue-300',     badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 'completed': return { dot: 'bg-emerald-400',  text: 'text-emerald-300',  badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'abandoned': return { dot: 'bg-mh-slate-600', text: 'text-mh-slate-500', badge: 'bg-mh-slate-800 text-mh-slate-500 border-mh-slate-700' };
  }
}

// ── Filter tabs ───────────────────────────────────────────────

type FilterTab = 'active' | 'completed' | 'all';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'all',       label: 'All' },
];

// ── Challenge Card ────────────────────────────────────────────

interface ChallengeCardProps {
  challenge: HunterChallenge;
  onIncrement: (challenge: HunterChallenge) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function ChallengeCard({ challenge: c, onIncrement, onDelete, compact = false }: ChallengeCardProps) {
  const style   = statusStyle(c.status);
  const label   = challengeStatusLabel(c);
  const slotLabel = SLOT_LABELS[c.armour_slot ?? ''] ?? c.armour_slot ?? '—';
  const slotIcon  = SLOT_ICONS[c.armour_slot ?? ''] ?? null;
  const pieceImg  = c.piece_image ?? slotIcon;
  const isActive  = c.status === 'crafting' || c.status === 'upgrading';
  const isDone    = c.status === 'completed' || c.status === 'abandoned';

  // Rarity progress
  const progressPct = c.max_rarity > 0
    ? Math.round((c.current_rarity / c.max_rarity) * 100)
    : 0;

  if (compact) {
    // ── Compact mobile row ─────────────────────────────────────
    return (
      <div className={cn(
        'flex items-center gap-3 rounded-xl border p-3 transition-all',
        isDone
          ? 'border-mh-slate-800 bg-mh-slate-900/40 opacity-60'
          : 'border-mh-slate-750 bg-mh-slate-900',
      )}>
        {/* Piece icon */}
        <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-mh-slate-950 border border-mh-slate-800">
          {pieceImg && (
            <img src={pieceImg} alt={slotLabel} className="h-8 w-8 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-mh-slate-100 truncate">{c.set_name ?? 'Unknown Set'}</p>
          <p className="text-[10px] text-mh-slate-400 truncate">{slotLabel} · {c.monster_name ?? '—'}</p>
          <span className={cn('inline-block mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold border', style.badge)}>
            {label}
          </span>
        </div>

        {/* Action */}
        {isActive && (
          <button
            type="button"
            onClick={() => onIncrement(c)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-400 hover:bg-mh-gold-500/25 transition-colors"
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
      'rounded-2xl border p-4 space-y-3 transition-all',
      isDone
        ? 'border-mh-slate-800 bg-mh-slate-900/40 opacity-70'
        : 'border-mh-slate-750 bg-mh-slate-900 hover:border-mh-slate-650',
    )}>
      {/* Card header */}
      <div className="flex items-start gap-3">
        {/* Piece image */}
        <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-mh-slate-950 border border-mh-slate-800 p-1.5">
          {pieceImg ? (
            <img src={pieceImg} alt={slotLabel} className="h-full w-full object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          ) : (
            <Shield size={24} className="text-mh-slate-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-sm font-bold text-mh-slate-100 truncate">
                {c.set_name ?? 'Unknown Set'}
              </h3>
              <p className="text-xs text-mh-slate-400 mt-0.5">
                {slotLabel}
                {c.monster_name ? <span className="text-mh-slate-500"> · {c.monster_name}</span> : null}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold border', style.badge)}>
                {label}
              </span>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-mh-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remove challenge"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Rarity progress bar */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-mh-slate-500">
              <span>R{c.current_rarity} crafted</span>
              <span>Target: R{c.max_rarity}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-mh-slate-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  c.status === 'crafting'  ? 'bg-mh-gold-500' :
                  c.status === 'upgrading' ? 'bg-blue-400' :
                  c.status === 'completed' ? 'bg-emerald-400' :
                  'bg-mh-slate-600',
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      {isActive && (
        <button
          type="button"
          onClick={() => onIncrement(c)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/10 py-2 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/20 hover:text-mh-gold-200 transition-colors"
        >
          <Plus size={13} />
          {c.status === 'crafting' ? 'Mark as Crafted (R1)' : `Upgrade to R${(c.current_rarity || 0) + 1}`}
        </button>
      )}

      {/* Completion date */}
      {c.completed_at && (
        <p className="text-[10px] text-mh-slate-600 flex items-center gap-1">
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
}

function HuntingTargetsPanel({ monsterGroups }: HuntingTargetsPanelProps) {
  const [expandedMonster, setExpandedMonster] = useState<string | null>(null);

  if (monsterGroups.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-8 text-center">
        <Crosshair size={32} className="text-mh-slate-700 mx-auto mb-3" />
        <p className="text-sm font-semibold text-mh-slate-400">No active hunts</p>
        <p className="text-xs text-mh-slate-600 mt-1">Add an armour piece challenge to see which monsters to hunt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from(monsterGroups.entries()).map(([monsterId, group]) => {
        const isExpanded = expandedMonster === monsterId;
        const challengeCount = group.challenges.length;

        return (
          <div
            key={monsterId}
            className="rounded-2xl border border-mh-slate-750 bg-mh-slate-900 overflow-hidden"
          >
            {/* Monster row */}
            <button
              type="button"
              onClick={() => setExpandedMonster(isExpanded ? null : monsterId)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-mh-slate-850/60 transition-colors"
            >
              {/* Monster icon */}
              <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-mh-slate-950 border border-mh-slate-800 p-1">
                {group.setIcon ? (
                  <img
                    src={group.setIcon}
                    alt={group.monsterName}
                    className="h-full w-full object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <Shield size={20} className="text-mh-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-mh-slate-100 truncate">
                  {group.monsterName}
                </p>
                <p className="text-[10px] text-mh-slate-500">
                  {challengeCount} piece{challengeCount !== 1 ? 's' : ''} to track
                </p>
              </div>

              {isExpanded
                ? <ChevronDown size={15} className="text-mh-slate-500 shrink-0" />
                : <ChevronRight size={15} className="text-mh-slate-500 shrink-0" />}
            </button>

            {/* Expanded: list of linked piece challenges */}
            {isExpanded && (
              <div className="border-t border-mh-slate-800 divide-y divide-mh-slate-800/60">
                {group.challenges.map((c) => {
                  const style = statusStyle(c.status);
                  const slotLabel = SLOT_LABELS[c.armour_slot ?? ''] ?? c.armour_slot ?? '—';
                  const slotIcon = SLOT_ICONS[c.armour_slot ?? ''] ?? null;

                  return (
                    <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5">
                      {/* Slot icon */}
                      <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-mh-slate-950 border border-mh-slate-800">
                        {(c.piece_image ?? slotIcon) && (
                          <img
                            src={c.piece_image ?? slotIcon!}
                            alt={slotLabel}
                            className="h-5 w-5 object-contain"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-mh-slate-200 truncate">{slotLabel}</p>
                        <p className="text-[10px] text-mh-slate-500 truncate">{c.set_name ?? '—'}</p>
                      </div>

                      <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0', style.badge)}>
                        {c.status === 'crafting' ? 'Craft' : c.status === 'upgrading' ? `→R${c.max_rarity}` : 'Done'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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

  const [filterTab, setFilterTab]         = useState<FilterTab>('active');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // ── Derived data ────────────────────────────────────────────

  const filteredChallenges = useMemo(() => {
    switch (filterTab) {
      case 'active':
        return challenges.filter((c) => c.status === 'crafting' || c.status === 'upgrading');
      case 'completed':
        return challenges.filter((c) => c.status === 'completed' || c.status === 'abandoned');
      default:
        return challenges;
    }
  }, [challenges, filterTab]);

  // Only show active challenges in the Hunting Targets panel
  const activeChallenges = useMemo(
    () => challenges.filter((c) => c.status === 'crafting' || c.status === 'upgrading'),
    [challenges],
  );
  const monsterGroups = useMemo(() => groupChallengesByMonster(activeChallenges), [activeChallenges]);

  // Unique monster list for mobile strip
  const activeMonsters = useMemo(() => Array.from(monsterGroups.values()), [monsterGroups]);

  const incrementChallenge = useIncrementChallenge();


  const handleDelete = async (id: string) => {
    await deleteChallenge.mutateAsync(id);
  };

  // ── Guest wall ──────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-mh-gold-500/10 border border-mh-gold-500/30">
          <Target size={32} className="text-mh-gold-400" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="font-display text-2xl font-bold text-mh-slate-100">Hunter's Challenges</h2>
          <p className="text-sm text-mh-slate-400 mt-2 leading-relaxed">
            Track the armour pieces you want to craft and upgrade. Sign in to save your personal challenges and see which monsters to hunt.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-mh-gold-400 transition-colors"
          >
            <LogIn size={16} />
            Sign in to track challenges
          </button>
          <button
            type="button"
            onClick={() => navigate('/investigation-notes/armour')}
            className="flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-6 py-2.5 text-sm font-semibold text-mh-slate-300 hover:bg-mh-slate-700 transition-colors"
          >
            <Shield size={16} />
            Browse Armour
          </button>
        </div>
        <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </div>
    );
  }

  // ── Logged in ───────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-mh-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mh-gold-500/10 border border-mh-gold-500/20">
            <Target size={18} className="text-mh-gold-400" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-mh-slate-100">
              Hunter's Challenges
            </h1>
            <p className="text-xs text-mh-slate-500">
              {activeChallenges.length} active · {challenges.filter((c) => c.status === 'completed').length} completed
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5 shrink-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                filterTab === tab.id
                  ? 'bg-mh-gold-500 text-slate-950 shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── MOBILE: Monster hunt strip ── */}
          {activeMonsters.length > 0 && (
            <div className="lg:hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-500 mb-2">Today's Hunts</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activeMonsters.map((group) => (
                  <div
                    key={group.monsterName}
                    className="shrink-0 flex flex-col items-center gap-1 rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-2 min-w-[64px]"
                  >
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-mh-slate-950 border border-mh-slate-800">
                      {group.setIcon ? (
                        <img src={group.setIcon} alt={group.monsterName} className="h-8 w-8 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Shield size={18} className="text-mh-slate-600" />
                      )}
                    </div>
                    <span className="text-[9px] font-semibold text-mh-slate-300 text-center leading-tight max-w-[60px] truncate">
                      {group.monsterName}
                    </span>
                    <span className="text-[8px] text-mh-slate-600 font-mono">
                      ×{group.challenges.length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DESKTOP: Two-column layout / MOBILE: single column ── */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">

            {/* ── LEFT: Hunting Targets (desktop only) ── */}
            <div className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Crosshair size={15} className="text-mh-gold-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">Hunting Targets</h2>
                {activeChallenges.length > 0 && (
                  <span className="ml-auto rounded-full bg-mh-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-mh-slate-400">
                    {monsterGroups.size} monsters
                  </span>
                )}
              </div>
              <HuntingTargetsPanel monsterGroups={monsterGroups} />

              {/* Quick link to armour guide */}
              <button
                type="button"
                onClick={() => navigate('/investigation-notes/armour')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 px-4 py-3 text-xs font-semibold text-mh-slate-500 hover:text-mh-slate-300 hover:border-mh-slate-650 hover:bg-mh-slate-900/60 transition-all"
              >
                <Shield size={13} />
                Browse Armour to add more
              </button>
            </div>

            {/* ── RIGHT: Challenge list ── */}
            <div className="flex-1 min-w-0 space-y-3">
              {filteredChallenges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-10 text-center">
                  {filterTab === 'active' ? (
                    <>
                      <Target size={32} className="text-mh-slate-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-mh-slate-400">No active challenges yet</p>
                      <p className="text-xs text-mh-slate-600 mt-1 mb-4">
                        Open the Armour guide, select a piece, and tap "Add to My Challenges".
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/investigation-notes/armour')}
                        className="inline-flex items-center gap-2 rounded-xl bg-mh-gold-500/15 border border-mh-gold-500/30 px-4 py-2 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-colors"
                      >
                        <Shield size={13} />
                        Browse Armour
                      </button>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={32} className="text-mh-slate-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-mh-slate-400">No completed challenges yet</p>
                      <p className="text-xs text-mh-slate-600 mt-1">Complete an active challenge to see it here.</p>
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
        </>
      )}

    </div>
  );
}
