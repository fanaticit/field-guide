import { useState } from 'react';
import { cn } from '../lib/utils';

interface ArtBackdropProps {
  src?: string | null;
  /** Coloured when true, greyed out and dimmer when false (e.g. not owned / not recruited yet). */
  active: boolean;
  className?: string;
}

/**
 * Character art drawn big on the right side of a panel, as a faint backdrop behind the content.
 * The parent must be `relative isolate overflow-hidden`.
 */
export default function ArtBackdrop({ src, active, className }: ArtBackdropProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <img
        src={src}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        className={cn(
          'absolute right-0 top-1/2 h-[135%] w-auto max-w-none -translate-y-1/2 object-contain transition-all duration-300',
          active ? 'opacity-45' : 'opacity-25 grayscale',
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d14]/90 via-[#0b0d14]/55 to-transparent" />
    </div>
  );
}
