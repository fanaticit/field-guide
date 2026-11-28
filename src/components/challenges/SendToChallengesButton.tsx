// ─────────────────────────────────────────────────────────────
// SendToChallengesButton — the standard "Send to Challenges" control.
//
// Not tracked yet: tapping opens a small pop-up.
//   • A countdown adds the item to Challenges on its own ("just add").
//     It pauses while the pointer is over the pop-up.
//   • Or pick one of the hunter's projects: the item is added and put in that project.
//   • Or make a new project with it, add straight away, or cancel.
//
// Already tracked: the button reads "In Challenges ✓" and the pop-up lists the projects
// with a tick for each one the item is in (tap to add / take out), plus "Remove".
//
// Items with more than one kind of challenge (a buddy: recruit, Tier 1 or Tier 2) pass
// `goals`: the pop-up shows them as chips above the countdown, and picking one holds the
// countdown so nothing is added until the hunter confirms. When tracked, the chips change
// the challenge's goal (onChangeGoal).
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { Check, FolderKanban, Loader2, Plus, Star, Target, Trash2, X, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import {
  useChallengeProjects,
  useCreateProject,
  useAddChallengesToProject,
  useRemoveChallengesFromProject,
  projectErrorMessage,
  type ChallengeProject,
} from '../../hooks/useChallengeProjects';
import { NewProjectField } from './ProjectPanels';

/** Seconds before "just add to Challenges" happens on its own. */
const AUTO_ADD_SECONDS = 4;
const POPUP_WIDTH = 272;

export interface ChallengeGoalOption {
  /** Stored as the challenge's max_rarity */
  value: number;
  label: string;
  badge?: string;
}

/** What a page hands its item cards so they can show the standard Send to Challenges button. */
export interface ItemChallengeActions<T> {
  userId: string | null | undefined;
  onAdd: (item: T, goal?: number) => Promise<HunterChallenge | null | undefined>;
  onRemove: (challenge: HunterChallenge) => Promise<unknown>;
  onChangeGoal?: (challenge: HunterChallenge, goal: number) => Promise<unknown>;
  onRequireLogin: () => void;
}

export interface SendToChallengesButtonProps {
  userId: string | null | undefined;
  /** The challenge when the item is already tracked */
  challenge?: HunterChallenge | null;
  /** Creates the challenge (with the chosen goal, when there are goals) and returns it */
  onAdd: (goal?: number) => Promise<HunterChallenge | null | undefined>;
  /** Kinds of challenge to choose from (e.g. buddy: recruit / Tier 1 / Tier 2) */
  goals?: ChallengeGoalOption[];
  /** Goal picked when the pop-up opens (default: the first) */
  defaultGoal?: number;
  /** Changes the goal of the tracked challenge. Omit to hide the goal chips when tracked. */
  onChangeGoal?: (goal: number) => Promise<unknown>;
  /** Removes the challenge. Omit to hide "Remove from Challenges". */
  onRemove?: () => Promise<unknown>;
  /** Called instead of opening when nobody is signed in */
  onRequireLogin?: () => void;
  /** What is being sent, for the pop-up heading (e.g. "Capture a Rathalos") */
  itemName?: string;
  label?: string;
  trackedLabel?: string;
  className?: string;
}

type Phase = 'closed' | 'countdown' | 'working' | 'added' | 'manage';

export function SendToChallengesButton({
  userId,
  challenge,
  onAdd,
  goals,
  defaultGoal,
  onChangeGoal,
  onRemove,
  onRequireLogin,
  itemName,
  label = 'Send to Challenges',
  trackedLabel = 'In Challenges ✓',
  className,
}: SendToChallengesButtonProps) {
  const tracked = Boolean(challenge);
  const { data: projects = [], isLoading: loadingProjects } = useChallengeProjects(userId);
  const createProject = useCreateProject();
  const addToProject = useAddChallengesToProject();
  const removeFromProject = useRemoveChallengesFromProject();

  const [phase, setPhase] = useState<Phase>('closed');
  const [remaining, setRemaining] = useState(AUTO_ADD_SECONDS * 1000);
  const [paused, setPaused] = useState(false);
  // Set once the hunter picks a goal: the countdown then waits for them to confirm
  const [held, setHeld] = useState(false);
  const [goal, setGoal] = useState<number | undefined>(undefined);
  const [goalBusy, setGoalBusy] = useState<number | null>(null);
  const goalRef = useRef<number | undefined>(undefined);
  goalRef.current = goal;
  const [creating, setCreating] = useState(false);
  const [busyProject, setBusyProject] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // The challenge made during this pop-up (so picking a project after "add" doesn't add twice)
  const madeRef = useRef<HunterChallenge | null>(null);
  const phaseRef = useRef<Phase>('closed');
  phaseRef.current = phase;

  const open = phase !== 'closed';
  const current = challenge ?? madeRef.current;
  const memberOf = current ? projects.filter((p) => p.items.some((i) => i.challenge_id === current.id)) : [];

  const close = useCallback(() => {
    setPhase('closed');
    setCreating(false);
    setPaused(false);
    setHeld(false);
    setError(null);
    setMessage(null);
  }, []);

  /** Make sure the challenge exists; returns it. */
  const ensureChallenge = useCallback(async (): Promise<HunterChallenge> => {
    if (challenge) return challenge;
    if (madeRef.current) return madeRef.current;
    const made = await onAdd(goals?.length ? goalRef.current : undefined);
    if (!made) throw new Error('Could not add it to Challenges.');
    madeRef.current = made;
    return made;
  }, [challenge, onAdd, goals]);

  const justAdd = useCallback(async () => {
    if (phaseRef.current !== 'countdown') return;
    setPhase('working');
    setError(null);
    try {
      await ensureChallenge();
      setMessage('Added to Challenges');
      setPhase('added');
    } catch (err) {
      setError(projectErrorMessage(err));
      setPhase('countdown');
      setPaused(true);
    }
  }, [ensureChallenge]);

  const addToProjectNow = async (project: ChallengeProject) => {
    setBusyProject(project.id);
    setError(null);
    const wasCountdown = phaseRef.current === 'countdown';
    if (wasCountdown) setPhase('working');
    try {
      const c = await ensureChallenge();
      await addToProject.mutateAsync({ project, challenges: [c] });
      setMessage(`Added to Challenges and “${project.name}”`);
      setPhase('added');
    } catch (err) {
      setError(projectErrorMessage(err));
      if (wasCountdown) { setPhase('countdown'); setPaused(true); }
    } finally {
      setBusyProject(null);
    }
  };

  const toggleProject = async (project: ChallengeProject, add: boolean) => {
    if (!current) return;
    setBusyProject(project.id);
    setError(null);
    try {
      if (add) await addToProject.mutateAsync({ project, challenges: [current] });
      else await removeFromProject.mutateAsync({ projectId: project.id, challengeIds: [current.id] });
    } catch (err) {
      setError(projectErrorMessage(err));
    } finally {
      setBusyProject(null);
    }
  };

  const createWith = async (name: string) => {
    if (!userId) return;
    const wasCountdown = phaseRef.current === 'countdown';
    if (wasCountdown) setPhase('working');
    try {
      const c = await ensureChallenge();
      const project = await createProject.mutateAsync({ userId, name, sortOrder: projects.length });
      await addToProject.mutateAsync({ project, challenges: [c] });
      setCreating(false);
      setMessage(`Added to Challenges and new project “${project.name}”`);
      setPhase('added');
    } catch (err) {
      if (wasCountdown) { setPhase('countdown'); setPaused(true); }
      throw new Error(projectErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!onRemove) return;
    setPhase('working');
    setError(null);
    try {
      await onRemove();
      madeRef.current = null;
      close();
    } catch (err) {
      setError(projectErrorMessage(err));
      setPhase('manage');
    }
  };

  const openPopup = () => {
    if (!userId) { onRequireLogin?.(); return; }
    if (open) { if (phase === 'countdown') void justAdd(); else close(); return; }
    madeRef.current = null;
    setError(null);
    setMessage(null);
    setCreating(false);
    setPaused(false);
    setHeld(false);
    setGoal(goals?.length ? (goals.some((g) => g.value === defaultGoal) ? defaultGoal : goals[0].value) : undefined);
    setRemaining(AUTO_ADD_SECONDS * 1000);
    setPhase(tracked ? 'manage' : 'countdown');
  };

  const pickGoal = (value: number) => {
    setGoal(value);
    setHeld(true);
  };

  const changeGoal = async (value: number) => {
    if (!onChangeGoal || value === challenge?.max_rarity) return;
    setGoalBusy(value);
    setError(null);
    try {
      await onChangeGoal(value);
    } catch (err) {
      setError(projectErrorMessage(err));
    } finally {
      setGoalBusy(null);
    }
  };

  const goalChips = (active: number | undefined, onPick: (v: number) => void, disabled: boolean) => goals?.length ? (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Challenge goal">
      {goals.map((g) => {
        const on = g.value === active;
        return (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onPick(g.value)}
            className={cn(
              'flex min-w-[3.75rem] flex-1 flex-col items-center rounded-md border px-1.5 py-1 text-center transition-colors disabled:opacity-60',
              on ? 'border-mh-gold-400 bg-mh-gold-500/20 text-white' : 'border-white/10 bg-black/30 text-sky-300 hover:border-white/30 hover:text-white',
            )}
          >
            <span className="flex items-center gap-1 text-[10px] font-bold leading-tight">
              {goalBusy === g.value ? <Loader2 size={9} className="animate-spin" /> : on && <Check size={9} strokeWidth={3} />}
              {g.label}
            </span>
            {g.badge && <span className={cn('text-[9px] font-semibold', on ? 'text-mh-gold-300' : 'text-sky-500')}>{g.badge}</span>}
          </button>
        );
      })}
    </div>
  ) : null;

  // Countdown → just add
  useEffect(() => {
    if (phase !== 'countdown' || paused || held || creating) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setRemaining((r) => Math.max(0, r - dt));
    }, 50);
    return () => window.clearInterval(id);
  }, [phase, paused, held, creating]);

  useEffect(() => {
    if (phase === 'countdown' && remaining <= 0) void justAdd();
  }, [phase, remaining, justAdd]);

  // "Added" closes itself after a moment
  useEffect(() => {
    if (phase !== 'added') return;
    const id = window.setTimeout(close, 1800);
    return () => window.clearTimeout(id);
  }, [phase, close]);

  // Position next to the button (below, or above when there is no room)
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - POPUP_WIDTH - 8, r.right - POPUP_WIDTH));
      const up = window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom;
      setPos({ top: up ? r.top - 6 : r.bottom + 6, left, up });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Click outside: during the countdown that means "just add"; otherwise close
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      if (phaseRef.current === 'countdown') void justAdd();
      else if (phaseRef.current !== 'working') close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (phaseRef.current !== 'working') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close, justAdd]);

  const seconds = Math.ceil(remaining / 1000);
  const counting = phase === 'countdown' || (phase === 'working' && !tracked);
  const listLocked = phase === 'working' || phase === 'added';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); openPopup(); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={tracked ? 'In your Challenges — tap for projects or to remove' : 'Add this to your Hunter’s Challenges'}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow-sm transition-colors',
          tracked
            ? 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
            : 'border-mh-slate-750 bg-mh-slate-800 font-semibold text-mh-slate-300 hover:border-mh-gold-500/50 hover:bg-mh-slate-750 hover:text-mh-gold-300',
          open && 'ring-1 ring-mh-gold-500/60',
          className,
        )}
      >
        {tracked ? <Target size={11} className="text-yellow-400" /> : <Plus size={11} className="text-mh-gold-400" />}
        <span>{tracked ? trackedLabel : label}</span>
        {tracked && memberOf.length > 0 && (
          <span className="flex items-center gap-0.5 rounded bg-black/30 px-1 font-mono text-[9px] text-yellow-200" title={memberOf.map((p) => p.name).join(', ')}>
            <FolderKanban size={9} />{memberOf.length}
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label="Send to Challenges"
          // Menus that hold this button can ignore clicks in the pop-up (it lives in a portal)
          data-challenge-popup=""
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{ top: pos.top, left: pos.left, width: POPUP_WIDTH, transform: pos.up ? 'translateY(-100%)' : undefined }}
          className="mho-panel fixed z-[200] overflow-hidden !bg-[#1d1d22] text-white shadow-2xl shadow-black/60"
        >
          {/* Heading / countdown */}
          {phase === 'added' ? (
            <div className="flex items-start gap-2 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"><Check size={14} strokeWidth={3} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-200">{message}</p>
                <Link to="/challenges" className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 hover:text-white">
                  Open Challenges <ArrowRight size={10} />
                </Link>
              </div>
              <button type="button" onClick={close} className="text-sky-500 hover:text-white" title="Close"><X size={14} /></button>
            </div>
          ) : counting ? (
            <div className="space-y-2 border-b border-white/10 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white">
                    {phase === 'working' ? 'Adding to Challenges…' : held ? 'Add to Challenges' : `Adding to Challenges in ${seconds}s`}
                  </p>
                  {itemName && <p className="truncate text-[10px] text-sky-400" title={itemName}>{itemName}</p>}
                </div>
                <button type="button" onClick={close} disabled={phase === 'working'} className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-sky-400 hover:bg-white/10 hover:text-white disabled:opacity-40">
                  Cancel
                </button>
              </div>
              {goalChips(goal, pickGoal, phase === 'working')}
              <div className={cn('h-1 w-full overflow-hidden rounded-full bg-white/10', held && 'invisible')}>
                <div
                  className={cn('h-full rounded-full bg-mh-gold-400', paused && phase === 'countdown' && 'opacity-50')}
                  style={{ width: `${(remaining / (AUTO_ADD_SECONDS * 1000)) * 100}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => void justAdd()}
                disabled={phase === 'working'}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-mh-gold-500/50 bg-mh-gold-500/15 py-1.5 text-[11px] font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 disabled:opacity-60"
              >
                {phase === 'working' && !busyProject ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                {goals?.length && held
                  ? `Add: ${goals.find((g) => g.value === goal)?.label ?? 'challenge'}`
                  : 'Just add to Challenges'}
              </button>
              {(paused || held) && phase === 'countdown' && (
                <p className="text-center text-[9px] text-sky-500">{held ? 'Waiting for you — add it or pick a project' : 'Paused while you choose'}</p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 border-b border-white/10 p-3">
              <Target size={14} className="mt-0.5 shrink-0 text-yellow-400" />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-bold text-white">In your Challenges</p>
                  {itemName && <p className="truncate text-[10px] text-sky-400" title={itemName}>{itemName}</p>}
                  <Link to="/challenges" className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 hover:text-white">
                    Open Challenges <ArrowRight size={10} />
                  </Link>
                </div>
                {onChangeGoal && goals?.length ? (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-sky-500">Goal</p>
                    {goalChips(challenge?.max_rarity ?? undefined, (v) => void changeGoal(v), goalBusy !== null || phase === 'working')}
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={close} className="text-sky-500 hover:text-white" title="Close"><X size={14} /></button>
            </div>
          )}

          {/* Projects */}
          {phase !== 'added' && (
            <div className="space-y-1 p-2">
              <p className="flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                <FolderKanban size={11} /> {tracked ? 'Projects' : 'Or send to a project'}
              </p>
              {loadingProjects ? (
                <p className="flex items-center gap-1.5 px-1 py-1 text-[11px] text-sky-500"><Loader2 size={11} className="animate-spin" /> Loading projects…</p>
              ) : projects.length === 0 && !creating ? (
                <p className="px-1 py-0.5 text-[11px] text-sky-500">No projects yet.</p>
              ) : (
                <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                  {projects.map((p) => {
                    const inIt = memberOf.includes(p);
                    const busy = busyProject === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={listLocked || busyProject !== null}
                          onClick={() => (tracked ? toggleProject(p, !inIt) : addToProjectNow(p))}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors disabled:opacity-60',
                            inIt ? 'bg-yellow-500/10 text-white' : 'text-sky-200 hover:bg-white/10 hover:text-white',
                          )}
                        >
                          {tracked ? (
                            <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', inIt ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-white/25')}>
                              {busy ? <Loader2 size={10} className="animate-spin text-white" /> : inIt && <Check size={11} strokeWidth={3} />}
                            </span>
                          ) : (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-sky-500">
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                            </span>
                          )}
                          <span className="truncate">{p.name}</span>
                          {p.is_focus && <Star size={10} className="shrink-0 fill-yellow-400 text-yellow-400" aria-label="Focus project" />}
                          <span className="ml-auto shrink-0 font-mono text-[9px] text-sky-600">{p.items.length}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t border-white/10 pt-1.5">
                {creating ? (
                  <NewProjectField onCreate={createWith} onDone={() => setCreating(false)} placeholder="New project name" />
                ) : (
                  <button
                    type="button"
                    disabled={listLocked}
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold text-mh-gold-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <Plus size={12} /> New project with this
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p className="mx-2 mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-200">{error}</p>}

          {tracked && onRemove && phase !== 'added' && (
            <div className="border-t border-white/10 p-2">
              <button
                type="button"
                onClick={remove}
                disabled={phase === 'working'}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
              >
                {phase === 'working' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove from Challenges
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

export default SendToChallengesButton;
