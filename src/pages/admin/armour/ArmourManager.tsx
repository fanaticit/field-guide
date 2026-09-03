// ─────────────────────────────────────────────────────────────
// ArmourManager — Root container for Admin Armour Management
// Supports two primary workflows:
//   1. "By Monster" — select a monster and configure its 5 armour pieces
//   2. "By Skill" — search/sort by skill to see, edit, add or remove matching armour pieces
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Layers, ListFilter } from 'lucide-react';
import MonsterArmourBuilder from './MonsterArmourBuilder';
import SkillArmourMappingView from './SkillArmourMappingView';
import { useUIStore } from '../../../store/uiStore';
import { cn } from '../../../lib/utils';

type ViewMode = 'monster' | 'skill';

const GAMES = [
  { id: 'mhn', label: 'Monster Hunter Now',        short: 'MHN', color: 'blue'   },
  { id: 'mho', label: 'Monster Hunter Outlanders', short: 'MHO', color: 'orange' },
] as const;

export default function ArmourManager() {
  const defaultGame = useUIStore((s) => s.defaultGame);
  const [viewMode, setViewMode] = useState<ViewMode>('monster');
  const [selectedGame, setSelectedGame] = useState<string>(defaultGame || 'mhn');
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Sub-header toolbar ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/50 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-mh-slate-700 bg-mh-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('monster')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'monster'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm'
                    : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                <Layers size={13} />
                By Monster
              </button>
              <button
                type="button"
                onClick={() => setViewMode('skill')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'skill'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm'
                    : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                <ListFilter size={13} />
                By Skill
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-xs text-mh-slate-500">
              <span>Mode:</span>
              <span className="font-semibold text-mh-slate-300">
                {viewMode === 'monster'
                  ? 'Monster Armour Builder (5 pieces)'
                  : 'Skill to Armour Mapping'}
              </span>
            </div>
          </div>

          {/* Game Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-mh-slate-500 font-medium">Game:</span>
            <div className="flex rounded-lg border border-mh-slate-700 bg-mh-slate-800 p-0.5">
              {GAMES.map((g) => {
                const isActive = selectedGame === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGame(g.id)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-bold transition-all',
                      isActive
                        ? g.color === 'blue'
                          ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                          : 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40'
                        : 'text-mh-slate-400 hover:text-mh-slate-200',
                    )}
                  >
                    {g.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === 'monster' ? (
          <MonsterArmourBuilder
            game={selectedGame}
            selectedMonsterId={selectedMonsterId}
            onSelectMonster={setSelectedMonsterId}
          />
        ) : (
          <SkillArmourMappingView game={selectedGame} />
        )}
      </div>
    </div>
  );
}
