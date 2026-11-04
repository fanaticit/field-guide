// ─────────────────────────────────────────────────────────────
// SkillManager — detailed table (one row per skill level) with search,
// category filter, sorting and edit actions
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Search, Plus, RefreshCw, ChevronUp, ChevronDown,
  Edit2, Trash2,
} from 'lucide-react';
import {
  useAdminSkills,
  useToggleSkillActive,
  useDeleteSkill,
  type DBSkill,
} from '../../../hooks/useAdminSkills';
import SkillEditModal, {
  CATEGORY_CONFIG,
  CATEGORY_OPTIONS,
} from './SkillEditModal';
import { cn } from '../../../lib/utils';

type SortKey = 'name' | 'category' | 'level';
type SortDir = 'asc' | 'desc';

function LevelPills({ skill }: { skill: DBSkill }) {
  const { level, max_levels: maxLevel, is_set_bonus: isSetBonus } = skill;
  return (
    <span className="text-[11px] font-semibold tabular-nums text-mh-slate-300">
      {isSetBonus ? maxLevel + ' tiers' : 'Lv ' + level + ' / ' + maxLevel}
    </span>
  );
}

function ActiveToggle({ skill }: { skill: DBSkill }) {
  const toggle = useToggleSkillActive();
  return (
    <button
      onClick={() => toggle.mutate({ id: skill.id, isActive: !skill.is_active })}
      disabled={toggle.isPending}
      title={skill.is_active ? 'Deactivate' : 'Activate'}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        skill.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
        toggle.isPending && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          skill.is_active ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function AddSkillButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors shadow-sm"
    >
      <Plus size={14} />
      Add Skill or Set
    </button>
  );
}

export default function SkillManager() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'' | 'skill' | 'set'>('');
  const [filterActive, setFilterActive] = useState<'' | 'active' | 'inactive'>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editSkill, setEditSkill] = useState<DBSkill | null | 'new'>(null);

  const { data: skills = [], isLoading, refetch } = useAdminSkills();
  const remove = useDeleteSkill();

  const filtered = useMemo(() => {
    let list = [...skills];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.name_ja ?? '').toLowerCase().includes(q),
      );
    }
    if (filterCategory) list = list.filter((s) => s.category === filterCategory);
    if (filterType === 'skill') list = list.filter((s) => !s.is_set_bonus);
    if (filterType === 'set') list = list.filter((s) => s.is_set_bonus);
    if (filterActive === 'active') list = list.filter((s) => s.is_active);
    if (filterActive === 'inactive') list = list.filter((s) => !s.is_active);

    list.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortKey === 'name') {
        av = a.name;
        bv = b.name;
      } else if (sortKey === 'category') {
        av = a.category;
        bv = b.category;
      } else if (sortKey === 'level') {
        av = a.level;
        bv = b.level;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return a.name.localeCompare(b.name) || a.level - b.level;
    });

    return list;
  }, [skills, search, filterCategory, filterType, filterActive, sortKey, sortDir]);

  const activeCount = skills.filter((s) => s.is_active).length;
  const inactiveCount = skills.length - activeCount;
  const setBonusCount = skills.filter((s) => s.is_set_bonus).length;
  const standardSkillCount = skills.length - setBonusCount;

  const categoryOptions = useMemo(
    () => [...new Set([...CATEGORY_OPTIONS, ...skills.map((s) => s.category)])],
    [skills],
  );

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

  // ── List View ──
  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-mh-slate-300">
              <span className="font-bold text-mh-slate-100">{skills.length}</span> items
              <span className="text-xs text-mh-slate-500 ml-1.5">
                ({standardSkillCount} skills, {setBonusCount} sets)
              </span>
            </span>
            <span className="text-green-400">
              <span className="font-semibold">{activeCount}</span> active
            </span>
            {inactiveCount > 0 && (
              <span className="text-mh-slate-600">
                <span className="font-semibold">{inactiveCount}</span> inactive
              </span>
            )}
            {filtered.length !== skills.length && (
              <span className="text-mh-gold-400 text-xs">{filtered.length} shown</span>
            )}
          </div>

          <AddSkillButton onAdd={() => setEditSkill('new')} />
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills & sets…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as '' | 'skill' | 'set')}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All Types</option>
            <option value="skill">Skills Only</option>
            <option value="set">Set Bonuses Only</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat]?.label ?? cat}
              </option>
            ))}
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as '' | 'active' | 'inactive')}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs font-medium text-mh-slate-400 hover:bg-mh-slate-700 hover:text-mh-slate-200 transition-colors"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-mh-slate-700 bg-mh-slate-900/95 backdrop-blur-sm">
            <tr>
              <th className={cn(thCls, 'w-10')}>Active</th>
              <th className={cn(thCls, 'min-w-[220px]')}>
                <button onClick={() => handleSort('name')} className={thBtnCls}>
                  Skill / Set Name <SortIcon k="name" />
                </button>
              </th>
              <th className={cn(thCls, 'w-36')}>
                <button onClick={() => handleSort('category')} className={thBtnCls}>
                  Category <SortIcon k="category" />
                </button>
              </th>
              <th className={cn(thCls, 'w-36')}>
                <button onClick={() => handleSort('level')} className={thBtnCls}>
                  Level / Max <SortIcon k="level" />
                </button>
              </th>
              <th className={cn(thCls, 'w-24 text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mh-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-mh-slate-500">
                  No skills or sets found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map((skill) => {
                const categoryCfg = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.general;
                const CatIcon = categoryCfg.icon;

                return (
                  <tr
                    key={skill.id}
                    className={cn(
                      'group hover:bg-mh-slate-800/40 transition-colors',
                      !skill.is_active && 'opacity-50 bg-mh-slate-900/20',
                    )}
                  >
                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <ActiveToggle skill={skill} />
                    </td>

                    {/* Name + ID + Set Badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                            skill.is_set_bonus
                              ? 'border-mh-gold-500/40 bg-mh-gold-500/10 text-mh-gold-400'
                              : `${categoryCfg.bg} ${categoryCfg.text} ${categoryCfg.border}`,
                          )}
                        >
                          {skill.icon ? (
                            <img src={skill.icon} alt="" className="h-6 w-6 object-contain" loading="lazy" />
                          ) : (
                            <CatIcon size={16} />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-mh-slate-100 group-hover:text-mh-gold-400 transition-colors">
                              {skill.name}
                            </span>
                            {skill.is_set_bonus && (
                              <span className="rounded bg-mh-gold-500/15 px-1.5 py-0.5 text-[10px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                                Set Bonus
                              </span>
                            )}
                            {skill.name_ja && (
                              <span className="text-[11px] text-mh-slate-500">
                                ({skill.name_ja})
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-mh-slate-500">
                            {skill.id}
                          </span>

                          {/* Set Bonus Tier Pills */}
                          {skill.is_set_bonus && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {(skill.set_thresholds || []).map((t, idx) => {
                                const granted = t.granted_skill_id ? skillsMap.get(t.granted_skill_id) : null;
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded bg-mh-gold-500/10 px-2 py-0.5 text-[10px] text-mh-gold-300 border border-mh-gold-500/25"
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

                    {/* Category badge */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border',
                          categoryCfg.bg,
                          categoryCfg.text,
                          categoryCfg.border,
                        )}
                      >
                        <CatIcon size={12} />
                        {categoryCfg.label}
                      </span>
                    </td>

                    {/* Level / max level */}
                    <td className="px-4 py-3">
                      <LevelPills skill={skill} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditSkill(skill)}
                          title="Edit skill"
                          className="rounded p-1.5 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-mh-slate-200 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${skill.name}"?`)) {
                              remove.mutate(skill.id);
                            }
                          }}
                          title="Delete skill"
                          className="rounded p-1.5 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <SkillEditModal
        skill={editSkill === 'new' ? null : editSkill}
        open={editSkill !== null}
        onClose={() => setEditSkill(null)}
      />
    </div>
  );
}
