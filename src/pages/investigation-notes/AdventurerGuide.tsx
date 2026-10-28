// ─────────────────────────────────────────────────────────────
// AdventurerGuide — Investigation Notes view for MHO Playable Adventurers with Roster Recruitment Tracking
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  User,
  Search,
  Swords,
  Zap,
  Heart,
  Sparkles,
  LayoutGrid,
  List,
  Plus,
  CheckCircle2,
  Eye,
  Bookmark,
} from 'lucide-react';
import {
  type DBAdventurer,
  type AdventurerRarity,
  ADVENTURER_ROLE_CONFIG,
  ADVENTURER_ROLES,
  ADVENTURER_RARITIES,
  ADVENTURER_RARITY_CONFIG,
  ELEMENT_OPTIONS,
} from '../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { usePublicAdventurers, useUpdateAdventurerWeapon } from '../../hooks/useAdminAdventurers';
import { useUserAdventurerCollection } from '../../hooks/useUserAdventurerCollection';
import {
  useHunterChallenges,
  useAddAdventurerChallenge,
  getAdventurerChallenge,
} from '../../hooks/useHunterChallenges';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';
import AdventurerCard from './AdventurerCard';
import AdventurerModal from './AdventurerModal';
import AdventurerRarityBadge from './AdventurerRarityBadge';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import LoginModal from '../../components/auth/LoginModal';
import { cn } from '../../lib/utils';

type ViewMode = 'grid' | 'table';
const INTRO_HIDDEN_KEY = 'adventurers-intro-hidden';
type OwnershipFilter = 'all' | 'recruited' | 'missing';

const ROLE_ICONS: Record<string, typeof Swords> = {
  Assault: Swords,
  Disrupter: Zap,
  Disruptor: Zap,
  Support: Heart,
};

export default function AdventurerGuide() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | AdventurerRarity>('all');
  const [weaponFilter, setWeaponFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [inspectedAdventurer, setInspectedAdventurer] = useState<DBAdventurer | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { user } = useAuthStore();
  const theme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };

  const { data: adventurers = [], isLoading } = usePublicAdventurers();
  const updateWeaponMutation = useUpdateAdventurerWeapon();
  const { isRecruited, toggleRecruited } = useUserAdventurerCollection();

  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addAdventurerChallenge = useAddAdventurerChallenge();

  const handleAddChallenge = async (adv: DBAdventurer) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    await addAdventurerChallenge.mutateAsync({
      userId: user.id,
      adventurerId: adv.id,
      adventurerName: adv.name,
      pieceImage: adv.image,
      role: adv.role,
      element: adv.element_specialization,
    });
  };

  const defaultAdventurer = useMemo(
    () => adventurers.find((a) => a.is_default),
    [adventurers],
  );

  // Collection & Statistics Metrics
  const metrics = useMemo(() => {
    const total = adventurers.length;
    const recruitedCount = adventurers.filter((a) => isRecruited(a)).length;
    const percent = total > 0 ? Math.round((recruitedCount / total) * 100) : 0;

    const rarity = {} as Record<AdventurerRarity, { total: number; recruited: number }>;
    for (const r of ADVENTURER_RARITIES) {
      const inTier = adventurers.filter((a) => a.rarity === r);
      rarity[r] = { total: inTier.length, recruited: inTier.filter((a) => isRecruited(a)).length };
    }

    return { total, recruitedCount, percent, rarity };
  }, [adventurers, isRecruited]);

  // Filtered roster of all adventurers (including player character)
  const filteredAdventurers = useMemo(() => {
    let list = [...adventurers];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.name_ja ?? '').toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          (a.notes ?? '').toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'all') {
      list = list.filter(
        (a) =>
          a.role === roleFilter ||
          (roleFilter === 'Disrupter' && a.role === 'Disruptor') ||
          (roleFilter === 'Disruptor' && a.role === 'Disrupter'),
      );
    }

    if (elementFilter !== 'all') {
      list = list.filter((a) => a.element_specialization === elementFilter);
    }

    if (rarityFilter !== 'all') {
      list = list.filter((a) => a.rarity === rarityFilter);
    }

    if (weaponFilter !== 'all') {
      list = list.filter(
        (a) =>
          a.is_default ||
          a.weapon_type === weaponFilter ||
          (a.allowed_weapon_types && a.allowed_weapon_types.includes(weaponFilter)),
      );
    }

    if (ownershipFilter === 'recruited') {
      list = list.filter((a) => isRecruited(a));
    } else if (ownershipFilter === 'missing') {
      list = list.filter((a) => !isRecruited(a));
    }

    // Default sorting: player character (is_default) first, then sort_order, then name
    list.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [adventurers, search, roleFilter, elementFilter, rarityFilter, weaponFilter, ownershipFilter, isRecruited]);

  async function handleWeaponSwitch(weaponType: string) {
    if (!defaultAdventurer) return;
    await updateWeaponMutation.mutateAsync({
      id: defaultAdventurer.id,
      weaponType,
    });
  }

  return (
    <div data-rarity-theme={theme} className="challenges-theme px-6 pb-6 pt-2 lg:px-8 lg:pb-8 lg:pt-3 space-y-8 max-w-7xl mx-auto text-white">
      <PageTitlePanel
        icon="/img/ui/Adventurer%20Icon.png"
        title="Adventurers"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Build your roster of playable Outlanders adventurers and keep track of who you've recruited.
            Each adventurer has a combat role, a weapon discipline and an elemental specialty, so a full roster
            gives you more options for your builds. Tap a card to inspect abilities, weapons and lore, mark
            the ones you've recruited, or add the ones you're missing to your Hunter's Challenges
            <span className="text-mh-slate-200 font-semibold"> recruitment list</span> so you know who to aim for.
          </>
        }
      >
        {/* Collection status */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 rounded-xl p-1 border border-[var(--border-subtle)]">
          <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-[var(--theme-accent)]">
              <Bookmark size={10} />
              <span>Recruited</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-sm font-black text-white">{metrics.recruitedCount}</span>
              <span className="text-[10px] text-mh-slate-500">/ {metrics.total}</span>
              <span className="text-[9px] font-bold text-emerald-400 ml-0.5">({metrics.percent}%)</span>
            </div>
          </div>

          {ADVENTURER_RARITIES.map((r) => {
            const cfg = ADVENTURER_RARITY_CONFIG[r];
            const tier = metrics.rarity[r];
            return (
              <div key={r} className="px-2 py-0.5 text-center" title={`${tier.recruited} of ${tier.total} ${cfg.short} adventurers recruited`}>
                <span className="block text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-xs font-bold" style={{ color: cfg.color }}>{tier.recruited}</span>
                  <span className="text-[9px] text-mh-slate-500 font-bold">/ {tier.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PageTitlePanel>

      {/* ── Adventurers Roster ── */}
      <div className="space-y-4">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-mh-gold-400" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
              Adventurer Roster
            </h3>
            <span className="rounded-full bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-xs text-mh-slate-400 font-semibold">
              {filteredAdventurers.length} Adventurers
            </span>
          </div>

          {/* Search, Filters & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search adventurers..."
                className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            {/* Ownership Filter */}
            <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'recruited', label: 'Recruited' },
                  { id: 'missing', label: 'Missing' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOwnershipFilter(opt.id)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                    ownershipFilter === opt.id
                      ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                      : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Role Filter */}
            <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  roleFilter === 'all' ? 'bg-mh-slate-800 text-mh-gold-400' : 'text-mh-slate-400 hover:text-white',
                )}
              >
                All Roles
              </button>
              {ADVENTURER_ROLES.map((r) => {
                const cfg = ADVENTURER_ROLE_CONFIG[r];
                const isSelected = roleFilter === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(isSelected ? 'all' : r)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      isSelected ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.border}` : 'text-mh-slate-400 hover:text-white',
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {/* Element Filter */}
            <select
              value={elementFilter}
              onChange={(e) => setElementFilter(e.target.value)}
              className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
            >
              <option value="all">All Elements</option>
              {Object.values(ELEMENT_OPTIONS).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Rarity Filter */}
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as 'all' | AdventurerRarity)}
              className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
            >
              <option value="all">All Rarities</option>
              {ADVENTURER_RARITIES.map((r) => (
                <option key={r} value={r}>
                  {ADVENTURER_RARITY_CONFIG[r].label}
                </option>
              ))}
            </select>

            {/* Weapon Filter */}
            <select
              value={weaponFilter}
              onChange={(e) => setWeaponFilter(e.target.value)}
              className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
            >
              <option value="all">All Weapons</option>
              {WEAPON_TYPES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-mh-slate-700 bg-mh-slate-850 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-mh-gold-500 text-slate-950 font-bold'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  viewMode === 'table'
                    ? 'bg-mh-gold-500 text-slate-950 font-bold'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Render: Grid vs Table */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="text-xs text-mh-gold-400">Loading adventurers...</span>
          </div>
        ) : filteredAdventurers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
            <User size={36} className="text-mh-slate-600 mb-2" />
            <p className="text-xs font-semibold text-mh-slate-400">No adventurers match your filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdventurers.map((adv) => (
              <AdventurerCard
                key={adv.id}
                adventurer={adv}
                isRecruited={isRecruited(adv)}
                challenge={getAdventurerChallenge(challenges, adv.id)}
                onToggleRecruit={() => toggleRecruited(adv.id)}
                onAddChallenge={handleAddChallenge}
                onClick={() => setInspectedAdventurer(adv)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-md">
            <table className="w-full text-left text-xs text-mh-slate-300">
              <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
                <tr>
                  <th className="py-3 pl-4 pr-2">Adventurer</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Element</th>
                  <th className="px-3 py-3">Weapon Discipline</th>
                  <th className="px-3 py-3 text-center">Recruitment</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mh-slate-800">
                {filteredAdventurers.map((adv) => {
                  const roleKey = (adv.role === 'Disruptor' ? 'Disrupter' : adv.role) as 'Assault' | 'Disrupter' | 'Support';
                  const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
                  const RoleIcon = ROLE_ICONS[roleKey] || Swords;
                  const elemCfg = ELEMENT_OPTIONS[adv.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;
                  const weaponObj = WEAPON_TYPES.find((w) => w.id === adv.weapon_type);
                  const recruited = isRecruited(adv);

                  return (
                    <tr
                      key={adv.id}
                      onClick={() => setInspectedAdventurer(adv)}
                      className={cn(
                        'hover:bg-mh-slate-800/60 cursor-pointer transition-colors',
                        recruited ? 'bg-mh-slate-900/40' : 'opacity-60',
                      )}
                    >
                      {/* Character Info */}
                      <td className="py-3 pl-4 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 rounded-xl bg-mh-slate-800 border border-mh-slate-700 p-1 flex items-center justify-center overflow-hidden">
                            {adv.image ? (
                              <img
                                src={adv.image}
                                alt={adv.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <User size={18} className="text-mh-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-mh-slate-100">{adv.name}</p>
                              <AdventurerRarityBadge rarity={adv.rarity} className="!rounded !px-1.5 !py-0 !text-[9px]" />
                              {adv.is_default && (
                                <span className="rounded bg-mh-gold-500/20 border border-mh-gold-500/40 px-1.5 py-0.2 text-[9px] font-bold text-mh-gold-300 uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            {adv.name_ja && (
                              <p className="text-[10px] text-mh-slate-500">{adv.name_ja}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border', roleCfg.bg, roleCfg.text, roleCfg.border)}>
                          <RoleIcon size={11} />
                          <span>{roleCfg.label}</span>
                        </span>
                      </td>

                      {/* Element */}
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border', elemCfg.bg, elemCfg.text, elemCfg.border)}>
                          <span>{elemCfg.label}</span>
                        </span>
                      </td>

                      {/* Weapon */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('font-semibold', adv.is_default ? 'text-mh-gold-300 font-bold' : 'text-mh-slate-300')}>
                            {weaponObj?.name || adv.weapon_type || '—'}
                          </span>
                          {adv.is_default && (
                            <span className="text-[10px] text-mh-slate-500 font-medium">
                              (Active)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Recruitment Status */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {adv.is_default ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-mh-gold-500/15 border border-mh-gold-500/35 px-2.5 py-0.5 text-[10px] font-bold text-mh-gold-300">
                            <Sparkles size={11} />
                            <span>Default</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleRecruited(adv.id)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-transform hover:scale-105 active:scale-95',
                              recruited
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700 hover:bg-mh-slate-700 hover:text-white',
                            )}
                          >
                            {recruited ? (
                              <>
                                <CheckCircle2 size={11} />
                                <span>Recruited</span>
                              </>
                            ) : (
                              <>
                                <Plus size={11} />
                                <span>Recruit</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setInspectedAdventurer(adv)}
                          className="rounded-lg p-1 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                          title="Inspect character details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {inspectedAdventurer && (
        <AdventurerModal
          adventurer={
            inspectedAdventurer.is_default && defaultAdventurer
              ? defaultAdventurer
              : inspectedAdventurer
          }
          open={Boolean(inspectedAdventurer)}
          onClose={() => setInspectedAdventurer(null)}
          isRecruited={isRecruited(inspectedAdventurer)}
          challenge={getAdventurerChallenge(challenges, inspectedAdventurer.id)}
          onToggleRecruit={() => toggleRecruited(inspectedAdventurer.id)}
          onAddChallenge={handleAddChallenge}
          onSelectWeapon={handleWeaponSwitch}
        />
      )}

      {/* ── Login Modal for Guest Hunters ── */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
