// ─────────────────────────────────────────────────────────────
// SkillGameRosterView — skill × game assignment matrix
// Allows admins to quickly toggle games and adjust per-game max level.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Search, RefreshCw, Check, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import {
  type DBSkill,
  useToggleSkillGame,
  useUpdateSkillMaxLevel,
} from '../../../hooks/useAdminSkills';
import {
  CATEGORY_CONFIG,
  CATEGORY_OPTIONS,
  GAME_OPTIONS,
} from './SkillEditModal';
import { cn } from '../../../lib/utils';

interface Props {
  skills: DBSkill[];
  isLoading: boolean;
  onRefetch: () => void;
}

type SortKey = 'name' | 'category' | 'mhn_level' | 'mho_level';
type SortDir = 'asc' | 'desc';

// ── Per-game cell component ──────────────────────────────────
function GameSkillCell({
  skill,
  game,
}: {
  skill: DBSkill;
  game: typeof GAME_OPTIONS[number];
}) {
  const toggleGame = useToggleSkillGame();
  const updateMaxLevel = useUpdateSkillMaxLevel();

  const inGame = skill.games.includes(game.value);
  const maxLevel = skill.max_levels[game.value] ?? 5;
  const isPending = toggleGame.isPending || updateMaxLevel.isPending;

  function handleToggle() {
    const newGames = inGame
      ? skill.games.filter((g) => g !== game.value)
      : [...new Set([...skill.games, game.value])];

    const newMaxLevels = { ...skill.max_levels };
    if (!inGame && !newMaxLevels[game.value]) {
      newMaxLevels[game.value] = 5;
    }

    toggleGame.mutate({
      id: skill.id,
      newGames,
      newMaxLevels,
    });
  }

  function handleLevelChange(newLevel: number) {
    if (newLevel < 1 || newLevel > 10) return;
    updateMaxLevel.mutate({
      id: skill.id,
      game: game.value,
      level: newLevel,
      currentMaxLevels: skill.max_levels,
    });
  }

  const styles = {
    blue: {
      on: 'bg-blue-500/20 text-blue-300 ring-blue-500/40 hover:bg-blue-500/10',
      off: 'bg-mh-slate-800 text-mh-slate-500 ring-mh-slate-700 hover:ring-blue-500/40 hover:text-blue-400',
    },
    orange: {
      on: 'bg-orange-500/20 text-orange-300 ring-orange-500/40 hover:bg-orange-500/10',
      off: 'bg-mh-slate-800 text-mh-slate-500 ring-mh-slate-700 hover:ring-orange-500/40 hover:text-orange-400',
    },
  } as const;

  const s = styles[game.color];
  const cls = inGame ? s.on : s.off;

  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={inGame ? `Remove from ${game.label}` : `Add to ${game.label}`}
        className={cn(
          'flex w-28 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5',
          'text-xs font-semibold ring-1 transition-all duration-150',
          cls,
          isPending && 'cursor-wait opacity-60',
        )}
      >
        {isPending ? (
          <RefreshCw size={12} className="animate-spin" />
        ) : inGame ? (
          <Check size={12} className="shrink-0" />
        ) : (
          <Plus size={12} className="shrink-0" />
        )}
        {inGame ? 'In Game' : 'Add'}
      </button>

      {/* Inline Max Level Selector when skill is in game */}
      {inGame && (
        <div className="flex items-center gap-1 bg-mh-slate-800/80 px-2 py-0.5 rounded-md border border-mh-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-mh-slate-400">Max:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                disabled={isPending}
                onClick={() => handleLevelChange(lvl)}
                className={cn(
                  'h-5 w-5 rounded text-[11px] font-bold transition-colors',
                  maxLevel === lvl
                    ? game.color === 'blue'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-orange-500 text-white shadow-sm'
                    : 'text-mh-slate-400 hover:bg-mh-slate-700 hover:text-mh-slate-200',
                )}
              >
                {lvl}
              </button>
            ))}
            <select
              value={maxLevel > 5 ? maxLevel : ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val) handleLevelChange(val);
              }}
              className={cn(
                'h-5 rounded border border-mh-slate-700 bg-mh-slate-900 px-1 text-[10px] font-bold outline-none',
                maxLevel > 5 ? (game.color === 'blue' ? 'text-blue-400' : 'text-orange-400') : 'text-mh-slate-500',
              )}
            >
              <option value="" disabled>6+</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillGameRosterView({ skills, isLoading, onRefetch }: Props) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'' | 'skill' | 'set'>('');
  const [filterUnassigned, setFilterUnassigned] = useState<'' | 'not-mhn' | 'not-mho'>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const activeSkills = useMemo(
    () => skills.filter((s) => s.is_active),
    [skills],
  );

  const filtered = useMemo(() => {
    let list = [...activeSkills];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.name_ja ?? '').includes(q),
      );
    }
    if (filterCategory) {
      list = list.filter((s) => s.category === filterCategory);
    }
    if (filterType === 'skill') {
      list = list.filter((s) => !s.is_set_bonus);
    }
    if (filterType === 'set') {
      list = list.filter((s) => s.is_set_bonus);
    }
    if (filterUnassigned === 'not-mhn') {
      list = list.filter((s) => !s.games.includes('mhn'));
    }
    if (filterUnassigned === 'not-mho') {
      list = list.filter((s) => !s.games.includes('mho'));
    }

    list.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortKey === 'name') {
        av = a.name;
        bv = b.name;
      } else if (sortKey === 'category') {
        av = a.category;
        bv = b.category;
      } else if (sortKey === 'mhn_level') {
        av = a.games.includes('mhn') ? (a.max_levels.mhn ?? 0) : -1;
        bv = b.games.includes('mhn') ? (b.max_levels.mhn ?? 0) : -1;
      } else if (sortKey === 'mho_level') {
        av = a.games.includes('mho') ? (a.max_levels.mho ?? 0) : -1;
        bv = b.games.includes('mho') ? (b.max_levels.mho ?? 0) : -1;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [activeSkills, search, filterCategory, filterType, filterUnassigned, sortKey, sortDir]);

  const mhnCount = activeSkills.filter((s) => s.games.includes('mhn')).length;
  const mhoCount = activeSkills.filter((s) => s.games.includes('mho')).length;

  const skillsMap = useMemo(
    () => new Map(skills.map((s) => [s.id, s])),
    [skills],
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
    ) : (
      <span className="w-[13px]" />
    );

  const thCls = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mh-slate-500 select-none';
  const thBtnCls = 'flex items-center gap-1 hover:text-mh-slate-300 transition-colors cursor-pointer';

  return (
    <div className="flex h-full flex-col">
      {/* ── Filter Toolbar ── */}
      <div className="shrink-0 border-b border-mh-slate-700/80 bg-mh-slate-900/40 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Game summary pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 ring-1 ring-blue-500/30">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span>MHN:</span>
              <span className="font-bold">{mhnCount}</span> skills
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 ring-1 ring-orange-500/30">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              <span>MHO:</span>
              <span className="font-bold">{mhoCount}</span> skills
            </div>
            <span className="text-xs text-mh-slate-600">
              {filtered.length} of {activeSkills.length} shown
            </span>
          </div>

          <button
            onClick={onRefetch}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs font-medium text-mh-slate-400 hover:bg-mh-slate-700 hover:text-mh-slate-200 transition-colors"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Filter row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-9 pr-3 text-xs text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as '' | 'skill' | 'set')}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1.5 text-xs text-mh-slate-300 outline-none"
          >
            <option value="">All Types</option>
            <option value="skill">Skills Only</option>
            <option value="set">Set Bonuses Only</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1.5 text-xs text-mh-slate-300 outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>

          <select
            value={filterUnassigned}
            onChange={(e) => setFilterUnassigned(e.target.value as '' | 'not-mhn' | 'not-mho')}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1.5 text-xs text-mh-slate-300 outline-none"
          >
            <option value="">All Assignments</option>
            <option value="not-mhn">Missing from MHN</option>
            <option value="not-mho">Missing from MHO</option>
          </select>
        </div>
      </div>

      {/* ── Matrix Table ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-mh-slate-700 bg-mh-slate-900/95 backdrop-blur-sm">
            <tr>
              <th className={cn(thCls, 'w-64')}>
                <button onClick={() => handleSort('name')} className={thBtnCls}>
                  Skill / Set Name <SortIcon k="name" />
                </button>
              </th>
              <th className={cn(thCls, 'w-36')}>
                <button onClick={() => handleSort('category')} className={thBtnCls}>
                  Category <SortIcon k="category" />
                </button>
              </th>
              <th className={cn(thCls, 'text-center w-52')}>
                <div className="flex items-center justify-center gap-1 text-blue-400">
                  <button onClick={() => handleSort('mhn_level')} className={thBtnCls}>
                    Monster Hunter Now (MHN) <SortIcon k="mhn_level" />
                  </button>
                </div>
              </th>
              <th className={cn(thCls, 'text-center w-52')}>
                <div className="flex items-center justify-center gap-1 text-orange-400">
                  <button onClick={() => handleSort('mho_level')} className={thBtnCls}>
                    MH Outlanders (MHO) <SortIcon k="mho_level" />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mh-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-mh-slate-500">
                  No skills or sets matching the filters.
                </td>
              </tr>
            ) : (
              filtered.map((skill) => {
                const categoryCfg = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.general;
                const CatIcon = categoryCfg.icon;

                return (
                  <tr
                    key={skill.id}
                    className="group hover:bg-mh-slate-800/40 transition-colors"
                  >
                    {/* Skill info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          skill.is_set_bonus
                            ? 'border-mh-gold-500/40 bg-mh-gold-500/10 text-mh-gold-400'
                            : `${categoryCfg.bg} ${categoryCfg.text} ${categoryCfg.border}`,
                        )}>
                          <CatIcon size={15} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-sm text-mh-slate-200 group-hover:text-white">
                              {skill.name}
                            </span>
                            {skill.is_set_bonus && (
                              <span className="rounded bg-mh-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                                Set Bonus
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-mh-slate-500">
                            {skill.id}
                          </p>

                          {/* Set Bonus Tier Pills */}
                          {skill.is_set_bonus && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {(skill.set_thresholds || []).map((t, idx) => {
                                const granted = t.granted_skill_id ? skillsMap.get(t.granted_skill_id) : null;
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded bg-mh-gold-500/10 px-1.5 py-0.5 text-[9px] text-mh-gold-300 border border-mh-gold-500/25"
                                  >
                                    <span className="font-bold text-mh-gold-400">{t.pieces} pcs:</span>
                                    {granted ? (
                                      <span className="font-medium text-mh-slate-200">+{t.granted_skill_level || 1} {granted.name}</span>
                                    ) : t.description ? (
                                      <span className="text-mh-slate-300 italic">{t.description}</span>
                                    ) : (
                                      <span>Tier {idx + 1}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border',
                        categoryCfg.bg,
                        categoryCfg.text,
                        categoryCfg.border,
                      )}>
                        <CatIcon size={12} />
                        {categoryCfg.label}
                      </span>
                    </td>

                    {/* MHN Column */}
                    <td className="px-4 py-3 text-center">
                      <GameSkillCell skill={skill} game={GAME_OPTIONS[0]} />
                    </td>

                    {/* MHO Column */}
                    <td className="px-4 py-3 text-center">
                      <GameSkillCell skill={skill} game={GAME_OPTIONS[1]} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
