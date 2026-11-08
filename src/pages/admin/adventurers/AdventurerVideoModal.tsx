// ─────────────────────────────────────────────────────────────
// AdventurerVideoModal — Admin modal to configure YouTube guide video
// for the '/challenges/adventurers' page
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { X, Video, ExternalLink, Check, AlertCircle, Trash2, Play } from 'lucide-react';
import { usePageGuide, useUpdatePageGuide } from '../../../hooks/usePageGuide';
import { extractYouTubeId, getYouTubeEmbedUrl, isValidYouTubeUrl } from '../../../lib/youtube';
import { cn } from '../../../lib/utils';

interface AdventurerVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AdventurerVideoModal({ open, onClose }: AdventurerVideoModalProps) {
  const { data: pageGuide } = usePageGuide('adventurers');
  const updateGuide = useUpdatePageGuide();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (pageGuide) {
      setUrl(pageGuide.youtube_url || '');
      setTitle(pageGuide.title || '');
      setDescription(pageGuide.description || '');
    } else {
      setUrl('');
      setTitle('');
      setDescription('');
    }
  }, [pageGuide, open]);

  if (!open) return null;

  const trimmedUrl = url.trim();
  const videoId = extractYouTubeId(trimmedUrl);
  const isValid = !trimmedUrl || Boolean(videoId);
  const embedUrl = videoId ? getYouTubeEmbedUrl(videoId) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedUrl && !isValidYouTubeUrl(trimmedUrl)) return;

    await updateGuide.mutateAsync({
      page_id: 'adventurers',
      youtube_url: trimmedUrl || null,
      title: title.trim() || null,
      description: description.trim() || null,
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove the video link from the Adventurers page?')) {
      return;
    }

    await updateGuide.mutateAsync({
      page_id: 'adventurers',
      youtube_url: null,
      title: null,
      description: null,
    });

    setUrl('');
    setTitle('');
    setDescription('');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-800 px-6 py-4 bg-mh-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
              <Video size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <span>Adventurers Page Guide Video</span>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30">
                  YouTube
                </span>
              </h3>
              <p className="text-xs text-mh-slate-400">
                Configure a YouTube video displayed at the bottom of <code className="text-mh-gold-400">/challenges/adventurers</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[calc(85vh-130px)] overflow-y-auto custom-scrollbar">
          {/* Info Banner */}
          <div className="rounded-xl border border-sky-800/40 bg-sky-950/30 p-3 text-xs text-sky-200/90 leading-relaxed">
            <span className="font-bold text-sky-300">How it works: </span>
            When populated with a valid YouTube link, an embedded responsive video player appears at the bottom of the public{' '}
            <span className="font-semibold text-white">/challenges/adventurers</span> page to guide players on how to recruit, level insight, and manage challenges. Leaving it blank hides the video section entirely.
          </div>

          {/* YouTube URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              YouTube Video Link or ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                className={cn(
                  'w-full rounded-xl border bg-mh-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-mh-slate-500 transition-colors focus:outline-none focus:ring-1',
                  trimmedUrl && !isValid
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                    : videoId
                    ? 'border-green-500/60 focus:border-green-500 focus:ring-green-500/50 pr-10'
                    : 'border-mh-slate-700 focus:border-mh-gold-500 focus:ring-mh-gold-500/50',
                )}
              />
              {videoId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 flex items-center gap-1 text-xs">
                  <Check size={16} />
                </div>
              )}
            </div>
            {trimmedUrl && !isValid && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle size={13} />
                <span>Could not detect a valid YouTube video ID from this URL.</span>
              </p>
            )}
            <p className="text-[11px] text-mh-slate-500">
              Supports standard YouTube URLs (watch, share, embed, shorts) or direct 11-character video IDs.
            </p>
          </div>

          {/* Optional Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Video Title <span className="text-mh-slate-500 text-[10px] normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Adventurer System Guide &amp; Tutorial"
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-sm text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500/50"
            />
          </div>

          {/* Optional Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Caption / Description <span className="text-mh-slate-500 text-[10px] normal-case">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Watch this guide to learn more about Outlanders adventurers, roles, insight progression, and recruitment."
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3.5 py-2 text-sm text-white placeholder-mh-slate-500 focus:border-mh-gold-500 focus:outline-none focus:ring-1 focus:ring-mh-gold-500/50 resize-none"
            />
          </div>

          {/* Live Preview */}
          {embedUrl && (
            <div className="space-y-2 pt-2 border-t border-mh-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-mh-gold-400 flex items-center gap-1.5">
                  <Play size={13} />
                  <span>Live Embed Preview</span>
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-mh-slate-400 hover:text-white transition-colors"
                >
                  <span>Open in YouTube</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-mh-slate-700 bg-black shadow-inner">
                <iframe
                  src={embedUrl}
                  title="YouTube video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-mh-slate-800">
            {pageGuide?.youtube_url ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={updateGuide.isPending}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/60 transition-colors"
              >
                <Trash2 size={14} />
                <span>Remove Video</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-mh-slate-700 px-4 py-2 text-xs font-semibold text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateGuide.isPending || (Boolean(trimmedUrl) && !isValid)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all shadow-md',
                  saveSuccess
                    ? 'bg-green-500 text-slate-950 shadow-green-500/30'
                    : 'bg-mh-gold-500 text-mh-slate-950 hover:bg-mh-gold-400 hover:shadow-mh-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {saveSuccess ? (
                  <>
                    <Check size={14} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Video size={14} />
                    <span>{updateGuide.isPending ? 'Saving...' : 'Save Video Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
