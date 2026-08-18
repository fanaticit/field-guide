import { Settings as SettingsIcon, Globe, Bell, Palette, ShieldCheck } from 'lucide-react';

const sections = [
  {
    icon: Palette,
    title: 'Appearance',
    description: 'Theme, language, and display preferences.',
    badge: 'Coming Soon',
    badgeCls: 'rarity-1',
  },
  {
    icon: Globe,
    title: 'Localisation',
    description: 'Switch between English and Japanese (日本語).',
    badge: 'Coming Soon',
    badgeCls: 'rarity-1',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Email alerts for upvotes, comments, and events.',
    badge: 'Phase 3',
    badgeCls: 'rarity-3',
  },
  {
    icon: ShieldCheck,
    title: 'Account & Security',
    description: 'Manage your Supabase auth profile and linked accounts.',
    badge: 'Phase 1',
    badgeCls: 'rarity-2',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SettingsIcon size={20} className="text-mh-slate-400" />
          <span className="rarity-badge rarity-1">Settings</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-mh-slate-100 lg:text-3xl">
          Preferences
        </h1>
        <p className="text-sm text-mh-slate-500">
          Configure the Field Guide to your hunting style.
        </p>
      </div>

      {/* Settings sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sections.map(({ icon: Icon, title, description, badge, badgeCls }) => (
          <button
            key={title}
            className="mh-card group flex items-start gap-4 text-left"
            disabled
            aria-label={`${title} — ${badge}`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mh-slate-700/60 transition-colors group-hover:bg-mh-slate-700">
              <Icon size={20} className="text-mh-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-mh-slate-200">{title}</p>
                <span className={`rarity-badge ${badgeCls}`}>{badge}</span>
              </div>
              <p className="mt-0.5 text-xs text-mh-slate-500">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Version info */}
      <p className="text-center text-xs text-mh-slate-700">
        Field Guide v0.1.0 — scaffold
      </p>
    </div>
  );
}
