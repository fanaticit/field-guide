import React from 'react';
import { cn } from '../lib/utils';

export const ROLE_ICON_SRC: Record<string, string> = {
  assault: '/images/roles/assault.png',
  Assault: '/images/roles/assault.png',
  disrupter: '/images/roles/disrupter.png',
  Disrupter: '/images/roles/disrupter.png',
  disruptor: '/images/roles/disrupter.png',
  Disruptor: '/images/roles/disrupter.png',
  support: '/images/roles/support.png',
  Support: '/images/roles/support.png',
};

export function getRoleIconSrc(role: string | null | undefined): string | null {
  if (!role) return null;
  const key = role.trim();
  return ROLE_ICON_SRC[key] || ROLE_ICON_SRC[key.toLowerCase()] || null;
}

export interface RoleIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'role'> {
  role?: string | null;
  size?: number | string;
  className?: string;
}

export default function RoleIcon({
  role,
  size = 28,
  className,
  alt,
  style,
  ...props
}: RoleIconProps) {
  const src = getRoleIconSrc(role);
  if (!src) return null;

  const dim = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={src}
      alt={alt || `${role || 'Class'} Icon`}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      className={cn('inline-block object-contain shrink-0 drop-shadow-xs', className)}
      style={{ width: dim, height: dim, ...style }}
      loading="lazy"
      {...props}
    />
  );
}

export const AssaultRoleIcon = (props: Omit<RoleIconProps, 'role'>) => <RoleIcon role="Assault" {...props} />;
export const DisrupterRoleIcon = (props: Omit<RoleIconProps, 'role'>) => <RoleIcon role="Disrupter" {...props} />;
export const DisruptorRoleIcon = (props: Omit<RoleIconProps, 'role'>) => <RoleIcon role="Disruptor" {...props} />;
export const SupportRoleIcon = (props: Omit<RoleIconProps, 'role'>) => <RoleIcon role="Support" {...props} />;

export const ROLE_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  Assault: AssaultRoleIcon,
  Disrupter: DisrupterRoleIcon,
  Disruptor: DisruptorRoleIcon,
  Support: SupportRoleIcon,
};
