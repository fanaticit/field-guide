import { Users, ThumbsUp, Globe, Plus } from 'lucide-react';

const stats = [
  { label: 'Challenges', value: '0', icon: Globe, color: 'text-rarity-4' },
  { label: 'Upvotes Given', value: '0', icon: ThumbsUp, color: 'text-rarity-2' },
  { label: 'Hunters Active', value: '—', icon: Users, color: 'text-rarity-3' },
];

export default function CommunityHub() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-rarity-4" />
          <span className="rarity-badge rarity-4">Community Hub</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-mh-slate-100 lg:text-3xl">
          Hunter's Gathering Hall
        </h1>
        <p className="text-sm text-mh-slate-500">
          Discover, adopt, and share challenges with the Monster Hunter Now community.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="mh-card flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mh-slate-700/60">
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-mh-slate-100">{value}</p>
              <p className="text-xs text-mh-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="mh-card flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rarity-4/10 ring-1 ring-rarity-4/30">
          <Globe size={28} className="text-rarity-4" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-mh-slate-200">Community Challenges</h2>
          <p className="mt-1 max-w-sm text-sm text-mh-slate-500">
            Browse story, build, and custom challenges from hunters worldwide.
            Vote, adopt, and prove your skills.
          </p>
        </div>
        <button className="btn-mh mt-2">
          <Plus size={16} />
          Submit Challenge
        </button>
      </div>
    </div>
  );
}
