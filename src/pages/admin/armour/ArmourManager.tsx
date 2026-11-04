// ─────────────────────────────────────────────────────────────
// ArmourManager — Admin armour pieces list (one row per piece from the game data)
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import {
  ARMOUR_SLOT_OPTIONS,
  useArmourPieces,
  useDeleteArmourPieceById,
  type ArmourPiece,
} from '../../../hooks/useArmourPieces';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../../hooks/useAdminSkills';
import { getRarityBadgeStyle } from '../../../data/schemas/armour';
import ArmourEditModal, { skillLabel } from './ArmourEditModal';
import { cn } from '../../../lib/utils';

const selectCls =
  'rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none';
const thCls = 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mh-slate-500 select-none';

export default function ArmourManager() {
  const { data: pieces = [], isLoading, refetch } = useArmourPieces();
  const { data: monsters = [] } = useAdminMonsters();
  const { data: skills = [] } = useAdminSkills({ isActive: true, isSetBonus: false });
  const remove = useDeleteArmourPieceById();

  const [search, setSearch] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterSlot, setFilterSlot] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [editPiece, setEditPiece] = useState<ArmourPiece | null | 'new'>(null);

  const monstersById = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const skillsById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const setOptions = useMemo(
    () => [...new Set(pieces.map((p) => p.set_name).filter((n): n is string => !!n))].sort(),
    [pieces],
  );
  const rarityOptions = useMemo(
    () => [...new Set(pieces.map((p) => p.rarity))].sort((a, b) => a - b),
    [pieces],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pieces.filter((p) => {
      if (filterSet && p.set_name !== filterSet) return false;
      if (filterSlot && p.slot !== filterSlot) return false;
      if (filterRarity && p.rarity !== Number(filterRarity)) return false;
      if (onlyUnlinked && monstersById.has(p.monster_id)) return false;
      if (!q) return true;
      const monsterName = monstersById.get(p.monster_id)?.name ?? p.monster_id;
      return (
        p.id.includes(q) ||
        (p.set_name ?? '').toLowerCase().includes(q) ||
        monsterName.toLowerCase().includes(q) ||
        p.skills.some((id) => skillLabel(skillsById.get(id), id).toLowerCase().includes(q))
      );
    });
  }, [pieces, search, filterSet, filterSlot, filterRarity, onlyUnlinked, monstersById, skillsById]);

  const unlinkedCount = pieces.filter((p) => !monstersById.has(p.monster_id)).length;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-mh-slate-300">
            <span>
              <span className="font-bold text-mh-slate-100">{pieces.length}</span> armour pieces
            </span>
            {unlinkedCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle size={12} /> {unlinkedCount} not linked to a monster
              </span>
            )}
            {filtered.length !== pieces.length && (
              <span className="text-xs text-mh-gold-400">{filtered.length} shown</span>
            )}
          </div>
          <button
            onClick={() => setEditPiece('new')}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-2 text-xs font-bold text-mh-slate-950 shadow-sm hover:bg-mh-gold-400"
          >
            <Plus size={14} /> Add Armour Piece
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search id, set, monster or skill…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>
          <select value={filterSet} onChange={(e) => setFilterSet(e.target.value)} className={selectCls}>
            <option value="">All sets</option>
            {setOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)} className={selectCls}>
            <option value="">All slots</option>
            {ARMOUR_SLOT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)} className={selectCls}>
            <option value="">All rarities</option>
            {rarityOptions.map((r) => (
              <option key={r} value={r}>R{r}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-mh-slate-400">
            <input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} />
            Unlinked monsters only
          </label>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs font-medium text-mh-slate-400 hover:bg-mh-slate-700 hover:text-mh-slate-200"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 border-b border-mh-slate-700 bg-mh-slate-900/95 backdrop-blur-sm">
            <tr>
              <th className={thCls}>Icons</th>
              <th className={thCls}>Set / Slot</th>
              <th className={thCls}>Rarity</th>
              <th className={thCls}>Monster</th>
              <th className={cn(thCls, 'min-w-[260px]')}>Skills</th>
              <th className={thCls}>Set bonus</th>
              <th className={thCls}>Deco</th>
              <th className={cn(thCls, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mh-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-mh-slate-500">
                  {isLoading ? 'Loading…' : 'No armour pieces match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const monster = monstersById.get(p.monster_id);
                const rStyle = getRarityBadgeStyle(p.rarity);
                return (
                  <tr key={p.id} className={cn('group transition-colors hover:bg-mh-slate-800/40', !p.is_active && 'opacity-50')}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {[p.icon_m, p.icon_f].map((src, i) =>
                          src ? (
                            <img key={i} src={src} alt="" loading="lazy" className="h-10 w-10 object-contain" />
                          ) : (
                            <span key={i} className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-mh-slate-700 text-[9px] text-mh-slate-600">
                              {i === 0 ? 'M' : 'F'}
                            </span>
                          ),
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-semibold text-mh-slate-100">
                        {p.set_name ?? '—'} <span className="text-mh-gold-400">{p.set_variant}</span>
                      </div>
                      <div className="text-[11px] text-mh-slate-400">{p.slot}</div>
                      <div className="font-mono text-[10px] text-mh-slate-600">{p.id}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded border px-2 py-0.5 text-xs font-bold', rStyle.bg, rStyle.text, rStyle.border)}>
                        {rStyle.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {monster ? (
                        <span className="text-mh-slate-200">{monster.name}</span>
                      ) : (
                        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-300" title="Not linked to a monster yet">
                          {p.monster_id}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {p.skills.length === 0 && <span className="text-xs text-mh-slate-600">—</span>}
                        {p.skills.map((id) => {
                          const sk = skillsById.get(id);
                          return (
                            <span
                              key={id}
                              title={id}
                              className={cn(
                                'rounded border px-1.5 py-0.5 text-[11px]',
                                sk ? 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-200' : 'border-red-500/40 bg-red-500/10 text-red-300',
                              )}
                            >
                              {skillLabel(sk, id)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-mh-gold-300">
                      {p.set_bonus ? (
                        <span title={p.set_bonus.skill_id}>
                          {p.set_bonus.pieces}pc: {skillLabel(skillsById.get(p.set_bonus.skill_id), p.set_bonus.skill_id)}
                        </span>
                      ) : (
                        <span className="text-mh-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-mh-slate-300">{p.deco_slots.join(' ') || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditPiece(p)}
                          title="Edit"
                          className="rounded p-1.5 text-mh-slate-400 transition-colors hover:bg-mh-slate-700 hover:text-mh-slate-200"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete armour piece ${p.id} (${p.set_name} ${p.set_variant} ${p.slot})?`)) {
                              remove.mutate(p.id);
                            }
                          }}
                          title="Delete"
                          className="rounded p-1.5 text-mh-slate-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
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

      <ArmourEditModal
        piece={editPiece === 'new' ? null : editPiece}
        open={editPiece !== null}
        onClose={() => setEditPiece(null)}
        monsters={monsters}
        skills={skills}
      />
    </div>
  );
}
