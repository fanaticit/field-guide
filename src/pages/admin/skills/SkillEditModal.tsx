// ─────────────────────────────────────────────────────────────
// Skill Edit / Create Modal
// Full-featured form for editing or creating skills.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, AlertTriangle, Sparkles, Swords, Crosshair, Shield, HeartPulse, Skull, Sliders, Heart, Plus } from 'lucide-react';
import {
  type DBSkill,
  type SkillUpsert,
  type SetBonusTier,
  normalizeSetThresholds,
  useAdminSkills,
  useUpsertSkill,
  useDeleteSkill,
} from '../../../hooks/useAdminSkills';
import type { SkillCategory } from '../../../data/schemas/skill';
import { cn } from '../../../lib/utils';

// ── Category Configuration ──────────────────────────────────
export const CATEGORY_CONFIG: Record<
  SkillCategory,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  attack:   { label: 'Attack',   bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     icon: Swords     },
  critical: { label: 'Critical', bg: 'bg-pink-500/15',    text: 'text-pink-400',    border: 'border-pink-500/30',    icon: Crosshair  },
  defense:  { label: 'Defense',  bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30',    icon: Shield     },
  survival: { label: 'Survival', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: HeartPulse },
  status:   { label: 'Status',   bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   icon: Skull      },
  utility:  { label: 'Utility',  bg: 'bg-teal-500/15',    text: 'text-teal-400',    border: 'border-teal-500/30',    icon: Sliders    },
  health:   { label: 'Health',   bg: 'bg-lime-500/15',    text: 'text-lime-400',    border: 'border-lime-500/30',    icon: Heart      },
  general:  { label: 'General',  bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  icon: Sparkles   },
};

export const CATEGORY_OPTIONS: SkillCategory[] = [
  'attack',
  'critical',
  'defense',
  'survival',
  'status',
  'utility',
  'health',
  'general',
];

export const GAME_OPTIONS = [
  { value: 'mhn', label: 'Monster Hunter Now',        short: 'MHN', color: 'blue'   },
  { value: 'mho', label: 'Monster Hunter Outlanders', short: 'MHO', color: 'orange' },
] as const;

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function emptyForm(): SkillUpsert {
  return {
    id: '',
    name: '',
    name_ja: null,
    category: 'general',
    games: ['mho'],
    max_levels: { mho: 3 },
    is_set_bonus: false,
    set_thresholds: [
      { pieces: 2, granted_skill_id: null, granted_skill_level: 1, description: null },
      { pieces: 4, granted_skill_id: null, granted_skill_level: 1, description: null },
    ],
    is_active: true,
    icon: null,
    sort_orders: {},
    description: null,
    notes: null,
  };
}

interface Props {
  skill: DBSkill | null;
  open: boolean;
  onClose: () => void;
}

export default function SkillEditModal({ skill, open, onClose }: Props) {
  const isNew = skill === null;
  const [form, setForm] = useState<SkillUpsert>(emptyForm());
  const [idTouched, setIdTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: standardSkills = [] } = useAdminSkills({ isSetBonus: false, isActive: true });
  const upsert = useUpsertSkill();
  const remove = useDeleteSkill();

  useEffect(() => {
    if (open) {
      if (skill) {
        const parsedThresholds = normalizeSetThresholds(skill.set_thresholds);
        setForm({
          id: skill.id,
          name: skill.name,
          name_ja: skill.name_ja ?? null,
          category: skill.category ?? 'general',
          games: skill.games ?? ['mho'],
          max_levels: skill.max_levels ?? { mho: 3 },
          is_set_bonus: skill.is_set_bonus ?? false,
          set_thresholds: parsedThresholds.length > 0
            ? parsedThresholds
            : [
                { pieces: 2, granted_skill_id: null, granted_skill_level: 1, description: null },
                { pieces: 4, granted_skill_id: null, granted_skill_level: 1, description: null },
              ],
          is_active: skill.is_active,
          icon: skill.icon ?? null,
          sort_orders: skill.sort_orders ?? {},
          description: skill.description ?? null,
          notes: skill.notes ?? null,
        });
        setIdTouched(true);
      } else {
        setForm(emptyForm());
        setIdTouched(false);
      }
      setConfirmDelete(false);
      setErrorMsg(null);
    }
  }, [open, skill]);

  if (!open) return null;

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      id: !idTouched && isNew ? toSlug(name) : prev.id,
    }));
  }

  function toggleGame(gameId: string) {
    setForm((prev) => {
      const inGame = prev.games.includes(gameId);
      const nextGames = inGame
        ? prev.games.filter((g) => g !== gameId)
        : [...prev.games, gameId];
      
      const nextMaxLevels = { ...prev.max_levels };
      if (!inGame && !nextMaxLevels[gameId]) {
        nextMaxLevels[gameId] = gameId === 'mho' ? 3 : 5;
      }

      return {
        ...prev,
        games: nextGames,
        max_levels: nextMaxLevels,
      };
    });
  }

  function handleMaxLevelChange(gameId: string, level: number) {
    const validLevel = Math.max(1, Math.min(10, level || 1));
    setForm((prev) => ({
      ...prev,
      max_levels: {
        ...prev.max_levels,
        [gameId]: validLevel,
      },
    }));
  }

  function handleToggleSetBonus(isSet: boolean) {
    setForm((prev) => {
      const thresholds = prev.set_thresholds && prev.set_thresholds.length > 0
        ? prev.set_thresholds
        : [
            { pieces: 2, granted_skill_id: null, granted_skill_level: 1, description: null },
            { pieces: 4, granted_skill_id: null, granted_skill_level: 1, description: null },
          ];
      const nextMaxLevels = { ...prev.max_levels };
      if (isSet) {
        // Automatically sync maxLevel with the number of tiers
        prev.games.forEach((g) => {
          nextMaxLevels[g] = thresholds.length;
        });
      }
      return {
        ...prev,
        is_set_bonus: isSet,
        set_thresholds: thresholds,
        max_levels: nextMaxLevels,
      };
    });
  }

  function handleAddTier() {
    setForm((prev) => {
      const existingTiers = prev.set_thresholds || [];
      const lastPieces = existingTiers.length > 0
        ? existingTiers[existingTiers.length - 1].pieces
        : 2;
      const nextPieces = Math.min(10, lastPieces + 2);

      const newTier: SetBonusTier = {
        pieces: nextPieces,
        granted_skill_id: null,
        granted_skill_level: 1,
        description: null,
      };

      const nextTiers = [...existingTiers, newTier];
      const nextMaxLevels = { ...prev.max_levels };
      if (prev.is_set_bonus) {
        prev.games.forEach((g) => {
          nextMaxLevels[g] = nextTiers.length;
        });
      }

      return {
        ...prev,
        set_thresholds: nextTiers,
        max_levels: nextMaxLevels,
      };
    });
  }

  function handleUpdateTier(index: number, patch: Partial<SetBonusTier>) {
    setForm((prev) => {
      const nextTiers = (prev.set_thresholds || []).map((t, idx) =>
        idx === index ? { ...t, ...patch } : t,
      );
      return {
        ...prev,
        set_thresholds: nextTiers,
      };
    });
  }

  function handleRemoveTier(index: number) {
    setForm((prev) => {
      const nextTiers = (prev.set_thresholds || []).filter((_, idx) => idx !== index);
      const nextMaxLevels = { ...prev.max_levels };
      if (prev.is_set_bonus && nextTiers.length > 0) {
        prev.games.forEach((g) => {
          nextMaxLevels[g] = nextTiers.length;
        });
      }
      return {
        ...prev,
        set_thresholds: nextTiers,
        max_levels: nextMaxLevels,
      };
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErrorMsg('Skill name is required.');
      return;
    }
    if (!form.id.trim()) {
      setErrorMsg('Skill ID is required.');
      return;
    }
    if (form.games.length === 0) {
      setErrorMsg('Skill must be assigned to at least one game.');
      return;
    }

    try {
      setErrorMsg(null);
      await upsert.mutateAsync(form);
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e?.message ?? 'Failed to save skill.');
    }
  }

  async function handleDelete() {
    if (!skill) return;
    try {
      setErrorMsg(null);
      await remove.mutateAsync(skill.id);
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e?.message ?? 'Failed to delete skill.');
    }
  }

  const categoryCfg = CATEGORY_CONFIG[form.category] ?? CATEGORY_CONFIG.general;
  const CategoryIcon = categoryCfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-mh-slate-700/80 px-6 py-4 bg-mh-slate-900/60">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border',
              categoryCfg.bg,
              categoryCfg.text,
              categoryCfg.border,
            )}>
              <CategoryIcon size={20} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                {isNew ? 'Create New Skill' : `Edit: ${form.name || form.id}`}
              </h2>
              <p className="text-xs text-mh-slate-500 font-mono">
                {form.id ? `ID: ${form.id}` : 'Enter skill details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body (scrollable) ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertTriangle size={15} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Identity fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Critical Eye"
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Skill ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.id}
                readOnly={!isNew}
                onChange={(e) => {
                  setIdTouched(true);
                  setForm((p) => ({ ...p, id: toSlug(e.target.value) }));
                }}
                placeholder="e.g. critical_eye"
                className={cn(
                  'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm font-mono text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50',
                  !isNew && 'opacity-60 cursor-not-allowed bg-mh-slate-800/50',
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Japanese Name (optional)
              </label>
              <input
                type="text"
                value={form.name_ja ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, name_ja: e.target.value || null }))}
                placeholder="e.g. 見切り"
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Category / Type
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as SkillCategory }))}
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 outline-none focus:border-mh-gold-500/50"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Set Bonus Configuration ── */}
          <div className={cn(
            'rounded-xl border p-4 space-y-3 transition-all',
            form.is_set_bonus
              ? 'border-mh-gold-500/40 bg-mh-gold-500/5'
              : 'border-mh-slate-750 bg-mh-slate-800/30',
          )}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-mh-slate-200">Armour Set Bonus</p>
                  {form.is_set_bonus && (
                    <span className="rounded bg-mh-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                      Active Set Bonus
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-mh-slate-500">
                  Activates when equipping a certain number of armour pieces (e.g. 2 pieces, 4 pieces).
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSetBonus(!form.is_set_bonus)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                  form.is_set_bonus ? 'bg-mh-gold-500' : 'bg-mh-slate-700',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                    form.is_set_bonus ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            {form.is_set_bonus && (
              <div className="pt-2 border-t border-mh-slate-750 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-mh-slate-300">
                    Set Bonus Tiers & Granted Skills
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="flex items-center gap-1 rounded bg-mh-gold-500/15 border border-mh-gold-500/30 px-2.5 py-1 text-xs font-bold text-mh-gold-400 hover:bg-mh-gold-500/25 transition-all"
                  >
                    <Plus size={12} />
                    Add Tier
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(form.set_thresholds || []).map((tier, idx) => {
                    const selectedSkillMeta = standardSkills.find((s) => s.id === tier.granted_skill_id);
                    const selectedMaxLevel = selectedSkillMeta?.max_levels[form.games[0] || 'mhn'] ?? 5;

                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-mh-slate-700 bg-mh-slate-900/80 p-3 space-y-2.5"
                      >
                        {/* Tier header: Pieces requirement & Remove */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-mh-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                              Tier {idx + 1}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-mh-slate-300">
                              <span>Requires:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={tier.pieces}
                                onChange={(e) =>
                                  handleUpdateTier(idx, {
                                    pieces: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)),
                                  })
                                }
                                className="w-12 rounded border border-mh-slate-700 bg-mh-slate-800 px-1.5 py-0.5 text-center text-xs font-bold text-mh-gold-400 outline-none focus:border-mh-gold-500/50"
                              />
                              <span className="font-semibold text-mh-slate-400">Pieces</span>
                            </div>
                          </div>

                          {(form.set_thresholds?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTier(idx)}
                              title="Remove this tier"
                              className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Granted Skill & Level */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-mh-slate-800">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-mh-slate-400 mb-1">
                              Granted Skill (optional)
                            </label>
                            <select
                              value={tier.granted_skill_id ?? ''}
                              onChange={(e) => {
                                const skillId = e.target.value || null;
                                handleUpdateTier(idx, {
                                  granted_skill_id: skillId,
                                  granted_skill_level: skillId ? (tier.granted_skill_level || 1) : 1,
                                });
                              }}
                              className="w-full rounded border border-mh-slate-700 bg-mh-slate-800 px-2 py-1 text-xs text-mh-slate-200 outline-none focus:border-mh-gold-500/50"
                            >
                              <option value="">(None / Custom Effect Only)</option>
                              {standardSkills.map((sk) => (
                                <option key={sk.id} value={sk.id}>
                                  {sk.name} ({CATEGORY_CONFIG[sk.category]?.label || sk.category})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-mh-slate-400 mb-1">
                              Granted Level
                            </label>
                            <select
                              disabled={!tier.granted_skill_id}
                              value={tier.granted_skill_level || 1}
                              onChange={(e) =>
                                handleUpdateTier(idx, {
                                  granted_skill_level: parseInt(e.target.value, 10) || 1,
                                })
                              }
                              className="w-full rounded border border-mh-slate-700 bg-mh-slate-800 px-2 py-1 text-xs font-bold text-mh-gold-400 outline-none focus:border-mh-gold-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {Array.from({ length: selectedMaxLevel }, (_, i) => i + 1).map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  Level +{lvl}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Optional Custom Effect Notes */}
                        <div>
                          <input
                            type="text"
                            value={tier.description ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                description: e.target.value || null,
                              })
                            }
                            placeholder="Optional custom effect description (e.g. Increases fire element attack)"
                            className="w-full rounded border border-mh-slate-750 bg-mh-slate-800/60 px-2.5 py-1 text-xs text-mh-slate-300 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Game assignment & Max levels */}
          <div className="rounded-xl border border-mh-slate-700/80 bg-mh-slate-800/30 p-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-mh-slate-400">
              Game Availability & Max Levels
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GAME_OPTIONS.map((g) => {
                const inGame = form.games.includes(g.value);
                const maxLv = form.max_levels[g.value] ?? 5;
                return (
                  <div
                    key={g.value}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border p-3 transition-all',
                      inGame
                        ? g.color === 'blue'
                          ? 'border-blue-500/40 bg-blue-500/10'
                          : 'border-orange-500/40 bg-orange-500/10'
                        : 'border-mh-slate-700/60 bg-mh-slate-800/50 opacity-70',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inGame}
                          onChange={() => toggleGame(g.value)}
                          className="h-4 w-4 rounded border-mh-slate-700 bg-mh-slate-800 text-mh-gold-500 focus:ring-0"
                        />
                        <span className={cn(
                          'text-xs font-bold uppercase tracking-wider',
                          inGame
                            ? g.color === 'blue' ? 'text-blue-400' : 'text-orange-400'
                            : 'text-mh-slate-400',
                        )}>
                          {g.label} ({g.short})
                        </span>
                      </label>
                    </div>

                    {inGame && (
                      <div className="flex items-center gap-2 pt-1 border-t border-mh-slate-700/40">
                        <span className="text-xs text-mh-slate-400">Max Level:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={maxLv}
                            onChange={(e) => handleMaxLevelChange(g.value, parseInt(e.target.value, 10))}
                            className="w-16 rounded border border-mh-slate-700 bg-mh-slate-800 px-2 py-1 text-center text-xs font-bold text-mh-slate-100 outline-none focus:border-mh-gold-500/50"
                          />
                          <span className="text-[11px] text-mh-slate-500 font-mono">Lv {maxLv}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description and Notes */}
          <div>
            <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))}
              placeholder="What this skill does in game..."
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between rounded-lg border border-mh-slate-700/60 bg-mh-slate-800/40 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-mh-slate-200">Active in Field Guide</p>
              <p className="text-[11px] text-mh-slate-500">
                Disabled skills are hidden from build planners and public skill views.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                form.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                  form.is_active ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          {/* Delete section for existing skill */}
          {!isNew && (
            <div className="pt-2 border-t border-mh-slate-800">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete this skill permanently
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <div className="text-xs text-red-300">
                    Are you sure? This cannot be undone.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded px-2.5 py-1 text-xs text-mh-slate-400 hover:bg-mh-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={handleDelete}
                      className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {remove.isPending && <Loader2 size={12} className="animate-spin" />}
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-mh-slate-700/80 px-6 py-4 bg-mh-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={upsert.isPending}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-colors"
          >
            {upsert.isPending && <Loader2 size={14} className="animate-spin" />}
            {isNew ? 'Create Skill' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
