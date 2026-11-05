// ─────────────────────────────────────────────────────────────
// FeedbackModal.tsx — Player feedback, bug reports & feature requests
// Allows anonymous or authenticated submission with auto-context.
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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { submitFeedback, type FeedbackType } from '../../hooks/useAdminFeedback';
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

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { pathname } = useLocation();
  const { user, profile } = useAuthStore();
  const defaultGame = useUIStore((s) => s.defaultGame);

  const titleId = useId();
  const descId = useId();
  const contactId = useId();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setContactInfo('');
      setErrorMsg(null);
      setIsSubmitted(false);
      setIsSubmitting(false);
    }
  }, [open]);

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
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while sending feedback.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
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
        <div className="mb-4 flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-gold-500/10 ring-1 ring-mh-gold-500/30">
            <img
              src="/img/ui/BtnIcon_Chat.png"
              alt=""
              className="h-6 w-6 object-contain"
              onError={(e) => {
                // Fallback to chat icon if image not cached yet
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Send Feedback & Bug Reports</h2>
            <p className="text-xs text-mh-slate-400">
              Direct message to the site administrators.
            </p>
          </div>
        </div>

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
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-mh-gold-500 px-6 py-2.5 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors"
            >
              Back to Guide
            </button>
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

            {/* Subject / Title */}
            <div>
              <label htmlFor={titleId} className="block text-xs font-semibold text-mh-slate-300 mb-1">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                id={titleId}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  feedbackType === 'bug'
                    ? 'e.g., Visage skill bonus not applying in Build Planner'
                    : feedbackType === 'feature'
                      ? 'e.g., Add filter by weapon element'
                      : feedbackType === 'data'
                        ? 'e.g., Rathalos weak points are missing Dragon'
                        : 'e.g., Suggestion for the homepage layout'
                }
                className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500"
              />
            </div>

            {/* Description */}
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
                placeholder={
                  feedbackType === 'bug'
                    ? 'Please describe what happened, steps to reproduce, or what you expected to see.'
                    : 'Provide as much detail as possible to help us build or fix this!'
                }
                className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500 resize-none"
              />
            </div>

            {/* Contact Info (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={contactId} className="block text-xs font-semibold text-mh-slate-300">
                  Discord or Contact (Optional)
                </label>
                {user && (
                  <span className="text-[11px] text-mh-gold-400 font-medium">
                    Logged in as {displayName}
                  </span>
                )}
              </div>
              <input
                id={contactId}
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g., Discord: Hunter#1234 or your email (if you want a reply)"
                className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-xs text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500"
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
                disabled={isSubmitting || !title.trim() || !description.trim()}
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
      </div>
    </div>
  );
}
