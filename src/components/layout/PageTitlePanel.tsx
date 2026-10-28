import type { ReactNode } from 'react';

interface PageTitlePanelProps {
  /** Artwork shown at the left of the title */
  icon: string;
  title: string;
  description: ReactNode;
  /** Whether the description is currently hidden (controlled so pages can react to it) */
  hidden: boolean;
  onToggleHidden: () => void;
  /** Right-hand content such as the collection status bar or view controls */
  children?: ReactNode;
}

/**
 * Compact title panel shared by the themed section pages. It must sit inside a
 * `.section-theme` / `.challenges-theme` element with a data-rarity-theme attribute.
 */
export default function PageTitlePanel({
  icon,
  title,
  description,
  hidden,
  onToggleHidden,
  children,
}: PageTitlePanelProps) {
  const toggleClass =
    'shrink-0 text-[11px] font-semibold text-mh-slate-400 hover:text-[var(--theme-accent)] transition-colors';

  return (
    <div className="mho-panel mho-card-rarity flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 shadow-xl">
      <img src={icon} alt="" draggable={false} className="h-8 w-8 shrink-0 object-contain" />
      <h1 className="font-display text-base font-bold uppercase tracking-wide text-white flex items-center gap-1.5 shrink-0">
        <span className="text-[var(--theme-accent)] text-sm">❖</span>
        {title}
      </h1>

      {!hidden && (
        <>
          <p className="flex-1 min-w-[240px] text-[11px] text-mh-slate-400 leading-snug">{description}</p>
          <button type="button" onClick={onToggleHidden} className={toggleClass}>
            Hide
          </button>
        </>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
        {hidden && (
          <button type="button" onClick={onToggleHidden} className={toggleClass}>
            Show description
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
