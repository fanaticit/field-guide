import { BookOpen, CheckSquare, Sword, Star, Flame } from 'lucide-react';

const stats = [
  { label: 'Active Quests', value: '0', icon: Sword, color: 'text-mh-gold-400' },
  { label: 'Completed', value: '0', icon: CheckSquare, color: 'text-rarity-2' },
  { label: 'On Fire 🔥', value: '0', icon: Flame, color: 'text-el-fire' },
];

export default function FieldGuide() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-mh-gold-500" />
          <span className="rarity-badge rarity-5">Field Guide</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-mh-slate-100 lg:text-3xl">
          Quest Board
        </h1>
        <p className="text-sm text-mh-slate-500">
          Track your self-imposed hunter challenges and daily goals.
        </p>
      </div>

      {/* Stats row */}
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

      {/* Coming soon card */}
      <div className="mh-card flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-mh-gold-600/20 to-mh-gold-400/5 ring-1 ring-mh-gold-700/40">
          <Star size={28} className="text-mh-gold-400 text-glow-gold" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-mh-slate-200">Quest Board Coming Soon</h2>
          <p className="mt-1 max-w-sm text-sm text-mh-slate-500">
            Create, track, and complete your personalised Monster Hunter Now challenges.
            Filter by monster, weapon type, or element.
          </p>
        </div>
        <button className="btn-mh mt-2">
          <CheckSquare size={16} />
          Add First Quest
        </button>
      </div>
    </div>
  );
}
