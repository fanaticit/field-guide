// ─────────────────────────────────────────────────────────────
// AddBuildToChallengesButton — turn the planner build into a challenge project:
// the weapon, armour, adventurer, buddy and visage cards go into the hunter's
// challenges under one project named after the build. Items they already have
// (earlier challenges or their collections) are added as completed.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Target, X, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useBuildPlannerStore, type VisageSlot } from '../../store/buildPlannerStore';
import { useAuthStore } from '../../store/authStore';
import { useHunterChallenges } from '../../hooks/useHunterChallenges';
import {
  useChallengeProjects,
  useCreateProjectFromBuild,
  projectErrorMessage,
  type BuildProjectResult,
  type ProjectSlot,
} from '../../hooks/useChallengeProjects';
import LoginModal from '../auth/LoginModal';

const ARMOUR_SLOTS = ['helm', 'chest', 'gloves', 'waist', 'greaves'] as const;
const VISAGE_SLOTS: { slot: VisageSlot; key: ProjectSlot }[] = [
  { slot: 'core', key: 'core_visage' },
  { slot: 2, key: 'visage_2' },
  { slot: 3, key: 'visage_3' },
  { slot: 4, key: 'visage_4' },
  { slot: 5, key: 'visage_5' },
];
const VISAGE_TARGETS = [
  { value: 1, label: 'Fine (own the card)' },
  { value: 2, label: 'Rare' },
  { value: 3, label: 'Epic' },
  { value: 4, label: 'Superior' },
];

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

export function AddBuildToChallengesButton() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const store = useBuildPlannerStore();
  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const { data: projects = [] } = useChallengeProjects(user?.id);
  const createProject = useCreateProjectFromBuild();

  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [name, setName] = useState('');
  const [weaponTarget, setWeaponTarget] = useState(16);
  const [armourTarget, setArmourTarget] = useState(16);
  const [visageTarget, setVisageTarget] = useState(1);
  const [result, setResult] = useState<BuildProjectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingProject = store.buildId ? projects.find((p) => p.build_id === store.buildId) : undefined;

  const armour = ARMOUR_SLOTS.map((s) => [s, store[s]] as const).filter(([, p]) => p);
  const visages = VISAGE_SLOTS.flatMap(({ slot, key }) => {
    const v = slot === 'core' ? store.coreVisage : store[`visage${slot}` as 'visage2'];
    if (!v) return [];
    const ink = store.selectedInkTypes[String(slot)] || v.ink_types?.[0] || null;
    return [{ slot: key, visage: v, ink }];
  });

  const weaponMin = Math.max(1, store.weapon?.rarity ?? 1);
  const weaponMax = Math.max(weaponMin, store.weapon?.max_rarity ?? 16);
  const armourMin = Math.max(1, ...armour.map(([, p]) => p!.rarity ?? 1));
  const armourMax = 16;

  /** What the build holds, and whether each item is already in the hunter's challenges */
  const lines = useMemo(() => {
    const tracked = (pred: (c: (typeof challenges)[number]) => boolean) => challenges.some((c) => pred(c) && c.status !== 'abandoned');
    const out: { label: string; name: string; tracked: boolean }[] = [];
    if (store.weapon) out.push({ label: 'Weapon', name: store.weapon.name, tracked: tracked((c) => c.weapon_id === store.weapon!.id) });
    for (const [slot, p] of armour) {
      out.push({ label: slot[0].toUpperCase() + slot.slice(1), name: `${p!.set_name ?? p!.monster_name ?? ''} ${p!.set_variant ?? ''} ${slot}`.trim(), tracked: tracked((c) => c.armour_piece_id === p!.id) });
    }
    if (store.adventurer && !store.adventurer.is_default) {
      out.push({ label: 'Adventurer', name: store.adventurer.name, tracked: tracked((c) => c.adventurer_id === store.adventurer!.id) });
    }
    if (store.buddy) out.push({ label: 'Buddy', name: store.buddy.name, tracked: tracked((c) => c.buddy_id === store.buddy!.id) });
    for (const v of visages) {
      out.push({
        label: v.slot === 'core_visage' ? 'Core Visage' : 'Visage',
        name: `${v.visage.name}${v.ink ? ` (${v.ink})` : ''}`,
        tracked: tracked((c) => c.visage_id === v.visage.id && (c.ink_type ?? '') === (v.ink ?? '').toLowerCase()),
      });
    }
    return out;
  }, [store, armour, visages, challenges]);

  const openDialog = () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setName(existingProject?.name ?? (store.title.trim() || 'My build'));
    setWeaponTarget(Math.min(weaponMax, existingProject?.weapon_target_rarity ?? weaponMax));
    setArmourTarget(Math.min(armourMax, existingProject?.armour_target_rarity ?? armourMax));
    setResult(null);
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!user) return;
    setError(null);
    try {
      const res = await createProject.mutateAsync({
        userId: user.id,
        name: name.trim() || 'My build',
        buildId: store.buildId,
        projectId: existingProject?.id ?? null,
        weaponId: store.weapon?.id ?? null,
        armour: Object.fromEntries(armour.map(([s, p]) => [s, p!.id])),
        // The default (Fated) adventurer is always available, so it is not a challenge
        adventurerId: store.adventurer && !store.adventurer.is_default ? store.adventurer.id : null,
        buddyId: store.buddy?.id ?? null,
        visages: visages.map((v) => ({ slot: v.slot, visageId: v.visage.id, inkType: v.ink })),
        weaponTarget,
        armourTarget,
        visageTarget,
      });
      setResult(res);
    } catch (err) {
      console.error('Add build to challenges failed', err);
      setError(projectErrorMessage(err));
    }
  };

  const empty = lines.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="btn-mho-panel whitespace-nowrap !text-xs sm:!text-sm !py-1.5 !px-2.5 sm:!px-3"
        title={existingProject ? `Update the "${existingProject.name}" challenge project` : 'Add the whole build to your challenges as a project'}
      >
        <Target size={14} />
        <span className="hidden @3xl:inline">{existingProject ? 'Update Challenges' : 'Add to Challenges'}</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="mho-panel w-full max-w-lg max-h-[92vh] flex flex-col gap-3 p-4 shadow-2xl text-white">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#FFD700] text-xs">❖</span>
                {existingProject ? 'Update Challenge Project' : 'Add Build to Challenges'}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="text-mh-slate-400 hover:text-white cursor-pointer" title="Close">
                <X size={18} />
              </button>
            </div>

            {result ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-bold">“{name.trim() || 'My build'}” is in your challenges.</p>
                    <p className="text-xs text-emerald-300/90 mt-1">
                      {result.added} new item{result.added === 1 ? '' : 's'} added
                      {result.alreadyTracked > 0 && `, ${result.alreadyTracked} already in your challenges`}
                      {result.alreadyDone > 0 && ` · ${result.alreadyDone} already done`}.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn-mho-panel !text-sm !py-1.5 !px-3">Close</button>
                  <button
                    type="button"
                    onClick={() => navigate(`/challenges?project=${encodeURIComponent(result.projectId)}`)}
                    className="btn-mho-gold !text-sm !py-1.5 !px-3"
                  >
                    Open project <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-mh-slate-400 leading-relaxed">
                  Everything in this build becomes a challenge, grouped under one project. Items you already have —
                  from earlier challenges or your weapon, adventurer, buddy and visage collections — are added as done.
                </p>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">Project name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white focus:border-[#FFD700] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {store.weapon && (
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">Weapon done at</span>
                      <select
                        value={weaponTarget}
                        onChange={(e) => setWeaponTarget(Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 text-sm text-white"
                      >
                        {range(weaponMin, weaponMax).map((r) => <option key={r} value={r}>Rarity {r}</option>)}
                      </select>
                    </label>
                  )}
                  {armour.length > 0 && (
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">Armour done at</span>
                      <select
                        value={armourTarget}
                        onChange={(e) => setArmourTarget(Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 text-sm text-white"
                      >
                        {range(armourMin, armourMax).map((r) => <option key={r} value={r}>Rarity {r}</option>)}
                      </select>
                    </label>
                  )}
                  {visages.length > 0 && (
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">Visage cards done at</span>
                      <select
                        value={visageTarget}
                        onChange={(e) => setVisageTarget(Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 text-sm text-white"
                      >
                        {VISAGE_TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-mh-slate-500 -mt-1">
                  Armour pieces that can't reach the chosen rarity stop at their highest. You can change each item's target later on the Challenges page.
                </p>

                <div className="rounded-lg border border-white/10 bg-black/30 max-h-56 overflow-y-auto divide-y divide-white/5">
                  {empty ? (
                    <p className="p-3 text-xs text-mh-slate-400">This build has nothing to track yet — pick a weapon, armour, buddy or visage cards first.</p>
                  ) : lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wider text-mh-slate-500">{l.label}</span>
                      <span className="flex-1 min-w-0 truncate text-mh-slate-200">{l.name}</span>
                      <span className={l.tracked ? 'text-sky-300 text-[10px]' : 'text-emerald-300 text-[10px]'}>
                        {l.tracked ? 'Already tracked' : 'New'}
                      </span>
                    </div>
                  ))}
                </div>

                {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn-mho-panel !text-sm !py-1.5 !px-3">Cancel</button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={empty || createProject.isPending}
                    className="btn-mho-gold !text-sm !py-1.5 !px-3 disabled:opacity-50"
                  >
                    {createProject.isPending ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
                    {existingProject ? 'Update project' : 'Create project'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
