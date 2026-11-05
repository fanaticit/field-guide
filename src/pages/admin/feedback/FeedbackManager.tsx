// ─────────────────────────────────────────────────────────────
// FeedbackManager.tsx — Admin review and management of player feedback
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  FileCheck,
  MessageCircle,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCheck,
  X,
  AlertCircle,
  User,
  Loader2,
} from 'lucide-react';
import {
  useAdminFeedbackList,
  useUpdateFeedback,
  useDeleteFeedback,
  useMarkAllFeedbackRead,
  type SiteFeedback,
  type FeedbackStatus,
  type FeedbackType,
} from '../../../hooks/useAdminFeedback';
import { cn } from '../../../lib/utils';

const TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; colorClass: string }
> = {
  bug: { label: 'Bug', icon: Bug, colorClass: 'bg-red-500/10 text-red-400 ring-red-500/30' },
  feature: { label: 'Feature', icon: Lightbulb, colorClass: 'bg-amber-500/10 text-amber-400 ring-amber-500/30' },
  data: { label: 'Data', icon: FileCheck, colorClass: 'bg-blue-500/10 text-blue-400 ring-blue-500/30' },
  general: { label: 'General', icon: MessageCircle, colorClass: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' },
};

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; colorClass: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  new: { label: 'New', colorClass: 'bg-red-500/10 text-red-400 ring-red-500/30', icon: AlertCircle },
  in_progress: { label: 'In Progress', colorClass: 'bg-amber-500/10 text-amber-400 ring-amber-500/30', icon: Clock },
  resolved: { label: 'Resolved', colorClass: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', colorClass: 'bg-mh-slate-800 text-mh-slate-400 ring-mh-slate-700', icon: Archive },
};

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
  highlight = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        highlight && value > 0
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-mh-slate-800 bg-mh-slate-900/50 text-mh-slate-100',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg ring-1',
          highlight && value > 0
            ? 'bg-red-500/20 text-red-400 ring-red-500/40'
            : 'bg-mh-slate-800 text-mh-slate-400 ring-mh-slate-700',
        )}
      >
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-mh-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function FeedbackManager() {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<SiteFeedback | null>(null);

  const { data: feedbackList = [], isLoading, refetch, isFetching } = useAdminFeedbackList({
    status: statusFilter,
    type: typeFilter,
    search,
  });

  const updateMutation = useUpdateFeedback();
  const deleteMutation = useDeleteFeedback();
  const markAllReadMutation = useMarkAllFeedbackRead();

  // Summary counts
  const stats = useMemo(() => {
    let total = 0;
    let newCount = 0;
    let inProgress = 0;
    let resolved = 0;

    for (const item of feedbackList) {
      total++;
      if (item.status === 'new') newCount++;
      if (item.status === 'in_progress') inProgress++;
      if (item.status === 'resolved') resolved++;
    }

    return { total, newCount, inProgress, resolved };
  }, [feedbackList]);

  const handleOpenDetail = (item: SiteFeedback) => {
    setSelectedFeedback(item);
    if (!item.is_read) {
      updateMutation.mutate({ id: item.id, updates: { is_read: true } });
    }
  };

  const handleStatusChange = (item: SiteFeedback, newStatus: FeedbackStatus) => {
    updateMutation.mutate({
      id: item.id,
      updates: {
        status: newStatus,
        is_read: true,
      },
    });
    if (selectedFeedback?.id === item.id) {
      setSelectedFeedback({ ...selectedFeedback, status: newStatus, is_read: true });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback message?')) {
      deleteMutation.mutate(id);
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(null);
      }
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header stats bar ── */}
      <div className="shrink-0 border-b border-mh-slate-800 bg-mh-slate-900/30 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-mh-gold-400" />
              Player Feedback & Bug Reports
            </h2>
            <p className="text-xs text-mh-slate-400">
              Messages and issues submitted by hunters across the site.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs font-semibold text-mh-slate-300 hover:border-mh-slate-600 hover:text-white transition-all disabled:opacity-50"
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs font-semibold text-mh-slate-300 hover:border-mh-slate-600 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={AlertCircle} label="New Messages" value={stats.newCount} highlight />
          <StatCard icon={Clock} label="In Progress" value={stats.inProgress} />
          <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} />
          <StatCard icon={MessageSquare} label="Total Received" value={stats.total} />
        </div>
      </div>

      {/* ── Toolbar: Filters & Search ── */}
      <div className="shrink-0 border-b border-mh-slate-800 bg-mh-slate-950/40 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-mh-slate-800 bg-mh-slate-900 p-0.5 text-xs">
            {(['all', 'new', 'in_progress', 'resolved', 'dismissed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-all capitalize',
                  statusFilter === st
                    ? 'bg-mh-gold-500/10 text-mh-gold-400 font-bold ring-1 ring-mh-gold-500/30'
                    : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                {st === 'all' ? 'All Status' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center rounded-lg border border-mh-slate-800 bg-mh-slate-900 p-0.5 text-xs">
            {(['all', 'bug', 'feature', 'data', 'general'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-all capitalize',
                  typeFilter === t
                    ? 'bg-mh-gold-500/10 text-mh-gold-400 font-bold ring-1 ring-mh-gold-500/30'
                    : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-mh-slate-800 bg-mh-slate-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Content List ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-mh-gold-400" />
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-mh-slate-800 text-center">
            <MessageSquare size={32} className="text-mh-slate-700" />
            <p className="text-sm font-semibold text-mh-slate-400">No feedback found</p>
            <p className="text-xs text-mh-slate-600">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No messages have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {feedbackList.map((item) => {
              const typeConf = TYPE_CONFIG[item.feedback_type] ?? TYPE_CONFIG.general;
              const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.new;
              const TypeIcon = typeConf.icon;
              const StatusIcon = statusConf.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className={cn(
                    'group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-150 cursor-pointer',
                    !item.is_read
                      ? 'border-mh-gold-500/40 bg-mh-slate-900/90 shadow-md ring-1 ring-mh-gold-500/20'
                      : 'border-mh-slate-800 bg-mh-slate-900/40 hover:border-mh-slate-700 hover:bg-mh-slate-900/70',
                  )}
                >
                  {/* Left: Badges + Title & snippet */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {!item.is_read && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-mh-gold-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                        title="Unread"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Type badge */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ring-1',
                            typeConf.colorClass,
                          )}
                        >
                          <TypeIcon size={12} />
                          {typeConf.label}
                        </span>

                        {/* Status badge */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1',
                            statusConf.colorClass,
                          )}
                        >
                          <StatusIcon size={11} />
                          {statusConf.label}
                        </span>

                        {/* Page Link */}
                        {item.page_url && (
                          <span className="text-[11px] text-mh-slate-500 flex items-center gap-1 truncate max-w-[200px]">
                            <ExternalLink size={10} />
                            {item.page_url}
                          </span>
                        )}

                        <span className="text-[11px] text-mh-slate-600">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>

                      <h3 className="font-display text-sm font-bold text-white group-hover:text-mh-gold-300 transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-mh-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Submitter + Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right text-[11px]">
                      <div className="font-semibold text-mh-slate-300 flex items-center gap-1 justify-end">
                        <User size={12} className="text-mh-slate-500" />
                        {item.user_display_name || 'Guest'}
                      </div>
                      {item.contact_info && (
                        <div className="text-mh-slate-500 truncate max-w-[150px]">
                          {item.contact_info}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="rounded-lg p-1.5 text-mh-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function FeedbackDetailModal({
  feedback,
  onClose,
  onStatusChange,
  onDelete,
}: {
  feedback: SiteFeedback;
  onClose: () => void;
  onStatusChange: (item: SiteFeedback, newStatus: FeedbackStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [adminNotes, setAdminNotes] = useState(feedback.admin_notes || '');
  const [savedNotesMsg, setSavedNotesMsg] = useState(false);
  const updateMutation = useUpdateFeedback();

  const typeConf = TYPE_CONFIG[feedback.feedback_type] ?? TYPE_CONFIG.general;
  const TypeIcon = typeConf.icon;

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({
      id: feedback.id,
      updates: { admin_notes: adminNotes.trim() || null },
    });
    setSavedNotesMsg(true);
    setTimeout(() => setSavedNotesMsg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-mh-slate-700 bg-mh-slate-900 p-6 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-4 pr-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ring-1',
                typeConf.colorClass,
              )}
            >
              <TypeIcon size={13} />
              {typeConf.label}
            </span>
            <span className="text-xs text-mh-slate-500">
              Submitted {new Date(feedback.created_at).toLocaleString()}
            </span>
          </div>
          <h2 className="font-display text-lg font-bold text-white">{feedback.title}</h2>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Details / Description */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-mh-slate-500 mb-2">
              Message Description
            </div>
            <p className="whitespace-pre-wrap text-mh-slate-200 text-sm leading-relaxed">
              {feedback.description}
            </p>
          </div>

          {/* Context Card */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-3 text-[11px]">
            <div>
              <span className="text-mh-slate-500 block">Submitter:</span>
              <span className="font-bold text-mh-slate-200">
                {feedback.user_display_name || 'Guest'}
              </span>
            </div>
            <div>
              <span className="text-mh-slate-500 block">Contact Info:</span>
              <span className="font-bold text-mh-gold-400">
                {feedback.contact_info || 'None provided'}
              </span>
            </div>
            <div>
              <span className="text-mh-slate-500 block">Page URL:</span>
              {feedback.page_url ? (
                <a
                  href={feedback.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={10} />
                  {feedback.page_url}
                </a>
              ) : (
                <span className="text-mh-slate-500">N/A</span>
              )}
            </div>
            <div>
              <span className="text-mh-slate-500 block">Game / Device:</span>
              <span className="text-mh-slate-300">
                {feedback.game_context?.toUpperCase() || 'MHO'} • {feedback.device_info || 'Desktop'}
              </span>
            </div>
          </div>

          {/* Status Selector */}
          <div>
            <label className="block font-semibold text-mh-slate-300 mb-1.5">
              Change Status
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['new', 'in_progress', 'resolved', 'dismissed'] as const).map((st) => {
                const conf = STATUS_CONFIG[st];
                const Icon = conf.icon;
                const isCurrent = feedback.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onStatusChange(feedback, st)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition-all',
                      isCurrent
                        ? `${conf.colorClass} ring-1 ring-white/10`
                        : 'border-mh-slate-800 bg-mh-slate-950 text-mh-slate-400 hover:border-mh-slate-700',
                    )}
                  >
                    <Icon size={12} />
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-mh-slate-300">
                Admin Notes (Internal only)
              </label>
              {savedNotesMsg && (
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Saved!
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Private notes for admins (e.g. fixed in commit #123, requested follow-up, etc.)..."
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 p-3 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none"
            />
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-mh-slate-800 px-3 py-1.5 text-xs font-semibold text-mh-slate-200 hover:bg-mh-slate-700 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-mh-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onDelete(feedback.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Delete Message
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-mh-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-mh-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
