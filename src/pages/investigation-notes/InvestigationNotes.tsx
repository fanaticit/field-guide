// ─────────────────────────────────────────────────────────────
// InvestigationNotes — shell/layout for the Investigation Notes
// section. The active sub-page is driven by the URL :subPage param.
// Add more sub-pages here as they are built.
// ─────────────────────────────────────────────────────────────
import { BookMarked, Bug, Sword, Shield, Sparkles, Cat, UserCheck } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { type InvestigationSubPage } from '../../store/uiStore';
import MonsterGuide from './MonsterGuide';
import AdventurerGuide from './AdventurerGuide';
import VisageSetsGuide from './VisageSetsGuide';
import BuddyGuide from './BuddyGuide';
import WeaponGuide from './WeaponGuide';
import ArmourGuide from './ArmourGuide';

const tabs: Array<{ id: InvestigationSubPage; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'monster-guide', label: 'Monster Guide', icon: Bug },
  { id: 'adventurers', label: 'Adventurers', icon: UserCheck },
  { id: 'visages', label: 'Visage', icon: Sparkles },
  { id: 'buddies', label: 'Buddies', icon: Cat },
  { id: 'weapons', label: 'Weapons', icon: Sword },
  { id: 'armour', label: 'Armour', icon: Shield },
];

export default function InvestigationNotes() {
  const { subPage } = useParams<{ subPage: string }>();
  const navigate = useNavigate();
  // Fall back to 'monster-guide' if param is missing or unrecognised
  const activeSubPage: InvestigationSubPage =
    (tabs.find(t => t.id === subPage)?.id ?? 'monster-guide') as InvestigationSubPage;

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
              onClick={() => navigate(`/investigation-notes/${id}`)}
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
      {activeSubPage === 'armour' && <ArmourGuide />}
    </div>
  );
}
