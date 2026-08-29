// ─────────────────────────────────────────────────────────────
// Monster Edit / Create Modal
// Full-featured form for every monster attribute.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { type DBMonster, type MonsterUpsert, useUpsertMonster, useDeleteMonster, useBaseMonsters } from '../../../hooks/useAdminMonsters';
import { cn } from '../../../lib/utils';

// ── Constants ────────────────────────────────────────────────
const SPECIES_OPTIONS = [
  { value: 'flying_wyvern',  label: 'Flying Wyvern' },
  { value: 'brute_wyvern',   label: 'Brute Wyvern' },
  { value: 'bird_wyvern',    label: 'Bird Wyvern' },
  { value: 'fanged_wyvern',  label: 'Fanged Wyvern' },
  { value: 'fanged_beast',   label: 'Fanged Beast' },
  { value: 'leviathan',      label: 'Leviathan' },
  { value: 'elder_dragon',   label: 'Elder Dragon' },
  { value: 'piscine_wyvern', label: 'Piscine Wyvern' },
  { value: 'carapaceon',     label: 'Carapaceon' },
  { value: 'temnoceran',     label: 'Temnoceran' },
  { value: 'neopteron',      label: 'Neopteron' },
];

const TIER_OPTIONS = [
  { value: 'low',   label: 'Low Rank' },
  { value: 'high',  label: 'High Rank' },
  { value: 'elder', label: 'Elder / Master Rank' },
  { value: 'small', label: 'Small / Starter' },
  { value: 'collab', label: 'Collab / Event' },
];

const ELEMENT_OPTIONS = ['fire', 'water', 'thunder', 'ice', 'dragon'];
const STATUS_OPTIONS  = ['poison', 'sleep', 'paralysis', 'blast', 'stun'];

const GAME_OPTIONS = [
  { value: 'mhn', label: 'Monster Hunter Now',        color: 'blue'   },
  { value: 'mho', label: 'Monster Hunter Outlanders', color: 'orange' },
];

const ELEMENT_COLORS: Record<string, string> = {
  fire:      'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  water:     'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  thunder:   'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30',
  ice:       'bg-cyan-500/20 text-cyan-300 ring-cyan-500/30',
  dragon:    'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  poison:    'bg-green-500/20 text-green-300 ring-green-500/30',
  sleep:     'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
  paralysis: 'bg-yellow-400/20 text-yellow-200 ring-yellow-400/30',
  blast:     'bg-red-500/20 text-red-300 ring-red-500/30',
  stun:      'bg-amber-500/20 text-amber-300 ring-amber-500/30',
};

// ── Helpers ──────────────────────────────────────────────────
function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function emptyForm(): MonsterUpsert {
  return {
    id: '',
    name: '',
    name_ja: null,
    species: null,
    tier: 'low',
    elements: [],
    weaknesses: [],
    is_variant: false,
    parent_id: null,
    is_radiant: false,
    games: ['mhn'],
    is_active: true,
    icon: null,
    sort_orders: {},
    notes: null,
  };
}

// ── Sub-components ───────────────────────────────────────────
function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-mh-slate-400 mb-1.5">
      {children}
    </label>
  );
}

function Input({ id, value, onChange, placeholder, type = 'text', readOnly }: {
  id?: string; value: string | number | ''; placeholder?: string;
  type?: string; readOnly?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2',
        'text-sm text-mh-slate-200 placeholder-mh-slate-600',
        'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/20',
        readOnly && 'opacity-60 cursor-default',
      )}
    />
  );
}

function Select({ id, value, options, onChange }: {
  id?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2',
        'text-sm text-mh-slate-200 outline-none',
        'focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/20',
      )}
    >
      <option value="">— None —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function TagToggle({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-semibold ring-1 capitalize transition-all duration-150',
              active
                ? (ELEMENT_COLORS[opt] ?? 'bg-mh-gold-500/20 text-mh-gold-300 ring-mh-gold-500/30')
                : 'bg-mh-slate-800 text-mh-slate-500 ring-mh-slate-700 hover:ring-mh-slate-500',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
interface Props {
  monster: DBMonster | null; // null = create mode
  open: boolean;
  onClose: () => void;
}

export default function MonsterEditModal({ monster, open, onClose }: Props) {
  const isCreate = !monster;
  const upsert = useUpsertMonster();
  const del = useDeleteMonster();
  const { data: baseMonsters = [] } = useBaseMonsters();

  const [form, setForm] = useState<MonsterUpsert>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Sync form when monster prop changes
  useEffect(() => {
    if (open) {
      setDeleteConfirm(false);
      setForm(monster ? { ...monster } : emptyForm());
    }
  }, [monster, open]);

  // Auto-generate id from name when creating
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      ...(isCreate ? { id: toSlug(name) } : {}),
    }));
  };

  // Update per-game sort order
  const handleSortOrderChange = (game: string, raw: string) => {
    const num = parseInt(raw, 10);
    setForm((f) => {
      const next = { ...f.sort_orders };
      if (raw === '' || isNaN(num)) {
        delete next[game];
      } else {
        next[game] = num;
      }
      return { ...f, sort_orders: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsert.mutateAsync(form);
    onClose();
  };

  const handleDelete = async () => {
    if (!monster) return;
    await del.mutateAsync(monster.id);
    onClose();
  };

  if (!open) return null;

  const isBusy = upsert.isPending || del.isPending;
  const error = upsert.error?.message || del.error?.message;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-4 left-1/2 z-50 flex w-full max-w-2xl -translate-x-1/2 flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-mh-slate-700 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-mh-slate-100">
              {isCreate ? 'Add Monster' : `Edit — ${monster.name}`}
            </h2>
            {!isCreate && (
              <p className="text-xs text-mh-slate-500">ID: <code className="text-mh-gold-500">{monster.id}</code></p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mh-slate-500 hover:bg-mh-slate-800 hover:text-mh-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name (English) *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Rathalos"
                />
              </div>
              <div>
                <Label htmlFor="name_ja">Name (Japanese)</Label>
                <Input
                  id="name_ja"
                  value={form.name_ja ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, name_ja: v || null }))}
                  placeholder="e.g. リオレウス"
                />
              </div>
            </div>

            {/* ID */}
            <div>
              <Label htmlFor="id">ID {isCreate && '(auto-generated from name)'}</Label>
              <Input
                id="id"
                value={form.id}
                onChange={(v) => setForm((f) => ({ ...f, id: toSlug(v) }))}
                placeholder="e.g. rathalos"
                readOnly={!isCreate}
              />
            </div>

            {/* Species + Tier */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Species</Label>
                <Select
                  value={form.species ?? ''}
                  options={SPECIES_OPTIONS}
                  onChange={(v) => setForm((f) => ({ ...f, species: v || null }))}
                />
              </div>
              <div>
                <Label>Tier</Label>
                <Select
                  value={form.tier}
                  options={TIER_OPTIONS}
                  onChange={(v) => setForm((f) => ({ ...f, tier: v }))}
                />
              </div>
            </div>

            {/* Elements */}
            <div>
              <Label>Elements (monster uses)</Label>
              <TagToggle
                options={[...ELEMENT_OPTIONS, ...STATUS_OPTIONS]}
                selected={form.elements}
                onChange={(v) => setForm((f) => ({ ...f, elements: v }))}
              />
            </div>

            {/* Weaknesses */}
            <div>
              <Label>Weaknesses (player exploits)</Label>
              <TagToggle
                options={[...ELEMENT_OPTIONS, ...STATUS_OPTIONS]}
                selected={form.weaknesses}
                onChange={(v) => setForm((f) => ({ ...f, weaknesses: v }))}
              />
            </div>

            {/* Games */}
            <div>
              <Label>Games</Label>
              <div className="flex flex-col gap-2">
                {GAME_OPTIONS.map((g) => (
                  <label key={g.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.games.includes(g.value)}
                      onChange={() => {
                        const games = form.games.includes(g.value)
                          ? form.games.filter((x) => x !== g.value)
                          : [...form.games, g.value];
                        setForm((f) => ({ ...f, games }));
                      }}
                      className="h-4 w-4 rounded border-mh-slate-600 bg-mh-slate-800 accent-amber-500"
                    />
                    <span className="text-sm text-mh-slate-300">{g.label}</span>
                    <span className={cn(
                      'ml-auto rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wider',
                      g.value === 'mhn' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400',
                    )}>
                      {g.value.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Per-game sort order — only shown for games the monster is in */}
            {form.games.length > 0 && (
              <div className="rounded-xl border border-mh-slate-700 bg-mh-slate-800/40 p-4">
                <p className="mb-3 text-sm font-semibold text-mh-slate-300">Sort Order per Game</p>
                <p className="mb-3 text-xs text-mh-slate-600">
                  Controls display position in each game's monster list. Lower number = appears first.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {GAME_OPTIONS.filter((g) => form.games.includes(g.value)).map((g) => (
                    <div key={g.value}>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-mh-slate-400">
                        <span className={cn(
                          'rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider',
                          g.value === 'mhn' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400',
                        )}>
                          {g.value.toUpperCase()}
                        </span>
                        {g.label}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.sort_orders[g.value] ?? ''}
                        onChange={(e) => handleSortOrderChange(g.value, e.target.value)}
                        placeholder="e.g. 10"
                        className={cn(
                          'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2',
                          'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                          'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/20',
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variant section */}
            <div className="rounded-xl border border-mh-slate-700 bg-mh-slate-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-mh-slate-300">Variant / Radiant</p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_variant}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      is_variant: e.target.checked,
                      parent_id: e.target.checked ? f.parent_id : null,
                      is_radiant: e.target.checked ? f.is_radiant : false,
                    }))}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span className="text-sm text-mh-slate-400">Is Variant</span>
                </label>
              </div>

              {form.is_variant && (
                <>
                  <div>
                    <Label>Parent Monster</Label>
                    <Select
                      value={form.parent_id ?? ''}
                      options={baseMonsters
                        .filter((m) => m.id !== form.id)
                        .map((m) => ({ value: m.id, label: m.name }))}
                      onChange={(v) => setForm((f) => ({ ...f, parent_id: v || null }))}
                    />
                  </div>

                  {form.games.includes('mho') && (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.is_radiant}
                        onChange={(e) => setForm((f) => ({ ...f, is_radiant: e.target.checked }))}
                        className="h-4 w-4 rounded accent-amber-500"
                      />
                      <span className="text-sm text-mh-slate-400">Is Radiant (MHO)</span>
                    </label>
                  )}
                </>
              )}
            </div>

            {/* Active toggle */}
            <div>
              <Label>Status</Label>
              <label className="mt-2 flex cursor-pointer items-center gap-3">
                <div
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer',
                    form.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
                  )}
                >
                  <span className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                    form.is_active ? 'translate-x-6' : 'translate-x-1',
                  )} />
                </div>
                <span className={cn('text-sm', form.is_active ? 'text-green-400' : 'text-mh-slate-500')}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>

            {/* Admin Notes */}
            <div>
              <Label htmlFor="notes">Admin Notes</Label>
              <textarea
                id="notes"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                rows={2}
                placeholder="Internal notes visible only to admins…"
                className={cn(
                  'w-full resize-none rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2',
                  'text-sm text-mh-slate-200 placeholder-mh-slate-600',
                  'outline-none focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/20',
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-mh-slate-700 px-6 py-4">
            {/* Delete (edit mode only) */}
            {!isCreate && !deleteConfirm && (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            {deleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Permanently delete?</span>
                <button type="button" onClick={handleDelete} disabled={isBusy}
                  className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50">
                  {isBusy ? 'Deleting…' : 'Confirm'}
                </button>
                <button type="button" onClick={() => setDeleteConfirm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-mh-slate-500 hover:text-mh-slate-300">
                  Cancel
                </button>
              </div>
            )}
            {isCreate && <div />}

            {/* Save / Cancel */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy || !form.name || !form.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl bg-mh-gold-500 px-5 py-2 text-sm font-bold text-mh-slate-900',
                  'transition-all hover:bg-mh-gold-400 disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {isBusy && <Loader2 size={14} className="animate-spin" />}
                {isCreate ? 'Create Monster' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
