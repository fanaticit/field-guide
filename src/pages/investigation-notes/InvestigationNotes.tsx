// ─────────────────────────────────────────────────────────────
// InvestigationNotes — shell/layout for the Investigation Notes
// section. Renders the active sub-page from the UI store.
// Add more sub-pages here as they are built.
// ─────────────────────────────────────────────────────────────
import { BookMarked, Bug, Sword, Shield, Sparkles, Cat, UserCheck } from 'lucide-react';
import { useUIStore, type InvestigationSubPage } from '../../store/uiStore';
import MonsterGuide from './MonsterGuide';
import AdventurerGuide from './AdventurerGuide';
import VisageSetsGuide from './VisageSetsGuide';
import BuddyGuide from './BuddyGuide';
import WeaponGuide from './WeaponGuide';

const tabs: Array<{ id: InvestigationSubPage; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'monster-guide', label: 'Monster Guide', icon: Bug },
  { id: 'adventurers', label: 'Adventurers', icon: UserCheck },
  { id: 'visages', label: 'Visage', icon: Sparkles },
  { id: 'buddies', label: 'Buddies', icon: Cat },
  { id: 'weapons', label: 'Weapons', icon: Sword },
  { id: 'armour', label: 'Armour', icon: Shield },
];

function ComingSoon({ title, icon: Icon, description }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; description: string }) {
  return (
    <div className="mh-card flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Icon size={48} className="text-mh-slate-700" />
      <div>
        <p className="font-display text-lg font-semibold text-mh-slate-300">{title}</p>
        <p className="mt-1 text-sm text-mh-slate-500">{description}</p>
        <span className="mt-3 inline-block rounded-full bg-mh-gold-500/10 px-3 py-1 text-xs font-medium text-mh-gold-400 ring-1 ring-mh-gold-500/30">
          Coming soon
        </span>
      </div>
    </div>
  );
}

export default function InvestigationNotes() {
  const { activeSubPage, setActiveSubPage } = useUIStore();

  return (
    <div className="flex flex-col">
      {/* Section header + sub-nav tabs */}
      <div className="border-b border-mh-slate-700 bg-mh-slate-950/60 px-6 pb-0 pt-6 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mh-gold-500/10 ring-1 ring-mh-gold-500/30">
            <BookMarked size={20} className="text-mh-gold-400" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-mh-slate-100">
              Investigation Notes
            </h1>
            <p className="text-xs text-mh-slate-500">
              Monster lore, weapon data &amp; armour references
            </p>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex gap-1" role="tablist" aria-label="Investigation Notes sub-pages">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeSubPage === id}
              onClick={() => setActiveSubPage(id)}
              className={
                activeSubPage === id
                  ? 'flex items-center gap-2 border-b-2 border-mh-gold-400 px-4 py-2.5 text-sm font-semibold text-mh-gold-400 transition-all'
                  : 'flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-mh-slate-400 transition-all hover:text-mh-slate-200'
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-page content */}
      {activeSubPage === 'monster-guide' && <MonsterGuide />}
      {activeSubPage === 'adventurers' && <AdventurerGuide />}
      {activeSubPage === 'visages' && <VisageSetsGuide />}
      {activeSubPage === 'buddies' && <BuddyGuide />}
      {activeSubPage === 'weapons' && <WeaponGuide />}
      {activeSubPage === 'armour' && (
        <div className="p-6 lg:p-8">
          <ComingSoon
            title="Armour"
            icon={Shield}
            description="Per-monster armour skills across all 5 slots · driftsmelt slots"
          />
        </div>
      )}
    </div>
  );
}
