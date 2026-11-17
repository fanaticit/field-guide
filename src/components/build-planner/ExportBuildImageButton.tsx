import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ImageDown, Download, ClipboardCopy, X, Loader2, Check, Link2 } from 'lucide-react';
import { useBuildPlannerStore, armourPieceIcon, type ArmourPiece, type Visage } from '../../store/buildPlannerStore';
import { useAuthStore } from '../../store/authStore';
import { useAdminSkills } from '../../hooks/useAdminSkills';
import { useAdminWeaponTypes } from '../../hooks/useAdminWeapons';
import { buildSkillIndex } from '../../lib/skillIndex';
import { getInkConfig } from '../../data/schemas/visage';
import { getWeaponMaxName, type DBWeapon } from '../../data/schemas/weapon';
import { getRoleIconSrc } from '../RoleIcon';
import { renderBuildImage, solidInkColor, type ExportBuildData, type ExportInk, type ExportInkSet } from '../../lib/exportBuildImage';
import { INK_SET_BONUSES } from './VisageSelector';

// Same colours as the Skills panel categories
const CATEGORY_HEX: Record<string, string> = {
  attack: '#f87171',
  critical: '#c084fc',
  defense: '#60a5fa',
  survival: '#fb923c',
  general: '#cbd5e1',
  status: '#34d399',
  utility: '#facc15',
  health: '#4ade80',
};
const CATEGORY_ALIASES: Record<string, string> = {
  'Hunt (General)': 'attack',
  'Hunt (Ranged)': 'critical',
  'Weapon-specific': 'utility',
  Attributes: 'defense',
  Resistance: 'status',
  Survival: 'survival',
  Exploration: 'general',
};

const ARMOUR_SLOTS = [
  ['helm', 'Head'],
  ['chest', 'Chest'],
  ['gloves', 'Arms'],
  ['waist', 'Waist'],
  ['greaves', 'Legs'],
] as const;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'build';
}

export function ExportBuildImageButton() {
  const store = useBuildPlannerStore();
  const gender = useAuthStore((s) => s.profile?.equipment_gender ?? 'male');
  const { data: skillsData = [] } = useAdminSkills({ isActive: true, isSetBonus: false });
  const { data: allWeaponTypes = [] } = useAdminWeaponTypes({ isActive: true });
  const { byId } = useMemo(() => buildSkillIndex(skillsData), [skillsData]);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const collect = (): ExportBuildData => {
    const s = useBuildPlannerStore.getState();
    const adv = s.adventurer;

    const isRoleLocked = !!adv && !adv.is_default;
    const role = isRoleLocked
      ? ((adv?.role === 'Disruptor' ? 'Disrupter' : adv?.role) || 'Assault')
      : (s.tacticalRole || 'Assault');

    const isWeaponLocked = !!adv && !adv.is_default && !!adv.allowed_weapon_types?.[0];
    const weaponType = isWeaponLocked
      ? (allWeaponTypes.find((wt) => wt.id === adv!.allowed_weapon_types[0]) ?? s.weaponType)
      : s.weaponType;

    const inkFor = (slot: string, v: Visage | null): ExportInk | null => {
      if (!v) return null;
      const cfg = getInkConfig(s.selectedInkTypes[slot] || v.ink_types[0]);
      return {
        name: cfg.name,
        icon: cfg.iconName.startsWith('/') ? cfg.iconName : null,
        color: solidInkColor(cfg.glowColor),
      };
    };

    // Ink set counts and bonuses, worked out the same way as the Visage panel
    const hasHuntingMaster = s.buildExceptions.includes('hunting_master_1');
    const coreInkId = s.coreVisage ? getInkConfig(s.selectedInkTypes['core'] || s.coreVisage.ink_types[0]).id : null;
    const inkCounts = new Map<string, number>();
    (['core', 2, 3, 4, 5] as const).forEach((slot) => {
      const card = slot === 'core' ? s.coreVisage : s[`visage${slot}` as const];
      const ink = card ? s.selectedInkTypes[String(slot)] : null;
      if (ink) inkCounts.set(ink, (inkCounts.get(ink) ?? 0) + 1);
    });
    const inkSets: ExportInkSet[] = Array.from(inkCounts.entries()).map(([ink, count]) => {
      const cfg = getInkConfig(ink);
      const isCoreInk = cfg.id === coreInkId;
      const bonuses = INK_SET_BONUSES[ink] ?? INK_SET_BONUSES[cfg.id] ?? [];
      return {
        ink: { name: cfg.name, icon: cfg.iconName.startsWith('/') ? cfg.iconName : null, color: solidInkColor(cfg.glowColor) },
        count,
        bonuses: bonuses.map(({ pieces, description }) => {
          const mastery = isCoreInk && hasHuntingMaster && pieces === 4;
          return {
            label: mastery ? '3pc (Mastery I)' : `${pieces}pc`,
            description,
            achieved: count >= (mastery ? 3 : pieces),
          };
        }),
      };
    });

    const skills = s.getActiveSkills()
      .sort((a, b) => b.level - a.level)
      .map((sk) => {
        const def = byId.get(sk.id);
        const maxLevel = def?.max_levels ?? sk.level;
        const cat = def?.category || 'general';
        return {
          name: def?.name || sk.id,
          level: Math.min(sk.level, maxLevel),
          maxLevel,
          color: CATEGORY_HEX[CATEGORY_ALIASES[cat] ?? cat] ?? CATEGORY_HEX.general,
        };
      });

    const weapon = s.weapon;
    const element = weapon?.element_type && weapon.element_type !== 'raw'
      ? weapon.element_type.charAt(0).toUpperCase() + weapon.element_type.slice(1)
      : null;

    return {
      title: s.title,
      description: s.description,
      buildRole: s.buildRole,
      adventurer: adv ? { name: adv.name, image: adv.image } : null,
      tacticalRole: { name: role, icon: getRoleIconSrc(role) },
      weaponType: weaponType ? { name: weaponType.name, icon: weaponType.icon } : null,
      buddy: s.buddy ? { name: s.buddy.name, image: s.buddy.image, corePassive: s.buddy.core_passive } : null,
      weapon: weapon
        ? {
            name: getWeaponMaxName(weapon as DBWeapon),
            image: weapon.image,
            detail: [
              weaponType?.name,
              weapon.attack ? `ATK ${weapon.attack}` : null,
              element ? `${element}${weapon.element_damage ? ' ' + weapon.element_damage : ''}` : null,
            ].filter(Boolean).join(' · ') || null,
          }
        : null,
      armour: ARMOUR_SLOTS.map(([key, label]) => {
        const piece = s[key] as ArmourPiece | null;
        return {
          slot: label,
          name: piece ? ((piece.set_name ?? piece.monster_name ?? 'Armour') + ' ' + (piece.set_variant ?? '')).trim() : null,
          icon: piece
            ? (armourPieceIcon(piece, gender) || (piece as ArmourPiece & { monster_icon?: string }).monster_icon || `/images/armor/${key}.png`)
            : null,
        };
      }),
      coreVisage: s.coreVisage
        ? {
            name: s.coreVisage.name,
            icon: s.coreVisage.monster_icon || s.coreVisage.monster_sketch,
            points: s.coreVisage.points,
            coreEffect: s.coreVisage.core_effect,
            ink: inkFor('core', s.coreVisage),
          }
        : null,
      supportVisages: ([2, 3, 4, 5] as const).map((n) => {
        const v = s[`visage${n}` as const];
        return v ? { name: v.name, points: v.points, ink: inkFor(String(n), v) } : null;
      }),
      inkSets,
      totalVisagePoints: s.getTotalVisagePoints(),
      skills,
      buildUrl: s.buildId ? `mhfg.quest/armory/planner/${s.buildId}` : null,
      generatedOn: new Date(),
    };
  };

  const generate = async () => {
    setOpen(true);
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const canvas = await renderBuildImage(collect());
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!b) throw new Error('Could not create the image.');
      setBlob(b);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
    } catch (e) {
      console.error('Build image export failed', e);
      setError(e instanceof Error ? e.message : 'Could not create the image.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `mhfg-${slugify(store.title || 'build')}.png`;
    a.click();
  };

  const copy = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Your browser blocked copying the image — use Download instead.');
    }
  };

  const buildLink = store.buildId ? `${window.location.origin}/armory/planner/${store.buildId}` : null;

  const copyLink = async () => {
    if (!buildLink) return;
    try {
      await navigator.clipboard.writeText(buildLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('Your browser blocked copying the link.');
    }
  };

  const canCopy = typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;

  return (
    <>
      <button
        type="button"
        onClick={generate}
        className="btn-mho-panel whitespace-nowrap !text-xs sm:!text-sm !py-1.5 !px-2.5 sm:!px-3"
        title="Export this build as an image to share"
      >
        <ImageDown size={14} />
        <span className="hidden sm:inline">Export Image</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="mho-panel w-full max-w-4xl max-h-[92vh] flex flex-col gap-3 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-white flex items-center gap-2">
                <span className="text-[#FFD700] text-xs">❖</span>Export Build Image
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="text-mh-slate-400 hover:text-white cursor-pointer" title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-[200px] overflow-auto rounded-lg border border-white/10 bg-black/40 flex items-start justify-center">
              {busy ? (
                <div className="flex items-center gap-2 text-sm text-mh-slate-400 self-center">
                  <Loader2 size={16} className="animate-spin" /> Rendering build…
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Build preview" className="w-full h-auto" />
              ) : null}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={copyLink}
                disabled={!buildLink}
                className="btn-mho-panel !text-sm !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                title={buildLink ? buildLink : 'Save the build first to get a link'}
              >
                {linkCopied ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}
                <span>{linkCopied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
              {canCopy && (
                <button type="button" onClick={copy} disabled={!blob || busy} className="btn-mho-panel !text-sm !py-1.5 !px-3 disabled:opacity-50">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <ClipboardCopy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Image'}</span>
                </button>
              )}
              <button type="button" onClick={download} disabled={!previewUrl || busy} className="btn-mho-gold !text-sm !py-1.5 !px-3.5 flex items-center gap-1.5 disabled:opacity-50">
                <Download size={14} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
