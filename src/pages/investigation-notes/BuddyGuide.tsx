// ─────────────────────────────────────────────────────────────
// BuddyGuide — Investigation Notes view for MHO Companions (Buddies) with Collection
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Search,
  Cat,
  Swords,
  Zap,
  Heart,
  LayoutGrid,
  List,
  Info,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import {
  type DBBuddy,
  type BuddyTier,
  type BuddyRole,
  BUDDY_TIERS,
  BUDDY_TIER_RARITY,
  BUDDY_ROLES,
  TIER_CONFIG,
  ROLE_CONFIG,
} from '../../data/schemas/buddy';
import { ADVENTURER_RARITY_CONFIG } from '../../data/schemas/adventurer';
import { useAdminBuddies } from '../../hooks/useAdminBuddies';
import { useUserBuddyCollection } from '../../hooks/useUserBuddyCollection';
import {
  useHunterChallenges,
  useAddBuddyChallenge,
  getBuddyChallenge,
} from '../../hooks/useHunterChallenges';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';
import BuddyCard from './BuddyCard';
import BuddyModal from './BuddyModal';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import LoginModal from '../../components/auth/LoginModal';
import { cn } from '../../lib/utils';

type ViewMode = 'grid' | 'table';
type OwnershipFilter = 'all' | 'owned' | 'unowned';
const INTRO_HIDDEN_KEY = 'buddies-intro-hidden';

const ROLE_ICONS: Record<BuddyRole, React.ComponentType<{ size?: number; className?: string }>> = {
  Assault: Swords,
  Disruptor: Zap,
  Support: Heart,
};

const TIER_ORDER: Record<BuddyTier, number> = {
  SSR: 3,
  SR: 2,
  R: 1,
};

export default function BuddyGuide() {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [inspectedBuddy, setInspectedBuddy] = useState<DBBuddy | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { user } = useAuthStore();
  const theme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };

  const { data: buddies = [], isLoading } = useAdminBuddies({ isActive: true });
  const {
    collectionMap,
    setBuddyQuantity,
    removeBuddyFromCollection,
    totalCollected,
  } = useUserBuddyCollection();

  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addBuddyChallenge = useAddBuddyChallenge();

  const handleAddChallenge = async (buddy: DBBuddy) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    await addBuddyChallenge.mutateAsync({
      userId: user.id,
      buddyId: buddy.id,
      buddyName: buddy.name,
      pieceImage: buddy.image,
      tier: buddy.tier,
      role: buddy.role,
    });
  };

  // Filter and sort buddies
  const filtered = useMemo(() => {
    let list = [...buddies];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.name_ja ?? '').toLowerCase().includes(q) ||
          (b.core_passive ?? '').toLowerCase().includes(q),
      );
    }

    if (selectedTier !== 'all') {
      list = list.filter((b) => b.tier === selectedTier);
    }

    if (selectedRole !== 'all') {
      list = list.filter((b) => b.role === selectedRole);
    }

    if (ownershipFilter === 'owned') {
      list = list.filter((b) => Boolean(collectionMap[b.id]));
    } else if (ownershipFilter === 'unowned') {
      list = list.filter((b) => !collectionMap[b.id]);
    }

    // Default sorting: Tier (SSR -> SR -> R) then sort_order then name
    list.sort((a, b) => {
      const tierDiff = (TIER_ORDER[b.tier] || 0) - (TIER_ORDER[a.tier] || 0);
      if (tierDiff !== 0) return tierDiff;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [buddies, search, selectedTier, selectedRole, ownershipFilter, collectionMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = buddies.length;
    const tiers = {} as Record<BuddyTier, { total: number; owned: number }>;
    for (const tier of BUDDY_TIERS) {
      const inTier = buddies.filter((b) => b.tier === tier);
      tiers[tier] = { total: inTier.length, owned: inTier.filter((b) => collectionMap[b.id]).length };
    }

    const progressPct = total > 0 ? Math.round((totalCollected / total) * 100) : 0;

    return { total, totalCollected, progressPct, tiers };
  }, [buddies, collectionMap, totalCollected]);

  return (
    <div data-rarity-theme={theme} className="challenges-theme flex flex-col gap-6 px-6 pb-6 pt-2 lg:px-8 lg:pb-8 lg:pt-3 text-white">
      <PageTitlePanel
        icon="/img/ui/Buddy%20Icon.png"
        title="Buddies"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Collect the Aesoland companions that fight alongside you. Each buddy has a rarity, a combat role
            (Assault, Disruptor or Support) and a core passive, and you can own several copies of the same one.
            Tap a card to inspect passives and update how many you own, or add the ones you're missing to your
            Hunter's Challenges <span className="text-mh-slate-200 font-semibold">recruitment list</span> so you
            know who to aim for.
          </>
        }
      >
        {/* Collection status */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 rounded-xl p-1 border border-[var(--border-subtle)]">
          <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-[var(--theme-accent)]">
              <Bookmark size={10} />
              <span>Collected</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-sm font-black text-white">{stats.totalCollected}</span>
              <span className="text-[10px] text-mh-slate-500">/ {stats.total}</span>
              <span className="text-[9px] font-bold text-emerald-400 ml-0.5">({stats.progressPct}%)</span>
            </div>
          </div>

          {BUDDY_TIERS.map((tier) => {
            const cfg = ADVENTURER_RARITY_CONFIG[BUDDY_TIER_RARITY[tier]];
            const tierStats = stats.tiers[tier];
            return (
              <div key={tier} className="px-2 py-0.5 text-center" title={`${tierStats.owned} of ${tierStats.total} ${tier} buddies collected`}>
                <span className="block text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-xs font-bold" style={{ color: cfg.color }}>{tierStats.owned}</span>
                  <span className="text-[9px] text-mh-slate-500 font-bold">/ {tierStats.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PageTitlePanel>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buddies by name, Japanese name, or passive skill..."
            className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-900/90 pl-10 pr-4 py-2.5 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50 shadow-inner"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ownership Filter */}
          <div className="flex items-center rounded-xl bg-mh-slate-900/90 p-1 border border-mh-slate-750 text-xs">
            <button
              onClick={() => setOwnershipFilter('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-semibold transition-all',
                ownershipFilter === 'all'
                  ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              All
            </button>
            <button
              onClick={() => setOwnershipFilter('owned')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all',
                ownershipFilter === 'owned'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              <CheckCircle2 size={12} />
              <span>Owned</span>
            </button>
            <button
              onClick={() => setOwnershipFilter('unowned')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-semibold transition-all',
                ownershipFilter === 'unowned'
                  ? 'bg-mh-slate-750 text-white font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              Missing
            </button>
          </div>

          {/* Tier Filter Chips */}
          <div className="flex items-center rounded-xl bg-mh-slate-900/90 p-1 border border-mh-slate-750 text-xs">
            <button
              onClick={() => setSelectedTier('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-semibold transition-all',
                selectedTier === 'all'
                  ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              All Tiers
            </button>
            {BUDDY_TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  'rounded-lg px-2 py-1 font-bold transition-all',
                  selectedTier === tier
                    ? tier === 'SSR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : tier === 'SR'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-blue-600 text-white shadow-sm'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Role Filter Chips */}
          <div className="flex items-center rounded-xl bg-mh-slate-900/90 p-1 border border-mh-slate-750 text-xs">
            <button
              onClick={() => setSelectedRole('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-semibold transition-all',
                selectedRole === 'all'
                  ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              All Roles
            </button>
            {BUDDY_ROLES.map((role) => {
              const RoleIcon = ROLE_ICONS[role];
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition-all',
                    selectedRole === role
                      ? 'bg-mh-slate-750 text-white shadow-sm ring-1 ring-mh-gold-400'
                      : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  <RoleIcon size={12} />
                  <span>{role}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-mh-slate-900/90 p-1 border border-mh-slate-750 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              className={cn(
                'rounded-lg p-1.5 transition-all',
                viewMode === 'grid'
                  ? 'bg-mh-slate-750 text-mh-gold-400 shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={cn(
                'rounded-lg p-1.5 transition-all',
                viewMode === 'table'
                  ? 'bg-mh-slate-750 text-mh-gold-400 shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content / Buddies Display ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center text-mh-slate-500 min-h-[300px]">
          <Cat size={48} className="mb-3 opacity-30 text-mh-gold-400" />
          <h3 className="font-display text-base font-bold text-mh-slate-300">
            No Companions Found
          </h3>
          <p className="text-xs text-mh-slate-400 mt-1 max-w-md">
            {search || selectedTier !== 'all' || selectedRole !== 'all' || ownershipFilter !== 'all'
              ? 'No buddies matched your active search and filter criteria.'
              : 'No active companions have been registered in the database yet.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((buddy) => (
            <BuddyCard
              key={buddy.id}
              buddy={buddy}
              collectionEntry={collectionMap[buddy.id]}
              challenge={getBuddyChallenge(challenges, buddy.id)}
              onSetQuantity={(qty) => setBuddyQuantity(buddy.id, qty)}
              onRemoveFromCollection={() => removeBuddyFromCollection(buddy.id)}
              onAddChallenge={handleAddChallenge}
              onClick={() => setInspectedBuddy(buddy)}
            />
          ))}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="overflow-hidden rounded-2xl border border-mh-slate-800 bg-mh-slate-900/80 shadow-md">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-950 text-[11px] font-semibold uppercase tracking-wider text-mh-slate-400">
              <tr>
                <th className="px-5 py-3.5 min-w-[200px]">Companion</th>
                <th className="px-4 py-3.5 w-24">Tier</th>
                <th className="px-4 py-3.5 w-32">Role</th>
                <th className="px-4 py-3.5 w-32">Owned</th>
                <th className="px-5 py-3.5 min-w-[250px]">Core Passive Skill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800 text-xs">
              {filtered.map((buddy) => {
                const tierCfg = TIER_CONFIG[buddy.tier] || TIER_CONFIG.R;
                const roleCfg = ROLE_CONFIG[buddy.role] || ROLE_CONFIG.Support;
                const RoleIcon = ROLE_ICONS[buddy.role] || Heart;
                const entry = collectionMap[buddy.id];
                const isOwned = Boolean(entry);
                const qty = entry?.quantity ?? 0;

                return (
                  <tr
                    key={buddy.id}
                    onClick={() => setInspectedBuddy(buddy)}
                    className={cn(
                      'hover:bg-mh-slate-800/40 cursor-pointer transition-colors',
                      !isOwned && 'opacity-60',
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {buddy.image ? (
                          <img
                            src={buddy.image}
                            alt={buddy.name}
                            className="h-10 w-10 rounded-xl object-cover shadow-sm shrink-0 border border-mh-slate-750"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 text-mh-gold-400">
                            <Cat size={16} />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-mh-slate-100">
                            {buddy.name}
                          </span>
                          {buddy.name_ja && (
                            <span className="ml-1 text-[11px] text-mh-slate-500">
                              ({buddy.name_ja})
                            </span>
                          )}
                          <p className="font-mono text-[10px] text-mh-slate-500">
                            {buddy.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 text-xs font-black tracking-wider border shadow-sm',
                          tierCfg.badgeBg,
                          tierCfg.badgeText,
                          tierCfg.badgeBorder,
                        )}
                      >
                        {buddy.tier}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-bold border',
                          roleCfg.bg,
                          roleCfg.text,
                          roleCfg.border,
                        )}
                      >
                        <RoleIcon size={12} />
                        <span>{buddy.role}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {isOwned ? (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold">
                            {qty >= 5 ? '5+' : qty} Owned
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBuddyQuantity(buddy.id, 1)}
                          className="rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-mh-slate-400 hover:border-mh-gold-500 hover:text-mh-gold-300 transition-colors"
                        >
                          + Collect
                        </button>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-mh-slate-200 leading-relaxed font-medium">
                        {buddy.core_passive || <span className="text-mh-slate-600 italic">—</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer Tip Banner ── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-mh-slate-800/80 bg-mh-slate-950/60 p-4 text-xs text-mh-slate-400">
        <Info size={16} className="text-mh-gold-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-mh-slate-300">Hunter Collection:</span> Click the quantity count ball on any companion card or table row to quickly update how many copies you own (up to 5+).
        </p>
      </div>

      {/* ── Detail Modal ── */}
      <BuddyModal
        buddy={inspectedBuddy}
        open={inspectedBuddy !== null}
        collectionEntry={inspectedBuddy ? collectionMap[inspectedBuddy.id] : undefined}
        challenge={inspectedBuddy ? getBuddyChallenge(challenges, inspectedBuddy.id) : undefined}
        onSetQuantity={(qty) => inspectedBuddy && setBuddyQuantity(inspectedBuddy.id, qty)}
        onRemoveFromCollection={() => inspectedBuddy && removeBuddyFromCollection(inspectedBuddy.id)}
        onAddChallenge={handleAddChallenge}
        onClose={() => setInspectedBuddy(null)}
      />

      {/* ── Login Modal for Guest Hunters ── */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
