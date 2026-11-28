// ─────────────────────────────────────────────────────────────
// AdventurerModal — Detailed Inspection Dialog for MHO Adventurers
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useAdminWeaponTypes } from '../../hooks/useAdminWeapons';
import {
  X,
  User,
  Swords,
  Sparkles,
  Info,
  CheckCircle2,
  Plus,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';
import {
  type DBAdventurer,
  ADVENTURER_MAX_INSIGHT,
  ADVENTURER_ROLE_CONFIG,
  adventurerRarityBorder,
  ELEMENT_OPTIONS,
  resolveAdventurerMedia,
} from '../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';
import { useAdventurerGifts, useAdventurerSkills, type FavouriteGift } from '../../hooks/useAdminAdventurers';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import AdventurerRarityBadge from './AdventurerRarityBadge';
import { InsightPill, InsightRow } from './AdventurerInsight';
import { AdventurerChallengeButton, type AdventurerChallengeActions } from './AdventurerChallengeButton';
import { ROLE_ICONS } from '../../components/RoleIcon';
import { getYouTubeEmbedUrl } from '../../lib/youtube';
import YouTubeIcon from '../../components/YouTubeIcon';
import FeedbackModal from '../../components/feedback/FeedbackModal';
import AdventurerGifts, { FavouriteGiftIcons } from './AdventurerGifts';

interface AdventurerModalProps {
  adventurer: DBAdventurer | null;
  open: boolean;
  onClose: () => void;
  isRecruited?: boolean;
  /** 1-7 when recruited, 0 otherwise. */
  insightLevel?: number;
  challenge?: HunterChallenge;
  onToggleRecruit?: () => void;
  onSetInsight?: (level: number) => void;
  /** Send to Challenges pop-up (goal choice, projects) */
  challengeActions?: AdventurerChallengeActions;
  onSelectWeapon?: (weapon: string) => void;
}

export default function AdventurerModal({
  adventurer: rawAdventurer,
  open,
  onClose,
  isRecruited = false,
  insightLevel = 0,
  challenge,
  onToggleRecruit,
  onSetInsight,
  challengeActions,
  onSelectWeapon,
}: AdventurerModalProps) {
  const isAdmin = useAuthStore(selectIsAdmin);
  const gender = useAuthStore((s) => s.profile?.equipment_gender ?? 'male');
  const adventurer = useMemo(
    () => (rawAdventurer ? resolveAdventurerMedia(rawAdventurer, gender) ?? rawAdventurer : null),
    [rawAdventurer, gender],
  );
  const [imageError, setImageError] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const { data: skills = [] } = useAdventurerSkills(open ? adventurer?.id : null);
  // Same request the Bond Gifts table uses (shared cache), filtered to favourites for the quick reference.
  const { data: gifts = [] } = useAdventurerGifts(open ? adventurer?.id : null);
  const favouriteGifts: FavouriteGift[] = gifts
    .filter((g) => g.preference === 'favourite')
    .map(({ gift_id, name, icon, bond_gained, multiplier }) => ({ gift_id, name, icon, bond_gained, multiplier }));
  const { data: allWeaponTypes = [] } = useAdminWeaponTypes({ isActive: true });

  const availableWeaponTypes = useMemo(() => {
    const list = allWeaponTypes.filter((wt) => Array.isArray(wt.games) && wt.games.includes('mho'));
    if (list.length > 0) return list;
    return WEAPON_TYPES;
  }, [allWeaponTypes]);

  const embedUrl = useMemo(
    () => (adventurer?.youtube_url ? getYouTubeEmbedUrl(adventurer.youtube_url) : null),
    [adventurer?.youtube_url],
  );

  if (!open || !adventurer) return null;

  const roleKey = (adventurer.role === 'Disruptor' ? 'Disrupter' : adventurer.role) as 'Assault' | 'Disrupter' | 'Support';
  const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
  const RoleIcon = ROLE_ICONS[roleKey] || ROLE_ICONS.Assault;
  const elemCfg = ELEMENT_OPTIONS[adventurer.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;
  const activeWeaponObj = WEAPON_TYPES.find((w) => w.id === adventurer.weapon_type);
  const currentInsight = isRecruited ? Math.max(1, insightLevel) : 0;
  const bondImage = adventurer.bond_image || (adventurer.id ? `/images/adventurers/${adventurer.id}_bond.png` : null);
  const hasInsight = isRecruited && currentInsight >= 1;
  const activeBgImage = (hasInsight && bondImage) ? bondImage : (adventurer.background_image ?? null);
  const showBackground = Boolean(activeBgImage) && !backgroundError;

  const insightProgress = Math.max(0, Math.min(1, (currentInsight - 1) / (ADVENTURER_MAX_INSIGHT - 1)));
  // Lv 1: 0.35 brightness, 0.35 opacity -> Lv 7 (Max): 1.0 brightness, 0.75 opacity
  const bondBrightness = hasInsight ? (0.35 + 0.65 * insightProgress) : 0.4;
  const bondOpacity = hasInsight ? (0.35 + 0.40 * insightProgress) : 0.25;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative isolate z-10 w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-150',
          'bg-gradient-to-b from-[#161a26] to-[#0f121a]',
          isRecruited
            ? 'border-mh-gold-500/50 shadow-mh-gold-500/10'
            : 'border-mh-slate-800 shadow-black/50',
        )}
        style={adventurerRarityBorder(adventurer.rarity)}
      >
        {/* Panel background art, dimmed so text stays readable, brightness scales with insight when recruited */}
        {showBackground && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <img
              src={activeBgImage!}
              alt=""
              onError={() => setBackgroundError(true)}
              style={hasInsight ? {
                filter: `brightness(${bondBrightness}) contrast(1.05)`,
                opacity: bondOpacity,
              } : undefined}
              className={cn('h-full w-full object-cover transition-all duration-300', !hasInsight && 'opacity-25 grayscale')}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f121a]/60 via-[#0f121a]/80 to-[#0f121a]/95" />
          </div>
        )}

        {/* Header Bar */}
        <div className="relative flex items-center justify-between border-b border-mh-slate-800 bg-mh-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            {adventurer.is_default && (
              <span className="flex items-center gap-1 rounded-lg bg-mh-gold-500 px-2.5 py-1 text-xs font-black text-mh-slate-950 shadow-sm">
                <Sparkles size={13} />
                <span>Your Hunter</span>
              </span>
            )}

            {/* Role Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border shadow-sm',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={26} />
              <span>{roleCfg.label}</span>
            </span>

            {/* Element Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border',
                elemCfg.bg,
                elemCfg.text,
                elemCfg.border,
              )}
            >
              <span>{elemCfg.label} Affinity</span>
            </span>

            <AdventurerRarityBadge rarity={adventurer.rarity} className="py-1 text-[11px]" />

            {(adventurer.status === 'not_in_game' || adventurer.is_spoiler) && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                title={isAdmin && adventurer.status_reason ? `Spoiler — ${adventurer.status_reason}` : '***Spoiler***'}
              >
                <span>Coming</span>
              </span>
            )}

            <Link
              to={`/armory?adventurer=${encodeURIComponent(adventurer.id)}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-300 hover:bg-blue-500/30 transition-all shadow-sm cursor-pointer"
              title={`View community builds featuring ${adventurer.name}`}
            >
              <LayoutGrid size={13} className="text-blue-400" />
              <span>Community Builds</span>
            </Link>

            {Boolean(embedUrl) && (
              <a
                href="#adventurer-video-guide"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('adventurer-video-guide')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all shadow-sm cursor-pointer"
                title="Watch character video guide"
              >
                <YouTubeIcon size={14} className="text-red-500 fill-red-500" />
                <span>Video Guide</span>
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Identity & Portrait (No extra border, large & visible) */}
          <div className="flex items-center gap-5">
            <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center">
              {adventurer.image && !imageError ? (
                <img
                  src={adventurer.image}
                  alt={adventurer.name}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              ) : (
                <User size={52} className={isRecruited ? 'text-mh-gold-400' : 'text-mh-slate-500'} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-bold text-mh-slate-100">
                  {adventurer.name}
                </h2>
                {adventurer.name_ja && (
                  <span className="text-sm text-mh-slate-400 font-medium">
                    ({adventurer.name_ja})
                  </span>
                )}
              </div>
              {adventurer.title && (
                <p className="text-sm font-semibold italic text-mh-gold-300 mt-0.5">{adventurer.title}</p>
              )}
              <p className="text-xs text-mh-slate-400 mt-1">
                Aesoland Adventurer &bull; Monster Hunter Outlanders
              </p>
              {(adventurer.gender || adventurer.height || adventurer.default_buddy) && (
                <p className="text-xs text-mh-slate-400 mt-1">
                  {[
                    adventurer.gender && adventurer.gender.charAt(0).toUpperCase() + adventurer.gender.slice(1),
                    adventurer.height,
                    adventurer.default_buddy && `Default buddy: ${adventurer.default_buddy}`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}

              {/* Favourite gifts — highlighted on the character sheet for quick reference */}
              {favouriteGifts.length > 0 && (
                <div className="mt-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mh-gold-300">
                    <img src="/img/ui/Common_Icon_Recommend1.png" alt="" className="h-4 w-4 object-contain" />
                    <span>Favourite Gifts</span>
                  </div>
                  <FavouriteGiftIcons gifts={favouriteGifts} size="md" />
                </div>
              )}

              {(adventurer.status === 'not_in_game' || adventurer.is_spoiler) && (
                <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider border border-amber-500/40">Coming</span>
                    <span>Upcoming Adventurer</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-300 font-bold tracking-wider">
                    ***Spoiler***
                  </p>
                  {isAdmin && adventurer.status_reason && (
                    <p className="mt-1 text-[10px] text-mh-slate-400">
                      <span className="font-semibold text-mh-slate-300">Admin note:</span> {adventurer.status_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hunter Recruitment Status & Challenge Card */}
          <div className="rounded-xl border border-mh-gold-500/30 bg-mh-slate-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-gold-400">
                <CheckCircle2 size={15} className="text-mh-gold-400" />
                <span>Hunter Roster Status</span>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                  isRecruited
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700',
                )}
              >
                {adventurer.is_default
                  ? 'Active Player Character'
                  : isRecruited
                    ? 'Recruited to Roster'
                    : 'Not Recruited'}
              </span>
            </div>

            {!adventurer.is_default && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-mh-slate-800">
                <p className="text-xs text-mh-slate-400">
                  {isRecruited
                    ? 'This adventurer is marked as recruited in your personal field guide.'
                    : 'Mark this adventurer as recruited when unlocked in Monster Hunter Outlanders.'}
                </p>

                <div className="flex items-center gap-2 shrink-0">
                  {challengeActions && (
                    <AdventurerChallengeButton
                      adventurer={adventurer}
                      currentLevel={currentInsight}
                      challenge={challenge}
                      actions={challengeActions}
                      className="!rounded-lg !px-3 !py-1.5 !text-xs"
                    />
                  )}

                  <button
                    type="button"
                    onClick={onToggleRecruit}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0',
                      isRecruited
                        ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                        : 'bg-mh-gold-500 text-mh-slate-950 hover:bg-mh-gold-400 shadow-sm',
                    )}
                  >
                    {isRecruited ? (
                      <>
                        <X size={13} />
                        <span>Unrecruit</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Mark Recruited</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isRecruited && (
              <div className="space-y-2 pt-2 border-t border-mh-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                    Insight Level
                  </span>
                  <InsightPill level={currentInsight} />
                </div>
                <InsightRow level={currentInsight} onChange={(lvl) => onSetInsight?.(lvl)} />
              </div>
            )}
          </div>

          {/* Community Builds Section Link */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <LayoutGrid size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Community Builds for {adventurer.name}
                </p>
                <p className="text-[11px] text-mh-slate-400">
                  Discover weapons, armour, and visage loadouts created for this adventurer
                </p>
              </div>
            </div>
            <Link
              to={`/armory?adventurer=${encodeURIComponent(adventurer.id)}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 text-xs transition-colors shrink-0 shadow-sm whitespace-nowrap"
            >
              <span>View Builds</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {/* Tactical Role Analysis */}
          <div className={cn('rounded-xl border p-4 space-y-1.5', roleCfg.bg, roleCfg.border)}>
            <div className="flex items-center gap-2">
              <RoleIcon size={32} />
              <h4 className={cn('text-xs font-bold uppercase tracking-wider', roleCfg.text)}>
                Tactical Role: {roleCfg.label}
              </h4>
            </div>
            <p className="text-xs text-mh-slate-300 leading-relaxed">
              {roleCfg.description}
            </p>
          </div>

          {/* Weapon Discipline */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-mh-gold-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-200">
                  Weapon Discipline
                </h4>
              </div>
              {adventurer.is_default && (
                <span className="text-[11px] font-bold text-mh-gold-400">
                  {availableWeaponTypes.length} Weapons Available
                </span>
              )}
            </div>

            {adventurer.is_default ? (
              <div className="space-y-2">
                <p className="text-xs text-mh-slate-400">
                  As your customizable hunter, select your active weapon discipline:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
                  {availableWeaponTypes.map((w) => {
                    const isSelected = w.id === adventurer.weapon_type;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelectWeapon?.(w.id)}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all',
                          isSelected
                            ? 'border-mh-gold-400 bg-mh-gold-500 text-mh-slate-950 font-bold shadow-sm'
                            : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white',
                        )}
                      >
                        <span className="truncate">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-mh-slate-200 font-bold">
                    Primary: {activeWeaponObj?.name || adventurer.weapon_type || 'Unspecified'}
                  </span>
                  <span className="rounded bg-mh-slate-800 px-2 py-0.5 text-[10px] font-semibold text-mh-slate-400 border border-mh-slate-700">
                    Discipline
                  </span>
                </div>
                {adventurer.allowed_weapon_types && adventurer.allowed_weapon_types.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {adventurer.allowed_weapon_types.map((wt) => {
                      const weaponObj = WEAPON_TYPES.find((w) => w.id === wt);
                      return (
                        <span
                          key={wt}
                          className="rounded-md bg-mh-slate-800/90 border border-mh-slate-700 px-2 py-0.5 text-[11px] font-medium text-mh-slate-300"
                        >
                          {weaponObj?.name || wt}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Character Lore & Description */}
          {adventurer.description && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
                <Info size={13} />
                <span>Character Lore &amp; Background</span>
              </div>
              <p className="text-xs text-mh-slate-300 leading-relaxed whitespace-pre-line">
                {adventurer.description}
              </p>
            </div>
          )}

          {/* Playstyle */}
          {adventurer.playstyle && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
                <Swords size={13} />
                <span>Playstyle</span>
              </div>
              <p className="text-xs text-mh-slate-300 leading-relaxed whitespace-pre-line">{adventurer.playstyle}</p>
            </div>
          )}

          {/* Traits */}
          {adventurer.traits && adventurer.traits.length > 0 && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
                <Sparkles size={13} className="text-mh-gold-400" />
                <span>Traits</span>
              </div>
              <ul className="space-y-2">
                {adventurer.traits.map((t) => (
                  <li key={t.name} className="text-xs leading-relaxed">
                    <span className="font-bold text-mh-gold-300">{t.name}</span>
                    <span className="text-mh-slate-300 whitespace-pre-line">{t.description && `: ${t.description}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
                <Swords size={13} />
                <span>Skills</span>
              </div>
              <ul className="divide-y divide-mh-slate-800/80">
                {skills.map((sk) => (
                  <li key={sk.id} className="py-1.5 text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-mh-slate-200">{sk.name}</span>
                      {sk.skill_type && <span className="text-[10px] text-mh-slate-500 shrink-0">{sk.skill_type}</span>}
                    </div>
                    {sk.description && <p className="text-mh-slate-400 leading-relaxed mt-0.5">{sk.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* YouTube Video Guide Panel */}
          {embedUrl && (
            <div id="adventurer-video-guide" className="rounded-xl border border-red-500/30 bg-mh-slate-900/80 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                    <YouTubeIcon size={18} className="text-red-500 fill-red-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span>Character Video Guide</span>
                      <span className="rounded-full bg-red-500/20 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider text-red-300 border border-red-500/30">
                        YouTube
                      </span>
                    </h4>
                    <p className="text-[11px] text-mh-slate-400 mt-0.5">
                      Overview and guide on how to play {adventurer.name}.
                    </p>
                  </div>
                </div>

                {adventurer.youtube_url && (
                  <a
                    href={adventurer.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1 text-xs font-semibold text-mh-slate-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 transition-all shrink-0 shadow-sm"
                  >
                    <span>Watch on YouTube</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Responsive 16:9 Video Embed Player */}
              <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-mh-slate-800 bg-black shadow-inner">
                <iframe
                  src={embedUrl}
                  title={`${adventurer.name} Guide`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>

              {/* Callout below video */}
              <div className="pt-1 text-center">
                <p className="text-xs text-mh-slate-400">
                  If you want your video here, submit a{' '}
                  <button
                    type="button"
                    onClick={() => setFeedbackModalOpen(true)}
                    className="font-bold text-mh-gold-400 hover:text-mh-gold-300 underline underline-offset-2 transition-colors inline-block cursor-pointer"
                  >
                    &ldquo;General&rdquo; feedback
                  </button>{' '}
                  to the site.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {adventurer.notes && (
            <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/50 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-mh-slate-400 uppercase tracking-wider">
                <Sparkles size={12} className="text-mh-gold-400" />
                <span>Field Guide Notes</span>
              </div>
              <p className="text-xs text-mh-slate-400 leading-relaxed">
                {adventurer.notes}
              </p>
            </div>
          )}

          {/* Bond gifts */}
          <AdventurerGifts adventurerId={adventurer.id} open={open} />
        </div>

        {/* Footer */}
        <div className="relative border-t border-mh-slate-800 bg-mh-slate-950/90 px-6 py-3 flex items-center justify-between text-xs text-mh-slate-500">
          <span>Monster Hunter Outlanders Adventurer</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-mh-slate-800 px-4 py-1.5 text-xs font-bold text-mh-slate-200 hover:bg-mh-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Feedback Modal for video submissions */}
      <FeedbackModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        defaultType="general"
      />
    </div>
  );
}
