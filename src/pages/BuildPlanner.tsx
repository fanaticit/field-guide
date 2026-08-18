import { Shield, Sword, Plus, Zap } from 'lucide-react';

const rarities = [
  { label: 'R1 Common', cls: 'rarity-1' },
  { label: 'R2 Uncommon', cls: 'rarity-2' },
  { label: 'R3 Rare', cls: 'rarity-3' },
  { label: 'R4 Epic', cls: 'rarity-4' },
  { label: 'R5 Legendary', cls: 'rarity-5' },
  { label: 'R6 Ancient', cls: 'rarity-6' },
  { label: 'Elder Dragon', cls: 'rarity-elder' },
];

export default function BuildPlanner() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-rarity-3" />
          <span className="rarity-badge rarity-3">Build Planner</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-mh-slate-100 lg:text-3xl">
          Loadout Workshop
        </h1>
        <p className="text-sm text-mh-slate-500">
          Plan your weapon and armour combinations for every hunt.
        </p>
      </div>

      {/* Rarity tier showcase */}
      <div className="mh-card">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-mh-slate-400">
          Rarity Tiers
        </h2>
        <div className="flex flex-wrap gap-2">
          {rarities.map((r) => (
            <span key={r.cls} className={`rarity-badge ${r.cls}`}>
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div className="mh-card flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rarity-3/10 ring-1 ring-rarity-3/30">
          <Sword size={28} className="text-rarity-3" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-mh-slate-200">Build Planner Coming Soon</h2>
          <p className="mt-1 max-w-sm text-sm text-mh-slate-500">
            Import builds from mhn.quest, compare skills, and export shareable loadout cards.
          </p>
        </div>
        <button className="btn-mh mt-2">
          <Plus size={16} />
          New Build
        </button>
        <div className="flex items-center gap-2 text-xs text-mh-slate-600">
          <Zap size={12} />
          <span>mhn.quest import / export coming in Phase 2</span>
        </div>
      </div>
    </div>
  );
}
