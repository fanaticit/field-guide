// ─────────────────────────────────────────────────────────────
// Challenge project panels for the Hunter's Challenges page:
//   ProjectSwitcher   — "All challenges" + one chip per project with % complete
//   ProjectOverview   — progress, each item with its target (editable), close project
//   ProjectHuntList   — monsters to hunt for the parts the weapon/armour still need
//                       to reach their targets, with the hunt level that drops each tier
// ─────────────────────────────────────────────────────────────
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import {
  FolderKanban, CheckCircle2, ChevronDown, ChevronRight, X, Edit2, Save, Loader2, ExternalLink, Crosshair, Package,
  FolderPlus, Plus, Check, Search, Star,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import {
  PROJECT_SLOT_LABELS,
  tierNumber,
  type ChallengeProject,
  type ChallengeProjectItem,
  type HuntItemPlan,
  type HuntLevel,
  type HuntMonster,
  type ProjectProgress,
} from '../../hooks/useChallengeProjects';

// ── Progress bar ─────────────────────────────────────────────

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-black/40', className)}>
      <div
        className={cn('h-full rounded-full transition-all', percent >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-[var(--theme-grad-from)] to-[var(--theme-grad-to)]')}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

// ── Switcher ─────────────────────────────────────────────────

/** Small inline "name + save" field used to make a new project. */
export function NewProjectField({ onCreate, onDone, placeholder = 'Project name' }: {
  onCreate: (name: string) => Promise<unknown>;
  onDone: () => void;
  placeholder?: string;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const next = name.trim();
    if (!next || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(next);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Could not create the project.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-1 rounded-lg border border-[var(--theme-accent)] bg-black/40 px-2 py-1">
        <input
          autoFocus
          value={name}
          maxLength={60}
          placeholder={placeholder}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone(); }}
          className="w-36 min-w-0 bg-transparent text-xs font-bold text-white placeholder:text-sky-600 focus:outline-none"
        />
        <button type="button" onClick={save} disabled={!name.trim() || busy} className="text-emerald-300 hover:text-white disabled:opacity-40" title="Create project">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button type="button" onClick={onDone} className="text-sky-500 hover:text-white" title="Cancel"><X size={13} /></button>
      </span>
      {error && <span className="max-w-[16rem] text-[10px] text-red-300">{error}</span>}
    </span>
  );
}

export function ProjectSwitcher({
  projects,
  progress,
  activeId,
  onSelect,
  onCreate,
}: {
  projects: ChallengeProject[];
  progress: Map<string, ProjectProgress>;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  /** Creates an empty project (and should select it). Omit to hide the button. */
  onCreate?: (name: string) => Promise<unknown>;
}) {
  const [creating, setCreating] = useState(false);
  if (!projects.length && !onCreate) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-500">
        <FolderKanban size={12} /> Projects
      </span>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
          activeId === null
            ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)] text-white'
            : 'border-[var(--border-subtle)] bg-black/30 text-[var(--text-secondary)] hover:text-white',
        )}
      >
        All challenges
      </button>
      {projects.map((p) => {
        const pr = progress.get(p.id) ?? { percent: 0, done: 0, total: 0 };
        const active = activeId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(active ? null : p.id)}
            title={`${p.is_focus ? 'Focus project · ' : ''}${pr.done} of ${pr.total} items done`}
            className={cn(
              'flex min-w-[8rem] max-w-[16rem] flex-col gap-1 rounded-lg border px-3 py-1.5 text-left text-xs font-bold transition-all',
              active
                ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)] text-white shadow-[0_0_10px_var(--accent-gold-glow)]'
                : 'border-[var(--border-subtle)] bg-black/30 text-[var(--text-secondary)] hover:text-white',
            )}
          >
            <span className="flex items-center gap-2">
              {p.is_focus && <Star size={11} className="-mr-1 shrink-0 fill-yellow-400 text-yellow-400" aria-label="Focus project" />}
              <span className="truncate">{p.name}</span>
              <span className={cn('ml-auto shrink-0 font-mono text-[10px]', pr.percent >= 100 ? 'text-emerald-300' : 'text-sky-300')}>
                {pr.percent}%
              </span>
            </span>
            <ProgressBar percent={pr.percent} className="h-1" />
          </button>
        );
      })}
      {onCreate && (creating ? (
        <NewProjectField onCreate={onCreate} onDone={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-1.5 text-xs font-bold text-sky-400 transition-all hover:border-[var(--theme-accent)] hover:text-white"
          title="Make a project and add challenges to it"
        >
          <Plus size={12} /> New project
        </button>
      ))}
    </div>
  );
}

// ── Target options per item ──────────────────────────────────

export interface TargetOption {
  value: number;
  label: string;
}

// ── Overview ─────────────────────────────────────────────────

export interface ProjectOverviewItem {
  item: ChallengeProjectItem;
  /** The project's view of the challenge (max_rarity = target) */
  challenge: HunterChallenge;
  name: string;
  image: string | null;
  levelLabel: string;
  targetOptions: TargetOption[];
  plan: HuntItemPlan | null;
}

export function ProjectOverview({
  project,
  progress,
  items,
  onSetTarget,
  onRename,
  onClose,
  savingTarget,
  onAddItems,
  onRemoveItem,
  removingId,
  onToggleFocus,
  focusBusy = false,
}: {
  project: ChallengeProject;
  progress: ProjectProgress;
  items: ProjectOverviewItem[];
  onSetTarget: (item: ChallengeProjectItem, target: number) => void;
  onRename: (name: string) => Promise<unknown>;
  onClose: () => void;
  savingTarget: string | null;
  /** Opens the picker of challenges to add */
  onAddItems?: () => void;
  /** Takes an item out of the project (the challenge stays) */
  onRemoveItem?: (item: ChallengeProjectItem) => void;
  removingId?: string | null;
  /** Make this the focus project (or stop it being the focus) */
  onToggleFocus?: () => void;
  focusBusy?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [showItems, setShowItems] = useState(true);

  const saveName = async () => {
    const next = name.trim();
    if (next && next !== project.name) await onRename(next);
    setEditing(false);
  };

  return (
    <div className="mho-panel-deep space-y-3 p-3">
      <div className="space-y-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <FolderKanban size={13} className="shrink-0 text-[var(--theme-accent)]" />
          {editing ? (
            <>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                className="min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2 py-0.5 text-xs font-bold text-white focus:outline-none"
              />
              <button type="button" onClick={saveName} className="text-emerald-300 hover:text-white" title="Save name"><Save size={13} /></button>
            </>
          ) : (
            <>
              <h2 className="min-w-0 flex-1 truncate font-display text-xs font-bold uppercase tracking-wider text-white">{project.name}</h2>
              {onToggleFocus && (
                <button
                  type="button"
                  onClick={onToggleFocus}
                  disabled={focusBusy}
                  aria-pressed={Boolean(project.is_focus)}
                  title={project.is_focus ? 'Your focus project — listed first and opened by default. Tap to stop focusing.' : 'Make this your focus: listed first and opened by default'}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-50',
                    project.is_focus
                      ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-300 hover:bg-yellow-400/25'
                      : 'border-white/15 text-sky-400 hover:border-yellow-400/50 hover:text-yellow-300',
                  )}
                >
                  {focusBusy ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} className={project.is_focus ? 'fill-yellow-400' : ''} />}
                  {project.is_focus ? 'Focus' : 'Set focus'}
                </button>
              )}
              <button type="button" onClick={() => { setName(project.name); setEditing(true); }} className="text-sky-500 hover:text-white" title="Rename project">
                <Edit2 size={12} />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar percent={progress.percent} />
          <span className={cn('shrink-0 font-mono text-xs font-bold', progress.percent >= 100 ? 'text-emerald-300' : 'text-white')}>
            {progress.percent}%
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-sky-500">
          <span>{progress.done} of {progress.total} items done</span>
          {project.build_id && (
            <Link to={`/armory/planner/${project.build_id}`} className="ml-auto inline-flex items-center gap-1 text-sky-300 hover:text-white">
              Open build <ExternalLink size={10} />
            </Link>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowItems((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400 hover:text-white"
      >
        {showItems ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Items &amp; targets
      </button>

      {showItems && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-3 text-center">
          <p className="text-[11px] font-semibold text-sky-300">This project is empty</p>
          <p className="mt-0.5 text-[10px] text-sky-500">
            Add challenges you're already tracking, or use the <FolderPlus size={10} className="inline" /> button on any challenge card.
          </p>
        </div>
      )}

      {showItems && (
        <ul className="space-y-1.5">
          {items.map(({ item, challenge, name: itemName, image, levelLabel, targetOptions, plan }) => {
            const done = challenge.status === 'completed';
            return (
              <li
                key={item.challenge_id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2 py-1.5',
                  done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-black/20',
                )}
              >
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                  {image && <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" />}
                  {done && <CheckCircle2 size={12} className="absolute bottom-0 right-0 rounded-full bg-black text-emerald-400" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-white" title={itemName}>{itemName}</p>
                  <p className="truncate text-[10px] text-sky-500">
                    {item.slot ? PROJECT_SLOT_LABELS[item.slot] : 'Item'} · {levelLabel}
                    {plan?.requiredLevel ? ` · needs Lv ${plan.requiredLevel}` : ''}
                  </p>
                </div>
                {targetOptions.length > 1 ? (
                  <select
                    value={item.target_level}
                    onChange={(e) => onSetTarget(item, Number(e.target.value))}
                    disabled={savingTarget === item.challenge_id}
                    title="Done at"
                    className="w-[5.5rem] shrink-0 rounded border border-white/15 bg-black/60 px-1 py-0.5 text-[10px] text-white disabled:opacity-50"
                  >
                    {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="shrink-0 text-[10px] text-sky-400">{targetOptions[0]?.label}</span>
                )}
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item)}
                    disabled={removingId === item.challenge_id}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sky-600 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                    title="Take out of this project (the challenge stays)"
                  >
                    {removingId === item.challenge_id ? <Loader2 size={11} className="animate-spin" /> : <X size={12} />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {onAddItems && (
        <button
          type="button"
          onClick={onAddItems}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--theme-accent)] hover:text-white"
        >
          <FolderPlus size={13} /> Add challenges
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20"
      >
        <X size={13} /> Close project
      </button>
    </div>
  );
}

// ── Hunt list ────────────────────────────────────────────────

function tierHint(level: HuntLevel | undefined, tier: string): string {
  if (!level) return `Tier ${tier} parts`;
  const bits = [`Hunt ★${level.hunt_difficulty}`];
  if (level.monster_level) bits.push(`Lv ${level.monster_level}`);
  if (level.suggested_hunt_power) bits.push(`~${level.suggested_hunt_power.toLocaleString('en-GB')} power`);
  return `Tier ${tier}: ${bits.join(' · ')}`;
}

export function ProjectHuntList({
  monsters,
  huntLevels,
  selectedIds,
  onSelect,
  nameOf,
}: {
  monsters: HuntMonster[];
  huntLevels: Map<string, Map<number, HuntLevel>>;
  /** Challenge ids of the selected monster, if any */
  selectedIds: string | null;
  onSelect: (monster: HuntMonster | null) => void;
  nameOf: (challengeId: string) => string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mho-panel-deep space-y-3 p-3">
      <div className="mb-1 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--theme-accent)]">❖</span>
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">Monsters to Hunt</h2>
          {monsters.length > 0 && (
            <span className="ml-auto rounded-full bg-sky-800 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400">
              {monsters.filter((m) => m.monsterId !== '__general__').length} monsters
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] text-sky-500">
          Every part the weapon and armour still need to reach this project's targets. Tap a monster to see the items that need it.
        </p>
      </div>

      {monsters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-white/5 p-6 text-center">
          <Crosshair size={28} className="mx-auto mb-2 text-sky-700" />
          <p className="text-xs font-semibold text-sky-400">Nothing left to hunt</p>
          <p className="mt-1 text-[10px] text-sky-600">The weapon and armour in this project have reached their targets.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {monsters.map((m) => {
            const key = m.challengeIds.join(',');
            const isSelected = selectedIds === key;
            const isOpen = expanded === m.monsterId;
            const levels = huntLevels.get(m.monsterId);
            const general = m.monsterId === '__general__';
            return (
              <li key={m.monsterId} className={cn('rounded-lg border', isSelected ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)]' : 'border-white/10 bg-black/20')}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button type="button" onClick={() => onSelect(isSelected ? null : m)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40">
                      {m.icon ? <img src={m.icon} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Package size={14} className="text-sky-500" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-white">{m.monsterName}</span>
                      <span className="block truncate text-[10px] text-sky-500">
                        {m.total} part{m.total === 1 ? '' : 's'} · {m.challengeIds.length} item{m.challengeIds.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    {!general && m.tiers.length > 0 && (
                      <span className="flex shrink-0 gap-0.5">
                        {m.tiers.map((t) => (
                          <span key={t} title={tierHint(levels?.get(tierNumber(t) ?? 0), t)} className="rounded border border-yellow-500/30 bg-yellow-500/15 px-1 text-[9px] font-bold text-yellow-300">
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={() => setExpanded(isOpen ? null : m.monsterId)} className="shrink-0 text-sky-500 hover:text-white" title="Show parts">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-1.5 border-t border-white/10 px-2 py-2">
                    {!general && m.tiers.length > 0 && (
                      <ul className="space-y-0.5 text-[10px] text-sky-300">
                        {m.tiers.map((t) => <li key={t}>{tierHint(levels?.get(tierNumber(t) ?? 0), t)}</li>)}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {m.materials.map((mat) => (
                        <span
                          key={mat.item}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]',
                            general ? 'border-sky-700/50 bg-sky-900/40 text-sky-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
                          )}
                        >
                          {mat.item} <span className="font-bold">×{mat.count}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-sky-500">For: {m.challengeIds.map(nameOf).join(', ')}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[9px] leading-relaxed text-sky-600">
        Part tiers (I–VI) are matched to the monster's Hunt difficulty (★1–★6) as a guide.
      </p>
    </div>
  );
}

// ── Close dialog ─────────────────────────────────────────────

export function CloseProjectDialog({
  project,
  keptCount,
  removableCount,
  busy,
  onCancel,
  onConfirm,
}: {
  project: ChallengeProject;
  keptCount: number;
  removableCount: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (removeUnstarted: boolean) => void;
}) {
  const [removeUnstarted, setRemoveUnstarted] = useState(true);
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="mho-panel w-full max-w-md space-y-3 p-4 text-white shadow-2xl">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
          <span className="text-xs text-[#FFD700]">❖</span> Close “{project.name}”?
        </h2>
        <p className="text-xs leading-relaxed text-mh-slate-300">
          The project is removed. Everything you've crafted, upgraded, recruited or collected stays in your challenges
          and collections at the level you reached{keptCount > 0 ? ` (${keptCount} item${keptCount === 1 ? '' : 's'})` : ''}. Weapons are saved to your weapon collection.
        </p>
        {removableCount > 0 && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-mh-slate-200">
            <input type="checkbox" checked={removeUnstarted} onChange={(e) => setRemoveUnstarted(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-yellow-500" />
            <span>
              Also remove the {removableCount} item{removableCount === 1 ? '' : 's'} this project added that you haven't started.
              <span className="block text-[10px] text-mh-slate-500">Challenges you had before the project are never removed.</span>
            </span>
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-mho-panel !px-3 !py-1.5 !text-sm">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(removeUnstarted && removableCount > 0)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-200 hover:bg-red-500/30 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Close project
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Remove a challenge ───────────────────────────────────────

/** Confirms removing a challenge: it only leaves the challenge list, the item stays in the hunter's account. */
export function RemoveChallengeDialog({
  name,
  projectNames,
  busy,
  onCancel,
  onConfirm,
}: {
  name: string;
  /** Projects the challenge will also be taken out of */
  projectNames: string[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="mho-panel w-full max-w-md space-y-3 p-4 text-white shadow-2xl">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
          <span className="text-xs text-[#FFD700]">❖</span> Remove challenge?
        </h2>
        <p className="text-sm font-semibold text-white">{name}</p>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-100">
          This only removes the <strong>challenge</strong> from your list. It does <strong>not</strong> remove the item from your account —
          anything you've crafted, upgraded, recruited or collected stays in your collections.
        </div>
        {projectNames.length > 0 && (
          <p className="text-xs text-mh-slate-300">
            It will also be taken out of {projectNames.length === 1 ? 'the project' : 'these projects'}:{' '}
            <span className="font-semibold text-white">{projectNames.join(', ')}</span>.
          </p>
        )}
        <p className="text-[10px] text-mh-slate-500">Your progress on this challenge (current level, notes) will be lost.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-mho-panel !px-3 !py-1.5 !text-sm">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-200 hover:bg-red-500/30 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Remove challenge
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Add a challenge to projects (button on each challenge card) ──

/**
 * Folder button for a challenge card. Opens a small menu of the hunter's projects with a tick
 * for each one the challenge is in; tapping a project adds or removes it. "New project" makes
 * one with this challenge already in it.
 */
export function ProjectMenuButton({
  challengeId,
  projects,
  onToggle,
  onCreateWith,
}: {
  challengeId: string;
  projects: ChallengeProject[];
  onToggle: (project: ChallengeProject, add: boolean) => Promise<unknown>;
  onCreateWith: (name: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const memberOf = projects.filter((p) => p.items.some((i) => i.challenge_id === challengeId));

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const width = 240;
      setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = async (p: ChallengeProject, add: boolean) => {
    setBusyId(p.id);
    setError(null);
    try {
      await onToggle(p, add);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not update the project.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setOpen((v) => !v); setCreating(false); setError(null); }}
        className={cn(
          'relative flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
          memberOf.length ? 'text-[var(--theme-accent)] hover:bg-white/10' : 'text-sky-600 hover:bg-white/10 hover:text-white',
        )}
        title={memberOf.length ? `In ${memberOf.map((p) => p.name).join(', ')}` : 'Add to a project'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FolderPlus size={12} />
        {memberOf.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[var(--theme-accent)] px-0.5 font-mono text-[8px] font-bold text-black">
            {memberOf.length}
          </span>
        )}
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left, width: 240 }}
          className="mho-panel fixed z-[90] space-y-1 p-2 !bg-[#1d1d22] text-white shadow-2xl shadow-black/60"
        >
          <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">Projects</p>
          {projects.length === 0 && !creating && (
            <p className="px-1 pb-1 text-[11px] text-sky-500">No projects yet.</p>
          )}
          <ul className="max-h-60 space-y-0.5 overflow-y-auto">
            {projects.map((p) => {
              const inIt = memberOf.includes(p);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={inIt}
                    disabled={busyId !== null}
                    onClick={() => toggle(p, !inIt)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors disabled:opacity-60',
                      inIt ? 'bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] text-white' : 'text-sky-200 hover:bg-white/10',
                    )}
                  >
                    <span className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      inIt ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-black' : 'border-white/25',
                    )}>
                      {busyId === p.id ? <Loader2 size={10} className="animate-spin text-white" /> : inIt && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="truncate">{p.name}</span>
                    {p.is_focus && <Star size={10} className="ml-auto shrink-0 fill-yellow-400 text-yellow-400" aria-label="Focus project" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-white/10 pt-1.5">
            {creating ? (
              <NewProjectField onCreate={onCreateWith} onDone={() => { setCreating(false); }} placeholder="New project name" />
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold text-[var(--theme-accent)] hover:bg-white/10 hover:text-white"
              >
                <Plus size={12} /> New project with this
              </button>
            )}
          </div>
          {error && <p className="px-1 text-[10px] text-red-300">{error}</p>}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Pick challenges to add to a project ──────────────────────

export interface PickableChallenge {
  challenge: HunterChallenge;
  name: string;
  image: string | null;
  /** e.g. "Weapon", "Armour", "Visage" */
  group: string;
  detail: string;
}

export function AddToProjectDialog({
  project,
  options,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  project: ChallengeProject;
  /** Challenges not yet in the project */
  options: PickableChallenge[];
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (challenges: HunterChallenge[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [hideDone, setHideDone] = useState(true);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = options.filter((o) =>
      (!hideDone || o.challenge.status !== 'completed') &&
      (!q || o.name.toLowerCase().includes(q) || o.detail.toLowerCase().includes(q) || o.group.toLowerCase().includes(q)));
    const map = new Map<string, PickableChallenge[]>();
    for (const o of list) map.set(o.group, [...(map.get(o.group) ?? []), o]);
    return [...map.entries()];
  }, [options, query, hideDone]);

  const visibleIds = groups.flatMap(([, list]) => list.map((o) => o.challenge.id));
  const allVisiblePicked = visibleIds.length > 0 && visibleIds.every((id) => picked.has(id));

  const flip = (ids: string[], on: boolean) => setPicked((prev) => {
    const next = new Set(prev);
    for (const id of ids) { if (on) next.add(id); else next.delete(id); }
    return next;
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="mho-panel flex max-h-[85vh] w-full max-w-lg flex-col gap-3 p-4 text-white shadow-2xl">
        <div className="flex items-start gap-2">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
            <FolderPlus size={16} className="shrink-0 text-[var(--theme-accent)]" />
            <span className="truncate">Add to “{project.name}”</span>
          </h2>
          <button type="button" onClick={onCancel} className="text-sky-500 hover:text-white" title="Close"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5">
            <Search size={13} className="shrink-0 text-sky-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your challenges"
              className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-sky-600 focus:outline-none"
            />
          </label>
          <label className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[11px] font-semibold text-sky-300">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-3.5 w-3.5 accent-yellow-500" />
            Hide collected
          </label>
        </div>

        <div className="min-h-[8rem] flex-1 space-y-3 overflow-y-auto pr-1">
          {options.length === 0 ? (
            <p className="py-8 text-center text-xs text-sky-500">Every challenge you're tracking is already in this project.</p>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-xs text-sky-500">No challenges match.</p>
          ) : groups.map(([group, list]) => {
            const ids = list.map((o) => o.challenge.id);
            const all = ids.every((id) => picked.has(id));
            return (
              <section key={group} className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-sky-400">{group}</h3>
                  <span className="font-mono text-[10px] text-sky-600">{list.length}</span>
                  <button type="button" onClick={() => flip(ids, !all)} className="ml-auto text-[10px] font-bold text-sky-400 hover:text-white">
                    {all ? 'Clear' : 'Select all'}
                  </button>
                </div>
                <ul className="space-y-1">
                  {list.map((o) => {
                    const on = picked.has(o.challenge.id);
                    return (
                      <li key={o.challenge.id}>
                        <button
                          type="button"
                          onClick={() => flip([o.challenge.id], !on)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                            on ? 'border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-accent)_12%,transparent)]' : 'border-white/10 bg-black/20 hover:border-white/25',
                          )}
                        >
                          <span className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                            on ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)] text-black' : 'border-white/25',
                          )}>
                            {on && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                            {o.image && <img src={o.image} alt="" loading="lazy" className="h-full w-full object-contain" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-semibold text-white">{o.name}</span>
                            <span className="block truncate text-[10px] text-sky-500">{o.detail}</span>
                          </span>
                          {o.challenge.status === 'completed' && <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">{error}</p>}

        <div className="flex items-center gap-2 border-t border-white/10 pt-3">
          {visibleIds.length > 0 && (
            <button type="button" onClick={() => flip(visibleIds, !allVisiblePicked)} className="text-[11px] font-bold text-sky-400 hover:text-white">
              {allVisiblePicked ? 'Clear shown' : 'Select all shown'}
            </button>
          )}
          <span className="ml-auto" />
          <button type="button" onClick={onCancel} className="btn-mho-panel !px-3 !py-1.5 !text-sm">Cancel</button>
          <button
            type="button"
            disabled={busy || picked.size === 0}
            onClick={() => onConfirm(options.filter((o) => picked.has(o.challenge.id)).map((o) => o.challenge))}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[var(--theme-grad-from)] to-[var(--theme-grad-to)] px-3 py-1.5 text-sm font-bold text-[var(--theme-on-accent)] disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add {picked.size || ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
