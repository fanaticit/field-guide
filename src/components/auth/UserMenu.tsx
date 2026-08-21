// ─────────────────────────────────────────────────────────────
// UserMenu — displayed in the Sidebar footer area
// Shows either:
//   • "Sign in" button (unauthenticated)
//   • Avatar + username + sign-out option (authenticated)
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { LogIn, LogOut, User, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import LoginModal from './LoginModal';
import { cn } from '../../lib/utils';

interface UserMenuProps {
  collapsed: boolean;
}

export default function UserMenu({ collapsed }: UserMenuProps) {
  const { user, profile, signOut } = useAuthStore();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = !!user;
  const displayName = profile?.display_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'Hunter';
  const avatarUrl = profile?.avatar_url ?? null;

  // ── Unauthenticated ─────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <div className="shrink-0 border-t border-mh-slate-700 p-3">
          <button
            onClick={() => setLoginOpen(true)}
            title="Sign in"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5',
              'text-sm font-medium text-mh-slate-400 transition-all duration-200',
              'border border-dashed border-mh-slate-700 hover:border-mh-gold-500/40',
              'hover:bg-mh-slate-800 hover:text-mh-gold-400',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogIn size={17} className="shrink-0" />
            {!collapsed && <span>Sign in</span>}
          </button>
        </div>

        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  // ── Authenticated ───────────────────────────────────────────
  return (
    <div className="shrink-0 border-t border-mh-slate-700 p-3">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        title={displayName}
        className={cn(
          'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2',
          'text-left transition-all duration-200 hover:bg-mh-slate-800',
          collapsed && 'justify-center px-0',
        )}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-mh-slate-700"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mh-gold-500/20 ring-1 ring-mh-gold-500/40">
              <User size={15} className="text-mh-gold-400" />
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-mh-slate-950 bg-green-500" />
        </div>

        {/* Name + chevron */}
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-mh-slate-200">{displayName}</p>
              <p className="truncate text-[10px] text-mh-slate-500">Hunter</p>
            </div>
            <ChevronUp
              size={14}
              className={cn(
                'shrink-0 text-mh-slate-600 transition-transform duration-200',
                menuOpen && 'rotate-180',
              )}
            />
          </>
        )}

        {/* Collapsed tooltip */}
        {collapsed && (
          <div className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1.5 text-xs font-semibold text-mh-slate-200 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 z-50">
            {displayName}
          </div>
        )}
      </button>

      {/* Dropdown — anchored above the button */}
      {menuOpen && !collapsed && (
        <div className="mt-1 overflow-hidden rounded-lg border border-mh-slate-700 bg-mh-slate-900 shadow-xl">
          <div className="border-b border-mh-slate-800 px-3 py-2.5">
            <p className="text-xs font-semibold text-mh-slate-200">{displayName}</p>
            <p className="mt-0.5 truncate text-[10px] text-mh-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-mh-slate-400 transition-colors hover:bg-mh-slate-800 hover:text-red-400"
          >
            <LogOut size={15} className="shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
