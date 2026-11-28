// ─────────────────────────────────────────────────────────────
// MonsterModal — Detailed Monster View & Study Progress Tracker
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Footprints,
  Crosshair,
  Plus,
  Trash2,
  Target,
  Sparkles,
  Sword,
  Check,
  Shield,
  ExternalLink,
  Activity,
  BookMarked,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import type { DBMonster } from '../../hooks/useAdminMonsters';
import { useAuthStore } from '../../store/authStore';
import {
  useUserMonsterStudy,
  type StandardStudyKey,
} from '../../hooks/useUserMonsterStudy';
import {
  useHunterChallenges,
  useAddMonsterChallenge,
  useDeleteChallenge,
  useIncrementChallenge,
  getVisageChallenge,
  type HunterChallenge,
} from '../../hooks/useHunterChallenges';
import { useAdminWeapons } from '../../hooks/useAdminWeapons';
import {
  useMonsterLevels,
  useMonsterHitzones,
} from '../../hooks/useMonsterDetails';
import { useVisageSetsData } from '../../hooks/useVisageSets';
import {
  type DBVisage,
  getInkConfig,
} from '../../data/schemas/visage';
import VisageCard, { InkIconComponent } from './VisageCard';
import VisageModal from './VisageModal';
import ElementIcon from '../../components/ElementIcon';
import { useVisageChallengeActions } from './useVisageChallengeActions';
import { cn } from '../../lib/utils';
import SendToChallengesButton from '../../components/challenges/SendToChallengesButton';
import LoginModal from '../../components/auth/LoginModal';
import { HowToUnlockButton, FreeHuntCounter, UnlockProgressInline } from '../../components/monsters/JourneyUnlockInfo';
import {
  monsterStudyCount,
  stepUnlocking,
  stepsNeedingStudiesOf,
} from '../../hooks/useInvestigationJourney';

interface Props {
  monster: DBMonster | null;
  open: boolean;
  onClose: () => void;
  /** Open another monster (e.g. the one whose studies unlock this one) */
  onOpenMonster?: (monsterId: string) => void;
  /** Monster id → icon, for the "How to unlock" pop-up */
  monsterIcons?: Map<string, string | null>;
}

const TIER_CONFIG: Record<string, { label: string; cls: string }> = {
  small: { label: 'Small Monster', cls: 'rarity-1' },
  low: { label: 'Low Rank', cls: 'rarity-2' },
  high: { label: 'High Rank', cls: 'rarity-4' },
  elder: { label: 'Elder Dragon', cls: 'rarity-elder' },
  collab: { label: 'Collab / Event', cls: 'rarity-5' },
};

const SPECIES_LABELS: Record<string, string> = {
  flying_wyvern: 'Flying Wyvern',
  brute_wyvern: 'Brute Wyvern',
  bird_wyvern: 'Bird Wyvern',
  fanged_wyvern: 'Fanged Wyvern',
  fanged_beast: 'Fanged Beast',
  leviathan: 'Leviathan',
  elder_dragon: 'Elder Dragon',
  piscine_wyvern: 'Piscine Wyvern',
  carapaceon: 'Carapaceon',
  temnoceran: 'Temnoceran',
  neopteron: 'Neopteron',
  herbivore: 'Herbivore',
  lynian: 'Lynian',
  wingdrake: 'Wingdrake',
  relict: 'Relict',
};

const ELEMENT_COLOURS: Record<string, string> = {
  fire: 'bg-el-fire/15 text-el-fire border border-el-fire/30',
  water: 'bg-el-water/15 text-el-water border border-el-water/30',
  thunder: 'bg-el-thunder/15 text-el-thunder border border-el-thunder/30',
  ice: 'bg-el-ice/15 text-el-ice border border-el-ice/30',
  dragon: 'bg-el-dragon/15 text-el-dragon border border-el-dragon/30',
  poison: 'bg-el-poison/15 text-el-poison border border-el-poison/30',
  paralysis: 'bg-el-paralysis/15 text-el-paralysis border border-el-paralysis/30',
  sleep: 'bg-el-sleep/15 text-el-sleep border border-el-sleep/30',
  blast: 'bg-el-blast/15 text-el-blast border border-el-blast/30',
  stun: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
};

const ELEMENT_LABELS: Record<string, string> = {
  fire: 'Fire',
  water: 'Water',
  thunder: 'Thunder',
  ice: 'Ice',
  dragon: 'Dragon',
  poison: 'Poison',
  paralysis: 'Paralysis',
  sleep: 'Sleep',
  blast: 'Blast',
  stun: 'Stun',
};

export default function MonsterModal({ monster, open, onClose, onOpenMonster, monsterIcons }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const {
    getMonsterStudy,
    toggleStandardTask,
    addCustomTask,
    toggleCustomTask,
    deleteCustomTask,
    setFreeHuntStudies,
    studyMap,
    journey,
  } = useUserMonsterStudy();

  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addMonsterChallenge = useAddMonsterChallenge();
  // Standard Send to Challenges pop-up for visage cards (goal, projects, remove)
  const visageChallengeActions = useVisageChallengeActions(useCallback(() => setLoginModalOpen(true), []));
  const deleteChallenge = useDeleteChallenge();
  const incrementChallenge = useIncrementChallenge();

  const { data: allWeapons = [] } = useAdminWeapons({ isActive: true });

  // Visage sets data & user collection tracking
  const {
    dbVisages = [],
    getCardCollection,
    setCardRarity,
    setCardQuantity,
    removeCardFromCollection,
    isCollected,
  } = useVisageSetsData({ showSpoilers: Boolean(profile?.show_spoilers) });

  const [inspectedCard, setInspectedCard] = useState<DBVisage | null>(null);
  const [inspectedInk, setInspectedInk] = useState<string | null>(null);

  // Weapons originating from this monster
  const linkedWeapons = useMemo(() => {
    if (!monster) return [];
    return allWeapons.filter(
      (w) =>
        w.monster_id === monster.id ||
        (w.series && w.series.toLowerCase().includes(monster.name.toLowerCase())) ||
        w.name.toLowerCase().includes(monster.name.toLowerCase()),
    );
  }, [allWeapons, monster]);

  // Visages originating from or depicting this monster
  const linkedVisageItems = useMemo(() => {
    if (!monster) return [];
    const monsterNameLower = (monster.name || '').toLowerCase().trim();
    const matched = dbVisages.filter(
      (v) =>
        (v.monster_id && v.monster_id === monster.id) ||
        (monsterNameLower && (
          (v.name && v.name.toLowerCase().trim() === monsterNameLower) ||
          (v.monster_name && v.monster_name.toLowerCase().trim() === monsterNameLower)
        )),
    );

    const items: { card: DBVisage; ink: string }[] = [];
    for (const card of matched) {
      const inks = card.ink_types && card.ink_types.length > 0 ? card.ink_types : ['flames'];
      for (const ink of inks) {
        items.push({
          card,
          ink: ink === 'fire' ? 'flames' : ink,
        });
      }
    }
    return items;
  }, [dbVisages, monster]);

  const collectedVisagesCount = useMemo(() => {
    return linkedVisageItems.filter((item) => isCollected(item.card.id, item.ink)).length;
  }, [linkedVisageItems, isCollected]);

  // Section tab navigation & filters
  const [activeTab, setActiveTab] = useState<'all' | 'study' | 'hitzones' | 'stats' | 'weapons' | 'visages'>('all');
  const [contentFilter, setContentFilter] = useState<string>('all');

  // Hitzones & Levels queries
  const { data: hitzones = [], isLoading: isLoadingHitzones } = useMonsterHitzones(monster?.id);
  const { data: levels = [], isLoading: isLoadingLevels } = useMonsterLevels(monster?.id);

  // Unique content categories for levels
  const contentCategories = useMemo(() => {
    const set = new Set<string>();
    levels.forEach((l) => {
      if (l.content) set.add(l.content);
    });
    return Array.from(set);
  }, [levels]);

  const filteredLevels = useMemo(() => {
    if (contentFilter === 'all') return levels;
    return levels.filter((l) => l.content === contentFilter);
  }, [levels, contentFilter]);

  // Lock background scroll when open
  useEffect(() => {
    if (!open) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !monster) return null;

  const study = getMonsterStudy(monster.id);
  // Investigation Journey: how this monster is unlocked, and which steps need its studies
  const unlockStep = stepUnlocking(journey, monster.id);
  const studyNeeds = stepsNeedingStudiesOf(journey, monster.id);
  const requiredStudies = unlockStep?.studies_monster_id ? monsterStudyCount(studyMap[unlockStep.studies_monster_id]) : 0;
  const requiredIcon = unlockStep?.studies_monster_id ? monsterIcons?.get(unlockStep.studies_monster_id) : null;
  const tierCfg = TIER_CONFIG[monster.tier] ?? { label: monster.tier, cls: 'rarity-1' };
  const speciesLabel = (monster.species && SPECIES_LABELS[monster.species]) || monster.species || 'Unknown Species';

  const isSmall = monster.tier === 'small';
  const isElder = monster.tier === 'elder' || monster.species === 'elder_dragon';
  const isFinished = isElder ? (study.unlocked || study.finished) : study.finished;

  // Active monster challenges for this monster
  const monsterChallenges = challenges.filter(
    (c) => c.challenge_type === 'monster' && c.monster_id === monster.id,
  );

  const getChallengeForTask = (taskLabel: string): HunterChallenge | undefined => {
    return monsterChallenges.find(
      (c) => (c.notes || '').trim().toLowerCase() === taskLabel.trim().toLowerCase(),
    );
  };

  const handleToggleTaskWithChallengeSync = async (
    taskKey: StandardStudyKey,
    taskLabel: string,
  ) => {
    const isCompletedNow = !study[taskKey];
    await toggleStandardTask(monster.id, taskKey, isElder);

    // If there's an active challenge in /challenges for this task, sync it!
    if (taskKey === 'finished' && isCompletedNow) {
      // User clicked finished -> all tasks are finished! Sync all active monster challenges
      for (const t of standardTasksList) {
        const c = getChallengeForTask(t.label);
        if (c && c.status !== 'completed') {
          await incrementChallenge.mutateAsync(c);
        }
      }
      for (const ct of study.custom_tasks) {
        const c = getChallengeForTask(ct.label);
        if (c && c.status !== 'completed') {
          await incrementChallenge.mutateAsync(c);
        }
      }
    } else {
      const c = getChallengeForTask(taskLabel);
      if (c) {
        if (isCompletedNow && c.status !== 'completed') {
          await incrementChallenge.mutateAsync(c);
        }
      }
    }
  };

  const handleToggleCustomWithChallengeSync = async (
    taskId: string,
    taskLabel: string,
    currentCompleted: boolean,
  ) => {
    const isCompletedNow = !currentCompleted;
    await toggleCustomTask(monster.id, taskId);

    const c = getChallengeForTask(taskLabel);
    if (c) {
      if (isCompletedNow && c.status !== 'completed') {
        await incrementChallenge.mutateAsync(c);
      }
    }
  };

  // Used by the Send to Challenges pop-up
  const addTaskChallenge = async (taskLabel: string, isCompleted: boolean) => {
    if (!user) return null;
    const existing = getChallengeForTask(taskLabel);
    if (existing) return existing;
    const res = await addMonsterChallenge.mutateAsync({
      userId: user.id,
      game: 'mho',
      monsterId: monster.id,
      monsterName: monster.name,
      pieceImage: monster.icon,
      setIcon: monster.icon,
      notes: taskLabel,
      completed: isCompleted,
    });
    return res.challenge;
  };

  const removeTaskChallenge = async (taskLabel: string) => {
    const existing = getChallengeForTask(taskLabel);
    if (existing) await deleteChallenge.mutateAsync(existing.id);
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskInput.trim()) return;
    await addCustomTask(monster.id, customTaskInput.trim());
    setCustomTaskInput('');
    setIsAddingTask(false);
  };

  // Study progress metrics
  const standardTasksList: {
    key: StandardStudyKey;
    label: string;
    icon?: typeof Footprints;
    imgIcon?: string;
    desc: string;
    badge?: string;
  }[] = isElder
    ? [
        {
          key: 'unlocked',
          label: 'Unlocked',
          imgIcon: '/img/ui/lock.png',
          desc: 'Encountered and registered in Field Guide',
        },
      ]
    : [
        {
          key: 'unlocked',
          label: 'Unlocked',
          imgIcon: '/img/ui/lock.png',
          desc: 'Encountered and registered in Field Guide',
        },
        {
          key: 'photo_taken',
          label: 'Photo Taken',
          imgIcon: '/img/ui/camera.png',
          desc: 'Captured in-game photographic evidence',
        },
        {
          key: 'witnessed_behavior',
          label: 'Witness ecological behavior',
          imgIcon: '/img/ui/eye.png',
          desc: 'Observed natural habits and feeding/resting behavior',
        },
        {
          key: 'hunted_10_plus',
          label: 'Hunted 10+',
          icon: Crosshair,
          desc: 'Successfully hunted at least 10 times',
        },
        {
          key: 'miniature_crown',
          label: 'Miniature Gold Crown',
          imgIcon: '/img/ui/Crown_Miniature_Gold.png',
          desc: 'Recorded smallest possible gold crown size specimen',
          badge: 'Mini Crown',
        },
        {
          key: 'giant_crown',
          label: 'Giant Gold Crown',
          imgIcon: '/img/ui/Crown_Giant_Gold.png',
          desc: 'Recorded largest possible giant gold crown size specimen',
          badge: 'Giant Crown',
        },
        {
          key: 'finished',
          label: 'Finished',
          imgIcon: '/img/ui/my_challenges_selected.png',
          desc: 'Complete monster field research mastered — marks all study tasks finished',
          badge: 'Complete All',
        },
      ];

  const totalPoints = isSmall ? 0 : standardTasksList.length + study.custom_tasks.length;
  let completedPoints = 0;
  if (!isSmall) {
    standardTasksList.forEach((t) => {
      if (study[t.key]) completedPoints++;
    });
    study.custom_tasks.forEach((ct) => {
      if (ct.completed) completedPoints++;
    });
  }
  const progressPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className="relative flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-900 shadow-2xl"
        >
          {/* Header Banner with sketch backdrop */}
          <div className="relative shrink-0 overflow-hidden border-b border-mh-slate-800 bg-gradient-to-r from-mh-slate-950 via-mh-slate-900 to-mh-slate-950 p-4 sm:p-6">
            {/* Sketch Background if available */}
            {monster.sketch && (
              <div className="pointer-events-none absolute inset-0 -z-0 opacity-20 overflow-hidden">
                <img
                  src={monster.sketch}
                  alt=""
                  className="h-full w-full object-cover object-right filter brightness-125 contrast-125"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-mh-slate-950 via-mh-slate-950/70 to-transparent" />
              </div>
            )}

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 flex-1 min-w-0">
                {/* Monster Icon — 200% enlarged, no border */}
                <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40 shrink-0 items-center justify-center">
                  {monster.icon ? (
                    <img
                      src={monster.icon}
                      alt={monster.name}
                      className="h-full w-full object-contain filter drop-shadow-xl"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Footprints size={64} className="text-mh-slate-500" />
                  )}
                </div>

                {/* Monster Titles, Badges, Weaknesses & Elements */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className={`rarity-badge ${tierCfg.cls}`}>{tierCfg.label}</span>
                    <span className="rounded-md border border-mh-slate-750 bg-mh-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mh-slate-300">
                      {speciesLabel}
                    </span>
                    {monster.is_variant && (
                      <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                        Variant
                      </span>
                    )}
                    {monster.is_radiant && (
                      <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Radiant
                      </span>
                    )}
                  </div>

                  <h2 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                    {monster.name}
                  </h2>
                  {monster.name_ja && (
                    <p className="text-xs font-medium text-mh-slate-400 mt-0.5">
                      {monster.name_ja}
                    </p>
                  )}

                  {/* Weak to & Element directly in header */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-2.5 border-t border-mh-slate-800/80">
                    {/* Weak to */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 flex items-center gap-1">
                        <Shield size={12} className="text-amber-400" />
                        Weak to:
                      </span>
                      {monster.weaknesses && monster.weaknesses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {monster.weaknesses.map((el) => (
                            <span
                              key={el}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none',
                                ELEMENT_COLOURS[el] ?? 'bg-mh-slate-800 text-mh-slate-300 border border-mh-slate-700',
                              )}
                            >
                              <ElementIcon element={el} size={13} />
                              <span>{ELEMENT_LABELS[el] ?? el}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-mh-slate-500 italic">None recorded</span>
                      )}
                    </div>

                    {/* Element */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 flex items-center gap-1">
                        <Sparkles size={12} className="text-cyan-400" />
                        Element:
                      </span>
                      {monster.elements && monster.elements.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {monster.elements.map((el) => (
                            <span
                              key={el}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none',
                                ELEMENT_COLOURS[el] ?? 'bg-mh-slate-800 text-mh-slate-300 border border-mh-slate-700',
                              )}
                            >
                              <ElementIcon element={el} size={13} />
                              <span>{ELEMENT_LABELS[el] ?? el}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-mh-slate-500 italic">Physical</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 p-2 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-white transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Navigation Tabs Bar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-mh-slate-800/80 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                  activeTab === 'all'
                    ? 'bg-mh-gold-500 text-slate-950 shadow-md'
                    : 'text-mh-slate-400 hover:text-white hover:bg-mh-slate-800',
                )}
              >
                All Info
              </button>
              {!isSmall && (
                <button
                  type="button"
                  onClick={() => setActiveTab('study')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    activeTab === 'study'
                      ? 'bg-mh-gold-500 text-slate-950 shadow-md'
                      : 'text-mh-slate-400 hover:text-white hover:bg-mh-slate-800',
                  )}
                >
                  <Target size={13} />
                  <span>Study Progress</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('hitzones')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                  activeTab === 'hitzones'
                    ? 'bg-mh-gold-500 text-slate-950 shadow-md'
                    : 'text-mh-slate-400 hover:text-white hover:bg-mh-slate-800',
                )}
              >
                <Crosshair size={13} />
                <span>Hitzones {hitzones.length > 0 && `(${hitzones.length})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                  activeTab === 'stats'
                    ? 'bg-mh-gold-500 text-slate-950 shadow-md'
                    : 'text-mh-slate-400 hover:text-white hover:bg-mh-slate-800',
                )}
              >
                <Activity size={13} />
                <span>Health & Attack {levels.length > 0 && `(${levels.length})`}</span>
              </button>
              {linkedWeapons.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('weapons')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    activeTab === 'weapons'
                      ? 'bg-mh-gold-500 text-slate-950 shadow-md'
                      : 'text-mh-slate-400 hover:text-white hover:bg-mh-slate-800',
                  )}
                >
                  <Sword size={13} />
                  <span>Weapons ({linkedWeapons.length})</span>
                </button>
              )}
              {linkedVisageItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('visages')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    activeTab === 'visages'
                      ? 'bg-mh-gold-500 text-slate-950 shadow-md'
                      : 'text-mh-slate-400 hover:text-white hover:bg-mh-slate-800',
                  )}
                >
                  <BookMarked size={13} />
                  <span>Visages ({collectedVisagesCount}/{linkedVisageItems.length})</span>
                </button>
              )}
            </div>

            {/* ── Study Progress Section (Hidden for Small Monsters) ── */}
            {!isSmall && (activeTab === 'all' || activeTab === 'study') && (
            <div className="rounded-2xl border border-mh-gold-500/30 bg-mh-slate-950/80 p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mh-gold-500/15 text-mh-gold-400 border border-mh-gold-500/30">
                    <Target size={15} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white tracking-wide">
                      Study Progress
                    </h3>
                    <p className="text-[11px] text-mh-slate-400">
                      Field research checklist & Hunter's Challenges tracker
                    </p>
                  </div>
                </div>

                {/* Progress bar pill & Quick Mark Finished action */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleTaskWithChallengeSync(
                        isElder ? 'unlocked' : 'finished',
                        isElder ? 'Unlocked' : 'Finished',
                      )
                    }
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all shadow-sm',
                      isFinished
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:border-emerald-500/50 hover:bg-emerald-950/20 hover:text-emerald-300',
                    )}
                    title={
                      isFinished
                        ? isElder
                          ? 'Elder Dragon is unlocked and finished'
                          : 'Monster is marked as finished'
                        : isElder
                        ? 'Mark Elder Dragon as unlocked'
                        : 'Mark all tasks as finished'
                    }
                  >
                    <img
                      src={
                        isFinished
                          ? '/img/ui/my_challenges_selected.png'
                          : '/img/ui/my_challenges.png'
                      }
                      alt=""
                      className="w-4 h-4 object-contain filter drop-shadow-xs"
                    />
                    <span>
                      {isFinished
                        ? isElder
                          ? 'Unlocked ✓'
                          : 'Monster Finished ✓'
                        : isElder
                        ? 'Mark Unlocked'
                        : 'Mark Finished'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2.5 bg-mh-slate-900 border border-mh-slate-800 rounded-xl px-3 py-1.5">
                    <div className="text-right">
                      <span className="text-xs font-black text-mh-gold-300">{completedPoints}</span>
                      <span className="text-[10px] text-mh-slate-500"> / {totalPoints}</span>
                    </div>
                    <div className="h-2 w-20 sm:w-28 rounded-full bg-mh-slate-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          progressPct === 100 ? 'bg-emerald-400' : 'bg-mh-gold-400',
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-mh-slate-300">{progressPct}%</span>
                  </div>
                </div>
              </div>

              {/* Standard Study Tasks */}
              <div className="space-y-2">
                {standardTasksList.map((task) => {
                  const TaskIcon = task.icon;
                  const isChecked = Boolean(study[task.key]);
                  const linkedChallenge = getChallengeForTask(task.label);

                  return (
                    <div
                      key={task.key}
                      className={cn(
                        'group flex items-center justify-between gap-3 rounded-xl border p-2.5 sm:p-3 transition-colors',
                        isChecked
                          ? 'border-emerald-500/30 bg-emerald-950/15'
                          : 'border-mh-slate-800 bg-mh-slate-900/60 hover:bg-mh-slate-850',
                      )}
                    >
                      {/* Checkbox & Task label */}
                      <button
                        type="button"
                        onClick={() => handleToggleTaskWithChallengeSync(task.key, task.label)}
                        className="flex items-start gap-3 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30'
                              : 'border-mh-slate-700 bg-mh-slate-800 group-hover:border-mh-slate-600',
                          )}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.imgIcon ? (
                              <img
                                src={
                                  task.key === 'finished'
                                    ? isChecked
                                      ? '/img/ui/my_challenges_selected.png'
                                      : '/img/ui/my_challenges.png'
                                    : task.imgIcon
                                }
                                alt=""
                                className={cn(
                                  'w-4 h-4 object-contain shrink-0 filter drop-shadow-xs transition-opacity',
                                  isChecked ? 'opacity-100' : 'opacity-85',
                                )}
                              />
                            ) : TaskIcon ? (
                              <TaskIcon
                                size={13}
                                className={cn(
                                  isChecked
                                    ? 'text-emerald-400'
                                    : 'text-mh-gold-400/80',
                                )}
                              />
                            ) : null}
                            <p
                              className={cn(
                                'text-xs font-bold leading-tight',
                                isChecked ? 'text-emerald-200 line-through opacity-85' : 'text-mh-slate-100',
                              )}
                            >
                              {task.label}
                            </p>
                            {task.badge && (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider',
                                  task.key === 'finished'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
                                )}
                              >
                                {task.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-mh-slate-400 leading-normal mt-0.5">
                            {task.desc}
                          </p>
                        </div>
                      </button>

                      {/* Right action: Send to / Track in Challenges (pop-up with projects) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.key === 'unlocked' && unlockStep && (
                          <>
                            {/* The monster studies this unlock needs, when the window has room */}
                            <UnlockProgressInline
                              step={unlockStep}
                              monsterStudies={requiredStudies}
                              monsterIcon={requiredIcon}
                              className="hidden md:flex"
                            />
                            <HowToUnlockButton
                              step={unlockStep}
                              monsterStudies={requiredStudies}
                              monsterIcon={requiredIcon}
                              onOpenMonster={onOpenMonster}
                            />
                          </>
                        )}
                        <SendToChallengesButton
                          userId={user?.id}
                          challenge={linkedChallenge ?? null}
                          onAdd={() => addTaskChallenge(task.label, isChecked)}
                          onRemove={() => removeTaskChallenge(task.label)}
                          onRequireLogin={() => setLoginModalOpen(true)}
                          itemName={`${monster.name}: ${task.label}`}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Free Hunt Study count — this monster's studies unlock the next one on the journey */}
                {studyNeeds.length > 0 && (
                  <FreeHuntCounter
                    count={study.free_hunt_studies ?? 0}
                    logged={monsterStudyCount(study)}
                    needs={studyNeeds}
                    revealNames={Boolean(profile?.show_spoilers)}
                    onChange={(n) => setFreeHuntStudies(monster.id, n)}
                  />
                )}

                {/* Custom User Tasks */}
                {study.custom_tasks.map((ct) => {
                  const linkedChallenge = getChallengeForTask(ct.label);

                  return (
                    <div
                      key={ct.id}
                      className={cn(
                        'group flex items-center justify-between gap-3 rounded-xl border p-2.5 sm:p-3 transition-colors',
                        ct.completed
                          ? 'border-emerald-500/30 bg-emerald-950/15'
                          : 'border-mh-slate-800 bg-mh-slate-900/60 hover:bg-mh-slate-850',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCustomWithChallengeSync(ct.id, ct.label, ct.completed)}
                        className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
                            ct.completed
                              ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30'
                              : 'border-mh-slate-700 bg-mh-slate-800 group-hover:border-mh-slate-600',
                          )}
                        >
                          {ct.completed && <Check size={13} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-xs font-bold leading-tight truncate',
                              ct.completed ? 'text-emerald-200 line-through opacity-85' : 'text-mh-slate-100',
                            )}
                          >
                            {ct.label}
                          </p>
                          <span className="text-[9px] uppercase tracking-wider text-mh-slate-500 font-semibold">
                            Custom Goal
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <SendToChallengesButton
                          userId={user?.id}
                          challenge={linkedChallenge ?? null}
                          onAdd={() => addTaskChallenge(ct.label, ct.completed)}
                          onRemove={() => removeTaskChallenge(ct.label)}
                          onRequireLogin={() => setLoginModalOpen(true)}
                          itemName={`${monster.name}: ${ct.label}`}
                        />

                        <button
                          type="button"
                          onClick={() => deleteCustomTask(monster.id, ct.id)}
                          className="rounded-lg p-1.5 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          title="Delete custom goal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Task Form */}
              {isAddingTask ? (
                <form onSubmit={handleCreateCustomTask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customTaskInput}
                    onChange={(e) => setCustomTaskInput(e.target.value)}
                    placeholder="Enter custom task (e.g. Capture with trap, Break tail)..."
                    className="flex-1 rounded-xl border border-mh-slate-700 bg-mh-slate-900 px-3 py-1.5 text-xs text-white placeholder-mh-slate-500 focus:outline-none focus:border-mh-gold-500/50"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-mh-gold-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 transition-colors shadow-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(false);
                      setCustomTaskInput('');
                    }}
                    className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1.5 text-xs text-mh-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTask(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-mh-gold-400 hover:text-mh-gold-300 transition-colors pt-1"
                >
                  <Plus size={13} />
                  <span>Add Custom Study Task</span>
                </button>
              )}
            </div>
            )}

            {/* ── Monster Hitzones Table ── */}
            {(activeTab === 'all' || activeTab === 'hitzones') && (
              <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/80 p-4 sm:p-5 space-y-3.5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mh-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-red-400 border border-red-500/30">
                      <Crosshair size={15} />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-white tracking-wide flex items-center gap-2">
                        <span>Hitzone Values (Damage Physiology)</span>
                        {hitzones.length > 0 && (
                          <span className="text-[10px] font-normal text-mh-slate-400 bg-mh-slate-900 border border-mh-slate-800 px-2 py-0.5 rounded-full">
                            {hitzones.length} parts
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-mh-slate-400">
                        Physical & elemental damage absorption rates (Values ≥ 45 trigger critical weak point bonuses)
                      </p>
                    </div>
                  </div>
                </div>

                {isLoadingHitzones ? (
                  <div className="flex h-28 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
                  </div>
                ) : hitzones.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-mh-slate-800 bg-mh-slate-900/40 p-6 text-center text-xs text-mh-slate-500">
                    No hitzone data recorded for this monster.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-mh-slate-800 bg-mh-slate-900/80">
                    <table className="w-full text-left text-xs text-mh-slate-300">
                      <thead className="border-b border-mh-slate-750 bg-mh-slate-950/90 text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Part</th>
                          <th className="py-2.5 px-2 text-center" title="Cut / Slashing damage">Cut</th>
                          <th className="py-2.5 px-2 text-center" title="Impact / Blunt damage">Impact</th>
                          <th className="py-2.5 px-2 text-center" title="Shot / Piercing / Ranged damage">Shot</th>
                          <th className="py-2.5 px-2 text-center" title="Fire element"><ElementIcon element="fire" size={13} className="inline mr-1" />Fire</th>
                          <th className="py-2.5 px-2 text-center" title="Water element"><ElementIcon element="water" size={13} className="inline mr-1" />Water</th>
                          <th className="py-2.5 px-2 text-center" title="Thunder element"><ElementIcon element="thunder" size={13} className="inline mr-1" />Thunder</th>
                          <th className="py-2.5 px-2 text-center" title="Ice element"><ElementIcon element="ice" size={13} className="inline mr-1" />Ice</th>
                          <th className="py-2.5 px-2 text-center" title="Dragon element"><ElementIcon element="dragon" size={13} className="inline mr-1" />Dragon</th>
                          <th className="py-2.5 px-3 text-center" title="Weak point stars">Weakness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mh-slate-800/60 font-mono text-xs">
                        {hitzones.map((hz) => {
                          const isPhysicalWeak = hz.cut >= 45 || hz.impact >= 45 || hz.shot >= 45;
                          return (
                            <tr
                              key={hz.id}
                              className={cn(
                                'hover:bg-mh-slate-800/40 transition-colors',
                                isPhysicalWeak && 'bg-amber-500/[0.03]',
                              )}
                            >
                              <td className="py-2 px-3 font-sans font-semibold text-mh-slate-100 whitespace-nowrap">
                                {hz.part}
                                {hz.state && (
                                  <span className="ml-1.5 rounded bg-mh-slate-800 border border-mh-slate-700 px-1.5 py-0.5 text-[9px] font-sans font-normal text-mh-slate-400">
                                    {hz.state}
                                  </span>
                                )}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.cut >= 45 ? 'text-amber-400 font-bold' : hz.cut >= 25 ? 'text-mh-slate-200' : 'text-mh-slate-500')}>
                                {hz.cut}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.impact >= 45 ? 'text-amber-400 font-bold' : hz.impact >= 25 ? 'text-mh-slate-200' : 'text-mh-slate-500')}>
                                {hz.impact}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.shot >= 45 ? 'text-amber-400 font-bold' : hz.shot >= 25 ? 'text-mh-slate-200' : 'text-mh-slate-500')}>
                                {hz.shot}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.fire >= 25 ? 'text-orange-400 font-bold' : hz.fire >= 15 ? 'text-orange-300/80' : 'text-mh-slate-500')}>
                                {hz.fire}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.water >= 25 ? 'text-sky-400 font-bold' : hz.water >= 15 ? 'text-sky-300/80' : 'text-mh-slate-500')}>
                                {hz.water}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.thunder >= 25 ? 'text-yellow-400 font-bold' : hz.thunder >= 15 ? 'text-yellow-300/80' : 'text-mh-slate-500')}>
                                {hz.thunder}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.ice >= 25 ? 'text-cyan-400 font-bold' : hz.ice >= 15 ? 'text-cyan-300/80' : 'text-mh-slate-500')}>
                                {hz.ice}
                              </td>
                              <td className={cn('py-2 px-2 text-center', hz.dragon >= 25 ? 'text-purple-400 font-bold' : hz.dragon >= 15 ? 'text-purple-300/80' : 'text-mh-slate-500')}>
                                {hz.dragon}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {hz.weak_point_stars > 0 ? (
                                  <span className="text-amber-400 text-[11px] font-sans font-bold">
                                    {'★'.repeat(hz.weak_point_stars)}
                                  </span>
                                ) : (
                                  <span className="text-mh-slate-600 font-sans text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Monster Health, Attack & Suggested Hunt Power ── */}
            {(activeTab === 'all' || activeTab === 'stats') && (
              <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/80 p-4 sm:p-5 space-y-3.5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mh-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Activity size={15} />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-white tracking-wide flex items-center gap-2">
                        <span>Monster Levels & Combat Stats</span>
                        {levels.length > 0 && (
                          <span className="text-[10px] font-normal text-mh-slate-400 bg-mh-slate-900 border border-mh-slate-800 px-2 py-0.5 rounded-full">
                            {levels.length} ranks
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-mh-slate-400">
                        Health scaling, attack potency, and suggested hunt power across difficulties
                      </p>
                    </div>
                  </div>

                  {/* Content Filter Pills (All / Hunt / Extreme Hunt / Field) */}
                  {contentCategories.length > 1 && (
                    <div className="flex items-center gap-1 rounded-xl bg-mh-slate-900 border border-mh-slate-800 p-1">
                      <button
                        type="button"
                        onClick={() => setContentFilter('all')}
                        className={cn(
                          'px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors',
                          contentFilter === 'all'
                            ? 'bg-mh-gold-500 text-slate-950 shadow-sm'
                            : 'text-mh-slate-400 hover:text-white',
                        )}
                      >
                        All ({levels.length})
                      </button>
                      {contentCategories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setContentFilter(c)}
                          className={cn(
                            'px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap',
                            contentFilter === c
                              ? 'bg-mh-gold-500 text-slate-950 shadow-sm'
                              : 'text-mh-slate-400 hover:text-white',
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isLoadingLevels ? (
                  <div className="flex h-28 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
                  </div>
                ) : filteredLevels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-mh-slate-800 bg-mh-slate-900/40 p-6 text-center text-xs text-mh-slate-500">
                    No level/stat scaling data recorded for this monster.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-mh-slate-800 bg-mh-slate-900/80">
                    <table className="w-full text-left text-xs text-mh-slate-300">
                      <thead className="border-b border-mh-slate-750 bg-mh-slate-950/90 text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Content Mode</th>
                          <th className="py-2.5 px-3 text-center">Difficulty</th>
                          <th className="py-2.5 px-3 text-center">Monster Level</th>
                          <th className="py-2.5 px-3 text-right">Suggested Hunt Power</th>
                          <th className="py-2.5 px-3 text-right">Health (HP)</th>
                          <th className="py-2.5 px-3 text-right">Attack</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mh-slate-800/60 font-mono text-xs">
                        {filteredLevels.map((lvl) => (
                          <tr key={lvl.id} className="hover:bg-mh-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-sans font-semibold text-mh-slate-200">
                              <span className={cn(
                                'inline-block px-2 py-0.5 rounded-md text-[10px] font-bold',
                                lvl.content === 'Extreme Hunt'
                                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                  : lvl.content === 'Field (open world)'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-mh-slate-800 text-mh-slate-300 border border-mh-slate-700',
                              )}>
                                {lvl.content}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-sans">
                              {lvl.hunt_difficulty !== null ? (
                                <span className="text-mh-slate-300 font-semibold">★ {lvl.hunt_difficulty}</span>
                              ) : (
                                <span className="text-mh-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {lvl.monster_level !== null ? (
                                <span className="rounded bg-mh-gold-500/15 text-mh-gold-300 border border-mh-gold-500/30 px-2 py-0.5 text-[11px] font-bold">
                                  Lv {lvl.monster_level}
                                </span>
                              ) : (
                                <span className="text-mh-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-sky-400">
                              {lvl.suggested_hunt_power !== null ? lvl.suggested_hunt_power.toLocaleString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                              {lvl.health.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                              {lvl.attack.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Linked Equipment Section ── */}
            {linkedWeapons.length > 0 && (activeTab === 'all' || activeTab === 'weapons') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300 flex items-center gap-1.5">
                    <Sword size={13} className="text-mh-gold-400" />
                    <span>Craftable Weapons ({linkedWeapons.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/challenges/weapons?search=${encodeURIComponent(monster.name)}`);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-mh-gold-400 hover:text-mh-gold-300 transition-colors"
                  >
                    <span>View in Armory</span>
                    <ExternalLink size={11} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {linkedWeapons.slice(0, 6).map((w) => (
                    <div
                      key={w.id}
                      onClick={() => {
                        onClose();
                        navigate(`/challenges/weapons?weapon=${w.id}`);
                      }}
                      className="flex items-center gap-3 rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-3 hover:border-mh-gold-500/40 hover:bg-mh-slate-850 cursor-pointer transition-colors group"
                    >
                      {/* Weapon Image: ~200% bigger, no border */}
                      <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center">
                        {w.image ? (
                          <img
                            src={w.image}
                            alt={w.name}
                            className="h-full w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Sword size={28} className="text-mh-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white group-hover:text-mh-gold-300 transition-colors truncate">
                          {w.name}
                        </p>
                        <p className="text-[10px] text-mh-slate-400 truncate mt-0.5">
                          Rarity {w.rarity || 1} · {w.weapon_type_id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Linked Visages Section ── */}
            {linkedVisageItems.length > 0 && (activeTab === 'all' || activeTab === 'visages') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300 flex items-center gap-1.5">
                    <BookMarked size={13} className="text-mh-gold-400" />
                    <span>Visages ({collectedVisagesCount}/{linkedVisageItems.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/gallery/collection');
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-mh-gold-400 hover:text-mh-gold-300 transition-colors"
                  >
                    <span>View in Visage Collection</span>
                    <ExternalLink size={11} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 items-start pt-1">
                  {linkedVisageItems.map(({ card, ink }) => {
                    const inkCfg = getInkConfig(ink);
                    const entry = getCardCollection(card.id, ink);
                    const challenge = getVisageChallenge(challenges, card.id, ink);
                    return (
                      <div
                        key={`${card.id}:${ink}`}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shadow-sm',
                            inkCfg.bg,
                            inkCfg.border,
                            inkCfg.text,
                          )}
                        >
                          <InkIconComponent iconName={inkCfg.iconName} size={11} />
                          <span className="truncate max-w-[85px]">{inkCfg.shortName}</span>
                        </div>
                        <VisageCard
                          card={card}
                          currentInk={ink}
                          collectionEntry={entry}
                          challenge={challenge}
                          onSetRarity={(rarity, qty) => setCardRarity(card.id, ink, rarity, qty)}
                          onSetQuantity={(qty) => setCardQuantity(card.id, ink, qty)}
                          onRemoveFromCollection={() => removeCardFromCollection(card.id, ink)}
                          challengeActions={visageChallengeActions}
                          onClick={() => {
                            setInspectedCard(card);
                            setInspectedInk(ink);
                          }}
                          buildMode={false}
                          onInspect={() => {
                            setInspectedCard(card);
                            setInspectedInk(ink);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      {inspectedCard && (
        <VisageModal
          card={inspectedCard}
          currentInk={inspectedInk || undefined}
          open={inspectedCard !== null}
          onClose={() => {
            setInspectedCard(null);
            setInspectedInk(null);
          }}
          collectionEntry={
            inspectedCard
              ? getCardCollection(inspectedCard.id, inspectedInk || 'flames')
              : null
          }
          challenge={
            inspectedCard
              ? getVisageChallenge(challenges, inspectedCard.id, inspectedInk || 'flames')
              : undefined
          }
          onSetRarity={(rarity, qty) => {
            if (inspectedCard) {
              setCardRarity(inspectedCard.id, inspectedInk || 'flames', rarity, qty);
            }
          }}
          onSetQuantity={(qty) => {
            if (inspectedCard) {
              setCardQuantity(inspectedCard.id, inspectedInk || 'flames', qty);
            }
          }}
          onRemoveFromCollection={() => {
            if (inspectedCard) {
              removeCardFromCollection(inspectedCard.id, inspectedInk || 'flames');
            }
          }}
          challengeActions={visageChallengeActions}
        />
      )}
    </>,
    document.body,
  );
}
