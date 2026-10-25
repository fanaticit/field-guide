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
    <div className="flex flex-col min-h-full">
      {/* Section header + sub-nav tabs (Fine Quality Theme) */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel-secondary)]/90 backdrop-blur-md px-6 pb-0 pt-6 lg:px-8 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-fine)] border border-[var(--rarity-fine)]/40 text-[var(--rarity-fine)] shadow-sm">
            <BookMarked size={20} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <span>Investigation Notes</span>
              <span className="badge-fine px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold">
                Fine Tier
              </span>
            </h1>
            <p className="text-xs text-[#A3A3A3]">
              Monster lore, weapon data &amp; armour references
            </p>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist" aria-label="Investigation Notes sub-pages">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeSubPage === id}
              onClick={() => navigate(`/investigation-notes/${id}`)}
              className={
                activeSubPage === id
                  ? 'flex items-center gap-2 border-b-2 border-[var(--rarity-fine)] px-4 py-2.5 text-sm font-bold text-[var(--rarity-fine)] transition-all drop-shadow-[0_0_8px_rgba(117,182,112,0.35)]'
                  : 'flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-[#A3A3A3] transition-all hover:text-white'
              }
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-page content */}
      <div className="p-6 lg:p-8">
        {activeSubPage === 'monster-guide' && <MonsterGuide />}
        {activeSubPage === 'adventurers' && <AdventurerGuide />}
        {activeSubPage === 'visages' && <VisageSetsGuide />}
        {activeSubPage === 'buddies' && <BuddyGuide />}
        {activeSubPage === 'weapons' && <WeaponGuide />}
        {activeSubPage === 'armour' && <ArmourGuide />}
      </div>
    </div>
  );
}
