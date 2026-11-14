// ─────────────────────────────────────────────────────────────
// WeaponModal — Detailed Inspection Dialog with Full Left-Side Weapon Showcase
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  X,
  Sword,
  Sparkles,
  CheckCircle2,
  Info,
  LogIn,
  Trash2,
  ChevronRight,
  Crosshair,
  Hammer,
  Check,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  WEAPON_SHARPNESS_ICONS,
  getRarityBadgeStyle,
  getWeaponDisplayName,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useWeaponUpgrades } from '../../hooks/useAdminWeapons';
import {
  type HunterChallenge,
  useAddWeaponChallenge,
  useIncrementChallenge,
  useUpdateChallengeStatus,
  useDeleteChallenge,
} from '../../hooks/useHunterChallenges';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import ChallengeIcon from '../../components/ChallengeIcon';
import ElementIcon from '../../components/ElementIcon';

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
  stun: 'from-yellow-400/15 via-amber-950/20 to-mh-slate-950',
};

interface Props {
  weapon: DBWeapon | null;
  open: boolean;
  onClose: () => void;
  challenge?: HunterChallenge;
  onOpenLogin: () => void;
  isCrafted?: boolean;
  craftedRarity?: number | null;
  onSetCraftedRarity?: (weaponId: string, rarity: number) => void;
  onRemoveCrafted?: (weaponId: string) => void;
}

export default function WeaponModal({
  weapon,
  open,
  onClose,
  challenge,
  onOpenLogin,
  isCrafted: isCraftedProp,
  craftedRarity,
  onSetCraftedRarity,
  onRemoveCrafted,
}: Props) {
  const { user } = useAuthStore();
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: upgrades = [] } = useWeaponUpgrades(open && weapon ? weapon.id : null);

  const addChallenge = useAddWeaponChallenge();
  const incrementChallenge = useIncrementChallenge();
  const updateChallengeStatus = useUpdateChallengeStatus();
  const deleteChallenge = useDeleteChallenge();

  // Picked rarities; null = the weapon's own starting / max rarity
  const [craftPick, setSelectedCraftRarity] = useState<number | null>(null);
  const [maxPick, setSelectedMaxRarity] = useState<number | null>(null);
  const selectedCraftRarity = craftPick ?? weapon?.rarity ?? 1;
  const selectedMaxRarity = maxPick ?? weapon?.max_rarity ?? 14;
  useEffect(() => {
    setSelectedCraftRarity(null);
    setSelectedMaxRarity(null);
  }, [weapon?.id]);

  // Lock background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Close modal on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !weapon) return null;

  const weaponTypeObj = WEAPON_TYPES.find((w) => w.id === weapon.weapon_type_id);
  const monsterObj = weapon.monster_id ? monsters.find((m) => m.id === weapon.monster_id) : null;
  const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.unknown;
  const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const glowTheme = ELEMENT_GLOWS[weapon.element_type] || ELEMENT_GLOWS.raw;

  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isCompleted = challenge?.status === 'completed';
  const isCrafted = (challenge?.current_rarity ?? 0) > 0;
  const currentRarity = challenge?.current_rarity ?? 0;
  const isUserCrafted = Boolean(craftedRarity || isCraftedProp);
  const activeCraftedRarity = craftedRarity ?? (challenge && challenge.current_rarity > 0 ? challenge.current_rarity : null);
  const maxR = challenge?.max_rarity ?? weapon.max_rarity;
  // Every rarity the weapon can have, from the one it starts at to its max
  const rarityRange = Array.from({ length: Math.max(1, weapon.max_rarity - weapon.rarity + 1) }, (_, i) => weapon.rarity + i);
  const craftR = challenge?.craft_rarity ?? (weapon.rarity || 1);

  const handleAddChallenge = async () => {
    if (!user) {
      onOpenLogin();
      return;
    }

    setErrorMsg(null);
    let finalMonster = monsterObj;
    let resolvedMonsterId = weapon.monster_id ?? null;
    if (!finalMonster) {
      const candidate = `${weapon.series || ''} ${weapon.name}`.toLowerCase();
      finalMonster = monsters.find((m) => candidate.includes(m.name.toLowerCase())) ?? null;
      if (finalMonster) {
        resolvedMonsterId = finalMonster.id;
      }
    }

    try {
      await addChallenge.mutateAsync({
        userId: user.id,
        game: 'mho',
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponTypeId: weapon.weapon_type_id,
        monsterId: resolvedMonsterId,
        monsterName: finalMonster?.name ?? null,
        elementType: weapon.element_type,
        specialSkill: weapon.apex_effect?.name ?? null,
        pieceImage: weapon.image ?? null,
        setIcon: finalMonster?.icon ?? weapon.image ?? null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl border border-mh-slate-750 bg-mh-slate-900 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92dvh] sm:max-h-[90vh]"
      >
        {/* ═══════════════════════════════════════════════════════
            LEFT PANEL (Desktop Only): Weapon Showcase Image
           ═══════════════════════════════════════════════════════ */}
        <div
          className={cn(
            'hidden md:flex md:w-[44%] lg:w-[46%] shrink-0 flex-col justify-between p-6 sm:p-7 md:p-8 relative overflow-hidden border-r border-mh-slate-750 bg-gradient-to-b',
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
                getRarityBadgeStyle(activeCraftedRarity ?? weapon.rarity ?? 1).badge,
              )}
            >
              {activeCraftedRarity ? `✓ R${activeCraftedRarity} Crafted` : getRarityBadgeStyle(weapon.rarity || 1).label}
            </span>

            <span className="rounded-lg bg-mh-slate-900/90 border border-mh-slate-750 px-2.5 py-1 text-xs font-bold text-mh-slate-200 shadow-sm">
              {weaponTypeObj?.name || weapon.weapon_type_id}
            </span>

            {weapon.is_spoiler && (
              <span className="rounded-lg bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-300 uppercase shadow-sm">
                Spoiler
              </span>
            )}
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
                <ElementIcon element={weapon.element_type} size={15} />
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
            (On Mobile, this is the main unified scrollable container)
           ═══════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 bg-mh-slate-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-mh-slate-750 bg-mh-slate-950/95 px-4 py-3 sm:px-6 sm:py-4 gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-base sm:text-xl md:text-2xl font-bold text-mh-slate-100 break-words leading-tight truncate">
                  {getWeaponDisplayName(weapon, activeCraftedRarity)}
                </h2>
                {getWeaponDisplayName(weapon, activeCraftedRarity) !== weapon.name && (
                  <span className="text-xs text-mh-slate-400 font-medium hidden sm:inline truncate">
                    (Base: {weapon.name})
                  </span>
                )}
                {weapon.name_ja && (
                  <span className="text-xs text-mh-slate-500 font-medium hidden sm:inline truncate">
                    ({weapon.name_ja})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold border font-mono shadow-xs', getRarityBadgeStyle(activeCraftedRarity ?? weapon.rarity ?? 1).badge)}>
                  {activeCraftedRarity ? `✓ R${activeCraftedRarity}` : getRarityBadgeStyle(weapon.rarity || 1).label}
                </span>
                <span className="rounded bg-mh-slate-800 border border-mh-slate-750 px-2 py-0.5 text-[10px] font-bold text-mh-slate-300 shadow-xs">
                  {weaponTypeObj?.name || weapon.weapon_type_id}
                </span>
                {weapon.series && (
                  <span className="text-[10px] text-mh-slate-400 hidden sm:inline truncate">
                    · {weapon.series}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 sm:p-2 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors shrink-0"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 md:p-6 space-y-4 md:space-y-5">
            {/* ── Mobile Compact Artwork Showcase (Mobile only) ── */}
            <div
              className={cn(
                'md:hidden rounded-2xl border border-mh-slate-750 bg-gradient-to-b p-3.5 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-lg',
                glowTheme,
              )}
            >
              <div className="relative z-10 w-full flex items-center justify-center my-1.5 min-h-[130px] max-h-[170px]">
                {weapon.image ? (
                  <img
                    src={weapon.image}
                    alt={weapon.name}
                    className="max-h-36 sm:max-h-40 w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Sword size={48} className="text-mh-slate-600" />
                )}
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold border shadow-xs',
                    elemCfg.bg,
                    elemCfg.text,
                    elemCfg.border,
                  )}
                >
                  <ElementIcon element={weapon.element_type} size={13} />
                  <span>{elemCfg.label}</span>
                </span>
                <span
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[11px] font-bold border shadow-xs',
                    srcCfg.bg,
                    srcCfg.text,
                    srcCfg.border,
                  )}
                >
                  {monsterObj ? `Monster: ${monsterObj.name}` : srcCfg.label}
                </span>
              </div>
              {weapon.description && (
                <p className="relative z-10 text-[11px] text-mh-slate-300 italic mt-2 max-w-md leading-relaxed">
                  "{weapon.description}"
                </p>
              )}
            </div>
            {/* ── User Weapon Crafting Status & Level Tracker ── */}
            <div className="rounded-2xl border border-mh-slate-700 bg-mh-slate-950/80 p-5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hammer size={18} className="text-mh-gold-400" />
                  <h3 className="font-display text-sm font-bold text-mh-slate-100 uppercase tracking-wider">
                    Crafting Status &amp; Level
                  </h3>
                </div>
                {isUserCrafted && activeCraftedRarity && (
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded px-2.5 py-0.5 text-xs font-bold border font-mono', getRarityBadgeStyle(activeCraftedRarity).badge)}>
                      ✓ Crafted R{activeCraftedRarity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveCrafted?.(weapon.id)}
                      title="Mark as uncrafted"
                      className="p-1.5 rounded-lg text-mh-slate-400 hover:text-rose-400 hover:bg-mh-slate-800 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-mh-slate-400">
                  Track whether you have crafted this weapon and select your current upgrade rarity:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {rarityRange.map((r) => {
                    const rStyle = getRarityBadgeStyle(r);
                    const isSelected = activeCraftedRarity === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onSetCraftedRarity?.(weapon.id, r)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border shadow-sm',
                          isSelected
                            ? cn(rStyle.badge, 'ring-2 ring-white/60 shadow-md scale-105')
                            : 'border-mh-slate-750 bg-mh-slate-900 text-mh-slate-300 hover:border-mh-gold-400 hover:text-white',
                        )}
                      >
                        <span className="font-mono">{rStyle.label}</span>
                        {isSelected && <Check size={13} className="stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Personal Hunter's Challenge Card ── */}
            <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-mh-slate-900 to-mh-slate-950 p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChallengeIcon size={22} />
                  <h3 className="font-display text-sm font-bold text-yellow-200 uppercase tracking-wider">
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
                          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
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
                      {rarityRange.map((r) => {
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
                      {rarityRange.filter((r) => r >= selectedCraftRarity).map((r) => {
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
                                ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-md scale-105 font-black'
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
                      Goal: <span className="font-bold text-yellow-300">R{selectedCraftRarity} &rarr; R{selectedMaxRarity}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddChallenge}
                      disabled={addChallenge.isPending}
                      className="flex items-center gap-2 rounded-xl border border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200 px-4 py-2 text-xs font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      <ChallengeIcon size={20} />
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
                      <span className="text-yellow-300 font-mono">
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
                            : 'bg-gradient-to-r from-yellow-500 to-mh-gold-400',
                        )}
                        style={{
                          width: `${Math.min(100, Math.round(((currentRarity || 0) / maxR) * 100))}%`,
                        }}
                      />
                    </div>

                    {/* Quick Rarity Direct Selectors */}
                    <div className="flex flex-wrap gap-1">
                      {[0, ...rarityRange].map((r) => {
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
                                ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                                : isReached
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
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
                        className="flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-4 py-1.5 text-xs font-bold transition-all shadow-md disabled:opacity-50"
                      >
                        <ChevronRight size={15} />
                        <span>{isCrafted ? `Upgrade to R${currentRarity + 1}` : `Mark as Crafted (R${craftR})`}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Starting stats */}
            <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/60 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-200">
                Stats at R{weapon.rarity}
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                <div className="rounded-lg border border-mh-slate-750 bg-mh-slate-900 p-2">
                  <div className="text-[10px] uppercase text-mh-slate-500">Attack</div>
                  <div className="font-mono text-sm font-bold text-mh-slate-100">{weapon.attack ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-mh-slate-750 bg-mh-slate-900 p-2">
                  <div className="text-[10px] uppercase text-mh-slate-500">Affinity</div>
                  <div className="font-mono text-sm font-bold text-mh-slate-100">
                    {weapon.affinity !== null && weapon.affinity !== undefined
                      ? weapon.affinity === 0
                        ? '0%'
                        : `${weapon.affinity > 0 ? '+' : ''}${weapon.affinity / 100}%`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-mh-slate-750 bg-mh-slate-900 p-2">
                  <div className="text-[10px] uppercase text-mh-slate-500 flex items-center gap-1">
                    <ElementIcon element={weapon.element_type} size={11} />
                    <span>{elemCfg.label}</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-mh-slate-100">{weapon.element_damage ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-mh-slate-750 bg-mh-slate-900 p-2">
                  <div className="text-[10px] uppercase text-mh-slate-500">Sharpness</div>
                  <div className="flex h-5 items-center">
                    {weapon.sharpness && WEAPON_SHARPNESS_ICONS[weapon.sharpness] ? (
                      <img src={WEAPON_SHARPNESS_ICONS[weapon.sharpness]} alt={weapon.sharpness} className="h-3.5 w-auto" />
                    ) : (
                      <span className="font-mono text-sm font-bold text-mh-slate-100">—</span>
                    )}
                  </div>
                </div>
              </div>
              {weapon.deco_slots.length > 0 && (
                <p className="text-[11px] text-mh-slate-500">Deco slots: {weapon.deco_slots.join(' · ')}</p>
              )}
              {weapon.source_detail && <p className="text-[11px] text-mh-slate-400">{weapon.source_detail}</p>}
            </div>

            {/* Apex effect */}
            {weapon.apex_effect && (
              <div className="rounded-2xl border border-mh-gold-500/30 bg-gradient-to-r from-mh-gold-500/10 via-mh-slate-900 to-mh-slate-900 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {weapon.apex_effect.icon ? (
                    <img src={weapon.apex_effect.icon} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <Sparkles size={16} className="text-mh-gold-400" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400">Apex Effect</h4>
                </div>
                <p className="font-display text-sm font-bold text-mh-slate-100 break-words leading-tight">{weapon.apex_effect.name}</p>
                <p className="text-xs text-mh-slate-300 leading-relaxed">{weapon.apex_effect.description}</p>
                {weapon.awakening_slots && (
                  <div className="space-y-1 border-t border-mh-gold-500/20 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">Awakening slots</p>
                    {weapon.awakening_slots.unlock_rarities.map((r, i) => (
                      <p key={r} className="text-[11px] text-mh-slate-300">
                        <span className="font-mono font-bold text-mh-gold-300">R{r}</span>
                        {' — '}
                        {(weapon.awakening_slots?.options[i] ?? []).join(' / ')}
                      </p>
                    ))}
                  </div>
                )}
                {weapon.apex_season && <p className="text-[11px] text-mh-slate-500">{weapon.apex_season}</p>}
              </div>
            )}

            {/* Upgrade path */}
            {upgrades.length > 1 && (
              <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/60 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-200">Upgrade Path</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-[10px] uppercase tracking-wider text-mh-slate-500">
                      <tr>
                        <th className="py-1 pr-2">Rarity</th>
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1 pr-2">Attack</th>
                        <th className="py-1 pr-2">{elemCfg.label}</th>
                        <th className="py-1 pr-2">Lv</th>
                        <th className="py-1">Materials</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mh-slate-800">
                      {upgrades.map((u) => {
                        const rs = getRarityBadgeStyle(u.rarity);
                        const stepName = u.name ?? getWeaponDisplayName(weapon, u.rarity);
                        return (
                          <tr key={u.rarity} className={cn(isCrafted && u.rarity === currentRarity && 'bg-yellow-500/10')}>
                            <td className="py-1.5 pr-2">
                              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono', rs.badge)}>{rs.label}</span>
                            </td>
                            <td className="py-1.5 pr-2 font-medium text-mh-slate-200 whitespace-nowrap">
                              {stepName}
                            </td>
                            <td className="py-1.5 pr-2 text-mh-slate-100">
                              {u.attack ?? '—'}
                              {u.gains?.Attack ? <span className="ml-1 text-[10px] text-emerald-400">+{u.gains.Attack}</span> : null}
                            </td>
                            <td className="py-1.5 pr-2 text-mh-slate-300">{u.element_damage ?? '—'}</td>
                            <td className="py-1.5 pr-2 text-mh-slate-300">{u.required_level ?? '—'}</td>
                            <td className="py-1.5 text-mh-slate-300">
                              {u.materials.length ? u.materials.map((m) => `${m.item} ×${m.count}`).join(', ') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
        </div>
      </div>
    </div>
  );
}
