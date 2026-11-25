// ─────────────────────────────────────────────────────────────
// "Export image" for the armour page's example build: a preview of the
// shareable PNG (with the MHFG.Quest logo footer), plus Copy Image,
// Download PNG and Copy Link — the same window as the Build Planner's.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ClipboardCopy, Download, ImageDown, Link2, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LAB_SLOTS, encodeBuild, targetProgress, type LabSlot } from './logic';
import type { LabPage } from './page-kit';
import { isLockedInBuild, targetTones } from './ui';
import { renderArmourImage, type ArmourImageData } from './exportImage';

// Same colours as the Build Planner image, by game skill category
const CATEGORY_HEX: Record<string, string> = {
  'Hunt (General)': '#f87171',
  'Hunt (Ranged)': '#c084fc',
  'Weapon-specific': '#facc15',
  Attributes: '#60a5fa',
  Resistance: '#34d399',
  Survival: '#fb923c',
  Exploration: '#cbd5e1',
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'armour';
}

/** A sensible default title: the set most of the build comes from */
function defaultTitle(lab: LabPage): string {
  const { data, store } = lab;
  if (!data) return 'My Armour Set';
  const counts = new Map<string, number>();
  for (const { id } of LAB_SLOTS) {
    const p = store.build[id] ? data.piecesById.get(store.build[id]!.pieceId) : undefined;
    if (p) counts.set(p.setName, (counts.get(p.setName) ?? 0) + 1);
  }
  const [name, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return name && n >= 3 ? `${name} Build` : 'My Armour Set';
}

function collect(lab: LabPage, title: string): ArmourImageData {
  const { data, store, result, myRarity } = lab;
  const tones = targetTones(store.targets);
  const wantedKeys = new Set(store.targets.map((t) => t.key));
  const pieces = LAB_SLOTS.map(({ id, label }) => {
    const e = store.build[id];
    const p = e ? data!.piecesById.get(e.pieceId) : undefined;
    if (!p) return { slot: label, setName: null };
    return {
      slot: label,
      setName: p.setName,
      monsterName: p.hasMonster ? p.monsterName : null,
      icon: p.image ?? LAB_SLOTS.find((s) => s.id === (id as LabSlot))?.icon,
      rarity: result!.rarityBySlot[id] ?? null,
      locked: isLockedInBuild(p, e?.rarity, myRarity),
      startRarity: p.rarity,
    };
  });
  const skills = [...result!.skills]
    .sort((a, b) => Number(wantedKeys.has(b.key)) - Number(wantedKeys.has(a.key)) || b.level - a.level || a.name.localeCompare(b.name))
    .map((l) => ({
      name: l.name,
      level: l.level,
      max: l.max,
      wasted: l.raw - l.level,
      wanted: wantedKeys.has(l.key),
      color: tones.get(l.key)?.hex ?? CATEGORY_HEX[l.category] ?? '#cbd5e1',
    }));
  const wanted = targetProgress(result!, store.targets).map((t) => ({
    name: data!.skills.get(t.key)?.name ?? t.key,
    have: t.have,
    target: t.level,
    color: tones.get(t.key)?.hex ?? '#FFD700',
  }));
  const setBonuses = result!.sets.map((s) => ({
    setName: s.setName,
    count: s.count,
    needed: s.needed,
    active: s.active,
    bonus: `+${s.level} ${s.skillName}`,
  }));
  return {
    title,
    rarity: myRarity,
    defence: result!.defence,
    pieces,
    skills,
    wanted,
    setBonuses,
    url: 'mhfg.quest/armory/armour',
    generatedOn: new Date(),
  };
}

export function ExportArmourImage({ lab, className }: { lab: LabPage; className?: string }) {
  const empty = !lab.result || lab.result.pieceCount === 0;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<'image' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderId = useRef(0);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Render when the window opens, and again (briefly debounced) when the title changes
  useEffect(() => {
    if (!open || !lab.data || !lab.result) return;
    const id = ++renderId.current;
    setBusy(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const canvas = await renderArmourImage(collect(lab, title));
        const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (id !== renderId.current) return;
        if (!b) throw new Error('Could not create the image.');
        setBlob(b);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(b);
        });
      } catch (e) {
        console.error('Armour image export failed', e);
        if (id === renderId.current) setError(e instanceof Error ? e.message : 'Could not create the image.');
      } finally {
        if (id === renderId.current) setBusy(false);
      }
    }, previewUrl ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title]);

  // Close with Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const start = () => {
    setTitle(defaultTitle(lab));
    setBlob(null);
    setPreviewUrl(null);
    setOpen(true);
  };

  const flash = (what: 'image' | 'link') => {
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `mhfg-${slugify(title || 'armour')}.png`;
    a.click();
  };

  const copyImage = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flash('image');
    } catch {
      setError('Your browser blocked copying the image — use Download instead.');
    }
  };

  const link = `${window.location.origin}/armory/armour?${encodeBuild(lab.store.build, lab.myRarity)}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      flash('link');
    } catch {
      setError('Your browser blocked copying the link.');
    }
  };

  const canCopyImage = typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={empty}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40',
          className,
          'border-mh-gold-400 bg-mh-gold-500 text-black hover:brightness-110',
        )}
        title={empty ? 'Add some armour to export an image' : 'Make an image of this build to share'}
      >
        <ImageDown size={13} /> Export image
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="mho-panel flex max-h-[94vh] w-full max-w-xl flex-col gap-3 p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label="Export armour image">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-white">
                  <span className="text-xs text-[#FFD700]">❖</span>Export Armour Image
                </h2>
                <span className="ml-auto mr-2 hidden text-[11px] text-mh-slate-500 sm:inline">1080 × 1920 · Shorts &amp; TikTok size</span>
                <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-mh-slate-400 hover:text-white" title="Close">
                  <X size={18} />
                </button>
              </div>

              <label className="flex flex-wrap items-center gap-2 text-xs text-mh-slate-400">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                  placeholder="My Armour Set"
                  className="h-9 min-w-[220px] flex-1 rounded-lg border border-mh-slate-700 bg-mh-slate-950 px-3 text-sm text-mh-slate-100 focus:border-mh-gold-400 focus:outline-none"
                />
              </label>

              <div className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40 p-2">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Armour build preview"
                    className={cn('aspect-[9/16] max-h-[64vh] w-auto max-w-full rounded-md object-contain transition-opacity', busy && 'opacity-60')}
                  />
                ) : null}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-mh-slate-300">
                    <Loader2 size={16} className="animate-spin" /> Rendering build…
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={copyLink} className="btn-mho-panel !px-3 !py-1.5 !text-sm" title={link}>
                  {copied === 'link' ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}
                  <span>{copied === 'link' ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                {canCopyImage && (
                  <button type="button" onClick={copyImage} disabled={!blob || busy} className="btn-mho-panel !px-3 !py-1.5 !text-sm disabled:opacity-50">
                    {copied === 'image' ? <Check size={14} className="text-emerald-400" /> : <ClipboardCopy size={14} />}
                    <span>{copied === 'image' ? 'Copied!' : 'Copy Image'}</span>
                  </button>
                )}
                <button type="button" onClick={download} disabled={!previewUrl || busy} className="btn-mho-gold flex items-center gap-1.5 !px-3.5 !py-1.5 !text-sm disabled:opacity-50">
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
