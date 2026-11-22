import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Calendar, History, Play, ExternalLink } from 'lucide-react';
import { siteMetadata, type SiteChangeItem } from '../../data/siteMetadata';
import { getYouTubeEmbedUrl } from '../../lib/youtube';
import { useUIStore } from '../../store/uiStore';
import { resolveSectionTheme } from '../../config/themes';
import { cn } from '../../lib/utils';

export default function SiteUpdatesSection() {
  const sectionThemes = useUIStore((s) => s.sectionThemes);
  const galleryTheme = resolveSectionTheme('/gallery', sectionThemes);

  const [selectedVersion, setSelectedVersion] = useState<string>(
    siteMetadata.releases[0]?.version || siteMetadata.version
  );

  const currentRelease =
    siteMetadata.releases.find((r) => r.version === selectedVersion) || {
      version: siteMetadata.version,
      date: siteMetadata.date,
      title: siteMetadata.title || 'Latest Updates',
      description: siteMetadata.description,
      youtube_url: siteMetadata.youtube_url,
      video_aspect: siteMetadata.video_aspect,
      changes: siteMetadata.changes,
    };

  const embedUrl = currentRelease.youtube_url ? getYouTubeEmbedUrl(currentRelease.youtube_url) : null;
  const isShorts =
    currentRelease.video_aspect === 'shorts' ||
    Boolean(currentRelease.youtube_url?.includes('/shorts/'));

  const formattedDate = currentRelease.date
    ? new Date(currentRelease.date + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div data-rarity-theme={galleryTheme} className="section-theme">
      <section aria-labelledby="latest-site-updates-title" className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-rarity-current)] border border-[var(--border-rarity-current)] shadow-inner">
              <img
                src="/img/ui/Visage%20Icon.png"
                alt="Visage Gallery"
                className="w-6 h-6 object-contain drop-shadow"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="latest-site-updates-title"
                  className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wide text-white"
                >
                  <span className="text-[var(--rarity-current)] mr-2 text-base">❖</span>
                  What's New On Field Guide
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[var(--bg-rarity-current)] text-[var(--rarity-current)] border border-[var(--border-rarity-current)]">
                  v{currentRelease.version}
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                <p className="text-xs sm:text-sm text-[#A3A3A3] truncate">
                  {currentRelease.title}
                </p>
                {/* YouTube Link directly next to/underneath text in header */}
                {currentRelease.youtube_url && (
                  <a
                    href={currentRelease.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 hover:text-red-300 transition-colors text-[11px] font-semibold shrink-0 shadow-sm"
                    title="Watch update video on YouTube"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Watch Video</span>
                    <ExternalLink size={10} className="opacity-75" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap self-start sm:self-auto shrink-0">
            {/* Version Switcher Pills */}
            {siteMetadata.releases.length > 1 && (
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
                <History size={13} className="text-mh-slate-500 ml-1.5 mr-0.5 hidden sm:block" />
                {siteMetadata.releases.map((rel, idx) => {
                  const isSelected = rel.version === currentRelease.version;
                  return (
                    <button
                      key={rel.version}
                      type="button"
                      onClick={() => setSelectedVersion(rel.version)}
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        isSelected
                          ? 'bg-[var(--bg-rarity-current)] text-[var(--rarity-current)] border border-[var(--border-rarity-current)] shadow-sm'
                          : 'text-mh-slate-400 hover:text-white hover:bg-white/5',
                      )}
                    >
                      v{rel.version}
                      {idx === 0 && (
                        <span className="ml-1 text-[9px] opacity-75 font-normal hidden md:inline">
                          (Latest)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {formattedDate && (
              <div className="inline-flex items-center gap-1.5 text-xs text-mh-slate-400">
                <Calendar size={13} className="text-[var(--rarity-current)]" />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Updates Panel */}
        <div className="mho-panel p-4 sm:p-6 rounded-2xl border-[var(--border-rarity-current)] bg-mh-slate-900/90 shadow-xl">
          {embedUrl && isShorts ? (
            /* Shorts Layout: Side-by-side with cards on desktop, stacked on mobile */
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Shorts Player Column */}
              <div className="w-full lg:w-[280px] shrink-0 flex flex-col items-center mx-auto lg:mx-0">
                <div className="w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-[var(--border-rarity-current)] bg-black/90 shadow-2xl relative ring-1 ring-white/10">
                  <iframe
                    src={embedUrl}
                    title={`${currentRelease.title} - Video Shorts`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
                {currentRelease.youtube_url && (
                  <a
                    href={currentRelease.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--rarity-current)] hover:underline"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Watch Shorts on YouTube</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* Changes List Column */}
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {currentRelease.changes.map((item, idx) => (
                  <ChangeCard key={idx} item={item} />
                ))}
              </div>
            </div>
          ) : (
            /* Standard 16:9 Landscape Layout */
            <div className="space-y-5">
              {embedUrl && (
                <div className="flex flex-col items-center pb-2">
                  <div className="w-full max-w-[600px] aspect-video rounded-xl overflow-hidden border border-[var(--border-rarity-current)] bg-black/60 shadow-2xl relative">
                    <iframe
                      src={embedUrl}
                      title={`${currentRelease.title} - Video Walkthrough`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                  {currentRelease.youtube_url && (
                    <a
                      href={currentRelease.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--rarity-current)] hover:underline"
                    >
                      <Play size={11} fill="currentColor" />
                      <span>Watch on YouTube</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}

              {/* Changes List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {currentRelease.changes.map((item, idx) => (
                  <ChangeCard key={idx} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ChangeCard({ item }: { item: SiteChangeItem }) {
  return (
    <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-white/10 bg-black/30 hover:border-[var(--border-rarity-current)] hover:bg-black/40 transition-all group shadow-sm">
      <div className="space-y-1.5">
        <h3 className="font-display text-sm font-bold text-white group-hover:text-[var(--rarity-current)] transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-mh-slate-300 leading-relaxed">
          {item.description}
        </p>
      </div>

      {item.page_url && (
        <div className="pt-2.5 mt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-mh-slate-400 uppercase tracking-wider font-semibold">
            Feature Link
          </span>
          <Link
            to={item.page_url}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--rarity-current)] hover:text-white group/link transition-colors"
          >
            <span>{item.page_label || 'View Page'}</span>
            <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
