import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { siteMetadata } from '../../data/siteMetadata';
import { getYouTubeEmbedUrl } from '../../lib/youtube';
import { useUIStore } from '../../store/uiStore';
import { resolveSectionTheme } from '../../config/themes';

export default function SiteUpdatesSection() {
  const sectionThemes = useUIStore((s) => s.sectionThemes);
  const galleryTheme = resolveSectionTheme('/gallery', sectionThemes);
  const embedUrl = siteMetadata.youtube_url ? getYouTubeEmbedUrl(siteMetadata.youtube_url) : null;

  const formattedDate = siteMetadata.date
    ? new Date(siteMetadata.date + 'T00:00:00').toLocaleDateString(undefined, {
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
                  v{siteMetadata.version}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#A3A3A3] mt-0.5 truncate">
                {siteMetadata.title}
              </p>
            </div>
          </div>

          {formattedDate && (
            <div className="inline-flex items-center gap-1.5 text-xs text-mh-slate-400 self-start sm:self-auto shrink-0">
              <Calendar size={13} className="text-[var(--rarity-current)]" />
              <span>Updated {formattedDate}</span>
            </div>
          )}
        </div>

        {/* Main Updates Panel */}
        <div className="mho-panel p-4 sm:p-6 rounded-2xl border-[var(--border-rarity-current)] bg-mh-slate-900/90 shadow-xl space-y-5">
          {/* Optional YouTube Video Walkthrough (rendered when youtube_url is filled in METADATA.json) */}
          {embedUrl && (
            <div className="flex justify-center pb-2">
              <div className="w-full max-w-[600px] aspect-video rounded-xl overflow-hidden border border-[var(--border-rarity-current)] bg-black/60 shadow-2xl relative">
                <iframe
                  src={embedUrl}
                  title={`${siteMetadata.title} - Video Walkthrough`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            </div>
          )}

          {/* Changes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {siteMetadata.changes.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-white/10 bg-black/30 hover:border-[var(--border-rarity-current)] hover:bg-black/40 transition-all group shadow-sm"
              >
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
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
