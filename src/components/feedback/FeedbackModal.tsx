// ─────────────────────────────────────────────────────────────
// FeedbackModal.tsx — Player feedback, bug reports & feature requests
// Allows anonymous or authenticated submission with auto-context,
// and gives authenticated players a "My Reports" tab to view
// ticket status and admin resolution replies.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useId } from 'react';
import { useLocation } from 'react-router-dom';
import {
  X,
  Bug,
  Lightbulb,
  FileCheck,
  MessageCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Inbox,
  PenSquare,
  ShieldCheck,
  Clock,
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  submitFeedback,
  useUserFeedbackCount,
  useUserFeedbackList,
  useMarkAllUserFeedbackRead,
  type FeedbackType,
  type FeedbackStatus,
  type SiteFeedback,
} from '../../hooks/useAdminFeedback';
import HumanCheck, { useHumanCheck } from '../auth/HumanCheck';
import { cn } from '../../lib/utils';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

interface TypeOption {
  id: FeedbackType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  colorClass: string;
}

const FEEDBACK_TYPES: TypeOption[] = [
  {
    id: 'bug',
    label: 'Bug Report',
    icon: Bug,
    description: 'Something is broken or not working as intended',
    colorClass: 'text-red-400 border-red-500/30 bg-red-500/10',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    icon: Lightbulb,
    description: 'A tool, filter, or feature you would like to see',
    colorClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    id: 'data',
    label: 'Data Correction',
    icon: FileCheck,
    description: 'Inaccurate skill value, monster info, or typo',
    colorClass: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
  {
    id: 'general',
    label: 'General',
    icon: MessageCircle,
    description: 'General thoughts, praise, or questions',
    colorClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
];

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; colorClass: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  new: { label: 'New', colorClass: 'bg-red-500/10 text-red-400 ring-red-500/30', icon: AlertCircle },
  in_progress: { label: 'In Progress', colorClass: 'bg-amber-500/10 text-amber-400 ring-amber-500/30', icon: Clock },
  resolved: { label: 'Resolved', colorClass: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', colorClass: 'bg-mh-slate-800 text-mh-slate-400 ring-mh-slate-700', icon: Archive },
};

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { pathname } = useLocation();
  const { user, profile } = useAuthStore();
  const defaultGame = useUIStore((s) => s.defaultGame);

  const titleId = useId();
  const descId = useId();
  const contactId = useId();

  const [activeTab, setActiveTab] = useState<'new' | 'my-reports'>('new');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: userUnreadCount = 0 } = useUserFeedbackCount();
  const { data: userReports = [], isLoading: isLoadingReports } = useUserFeedbackList();
  const markAllReadMutation = useMarkAllUserFeedbackRead();

  const humanCheck = useHumanCheck();
  const { reset: resetHumanCheck } = humanCheck;

  // Reset form when modal opens; if unread updates exist, default to "my-reports"
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setContactInfo('');
      setErrorMsg(null);
      setIsSubmitted(false);
      setIsSubmitting(false);
      resetHumanCheck();

      if (user && userUnreadCount > 0) {
        setActiveTab('my-reports');
        markAllReadMutation.mutate();
      } else {
        setActiveTab('new');
      }
    }
  }, [open, user, userUnreadCount, resetHumanCheck]);

  // Handle ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const displayName = profile?.display_name ?? profile?.username ?? (user ? 'Member' : 'Guest');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter a short summary or title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe what happened or what you would like added.');
      return;
    }

    if (!humanCheck.verify()) {
      setErrorMsg("That answer wasn't right — please solve the new math question.");
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceInfo = `${window.innerWidth}x${window.innerHeight} (${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'})`;

      await submitFeedback({
        user_id: user?.id ?? null,
        user_display_name: displayName,
        contact_info: contactInfo.trim() || null,
        feedback_type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        page_url: pathname,
        game_context: defaultGame,
        device_info: deviceInfo,
      });

      setIsSubmitted(true);
    } catch (err: unknown) {
      let msg = 'An unexpected error occurred while sending feedback.';
      if (err instanceof Error && err.message) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        msg = (err as { message: string }).message;
      } else if (typeof err === 'string') {
        msg = err;
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchToMyReports = () => {
    setActiveTab('my-reports');
    if (userUnreadCount > 0) {
      markAllReadMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-mh-slate-700/80 bg-mh-slate-900/95 p-6 shadow-2xl backdrop-blur-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          aria-label="Close feedback modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-3 flex items-center gap-3 shrink-0 pr-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-gold-500/10 ring-1 ring-mh-gold-500/30">
            <img
              src="/img/ui/BtnIcon_Chat.png"
              alt=""
              className="h-6 w-6 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {activeTab === 'new' ? 'Send Feedback & Bug Reports' : 'My Feedback & Reports'}
            </h2>
            <p className="text-xs text-mh-slate-400">
              {activeTab === 'new'
                ? 'Direct message to the site administrators.'
                : 'Track status updates and admin replies to your reports.'}
            </p>
          </div>
        </div>

        {/* Tabs switcher (only visible for signed-in users) */}
        {user ? (
          <div className="flex items-center gap-1.5 mb-4 border-b border-mh-slate-800 pb-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'new'
                  ? 'bg-mh-gold-500/15 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                  : 'text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white',
              )}
            >
              <PenSquare size={13} />
              Submit Report
            </button>
            <button
              type="button"
              onClick={handleSwitchToMyReports}
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'my-reports'
                  ? 'bg-mh-gold-500/15 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                  : 'text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white',
              )}
            >
              <Inbox size={13} />
              My Reports
              {userReports.length > 0 && (
                <span className="text-[10px] text-mh-slate-500 font-normal">
                  ({userReports.length})
                </span>
              )}
              {userUnreadCount > 0 && (
                <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white animate-pulse">
                  {userUnreadCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="mb-2 text-[11px] text-mh-slate-500 shrink-0">
            Tip: <span className="text-mh-gold-400">Sign in</span> to track the status of your reports and receive in-app notifications when fixed.
          </div>
        )}

        {/* TAB 1: SUBMIT NEW FEEDBACK */}
        {activeTab === 'new' && (
          <>
            {isSubmitted ? (
              /* Success Screen */
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">Message Received!</h3>
                  <p className="mt-1 max-w-sm text-xs text-mh-slate-300">
                    Thank you for contributing to the Field Guide! The site administrators have received your request and will review it.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {user && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('my-reports')}
                      className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-4 py-2 text-xs font-semibold text-mh-slate-200 hover:bg-mh-slate-700 transition-colors"
                    >
                      View My Reports
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-mh-gold-500 px-6 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors"
                  >
                    Back to Guide
                  </button>
                </div>
              </div>
            ) : (
              /* Submission Form */
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
                {errorMsg && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Feedback Category Selector */}
                <div>
                  <span className="block text-xs font-semibold text-mh-slate-300 mb-1.5">
                    Category
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {FEEDBACK_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = feedbackType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setFeedbackType(type.id)}
                          className={cn(
                            'flex flex-col items-start p-2.5 rounded-xl border text-left transition-all',
                            isSelected
                              ? `${type.colorClass} ring-1 ring-white/10`
                              : 'border-mh-slate-800 bg-mh-slate-950/40 text-mh-slate-400 hover:border-mh-slate-700 hover:text-mh-slate-200',
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Icon size={14} />
                            <span>{type.label}</span>
                          </div>
                          <span className="mt-1 text-[11px] leading-tight text-mh-slate-400">
                            {type.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title Input */}
                <div>
                  <label htmlFor={titleId} className="block text-xs font-semibold text-mh-slate-300 mb-1">
                    Summary / Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id={titleId}
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Bow charge level 4 value is incorrect in armour planner"
                    className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500"
                  />
                </div>

                {/* Description Input */}
                <div>
                  <label htmlFor={descId} className="block text-xs font-semibold text-mh-slate-300 mb-1">
                    Details <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id={descId}
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please include steps to reproduce, what you expected, or any other details..."
                    className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 p-3 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500"
                  />
                </div>

                {/* Contact Info (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={contactId} className="block text-xs font-semibold text-mh-slate-300">
                      Contact Info <span className="text-mh-slate-500 font-normal">(Optional)</span>
                    </label>
                    {user?.email && (
                      <span className="text-[10px] text-mh-gold-400/80">
                        Logged in as {user.email}
                      </span>
                    )}
                  </div>
                  <input
                    id={contactId}
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="e.g., Discord: Hunter#1234 or your email (if you want an email reply)"
                    className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500"
                  />
                </div>

                {/* Human Verification (Math Problem) */}
                <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-3">
                  <HumanCheck
                    id="feedback-human-check"
                    question={humanCheck.challenge.question}
                    value={humanCheck.answer}
                    onChange={humanCheck.setAnswer}
                    onRefresh={humanCheck.reset}
                  />
                </div>

                {/* Auto Context Note */}
                <div className="flex items-center gap-2 rounded-lg bg-mh-slate-950/60 border border-mh-slate-800 px-3 py-2 text-[11px] text-mh-slate-400">
                  <Monitor size={14} className="shrink-0 text-mh-slate-400" />
                  <span className="truncate">
                    Auto-attaching current page: <code className="text-mh-gold-400">{pathname}</code> ({defaultGame.toUpperCase()})
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !description.trim() || !humanCheck.answer.trim()}
                    className={cn(
                      'flex items-center gap-2 rounded-xl bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 shadow-md',
                      'hover:bg-mh-gold-400 transition-all duration-150',
                      'disabled:opacity-50 disabled:pointer-events-none',
                    )}
                  >
                    {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* TAB 2: MY SUBMITTED REPORTS */}
        {activeTab === 'my-reports' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoadingReports ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-mh-slate-400">
                <Loader2 size={24} className="animate-spin text-mh-gold-400 mb-2" />
                <span className="text-xs">Loading your reports...</span>
              </div>
            ) : userReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-mh-slate-500">
                <Inbox size={40} className="mb-2.5 text-mh-slate-600" />
                <p className="text-xs font-bold text-mh-slate-300">No reports submitted yet</p>
                <p className="mt-1 max-w-xs text-[11px] text-mh-slate-400 leading-relaxed">
                  When you submit bug reports or feedback while signed in, you can track live status updates and admin replies here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="mt-4 rounded-xl bg-mh-gold-500 px-4 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors"
                >
                  Submit a Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userReports.map((report) => (
                  <UserReportCard
                    key={report.id}
                    report={report}
                    isExpanded={expandedId === report.id}
                    onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserReportCard({
  report,
  isExpanded,
  onToggle,
}: {
  report: SiteFeedback;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeConf = FEEDBACK_TYPES.find((t) => t.id === report.feedback_type) ?? FEEDBACK_TYPES[0];
  const TypeIcon = typeConf.icon;
  const statusConf = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.new;
  const StatusIcon = statusConf.icon;

  const hasReply = !!report.admin_reply;
  const isResolved = report.status === 'resolved';

  return (
    <div
      className={cn(
        'rounded-xl border transition-all text-xs',
        hasReply
          ? 'border-mh-gold-500/40 bg-mh-slate-950/90 ring-1 ring-mh-gold-500/20'
          : 'border-mh-slate-800 bg-mh-slate-950/60',
      )}
    >
      {/* Header bar */}
      <div
        className="p-3 cursor-pointer hover:bg-white/[0.02] flex items-start justify-between gap-3"
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status pill */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1',
                statusConf.colorClass,
              )}
            >
              <StatusIcon size={11} />
              {statusConf.label}
            </span>

            {/* Type pill */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border',
                typeConf.colorClass,
              )}
            >
              <TypeIcon size={10} />
              {typeConf.label}
            </span>

            {/* Submission Date */}
            <span className="text-[10px] text-mh-slate-500">
              {new Date(report.created_at).toLocaleDateString()}
            </span>

            {/* Admin Reply notification pill */}
            {hasReply && (
              <span className="inline-flex items-center gap-1 rounded-md bg-mh-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-mh-gold-400 ring-1 ring-mh-gold-500/40">
                <ShieldCheck size={11} />
                Admin Response
              </span>
            )}
          </div>

          <h4 className="font-bold text-white text-xs leading-snug truncate pt-0.5">
            {report.title}
          </h4>
        </div>

        <button
          type="button"
          className="text-mh-slate-400 hover:text-white p-1 rounded-lg shrink-0 mt-0.5"
          aria-label={isExpanded ? 'Collapse report' : 'Expand report'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-mh-slate-800/80 space-y-2.5">
          {/* User's Original Report */}
          <div className="text-mh-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap bg-mh-slate-900/60 rounded-lg p-2.5 border border-mh-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-500 block mb-1">
              Your Description:
            </span>
            {report.description}
          </div>

          {/* Admin Response Card */}
          {hasReply ? (
            <div className="rounded-xl border border-mh-gold-500/50 bg-gradient-to-br from-mh-gold-500/15 to-mh-gold-500/5 p-3 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-mh-gold-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-mh-gold-400" />
                  Admin Response
                </span>
                {report.admin_reply_at && (
                  <span className="text-[10px] text-mh-slate-400">
                    {new Date(report.admin_reply_at).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-mh-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                {report.admin_reply}
              </p>
            </div>
          ) : isResolved ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>This issue has been marked as resolved by the administrators.</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
