import React from 'react';
import { cn } from '../lib/utils';
import { WEAPON_ELEMENT_CONFIG, type WeaponElementType } from '../data/schemas/weapon';

export interface ElementIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  element: string | WeaponElementType | null | undefined;
  size?: number | string;
  className?: string;
}

/** Standard icon mapping for all true elements, status effects, and non-elemental */
export const ELEMENT_ICON_SRC: Record<string, string> = {
  raw: '/images/ui/elements/raw.png',
  none: '/images/ui/elements/none.png',
  'non-elemental': '/images/ui/elements/Non-Elemental.png',
  fire: '/images/ui/elements/fire.png',
  water: '/images/ui/elements/water.png',
  thunder: '/images/ui/elements/thunder.png',
  ice: '/images/ui/elements/ice.png',
  dragon: '/images/ui/elements/dragon.png',
  poison: '/images/ui/elements/poison.png',
  paralysis: '/images/ui/elements/paralysis.png',
  sleep: '/images/ui/elements/sleep.png',
  blast: '/images/ui/elements/blast.png',
  stun: '/images/ui/elements/stun.png',
};

export const ELEMENT_LABELS: Record<string, string> = {
  raw: 'Non-Element',
  none: 'None',
  'non-elemental': 'Non-Elemental',
  fire: 'Fire',
  water: 'Water',
  thunder: 'Thunder',
  ice: 'Ice',
  dragon: 'Dragon',
  poison: 'Poison',
  paralysis: 'Paralysis',
  sleep: 'Sleep',
  blast: 'Blast',
  stun: 'Stun',
};

export default function ElementIcon({
  element,
  size = 14,
  className,
  alt,
  ...props
}: ElementIconProps) {
  if (!element) return null;

  const key = String(element).toLowerCase().trim();
  const src = ELEMENT_ICON_SRC[key] || WEAPON_ELEMENT_CONFIG[key as WeaponElementType]?.icon;
  const label = ELEMENT_LABELS[key] || WEAPON_ELEMENT_CONFIG[key as WeaponElementType]?.label || element;

  if (!src) {
    return null;
  }

  const dimensionStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  return (
    <img
      src={src}
      alt={alt ?? `${label} Element`}
      title={label}
      style={dimensionStyle}
      className={cn('inline-block shrink-0 object-contain', className)}
      loading="lazy"
      onError={(e) => {
        (e.currentTarget as HTMLElement).style.display = 'none';
      }}
      {...props}
    />
  );
}
