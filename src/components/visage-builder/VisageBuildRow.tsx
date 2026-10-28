// ─────────────────────────────────────────────────────────────
// VisageBuildRow — Compact horizontal list row for Visage Sets Directory
// ─────────────────────────────────────────────────────────────
import {
  Star,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  type VisageBuildRow as TVisageBuildRow,
  type VisageLoadout,
  type Buildability,
  type ActiveSetBonus,
  VISAGE_BUILD_SLOTS,
  VISAGE_POINT_CAP,
} from '../../lib/visageBuild';
import { getInkConfig } from '../../data/schemas/visage';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { cn } from '../../lib/utils';

interface Props {
  row: TVisageBuildRow;
  loadout: VisageLoadout;
  buildability: Buildability;
  activeBonuses: ActiveSetBonus[];
  duplicateIds: string[];
  missingKeys: Set<string>;
  isFavorite: boolean;
  isAuthor: boolean;
  isSignedIn: boolean;
  onToggleFavorite: () => void;
  onOpenInBuilder: () => void;
  onLoadToPlanner: () => void;
  onDelete: () => void;
}

export default function VisageBuildRow({
  row,
  loadout,
  buildability,
  activeBonuses,
  duplicateIds,
  missingKeys,
  isFavorite,
  isAuthor,
  isSignedIn,
  onToggleFavorite,
  onOpenInBuilder,
  onLoadToPlanner,
  onDelete,
}: Props) {
  const dateStr = new Date(row.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="mho-panel mho-panel-interactive flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:px-4 sm:py-3 group">
      {/* ── Left: Favorite Star, Title, Author & Description ── */}
      <div className="flex items-start gap-2.5 min-w-0 md:w-1/3">
        {/* Favorite Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={cn(
            'p-1.5 -ml-1 rounded-lg transition-colors shrink-0',
            isFavorite
              ? 'text-[#FFD700] hover:text-white'
              : 'text-[var(--text-secondary)] hover:text-[#FFD700] hover:bg-white/10',
          )}
        >
          <Star
            size={16}
            className={cn(isFavorite && 'fill-[#FFD700]')}
          />
        </button>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3
              onClick={onOpenInBuilder}
              className="font-display text-sm sm:text-base font-bold text-white hover:text-[#FFD700] cursor-pointer transition-colors truncate"
              title={row.title}
            >
              {row.title}
            </h3>
            {!row.is_published && (
              <span className="shrink-0 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
                Draft
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-mh-slate-500">
            <span className="flex items-center gap-1 truncate">
              <User size={11} />
              <span className="truncate text-mh-slate-400">
                {row.author?.username || (isAuthor ? 'You' : 'Hunter')}
              </span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar size={11} />
              <span>{dateStr}</span>
            </span>
            {duplicateIds.length > 0 && (
              <>
                <span>&bull;</span>
                <span className="text-amber-400 text-[10px]" title="Duplicate cards equipped">
                  ⚠ Dupes
                </span>
              </>
            )}
          </div>

          {row.description && (
            <p className="text-[11px] text-mh-slate-400 line-clamp-1 italic">
              {row.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Middle: 5 Cards Mini Strip & Set Bonuses ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
        {/* 5 Cards Mini Strip */}
        <div className="flex items-center gap-1 shrink-0">
          {VISAGE_BUILD_SLOTS.map((slot) => {
            const { visage, ink } = loadout[slot];
            const isCore = slot === 'core';
            const cfg = getInkConfig(ink);
            const isMissing = visage && ink && missingKeys.has(`${visage.id}:${ink}`);

            return (
              <div
                key={slot}
                title={
                  visage
                    ? `${visage.name}${ink ? ` · ${cfg.shortName}` : ''}${isMissing ? ' (not owned)' : ''}`
                    : 'Empty'
                }
                className={cn(
                  'relative w-8 h-10 sm:w-9 sm:h-11 rounded border bg-mh-slate-800 flex items-center justify-center overflow-hidden shrink-0',
                  isCore ? 'border-rarity-5/80 ring-1 ring-rarity-5/30' : 'border-mh-slate-700',
                  isMissing && 'opacity-50',
                )}
              >
                {visage ? (
                  visage.image_small ? (
                    <img
                      src={visage.image_small}
                      alt={visage.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[7px] font-bold text-mh-slate-300 text-center px-0.5 line-clamp-2">
                      {visage.name}
                    </span>
                  )
                ) : (
                  <span className="text-mh-slate-600 text-xs">—</span>
                )}

                {/* Ink Dot */}
                {visage && ink && (
                  <div
                    className={cn(
                      'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-tl flex items-center justify-center text-white',
                      cfg.dotColor,
                    )}
                  >
                    <InkIconComponent iconName={cfg.iconName} size={8} />
                  </div>
                )}

                {isMissing && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] bg-black/40">
                    🔒
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Set Bonuses Badges */}
        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
          {activeBonuses.length > 0 ? (
            activeBonuses.map((b) => {
              const cfg = getInkConfig(b.ink);
              const activeTier = b.achieved[b.achieved.length - 1];
              return (
                <span
                  key={b.ink}
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border',
                    cfg.bg,
                    cfg.border,
                    cfg.text,
                  )}
                  title={`${b.name} (${b.count} cards)${activeTier ? ` - ${activeTier.pieces}pc effect` : ''}`}
                >
                  <InkIconComponent iconName={cfg.iconName} size={9} />
                  <span>{cfg.shortName}</span>
                  <span className="opacity-70 font-mono">({b.count})</span>
                </span>
              );
            })
          ) : (
            <span className="text-[10px] text-mh-slate-500 italic">No set bonus</span>
          )}
        </div>
      </div>

      {/* ── Right: Points, Buildability & Action Buttons ── */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
        {/* Points & Buildability */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5">
          <span className="text-[11px] font-bold text-mh-slate-300">
            {row.total_points} / {VISAGE_POINT_CAP} pts
          </span>

          <div>
            {isSignedIn ? (
              buildability.buildable ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 size={12} />
                  <span>Buildable</span>
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-400"
                  title={`Missing: ${buildability.missing.map((m) => `${m.visage.name} (${getInkConfig(m.ink).shortName})`).join(', ')}`}
                >
                  <AlertCircle size={11} className="shrink-0" />
                  <span>Missing {buildability.missing.length}</span>
                </span>
              )
            ) : (
              <span className="text-[10px] text-mh-slate-500">Sign in to check</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onLoadToPlanner}
            title="Send this set to the Build Planner"
            className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 hover:border-amber-400 hover:text-amber-200 transition-all shadow-sm"
          >
            <Layers size={12} className="text-amber-400" />
            <span>Send to Planner</span>
          </button>


          {isAuthor && (
            <button
              onClick={onDelete}
              title="Delete build"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-black/30 text-rose-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}

          <button
            onClick={onOpenInBuilder}
            className="btn-mho-panel !px-2.5 !py-1 !text-xs"
          >
            <span>{isAuthor ? 'Edit' : 'Open'}</span>
            <ExternalLink size={12} className="text-[#FFD700]" />
          </button>
        </div>
      </div>
    </div>
  );
}
