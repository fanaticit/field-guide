// ─────────────────────────────────────────────────────────────
// MonsterGridCard — Grid View item for Monster Guide
// Features:
// - Borderless 200% monster icon
// - Bottom control bar under monster icon
// - Challenge button (right-hand side) toggles Study Progress popup checklist
// - Up to 3 uncompleted study icons (lock, camera, eye, crowns)
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, Footprints, Target } from 'lucide-react';
import type { DBMonster } from '../../hooks/useAdminMonsters';
import type {
  MonsterStudyRecord,
  StandardStudyKey,
} from '../../hooks/useUserMonsterStudy';
import { cn } from '../../lib/utils';
import type { JourneyNodeState, JourneyStep } from '../../hooks/useInvestigationJourney';
import { HowToUnlockButton, FreeHuntCounter } from '../../components/monsters/JourneyUnlockInfo';

/** Investigation Journey details for one card (all optional) */
export interface MonsterCardJourney {
  /** The journey step that unlocks this monster */
  unlockStep?: JourneyStep;
  /** Steps that need studies of this monster (shows the Free Hunt Study counter) */
  studyNeeds: JourneyStep[];
  /** Studies logged for this monster */
  studies: number;
  /** Studies logged for the unlock step's required monster */
  requiredStudies: number;
  requiredIcon?: string | null;
  /** Highlight while "Investigation Journey" is on; null = not on the journey */
  state?: JourneyNodeState | null;
  /** Journey view is on and this monster is not part of it */
  dimmed?: boolean;
  /** The hunter shows spoilers (name the monsters still to unlock) */
  spoilers?: boolean;
}

interface MonsterGridCardProps {
  monster: DBMonster;
  study: MonsterStudyRecord;
  onSelect: () => void;
  onToggleStandardTask: (monsterId: string, taskKey: StandardStudyKey, isElder?: boolean) => void;
  onToggleCustomTask?: (monsterId: string, taskId: string) => void;
  journey?: MonsterCardJourney;
  onSetFreeHunt?: (monsterId: string, count: number) => void;
  onOpenMonster?: (monsterId: string) => void;
}

const JOURNEY_STATE_CLASS: Record<JourneyNodeState, string> = {
  unlocked: 'ring-2 ring-amber-400 bg-amber-500/10 shadow-[0_0_18px_rgba(251,191,36,0.55)]',
  current: 'ring-2 ring-amber-400/45 bg-amber-500/5 shadow-[0_0_10px_rgba(251,191,36,0.25)]',
  next: 'outline-dashed outline-2 outline-offset-1 outline-sky-400/80',
  locked: 'outline-dashed outline-1 outline-offset-1 outline-mh-slate-500/60 opacity-60',
};

export default function MonsterGridCard({
  monster,
  study,
  onSelect,
  onToggleStandardTask,
  onToggleCustomTask,
  journey,
  onSetFreeHunt,
  onOpenMonster,
}: MonsterGridCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'right';
  }>({ vertical: 'bottom', horizontal: 'right' });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSmall = monster.tier === 'small';
  const isElder = monster.tier === 'elder' || monster.species === 'elder_dragon';
  const isFinished = isElder ? (study.unlocked || study.finished) : study.finished;

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vertical = rect.top < 250 ? 'top' : 'bottom';
      const horizontal = rect.left < 220 ? 'left' : 'right';
      setMenuPosition({ vertical, horizontal });
    }
    setMenuOpen((prev) => !prev);
  };

  // ── Compute up to 3 uncompleted icons in priority order ──
  // Small monsters have no study progress.
  // Elder dragons only have Unlocked study progress.
  // Standard large monsters follow priority:
  // 1. Unlocked (lock.png)
  // 2. Photo Taken (camera.png)
  // 3. Witness ecological behavior (eye.png)
  // If completed, replace with:
  // 4. Miniature Gold Crown (Crown_Miniature_Gold.png)
  // 5. Giant Gold Crown (Crown_Giant_Gold.png)
  // Cap at 3 icons max.
  const uncompletedIcons = useMemo(() => {
    if (isSmall) return [];

    if (isElder) {
      if (!study.unlocked) {
        return [
          {
            key: 'unlocked' as StandardStudyKey,
            label: 'Unlocked',
            icon: '/img/ui/lock.png',
          },
        ];
      }
      return [];
    }

    const list: { key: StandardStudyKey; label: string; icon: string }[] = [];

    if (!study.unlocked) {
      list.push({
        key: 'unlocked',
        label: 'Unlocked',
        icon: '/img/ui/lock.png',
      });
    }
    if (!study.photo_taken) {
      list.push({
        key: 'photo_taken',
        label: 'Photo Taken',
        icon: '/img/ui/camera.png',
      });
    }
    if (!study.witnessed_behavior) {
      list.push({
        key: 'witnessed_behavior',
        label: 'Witness ecological behavior',
        icon: '/img/ui/eye.png',
      });
    }

    if (list.length < 3 && !study.miniature_crown) {
      list.push({
        key: 'miniature_crown',
        label: 'Miniature Gold Crown',
        icon: '/img/ui/Crown_Miniature_Gold.png',
      });
    }
    if (list.length < 3 && !study.giant_crown) {
      list.push({
        key: 'giant_crown',
        label: 'Giant Gold Crown',
        icon: '/img/ui/Crown_Giant_Gold.png',
      });
    }

    return list;
  }, [
    isSmall,
    isElder,
    study.unlocked,
    study.photo_taken,
    study.witnessed_behavior,
    study.miniature_crown,
    study.giant_crown,
  ]);

  // Overall completion count
  const completedCount = useMemo(() => {
    if (isSmall) return 0;
    if (isElder) {
      let c = study.unlocked ? 1 : 0;
      study.custom_tasks.forEach((t) => {
        if (t.completed) c++;
      });
      return c;
    }
    let c = 0;
    if (study.unlocked) c++;
    if (study.photo_taken) c++;
    if (study.witnessed_behavior) c++;
    if (study.hunted_10_plus) c++;
    if (study.miniature_crown) c++;
    if (study.giant_crown) c++;
    if (study.finished) c++;
    study.custom_tasks.forEach((t) => {
      if (t.completed) c++;
    });
    return c;
  }, [isSmall, isElder, study]);

  const totalTasks = isSmall
    ? 0
    : isElder
    ? 1 + study.custom_tasks.length
    : 7 + study.custom_tasks.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      data-monster-id={monster.id}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'relative flex flex-col items-center justify-start p-1 sm:p-1.5 rounded-xl transition-all duration-150 group text-center cursor-pointer border',
        menuOpen
          ? 'bg-mh-slate-800/90 border-mh-gold-500/50 shadow-lg'
          : 'border-transparent hover:border-mh-gold-500/30 hover:bg-mh-slate-800/70',
        'focus:outline-none focus:ring-1 focus:ring-mh-gold-500/50',
        journey?.state && JOURNEY_STATE_CLASS[journey.state],
        journey?.state === 'current' && 'animate-[pulse_3s_ease-in-out_infinite]',
        journey?.dimmed && 'opacity-30 hover:opacity-80',
      )}
    >
      {/* ── Monster Icon Artwork ── */}
      <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 shrink-0 items-center justify-center">
        {monster.icon ? (
          <img
            src={monster.icon}
            alt={monster.name}
            className="h-full w-full object-contain filter drop-shadow transition-transform duration-150 group-hover:scale-108"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Footprints size={28} className="text-mh-slate-500" />
        )}
      </div>

      {/* ── Bottom Control Bar directly under the monster icon (hidden for small monsters) ── */}
      {!isSmall && (
        <div className="relative w-full flex items-center justify-between px-0.5 mt-0.5 min-h-[20px] z-10">
          {/* Left/Center: Incomplete Study Progress Icons (Max 3) */}
          <div className="flex items-center gap-0.5">
            {uncompletedIcons.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStandardTask(monster.id, item.key, isElder);
                }}
                title={`Click to mark ${item.label} as done`}
                className="flex items-center justify-center p-0.5 rounded hover:bg-white/10 transition-transform hover:scale-115 focus:outline-none"
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain opacity-80 hover:opacity-100 filter drop-shadow-xs"
                />
              </button>
            ))}
          </div>

          {/* Right: Challenge Icon Button (clickable popover trigger) */}
          <div className="relative ml-auto">
            <button
              ref={buttonRef}
              type="button"
              onClick={handleToggleMenu}
              title={
                isFinished
                  ? 'Study Finished! Click to view progress'
                  : 'Study Progress: Click to update tasks'
              }
              className={cn(
                'relative flex h-5 w-5 sm:h-5.5 sm:w-5.5 items-center justify-center rounded-md p-0.5 transition-all focus:outline-none hover:scale-115',
                isFinished
                  ? 'bg-amber-500/25 ring-1 ring-amber-400/60 shadow-sm shadow-amber-500/30'
                  : 'bg-black/40 hover:bg-black/70 ring-1 ring-mh-slate-700/60 hover:ring-mh-gold-400/50',
              )}
            >
              <img
                src={
                  isFinished
                    ? '/img/ui/my_challenges_selected.png'
                    : '/img/ui/my_challenges.png'
                }
                alt="Study Challenges"
                className={cn(
                  'h-full w-full object-contain filter drop-shadow transition-opacity',
                  isFinished ? 'opacity-100' : 'opacity-75 hover:opacity-100',
                )}
              />
            </button>

            {/* ── Popover Menu for Study Progress ── */}
            {menuOpen && (
              <div
                ref={menuRef}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'absolute z-50 w-56 rounded-xl border border-mh-gold-500/50 bg-mh-slate-950/98 p-2 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-100 text-left',
                  menuPosition.vertical === 'bottom'
                    ? 'bottom-full mb-1.5'
                    : 'top-full mt-1.5',
                  menuPosition.horizontal === 'right' ? 'right-0' : 'left-0',
                )}
                style={{
                  boxShadow:
                    '0 12px 30px rgba(0,0,0,0.85), 0 0 15px rgba(234,179,8,0.2)',
                }}
              >
                {/* Menu Header */}
                <div className="px-1.5 pb-1.5 mb-1 border-b border-mh-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/img/ui/my_challenges.png"
                      alt=""
                      className="w-3.5 h-3.5 object-contain"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-mh-gold-400">
                      Study Progress
                    </span>
                  </div>
                  <span className="text-[9px] text-mh-slate-400 font-semibold">
                    {completedCount}/{totalTasks}
                  </span>
                </div>

                {/* Study Tasks List */}
                <div className="space-y-0.5 max-h-60 overflow-y-auto pr-0.5">
                  {/* 1. Unlocked (+ how the Investigation Journey unlocks it) */}
                  <TaskRow
                    label="Unlocked"
                    icon="/img/ui/lock.png"
                    completed={study.unlocked}
                    onClick={() => onToggleStandardTask(monster.id, 'unlocked', isElder)}
                    trailing={journey?.unlockStep && (
                      <HowToUnlockButton
                        step={journey.unlockStep}
                        monsterStudies={journey.requiredStudies}
                        monsterIcon={journey.requiredIcon}
                        onOpenMonster={onOpenMonster}
                      />
                    )}
                  />

                  {/* Standard large monsters tasks (hidden for Elders) */}
                  {!isElder && (
                    <>
                      {/* 2. Photo Taken */}
                      <TaskRow
                        label="Photo Taken"
                        icon="/img/ui/camera.png"
                        completed={study.photo_taken}
                        onClick={() => onToggleStandardTask(monster.id, 'photo_taken')}
                      />

                      {/* 3. Witness ecological behavior */}
                      <TaskRow
                        label="Witness ecological behavior"
                        icon="/img/ui/eye.png"
                        completed={study.witnessed_behavior}
                        onClick={() =>
                          onToggleStandardTask(monster.id, 'witnessed_behavior')
                        }
                      />

                      {/* 4. Hunted 10+ */}
                      <TaskRow
                        label="Hunted 10+"
                        lucideIcon={<Target size={12} className="text-rose-400" />}
                        completed={study.hunted_10_plus}
                        onClick={() =>
                          onToggleStandardTask(monster.id, 'hunted_10_plus')
                        }
                      />

                      {/* 5. Miniature Gold Crown */}
                      <TaskRow
                        label="Miniature Gold Crown"
                        icon="/img/ui/Crown_Miniature_Gold.png"
                        completed={study.miniature_crown}
                        onClick={() =>
                          onToggleStandardTask(monster.id, 'miniature_crown')
                        }
                      />

                      {/* 6. Giant Gold Crown */}
                      <TaskRow
                        label="Giant Gold Crown"
                        icon="/img/ui/Crown_Giant_Gold.png"
                        completed={study.giant_crown}
                        onClick={() => onToggleStandardTask(monster.id, 'giant_crown')}
                      />
                    </>
                  )}

                  {/* Free Hunt Study count for monsters the Investigation Journey needs */}
                  {journey && journey.studyNeeds.length > 0 && onSetFreeHunt && (
                    <FreeHuntCounter
                      compact
                      count={study.free_hunt_studies ?? 0}
                      logged={journey.studies}
                      needs={journey.studyNeeds}
                      revealNames={journey.spoilers ?? false}
                      onChange={(n) => onSetFreeHunt(monster.id, n)}
                    />
                  )}

                  {/* Custom Tasks if any */}
                  {study.custom_tasks.length > 0 && (
                    <>
                      <div className="pt-1 pb-0.5 px-1.5 text-[8px] font-bold uppercase tracking-wider text-mh-slate-500 border-t border-mh-slate-800/60 mt-1">
                        Custom Goals
                      </div>
                      {study.custom_tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          label={task.label}
                          completed={task.completed}
                          onClick={() =>
                            onToggleCustomTask &&
                            onToggleCustomTask(monster.id, task.id)
                          }
                        />
                      ))}
                    </>
                  )}

                  {/* Divider and Finished action for standard monsters */}
                  {!isElder && (
                    <>
                      <div className="my-1 border-t border-mh-slate-800" />
                      <TaskRow
                        label="Finished"
                        icon="/img/ui/my_challenges_selected.png"
                        completed={study.finished}
                        highlight
                        onClick={() => onToggleStandardTask(monster.id, 'finished')}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Monster Name Underneath ── */}
      <span className="mt-1 text-[10px] sm:text-[11px] font-bold leading-tight text-mh-slate-200 group-hover:text-mh-gold-300 transition-colors line-clamp-2 max-w-full">
        {monster.name}
      </span>

      {monster.is_variant && (
        <span className="mt-0.5 rounded bg-purple-500/20 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-purple-300">
          Variant
        </span>
      )}
      {monster.is_radiant && (
        <span className="mt-0.5 rounded bg-amber-500/20 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-amber-400">
          Radiant
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponent: Checkbox Task Row in Popup Menu
// ─────────────────────────────────────────────────────────────
function TaskRow({
  label,
  icon,
  lucideIcon,
  completed,
  highlight = false,
  onClick,
  trailing,
}: {
  label: string;
  icon?: string;
  lucideIcon?: React.ReactNode;
  completed: boolean;
  highlight?: boolean;
  onClick: () => void;
  /** Shown at the end of the row, outside the toggle (e.g. a "How to unlock" link) */
  trailing?: React.ReactNode;
}) {
  if (trailing) {
    return (
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <TaskRow label={label} icon={icon} lucideIcon={lucideIcon} completed={completed} highlight={highlight} onClick={onClick} />
        </div>
        {trailing}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-colors group/item text-left',
        completed
          ? highlight
            ? 'bg-amber-500/20 text-amber-300 font-bold'
            : 'bg-mh-gold-500/10 text-mh-gold-200'
          : 'text-mh-slate-300 hover:bg-mh-slate-800/80 hover:text-white',
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Custom styled checkbox */}
        <div
          className={cn(
            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
            completed
              ? highlight
                ? 'bg-amber-400 border-amber-300 text-slate-950 font-black'
                : 'bg-mh-gold-500 border-mh-gold-400 text-slate-950 font-black'
              : 'border-mh-slate-600 bg-mh-slate-900 group-hover/item:border-mh-slate-400',
          )}
        >
          {completed && <Check size={10} strokeWidth={3} />}
        </div>

        {/* Task Icon */}
        {icon ? (
          <img
            src={icon}
            alt=""
            className="w-3.5 h-3.5 object-contain shrink-0"
          />
        ) : lucideIcon ? (
          <div className="shrink-0 flex items-center justify-center w-3.5 h-3.5">
            {lucideIcon}
          </div>
        ) : null}

        {/* Task Label */}
        <span className="truncate text-[11px]">{label}</span>
      </div>
    </button>
  );
}
