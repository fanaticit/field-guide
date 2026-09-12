// ─────────────────────────────────────────────────────────────
// WeaponModal — Detailed Inspection Dialog with Full Left-Side Weapon Showcase
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  X,
  Sword,
  Sparkles,
  CheckCircle2,
  Plus,
  Shield,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  Info,
  Target,
  LogIn,
  Trash2,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  getRarityBadgeStyle,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../hooks/useAdminSkills';
import {
  type HunterChallenge,
  useAddWeaponChallenge,
  useIncrementChallenge,
  useUpdateChallengeStatus,
  useDeleteChallenge,
} from '../../hooks/useHunterChallenges';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

const ELEMENT_ICONS: Record<WeaponElementType, React.ComponentType<{ size?: number; className?: string }>> = {
  raw: Shield,
  fire: Flame,
  water: Droplets,
  thunder: Zap,
  ice: Snowflake,
  dragon: Sparkles,
  poison: Skull,
  paralysis: Zap,
  blast: Flame,
  sleep: Snowflake,
};

const ELEMENT_GLOWS: Record<WeaponElementType, string> = {
  raw: 'from-mh-gold-500/10 via-mh-slate-900 to-mh-slate-950',
  fire: 'from-orange-600/15 via-red-950/20 to-mh-slate-950',
  water: 'from-blue-600/15 via-cyan-950/20 to-mh-slate-950',
  thunder: 'from-yellow-500/15 via-amber-950/20 to-mh-slate-950',
  ice: 'from-cyan-400/15 via-blue-950/20 to-mh-slate-950',
  dragon: 'from-red-600/20 via-purple-950/20 to-mh-slate-950',
  poison: 'from-purple-600/15 via-fuchsia-950/20 to-mh-slate-950',
  paralysis: 'from-yellow-500/15 via-amber-950/20 to-mh-slate-950',
  blast: 'from-rose-600/15 via-orange-950/20 to-mh-slate-950',
  sleep: 'from-indigo-500/15 via-blue-950/20 to-mh-slate-950',
};

const RARITY_PRESETS = [1, 2, 4, 6, 8, 10, 12, 16];

interface Props {
  weapon: DBWeapon | null;
  open: boolean;
  onClose: () => void;
  challenge?: HunterChallenge;
  onOpenLogin: () => void;
}

export default function WeaponModal({
  weapon,
  open,
  onClose,
  challenge,
  onOpenLogin,
}: Props) {
  const { user } = useAuthStore();
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ isActive: true });

  const addChallenge = useAddWeaponChallenge();
  const incrementChallenge = useIncrementChallenge();
  const updateChallengeStatus = useUpdateChallengeStatus();
  const deleteChallenge = useDeleteChallenge();

  const [selectedCraftRarity, setSelectedCraftRarity] = useState<number>(weapon?.rarity || 1);
  const [selectedMaxRarity, setSelectedMaxRarity] = useState<number>(16);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !weapon) return null;

  const weaponTypeObj = WEAPON_TYPES.find((w) => w.id === weapon.weapon_type_id);
  const monsterObj = weapon.monster_id ? monsters.find((m) => m.id === weapon.monster_id) : null;
  const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
  const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;
  const glowTheme = ELEMENT_GLOWS[weapon.element_type] || ELEMENT_GLOWS.raw;

  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isCompleted = challenge?.status === 'completed';
  const isCrafted = (challenge?.current_rarity ?? 0) > 0;
  const currentRarity = challenge?.current_rarity ?? 0;
  const maxR = challenge?.max_rarity ?? 16;
  const craftR = challenge?.craft_rarity ?? (weapon.rarity || 1);

  const handleAddChallenge = async () => {
    if (!user) {
      onOpenLogin();
      return;
    }

    setErrorMsg(null);
    try {
      await addChallenge.mutateAsync({
        userId: user.id,
        game: weapon.game,
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponTypeId: weapon.weapon_type_id,
        monsterId: weapon.monster_id ?? null,
        monsterName: monsterObj?.name ?? null,
        elementType: weapon.element_type,
        specialSkill: weapon.special_skill ?? null,
        pieceImage: weapon.image ?? null,
        setIcon: weapon.image ?? null,
        craftRarity: selectedCraftRarity,
        maxRarity: selectedMaxRarity,
      });
      setFeedbackMsg('Added to Hunter Challenges!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add challenge';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleIncrement = async () => {
    if (!challenge) return;
    setErrorMsg(null);
    try {
      await incrementChallenge.mutateAsync(challenge);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update challenge';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleSetRarityDirect = async (newRarity: number) => {
    if (!challenge) return;
    const isComp = newRarity >= maxR;
    await updateChallengeStatus.mutateAsync({
      challengeId: challenge.id,
      status: isComp ? 'completed' : newRarity > 0 ? 'upgrading' : 'crafting',
      currentRarity: newRarity,
      completedAt: isComp ? new Date().toISOString() : null,
    });
  };

  const handleDelete = async () => {
    if (!challenge) return;
    if (window.confirm(`Remove ${weapon.name} from your Hunter Challenges?`)) {
      await deleteChallenge.mutateAsync(challenge.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-5xl rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
      >
        {/* Close Button on Mobile */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-20 rounded-full p-2 bg-mh-slate-900/80 border border-mh-slate-700 text-mh-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* ═══════════════════════════════════════════════════════
            LEFT PANEL: Weapon Showcase Image (Takes Over Left Side)
           ═══════════════════════════════════════════════════════ */}
        <div
          className={cn(
            'w-full md:w-[44%] lg:w-[46%] shrink-0 flex flex-col justify-between p-6 sm:p-7 md:p-8 relative overflow-hidden border-b md:border-b-0 md:border-r border-mh-slate-750 bg-gradient-to-b',
            glowTheme,
          )}
        >
          {/* Subtle Ambient Background Radial Light */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-black/60" />

          {/* Top Info Bar inside Showcase */}
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold border font-mono shadow-sm',
                getRarityBadgeStyle(weapon.rarity || 1).badge,
              )}
            >
              {getRarityBadgeStyle(weapon.rarity || 1).label}
            </span>

            <span className="rounded-lg bg-mh-slate-900/90 border border-mh-slate-700/80 px-2.5 py-1 text-xs font-bold text-mh-slate-200 shadow-sm">
              {weaponTypeObj?.name || weapon.weapon_type_id}
            </span>

            <span className="rounded-lg bg-mh-slate-900/90 border border-mh-slate-700/80 px-2.5 py-1 text-[11px] font-mono font-bold text-mh-gold-400 uppercase shadow-sm">
              {weapon.game}
            </span>
          </div>

          {/* Full Hero Weapon Image Stage */}
          <div className="relative z-10 flex-1 my-6 min-h-[220px] sm:min-h-[280px] md:min-h-[340px] flex items-center justify-center p-2 group">
            {weapon.image ? (
              <img
                src={weapon.image}
                alt={weapon.name}
                className="max-h-[260px] sm:max-h-[320px] md:max-h-[380px] w-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-300 ease-out"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-mh-slate-600 gap-2">
                <Sword size={64} />
                <span className="text-xs font-semibold text-mh-slate-500">No weapon artwork</span>
              </div>
            )}
          </div>

          {/* Bottom Showcase Meta: Element & Lore */}
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Element / Status Badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border shadow-sm',
                  elemCfg.bg,
                  elemCfg.text,
                  elemCfg.border,
                )}
              >
                <ElIcon size={14} className={elemCfg.color} />
                <span>{elemCfg.label}</span>
              </span>

              {/* Source Origin */}
              <span
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold border shadow-sm',
                  srcCfg.bg,
                  srcCfg.text,
                  srcCfg.border,
                )}
              >
                {monsterObj ? `Monster: ${monsterObj.name}` : srcCfg.label}
              </span>
            </div>

            {/* Description / Field Quote */}
            {weapon.description && (
              <div className="rounded-xl bg-mh-slate-950/70 border border-mh-slate-800/80 p-3 shadow-inner">
                <p className="text-xs text-mh-slate-300 italic leading-relaxed">
                  "{weapon.description}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            RIGHT PANEL: Details, Skills & Hunter's Challenge Forge
           ═══════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 bg-mh-slate-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4 gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-mh-slate-100 break-words leading-tight">
                  {weapon.name}
                </h2>
                {weapon.name_ja && (
                  <span className="text-xs text-mh-slate-500 font-medium break-words">
                    ({weapon.name_ja})
                  </span>
                )}
              </div>

              {weapon.upgraded_name && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-300 font-medium mt-1 break-words">
                  <span className="text-mh-slate-400 text-[11px]">▲ Upgrades to:</span>
                  <span className="font-bold text-amber-200">{weapon.upgraded_name}</span>
                  {weapon.upgraded_name_ja && (
                    <span className="text-mh-slate-500 text-[10px]">({weapon.upgraded_name_ja})</span>
                  )}
                  {weapon.upgrade_level && (
                    <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] px-1.5 py-0.2 font-mono font-bold">
                      Lv {weapon.upgrade_level}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex rounded-full p-2 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ── Personal Hunter's Challenge Card ── */}
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-mh-slate-900 to-mh-slate-950 p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-blue-400" />
                  <h3 className="font-display text-sm font-bold text-blue-200 uppercase tracking-wider">
                    Hunter's Weapon Challenge
                  </h3>
                </div>

                {isTracked && challenge && (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-bold border',
                        isCompleted
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : isCrafted
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-amber-500/20 border-amber-500/40 text-amber-300',
                      )}
                    >
                      {isCompleted
                        ? '✓ Mastered R16'
                        : isCrafted
                        ? `Upgrading (R${currentRarity} / R${maxR})`
                        : `Craft Goal (R${craftR})`}
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      title="Remove challenge"
                      className="p-1 rounded-lg text-mh-slate-500 hover:text-red-400 hover:bg-mh-slate-800 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Hunting Target Info */}
              <div className="flex items-center gap-3 rounded-xl border border-mh-slate-750 bg-mh-slate-900/80 p-3 text-xs">
                <Crosshair size={16} className="text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-mh-slate-200 font-semibold">
                    {monsterObj ? (
                      <>
                        Hunt Target: <strong className="text-orange-300">{monsterObj.name}</strong>
                      </>
                    ) : (
                      <>
                        Material Source: <strong className="text-amber-300">{srcCfg.label}</strong>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-mh-slate-400 mt-0.5">
                    Hunt {monsterObj?.name || 'field materials'} in investigations to forge and upgrade this weapon.
                  </p>
                </div>
              </div>

              {/* Feedback / Error Alerts */}
              {feedbackMsg && (
                <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2.5 text-xs text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{feedbackMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-2.5 text-xs text-red-300 font-medium">
                  {errorMsg}
                </div>
              )}

              {!user ? (
                /* User Not Logged In */
                <div className="flex items-center justify-between rounded-xl bg-mh-slate-950/80 border border-mh-slate-750 p-4">
                  <div>
                    <p className="text-xs font-bold text-mh-slate-200">Track Your Forging Progress</p>
                    <p className="text-[11px] text-mh-slate-400 mt-0.5">Sign in to save starting rarity and set personal upgrade goals.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="flex items-center gap-1.5 rounded-xl bg-mh-gold-500 hover:bg-mh-gold-400 text-slate-950 px-3 py-1.5 text-xs font-bold transition-all shadow-md shrink-0"
                  >
                    <LogIn size={14} />
                    <span>Sign In</span>
                  </button>
                </div>
              ) : !isTracked ? (
                /* Add Challenge Controls: Pick Starting Rarity & Max Rarity */
                <div className="space-y-3 rounded-xl bg-mh-slate-950/70 border border-mh-slate-750 p-4">
                  <div>
                    <label className="text-xs font-bold text-mh-slate-300 block mb-1.5">
                      Select Starting Forged Rarity Tier:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {RARITY_PRESETS.map((r) => {
                        const badge = getRarityBadgeStyle(r);
                        const isSelected = selectedCraftRarity === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSelectedCraftRarity(r)}
                            className={cn(
                              'rounded-lg px-2.5 py-1 text-xs font-bold font-mono border transition-all',
                              isSelected
                                ? 'bg-mh-gold-500 text-slate-950 border-mh-gold-400 shadow-md scale-105'
                                : 'bg-mh-slate-800 text-mh-slate-300 border-mh-slate-700 hover:border-mh-slate-500',
                            )}
                          >
                            {badge.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Max Rarity Selector */}
                  <div>
                    <label className="text-xs font-bold text-mh-slate-300 block mb-1.5">
                      Target Max Rarity:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[10, 12, 14, 16].map((r) => {
                        const badge = getRarityBadgeStyle(r);
                        const isSelected = selectedMaxRarity === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSelectedMaxRarity(r)}
                            className={cn(
                              'rounded-lg px-2.5 py-1 text-xs font-bold font-mono border transition-all',
                              isSelected
                                ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-md scale-105 font-black'
                                : 'bg-mh-slate-800 text-mh-slate-300 border-mh-slate-700 hover:border-mh-slate-500',
                            )}
                          >
                            {badge.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-mh-slate-800">
                    <div className="text-xs text-mh-slate-400">
                      Goal: <span className="font-bold text-mh-gold-300">R{selectedCraftRarity} &rarr; R{selectedMaxRarity}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddChallenge}
                      disabled={addChallenge.isPending}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-mh-gold-500 to-amber-400 hover:from-mh-gold-400 hover:to-amber-300 text-slate-950 px-4 py-2 text-xs font-black transition-all shadow-md disabled:opacity-50"
                    >
                      <Plus size={16} />
                      <span>+ Add to Hunter Challenges</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Challenge Progress & Upgrade Actions */
                <div className="space-y-4 rounded-xl bg-mh-slate-950/70 border border-mh-slate-750 p-4">
                  {/* Rarity Step Progress Slider / Badges */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-mh-slate-300">Progression Tier</span>
                      <span className="text-blue-300 font-mono">
                        {isCrafted ? `R${currentRarity} of R${maxR}` : `Not Crafted (Goal: R${craftR})`}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full rounded-full bg-mh-slate-800 overflow-hidden mb-3">
                      <div
                        className={cn(
                          'h-full transition-all duration-500 rounded-full',
                          isCompleted
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-blue-500 to-mh-gold-400',
                        )}
                        style={{
                          width: `${Math.min(100, Math.round(((currentRarity || 0) / maxR) * 100))}%`,
                        }}
                      />
                    </div>

                    {/* Quick Rarity Direct Selectors */}
                    <div className="flex flex-wrap gap-1">
                      {[0, 1, 2, 4, 6, 8, 10, 12, 16].map((r) => {
                        const isActive = currentRarity === r;
                        const isReached = currentRarity >= r && r > 0;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleSetRarityDirect(r)}
                            className={cn(
                              'rounded px-2 py-0.5 text-[10px] font-bold font-mono border transition-all',
                              isActive
                                ? 'bg-blue-500 text-slate-950 border-blue-400'
                                : isReached
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-mh-slate-800 text-mh-slate-400 border-mh-slate-700 hover:border-mh-slate-600',
                            )}
                          >
                            {r === 0 ? 'Unforged' : `R${r}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-mh-slate-800">
                    <span className="text-[11px] text-mh-slate-400">
                      {isCompleted
                        ? 'Challenge finished! You mastered this weapon.'
                        : isCrafted
                        ? `Next Milestone: Rarity ${currentRarity + 1}`
                        : `Craft this weapon to unlock tracking.`}
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Mastered</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={incrementChallenge.isPending}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 px-4 py-1.5 text-xs font-bold transition-all shadow-md disabled:opacity-50"
                      >
                        <ChevronRight size={15} />
                        <span>{isCrafted ? `Upgrade to R${currentRarity + 1}` : `Mark as Crafted (R${craftR})`}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Special Skill Highlight */}
            {weapon.special_skill && (
              <div className="rounded-2xl border border-mh-gold-500/30 bg-gradient-to-r from-mh-gold-500/10 via-mh-slate-900 to-mh-slate-900 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-mh-gold-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400">
                    Special Skill Finish
                  </h4>
                </div>
                <p className="font-display text-sm font-bold text-mh-slate-100 break-words leading-tight">
                  {weapon.special_skill}
                </p>
                {weaponTypeObj?.description && (
                  <p className="text-xs text-mh-slate-400 mt-1 leading-relaxed">
                    {weaponTypeObj.description}
                  </p>
                )}
              </div>
            )}

            {/* Attached Weapon Skills */}
            <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-mh-gold-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-200">
                    Attached Passive Skills
                  </h4>
                </div>
                <span className="text-[11px] text-mh-slate-500">
                  {weapon.skills?.length ?? 0} Skill{(weapon.skills?.length ?? 0) === 1 ? '' : 's'}
                </span>
              </div>

              {(!weapon.skills || weapon.skills.length === 0) ? (
                <p className="text-xs text-mh-slate-500 italic py-2">
                  No inherent passive skills attached to this weapon.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {weapon.skills.map((s, idx) => {
                    const meta = dbSkills.find((d) => d.id === s.id);
                    const skillName = meta?.name ?? s.id;
                    const ur = s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null;
                    const isLocked = Boolean(ur && ur > 1);

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-mh-slate-100 break-words">
                              {skillName}
                            </span>
                            <span className="rounded bg-mh-gold-500/20 text-mh-gold-300 font-mono text-xs font-bold px-2 py-0.5 border border-mh-gold-500/30">
                              Level {s.level}
                            </span>
                          </div>

                          {/* Unlock Rarity / Level */}
                          {isLocked ? (
                            <span className="rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold px-2 py-0.5 border border-amber-500/40">
                              Unlocks at Lv {ur}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold px-2 py-0.5 border border-emerald-500/30">
                              Base Level
                            </span>
                          )}
                        </div>

                        {meta?.description && (
                          <p className="text-xs text-mh-slate-400 leading-relaxed">
                            {meta.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Field Notes & Weapon Styles */}
            {weapon.notes && (
              <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/40 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-slate-400">
                  <Info size={13} />
                  <span>Field Notes</span>
                </div>
                <p className="text-xs text-mh-slate-300 leading-relaxed">
                  {weapon.notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4 flex items-center justify-between">
            <p className="font-mono text-[11px] text-mh-slate-500">
              ID: {weapon.id}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-mh-slate-800 px-4 py-2 text-xs font-bold text-mh-slate-200 hover:bg-mh-slate-750 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
