// ─────────────────────────────────────────────────────────────
// Plumbing shared by the armour v2 / v3 / v4 pages: data, the build
// totals at my rarity, what a rarity change did, shared links,
// the piece popup and sign-in for challenge tracking.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, TrendingUp, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';
import LoginModal from '../../components/auth/LoginModal';
import { computeBuild, decodeBuild, diffBuilds, encodeBuild, type LabBuild, type LabSlot } from './logic';
import { useArmourLabStore } from './store';
import { useArmourLabData } from './useArmourLabData';
import { plannerArmour, useSendToPlanner, useTrackPiece } from './hooks';
import { LabStatus, VersionNav, useStickyFriendlyRoot } from './ui';
import { PieceActions, PieceInspector } from './inspector';

export interface RarityChange {
  from: number;
  to: number;
  text: string[];
  keys: Set<string>;
}

export function useLabPage(path: string) {
  const theme = useUIStore((s) => s.sectionThemes['/armory'] ?? DEFAULT_SECTION_THEMES['/armory']);
  const { data, isLoading, error } = useArmourLabData();
  useStickyFriendlyRoot();
  const store = useArmourLabStore();
  const myRarity = Math.min(store.myRarity ?? 14, data?.maxRarity ?? 14);
  const result = useMemo(() => (data ? computeBuild(data, store.build, myRarity) : null), [data, store.build, myRarity]);
  const wanted = useMemo(() => new Set(store.targets.map((t) => t.key)), [store.targets]);

  const [notice, setNotice] = useState<string | null>(null);
  const [change, setChange] = useState<RarityChange | null>(null);
  const changeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const tracker = useTrackPiece();
  const sendToPlanner = useSendToPlanner(data);

  // Guests asked to sign in: close the popup so the sign-in window is on top
  useEffect(() => {
    if (tracker.needsLogin) setInspectId(null);
  }, [tracker.needsLogin]);

  /** Called by the header when the hunter changes rarity */
  const onRarityChange = (from: number, to: number) => {
    if (!data || !result || result.pieceCount === 0) return;
    const d = diffBuilds(computeBuild(data, store.build, from), computeBuild(data, store.build, to));
    const text = d.skills.map((s) => `${s.name} ${s.from}→${s.to}`);
    if (d.defence) text.push(`Defence ${d.defence > 0 ? '+' : ''}${d.defence}`);
    setChange({ from, to, text: text.length ? text : ['No change to your build'], keys: new Set(d.skills.map((s) => s.key)) });
    clearTimeout(changeTimer.current);
    changeTimer.current = setTimeout(() => setChange(null), 7000);
  };

  // Shared build links (?p=…&r=…)
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (!data) return;
    const decoded = decodeBuild(params);
    if (!decoded) return;
    const valid: LabBuild = {};
    for (const [slot, entry] of Object.entries(decoded.build)) {
      if (entry && data.piecesById.has(entry.pieceId)) valid[slot as LabSlot] = entry;
    }
    store.setBuild(valid);
    if (decoded.rarity) store.setMyRarity(Math.min(decoded.rarity, data.maxRarity));
    setNotice(`Loaded a shared build (${Object.keys(valid).length} pieces).`);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params]);

  // Arriving from the Build Planner ("Make an Armour Set"): start from the planner's armour
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!data || !(location.state as { fromPlanner?: boolean } | null)?.fromPlanner) return;
    const b = plannerArmour(data);
    if (Object.keys(b).length > 0) {
      store.setBuild(b);
      setNotice('Your Build Planner armour is loaded. Change it here, then press “Build Planner” to send it back.');
    } else {
      setNotice('Build an armour set here, then press “Build Planner” to send it back to your build.');
    }
    navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, location.state]);

  const actions = {
    share: async () => {
      const url = `${window.location.origin}${path}?${encodeBuild(store.build, myRarity)}`;
      try {
        await navigator.clipboard.writeText(url);
        setNotice('Link copied — anyone who opens it sees this build at your rarity.');
      } catch {
        window.prompt('Copy this link', url);
      }
    },
    importFromPlanner: () => {
      if (!data) return;
      const b = plannerArmour(data);
      store.setBuild(b);
      setNotice(Object.keys(b).length ? 'Imported the armour from your Build Planner.' : 'Your Build Planner has no armour yet.');
    },
    sendToPlanner: () => sendToPlanner(store.build),
    clear: store.clearBuild,
  };

  return { theme, data, isLoading, error, store, myRarity, result, wanted, notice, setNotice, change, setChange, onRarityChange, inspectId, setInspectId, tracker, actions };
}

export type LabPage = ReturnType<typeof useLabPage>;

/** Notices under the header: shared-link / import messages and what a rarity change did */
export function LabNotices({ lab }: { lab: LabPage }) {
  return (
    <>
      {lab.change && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100" role="status">
          <TrendingUp size={14} className="mt-0.5 shrink-0 text-sky-300" />
          <span>
            <b>
              R{lab.change.from} → R{lab.change.to}:
            </b>{' '}
            {lab.change.text.join(' · ')}
          </span>
          <button type="button" onClick={() => lab.setChange(null)} className="ml-auto text-sky-300 hover:text-white" aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      )}
      {lab.notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200" role="status">
          <CheckCircle2 size={14} /> {lab.notice}
          <button type="button" onClick={() => lab.setNotice(null)} className="ml-auto" aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}

/** The piece popup and sign-in window */
export function LabOverlays({ lab }: { lab: LabPage }) {
  return (
    <>
      {lab.inspectId && lab.data && (
        <PieceInspector
          data={lab.data}
          pieceId={lab.inspectId}
          myRarity={lab.myRarity}
          targets={lab.store.targets}
          onClose={() => lab.setInspectId(null)}
          actions={(piece) => <PieceActions piece={piece} data={lab.data!} myRarity={lab.myRarity} tracker={lab.tracker} />}
        />
      )}
      <LoginModal open={lab.tracker.needsLogin} onClose={lab.tracker.closeLogin} />
    </>
  );
}

export function LabLoading({ lab, path }: { lab: LabPage; path: string }) {
  return (
    <div data-rarity-theme={lab.theme} className="section-theme w-full space-y-4 px-4 pb-6 pt-2 lg:px-6">
      <VersionNav current={path} />
      <LabStatus isLoading={lab.isLoading || !lab.data} error={lab.error} />
    </div>
  );
}
