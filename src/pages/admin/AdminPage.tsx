// ─────────────────────────────────────────────────────────────
// Admin Page — root layout
// Only renders for admins. Shows a sub-navigation and the
// active admin section.
// ─────────────────────────────────────────────────────────────
import { Shield, Bug, Sparkles, Layers, Users, FileText, SquareLibrary, Cat, UserCheck, Sword, SlidersHorizontal } from 'lucide-react';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useUIStore, type AdminSubPage } from '../../store/uiStore';
import { cn } from '../../lib/utils';
import MonsterManager from './monsters/MonsterManager';
import SkillManager from './skills/SkillManager';
import ArmourManager from './armour/ArmourManager';
import WeaponEquipmentManager from './weapons/WeaponEquipmentManager';
import OtherManager from './other/OtherManager';
import VisageManager from './visages/VisageManager';
import BuddyManager from './buddies/BuddyManager';
import AdventurerManager from './adventurers/AdventurerManager';

interface AdminTab {
  id: AdminSubPage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const TABS: AdminTab[] = [
  { id: 'monsters', label: 'Monsters', icon: Bug, description: 'Manage the monster roster' },
  { id: 'skills', label: 'Skills & Sets', icon: Sparkles, description: 'Manage skills, set bonuses, and game availability' },
  { id: 'weapons', label: 'Weapons', icon: Sword, description: 'Add & manage in-game craftable weapons' },
  { id: 'armour', label: 'Armour', icon: Layers, description: 'Manage monster armour piece skills' },
  { id: 'adventurers', label: 'Adventurers (MHO)', icon: UserCheck, description: 'Manage Outlanders Playable Adventurers' },
  { id: 'visages', label: 'Visages (MHO)', icon: SquareLibrary, description: 'Manage Outlanders Visage cards' },
  { id: 'buddies', label: 'Buddies (MHO)', icon: Cat, description: 'Manage Outlanders Companion Buddies' },
  { id: 'content', label: 'Content', icon: FileText, description: 'Moderate community content' },
  { id: 'users', label: 'Users', icon: Users, description: 'Manage user roles' },
  { id: 'other', label: 'Other', icon: SlidersHorizontal, description: 'Manage weapon types game availability & settings' },
];

export default function AdminPage() {
  const isAdmin = useAuthStore(selectIsAdmin);
  const { adminSubPage, setAdminSubPage } = useUIStore();

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Shield size={48} className="text-mh-slate-700" />
        <h2 className="font-display text-xl font-bold text-mh-slate-400">Admin Only</h2>
        <p className="max-w-sm text-sm text-mh-slate-600">
          You don't have permission to access this area.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Admin header ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mh-gold-500/10 ring-1 ring-mh-gold-500/30">
            <Shield size={18} className="text-mh-gold-400" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-mh-slate-100">Admin Panel</h1>
            <p className="text-xs text-mh-slate-500">Manage game data and community content</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = adminSubPage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminSubPage(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                    : 'text-mh-slate-500 hover:bg-mh-slate-800 hover:text-mh-slate-300',
                )}
              >
                <Icon size={15} className="shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {adminSubPage === 'monsters' && <MonsterManager />}
        {adminSubPage === 'skills' && <SkillManager />}
        {adminSubPage === 'weapons' && <WeaponEquipmentManager />}
        {adminSubPage === 'armour' && <ArmourManager />}
        {adminSubPage === 'adventurers' && <AdventurerManager />}
        {adminSubPage === 'visages' && <VisageManager />}
        {adminSubPage === 'buddies' && <BuddyManager />}
        {adminSubPage === 'content' && <ComingSoon label="Content Moderation" />}
        {adminSubPage === 'users' && <ComingSoon label="User Management" />}
        {adminSubPage === 'other' && <OtherManager />}
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-lg font-semibold text-mh-slate-400">{label}</p>
      <p className="text-sm text-mh-slate-600">Coming soon</p>
    </div>
  );
}
