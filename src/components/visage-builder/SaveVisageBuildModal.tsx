// ─────────────────────────────────────────────────────────────
// SaveVisageBuildModal — title / description / publish, then save.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface Props {
  open: boolean;
  asNew: boolean;
  initialTitle: string;
  initialDescription: string;
  initialPublished: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (v: { title: string; description: string; isPublished: boolean }) => void;
}

export default function SaveVisageBuildModal({
  open,
  asNew,
  initialTitle,
  initialDescription,
  initialPublished,
  saving,
  error,
  onClose,
  onConfirm,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isPublished, setIsPublished] = useState(initialPublished);

  useEffect(() => {
    if (open) {
      setTitle(asNew && initialTitle ? `${initialTitle} (copy)` : initialTitle);
      setDescription(initialDescription);
      setIsPublished(initialPublished);
    }
  }, [open, asNew, initialTitle, initialDescription, initialPublished]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-mh-gold-500/30 bg-[#141824] p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-mh-gold-300">{asNew ? 'Save as New Visage Build' : 'Save Visage Build'}</h3>
          <button onClick={onClose} className="text-mh-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">Title</span>
          <input
            autoFocus
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Flames 4pc + Water 2pc"
            className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-sm text-mh-slate-100 outline-none focus:border-mh-gold-500/60"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">Description</span>
          <textarea
            value={description}
            rows={4}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to use it, weapon pairings, alternatives…"
            className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-sm text-mh-slate-100 outline-none focus:border-mh-gold-500/60 resize-none"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-amber-400" />
          <span className="text-sm text-mh-slate-200">Publish to the site</span>
          <span className="text-[11px] text-mh-slate-500">(otherwise only you can see it)</span>
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-mh-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            disabled={!title.trim() || saving}
            onClick={() => onConfirm({ title, description, isPublished })}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-mh-gold-400 disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
