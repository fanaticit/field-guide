// ─────────────────────────────────────────────────────────────
// DuplicateBuildModal — Notifies user when an identical visage set exists
// and gives the choice to favorite the existing set or save a custom version.
// ─────────────────────────────────────────────────────────────
import { Star, Sparkles, X, Check, Loader2 } from 'lucide-react';
import type { DBVisage } from '../../data/schemas/visage';
import type { VisageBuildRow } from '../../lib/visageBuild';
import { rowToLoadout } from '../../lib/visageBuild';
import VisageLoadoutStrip from './VisageLoadoutStrip';

interface Props {
  open: boolean;
  duplicate: VisageBuildRow | null;
  visagesById: Map<string, DBVisage>;
  isFavorite: boolean;
  isFavoriting?: boolean;
  onClose: () => void;
  onFavoriteExisting: (build: VisageBuildRow) => void;
  onSaveCustomAnyway: () => void;
}

export default function DuplicateBuildModal({
  open,
  duplicate,
  visagesById,
  isFavorite,
  isFavoriting = false,
  onClose,
  onFavoriteExisting,
  onSaveCustomAnyway,
}: Props) {
  if (!open || !duplicate) return null;

  const duplicateLoadout = rowToLoadout(duplicate, visagesById);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-mh-gold-500/40 bg-[#131724] p-5 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-mh-gold-500/20 text-mh-gold-400 border border-mh-gold-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-mh-slate-100">
                Matching Set Already Exists
              </h3>
              <p className="text-xs text-mh-slate-400">
                An identical combination of cards and ink types is in the directory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mh-slate-500 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Set Card Preview */}
        <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/80 p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-mh-gold-400">
                Existing Shared Build
              </div>
              <h4 className="font-display text-base font-bold text-mh-slate-100">
                {duplicate.title}
              </h4>
              <div className="text-xs text-mh-slate-400">
                Created by{' '}
                <span className="text-mh-slate-200 font-semibold">
                  {duplicate.author?.username || 'Hunter'}
                </span>
              </div>
            </div>

            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-mh-slate-800 text-mh-slate-300 border border-mh-slate-700">
              {duplicate.total_points} pts
            </span>
          </div>

          {duplicate.description && (
            <p className="text-xs text-mh-slate-400 line-clamp-2 italic">
              "{duplicate.description}"
            </p>
          )}

          {/* Cards Strip Preview */}
          <div className="pt-1">
            <VisageLoadoutStrip loadout={duplicateLoadout} />
          </div>
        </div>

        <p className="text-xs text-mh-slate-300 leading-relaxed">
          Would you like to <span className="font-semibold text-mh-gold-400">favorite</span> this
          existing set for your collection and builds? You can still choose to save your own custom
          title and description if preferred.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-mh-slate-400 hover:text-white transition-colors text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSaveCustomAnyway}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800/80 px-3.5 py-2 text-xs font-semibold text-mh-slate-200 hover:text-white hover:bg-mh-slate-700 transition-all text-center"
          >
            Save Custom Version
          </button>

          <button
            type="button"
            disabled={isFavoriting}
            onClick={() => onFavoriteExisting(duplicate)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-mh-gold-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 transition-all shadow-md disabled:opacity-50"
          >
            {isFavoriting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isFavorite ? (
              <Check size={14} className="text-emerald-950" />
            ) : (
              <Star size={14} className="fill-slate-950 text-slate-950" />
            )}
            <span>{isFavorite ? 'Already in Favorites' : 'Favorite Existing Set'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
