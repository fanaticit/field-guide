// ─────────────────────────────────────────────────────────────
// WeaponEquipmentManager — Admin weapons list (one row per weapon from the game data)
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, Edit2, Trash2, EyeOff } from 'lucide-react';
import {
  useAdminWeapons,
  useAdminWeaponTypes,
  useDeleteWeapon,
  useToggleWeaponActive,
  useToggleWeaponSpoiler,
} from '../../../hooks/useAdminWeapons';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import {
  WEAPON_ELEMENT_CONFIG,
  WEAPON_SHARPNESS_ICONS,
  WEAPON_SOURCE_CONFIG,
  getRarityBadgeStyle,
  getWeaponMaxName,
  type DBWeapon,
  type WeaponElementType,
  type WeaponSourceType,
} from '../../../data/schemas/weapon';
import WeaponEditModal from './WeaponEditModal';
import { cn } from '../../../lib/utils';
import ElementIcon from '../../../components/ElementIcon';

const selectCls =
  'rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none';
const thCls = 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mh-slate-500 select-none';

function Switch({ checked, onChange, title }: { checked: boolean; onChange: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      title={title}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-green-500' : 'bg-mh-slate-700',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function WeaponEquipmentManager() {
  const { data: weapons = [], isLoading, refetch } = useAdminWeapons();
  const { data: monsters = [] } = useAdminMonsters();
  const { data: weaponTypes = [] } = useAdminWeaponTypes();
  const toggleActive = useToggleWeaponActive();
  const toggleSpoiler = useToggleWeaponSpoiler();
  const remove = useDeleteWeapon();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterElement, setFilterElement] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [editWeapon, setEditWeapon] = useState<DBWeapon | null | 'new'>(null);

  const monstersById = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const typesById = useMemo(() => new Map(weaponTypes.map((t) => [t.id, t])), [weaponTypes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return weapons.filter((w) => {
      if (filterType && w.weapon_type_id !== filterType) return false;
      if (filterElement && w.element_type !== filterElement) return false;
      if (filterSource && w.source_type !== filterSource) return false;
      if (filterStatus && w.status !== filterStatus) return false;
      if (filterVisibility === 'visible' && !(w.is_active && !w.is_spoiler)) return false;
      if (filterVisibility === 'hidden' && w.is_active) return false;
      if (filterVisibility === 'spoiler' && !w.is_spoiler) return false;
      if (!q) return true;
      const monsterName = w.monster_id ? monstersById.get(w.monster_id)?.name ?? '' : '';
      const maxName = getWeaponMaxName(w);
      return (
        w.id.includes(q) ||
        w.name.toLowerCase().includes(q) ||
        maxName.toLowerCase().includes(q) ||
        (w.series ?? '').toLowerCase().includes(q) ||
        monsterName.toLowerCase().includes(q)
      );
    });
  }, [weapons, search, filterType, filterElement, filterSource, filterStatus, filterVisibility, monstersById]);

  const spoilerCount = weapons.filter((w) => w.is_spoiler).length;
  const hiddenCount = weapons.filter((w) => !w.is_active).length;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-mh-slate-300">
            <span><span className="font-bold text-mh-slate-100">{weapons.length}</span> weapons</span>
            {spoilerCount > 0 && <span className="text-xs text-amber-400">{spoilerCount} spoilers</span>}
            {hiddenCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-mh-slate-500"><EyeOff size={12} /> {hiddenCount} hidden</span>
            )}
            {filtered.length !== weapons.length && <span className="text-xs text-mh-gold-400">{filtered.length} shown</span>}
          </div>
          <button
            onClick={() => setEditWeapon('new')}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-2 text-xs font-bold text-mh-slate-950 shadow-sm hover:bg-mh-gold-400"
          >
            <Plus size={14} /> Add Weapon
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search id, name, series or monster…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
            <option value="">All types</option>
            {weaponTypes.filter((t) => weapons.some((w) => w.weapon_type_id === t.id)).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={filterElement} onChange={(e) => setFilterElement(e.target.value)} className={selectCls}>
            <option value="">All elements</option>
            {(Object.keys(WEAPON_ELEMENT_CONFIG) as WeaponElementType[]).map((el) => (
              <option key={el} value={el}>{WEAPON_ELEMENT_CONFIG[el].label}</option>
            ))}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className={selectCls}>
            <option value="">All sources</option>
            {(Object.keys(WEAPON_SOURCE_CONFIG) as WeaponSourceType[]).map((s) => (
              <option key={s} value={s}>{WEAPON_SOURCE_CONFIG[s].label}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="">Any game status</option>
            <option value="in_game">In game</option>
            <option value="not_in_game">Not in game</option>
          </select>
          <select value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value)} className={selectCls}>
            <option value="">All visibility</option>
            <option value="visible">Visible to everyone</option>
            <option value="spoiler">Spoilers</option>
            <option value="hidden">Hidden</option>
          </select>
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
              <th className={thCls}>Active</th>
              <th className={thCls}>Spoiler</th>
              <th className={cn(thCls, 'min-w-[220px]')}>Weapon</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Rarity</th>
              <th className={thCls}>Monster</th>
              <th className={thCls}>Attack</th>
              <th className={thCls}>Element</th>
              <th className={thCls}>Source</th>
              <th className={thCls}>Game status</th>
              <th className={cn(thCls, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mh-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-sm text-mh-slate-500">
                  {isLoading ? 'Loading…' : 'No weapons match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((w) => {
                const rStyle = getRarityBadgeStyle(w.rarity);
                const el = WEAPON_ELEMENT_CONFIG[w.element_type];
                const src = WEAPON_SOURCE_CONFIG[w.source_type];
                return (
                  <tr key={w.id} className={cn('group transition-colors hover:bg-mh-slate-800/40', !w.is_active && 'opacity-50')}>
                    <td className="px-3 py-2">
                      <Switch checked={w.is_active} title="Active in Field Guide" onChange={() => toggleActive.mutate({ id: w.id, isActive: !w.is_active })} />
                    </td>
                    <td className="px-3 py-2">
                      <Switch checked={w.is_spoiler} title="Mark as spoiler" onChange={() => toggleSpoiler.mutate({ id: w.id, isSpoiler: !w.is_spoiler })} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {w.image ? (
                          <img src={w.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 object-contain" />
                        ) : (
                          <span className="h-10 w-10 shrink-0 rounded border border-dashed border-mh-slate-700" />
                        )}
                        <div>
                          <div className="text-sm font-semibold text-mh-slate-100">{w.name}</div>
                          {getWeaponMaxName(w) !== w.name && (
                            <div className="text-[10px] text-mh-gold-400">Max: {getWeaponMaxName(w)}</div>
                          )}
                          <div className="text-[11px] text-mh-slate-500">{w.series ?? '—'}</div>
                          <div className="font-mono text-[10px] text-mh-slate-600">{w.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-mh-slate-300">{typesById.get(w.weapon_type_id)?.name ?? w.weapon_type_id}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded border px-2 py-0.5 text-xs font-bold', rStyle.bg, rStyle.text, rStyle.border)}>{rStyle.label}</span>
                      <span className="ml-1 text-[10px] text-mh-slate-500">→ R{w.max_rarity}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-mh-slate-300">{w.monster_id ? monstersById.get(w.monster_id)?.name ?? w.monster_id : '—'}</td>
                    <td className="px-3 py-2 text-xs text-mh-slate-200">
                      {w.attack ?? '—'}
                      {w.sharpness && WEAPON_SHARPNESS_ICONS[w.sharpness] && (
                        <img src={WEAPON_SHARPNESS_ICONS[w.sharpness]} alt={w.sharpness} className="ml-1.5 inline h-3 w-auto" />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px]', el.bg, el.text, el.border)}>
                        <ElementIcon element={w.element_type} size={12} />
                        {el.label}{w.element_damage ? ` ${w.element_damage}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', src.bg, src.text, src.border)} title={w.source_detail ?? undefined}>
                        {src.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {w.status === 'in_game' ? (
                        <span className="text-emerald-400">In game</span>
                      ) : (
                        <span className="text-amber-400" title={w.status_reason ?? undefined}>
                          Not in game{w.status_reason ? ` — ${w.status_reason}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditWeapon(w)} title="Edit" className="rounded p-1.5 text-mh-slate-400 transition-colors hover:bg-mh-slate-700 hover:text-mh-slate-200">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete weapon ${w.name} (${w.id})?`)) remove.mutate(w.id);
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

      <WeaponEditModal
        weapon={editWeapon === 'new' ? null : editWeapon}
        open={editWeapon !== null}
        onClose={() => setEditWeapon(null)}
        monsters={monsters}
        weaponTypes={weaponTypes}
      />
    </div>
  );
}
