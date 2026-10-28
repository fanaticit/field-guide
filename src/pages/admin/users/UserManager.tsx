// ─────────────────────────────────────────────────────────────
// UserManager — Admin user report (total users + last login)
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Search, RefreshCw, Users, UserCheck, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';
import { useAdminUsers, type AdminUser } from '../../../hooks/useAdminUsers';
import { cn } from '../../../lib/utils';

type SortKey = 'user' | 'role' | 'created_at' | 'last_sign_in_at';
type SortDir = 'asc' | 'desc';

const DAY_MS = 24 * 60 * 60 * 1000;

const ROLE_STYLES: Record<AdminUser['role'], string> = {
  admin: 'bg-mh-gold-500/10 text-mh-gold-400 ring-mh-gold-500/30',
  moderator: 'bg-blue-500/10 text-blue-400 ring-blue-500/30',
  member: 'bg-mh-slate-800 text-mh-slate-400 ring-mh-slate-700',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-mh-slate-700 bg-mh-slate-900/50 px-4 py-3">
      <Icon size={18} className="text-mh-gold-400" />
      <div>
        <div className="text-xl font-bold text-mh-slate-100">{value}</div>
        <div className="text-xs text-mh-slate-500">{label}</div>
      </div>
    </div>
  );
}

function SortHeader({
  k,
  label,
  sortKey,
  sortDir,
  onSort,
}: {
  k: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-4 py-2 text-left">
      <button
        type="button"
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-mh-slate-500 hover:text-mh-slate-300"
      >
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
}

export default function UserManager() {
  const { data: users = [], isLoading, isFetching, error, refetch } = useAdminUsers();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('last_sign_in_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const stats = useMemo(() => {
    const now = Date.now();
    const within = (iso: string | null, days: number) =>
      !!iso && now - new Date(iso).getTime() <= days * DAY_MS;
    return {
      total: users.length,
      active7: users.filter((u) => within(u.last_sign_in_at, 7)).length,
      active30: users.filter((u) => within(u.last_sign_in_at, 30)).length,
      new30: users.filter((u) => within(u.created_at, 30)).length,
    };
  }, [users]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? users.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            (u.display_name ?? '').toLowerCase().includes(q) ||
            (u.email ?? '').toLowerCase().includes(q),
        )
      : [...users];

    const dir = sortDir === 'asc' ? 1 : -1;
    const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
    list.sort((a, b) => {
      switch (sortKey) {
        case 'user':
          return dir * (a.display_name || a.username).localeCompare(b.display_name || b.username);
        case 'role':
          return dir * a.role.localeCompare(b.role);
        case 'created_at':
          return dir * (time(a.created_at) - time(b.created_at));
        case 'last_sign_in_at':
          // Users who never signed in count as oldest
          return dir * (time(a.last_sign_in_at) - time(b.last_sign_in_at));
      }
    });
    return list;
  }, [users, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'user' || key === 'role' ? 'asc' : 'desc');
    }
  };

  const headerProps = { sortKey, sortDir, onSort: toggleSort };

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.total} />
        <StatCard icon={UserCheck} label="Active last 7 days" value={stats.active7} />
        <StatCard icon={UserCheck} label="Active last 30 days" value={stats.active30} />
        <StatCard icon={UserPlus} label="New last 30 days" value={stats.new30} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, name or email…"
            className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-900 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder:text-mh-slate-600 focus:border-mh-gold-500/50 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          title="Refresh"
          className="rounded-lg border border-mh-slate-700 p-2 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200"
        >
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
        </button>
        <span className="text-xs text-mh-slate-500">
          {rows.length} of {users.length}
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Failed to load users: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="py-12 text-center text-sm text-mh-slate-500">Loading users…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-mh-slate-700">
          <table className="w-full text-sm">
            <thead className="border-b border-mh-slate-700 bg-mh-slate-900/50">
              <tr>
                <SortHeader k="user" label="User" {...headerProps} />
                <SortHeader k="role" label="Role" {...headerProps} />
                <SortHeader k="created_at" label="Joined" {...headerProps} />
                <SortHeader k="last_sign_in_at" label="Last Login" {...headerProps} />
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-mh-slate-800/40">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mh-slate-800 text-xs font-bold uppercase text-mh-slate-400">
                          {(u.display_name || u.username).charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-mh-slate-200">{u.display_name || u.username}</div>
                        <div className="truncate text-xs text-mh-slate-500">
                          @{u.username}
                          {u.email ? ` · ${u.email}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1', ROLE_STYLES[u.role])}>
                      {u.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-mh-slate-400">{formatDate(u.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-mh-slate-300">
                    {formatDate(u.last_sign_in_at)}
                    {u.last_sign_in_at && <span className="ml-2 text-xs text-mh-slate-500">{timeAgo(u.last_sign_in_at)}</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-mh-slate-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
