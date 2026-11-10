import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAdminSkills } from '../../hooks/useAdminSkills';
import { buildSkillIndex } from '../../lib/skillIndex';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import { Sword, Shield, Heart, Star, Skull, Wrench, Crosshair } from 'lucide-react';

const CATEGORY_CONFIG: Record<string, { color: string, bg: string, border: string, ring: string, icon: any }> = {
  attack: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', ring: 'ring-red-500/50', icon: Sword },
  critical: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', ring: 'ring-purple-500/50', icon: Crosshair },
  defense: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'ring-blue-500/50', icon: Shield },
  survival: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', ring: 'ring-orange-500/50', icon: Heart },
  general: { color: 'text-mh-slate-300', bg: 'bg-mh-slate-600/10', border: 'border-mh-slate-600/20', ring: 'ring-mh-slate-400/50', icon: Star },
  status: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'ring-emerald-500/50', icon: Skull },
  utility: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', ring: 'ring-yellow-500/50', icon: Wrench },
  health: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', ring: 'ring-green-500/50', icon: Heart },
};

// The game's skill categories use the colours of the closest legacy category
const CATEGORY_ALIASES: Record<string, string> = {
  'Hunt (General)': 'attack',
  'Hunt (Ranged)': 'critical',
  'Weapon-specific': 'utility',
  Attributes: 'defense',
  Resistance: 'status',
  Survival: 'survival',
  Exploration: 'general',
};

export function SkillSummaryPanel() {
  const {
    getActiveSkills, hoveredSkillId, setHoveredSkillId, buddy, coreVisage,
    helm, chest, gloves, waist, greaves,
  } = useBuildPlannerStore();
  const activeSkills = getActiveSkills();

  // Full skill definitions to display names, descriptions and max levels
  const { data: skillsData = [], isLoading } = useAdminSkills({ isActive: true, isSetBonus: false });
  const { byId, levelRows } = useMemo(() => buildSkillIndex(skillsData), [skillsData]);

  // Query monsters for sketches / icons
  const { data: monsters = [] } = useQuery({
    queryKey: ['monsters_active_sketch'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monsters')
        .select('id, name, sketch, icon')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query other_resources (mining outcrops, bonepiles)
  const { data: otherResources = [] } = useQuery({
    queryKey: ['other_resources_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('other_resources')
        .select('id, name, icon')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const monsterMap = useMemo(() => new Map(monsters.map(m => [m.id, m])), [monsters]);
  const resourceMap = useMemo(() => new Map(otherResources.map(r => [r.id, r])), [otherResources]);

  // Resolve sources for the 5 armour pieces
  const armourPieces = useMemo(() => [helm, chest, gloves, waist, greaves], [helm, chest, gloves, waist, greaves]);
  const armourSources = useMemo(() => {
    return armourPieces.map((piece) => {
      if (!piece) return null;
      const mid = piece.monster_id ? String(piece.monster_id).toLowerCase() : '';
      const sname = piece.set_name ? String(piece.set_name).toLowerCase() : '';

      // Check mining / ore
      if (mid === 'mining_outcrops' || ['alloy', 'ingot', 'high metal', 'chainmail'].some(k => mid.includes(k) || sname.includes(k))) {
        const res = resourceMap.get('mining_outcrops');
        return {
          key: piece.id,
          name: res?.name || 'Mining Outcrops',
          icon: res?.icon || '/images/ui/other/MapIcon_Collectible_Lode.png',
          isSketch: false,
        };
      }

      // Check bone
      if (mid === 'bonepiles' || ['bone'].some(k => mid.includes(k) || sname.includes(k))) {
        const res = resourceMap.get('bonepiles');
        return {
          key: piece.id,
          name: res?.name || 'Bonepiles',
          icon: res?.icon || '/images/ui/other/MapIcon_Collectible_BoneMound.png',
          isSketch: false,
        };
      }

      // Check monster by id
      const monster = piece.monster_id ? monsterMap.get(piece.monster_id) : undefined;
      if (monster) {
        return {
          key: piece.id,
          name: monster.name,
          icon: monster.sketch || monster.icon,
          isSketch: !!monster.sketch,
        };
      }

      // Check other_resources by id directly
      if (piece.monster_id && resourceMap.has(piece.monster_id)) {
        const res = resourceMap.get(piece.monster_id)!;
        return {
          key: piece.id,
          name: res.name,
          icon: res.icon,
          isSketch: false,
        };
      }

      return null;
    });
  }, [armourPieces, monsterMap, resourceMap]);

  return (
    <div className="mho-panel relative isolate overflow-hidden p-4 flex flex-col gap-4">
      {/* 5-Piece Armour Monster / Resource Backdrop (Vertical 20% Stacks) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden flex flex-col">
        {armourSources.map((source, idx) => (
          <div key={idx} className="relative w-full h-[20%] overflow-hidden flex items-center justify-center border-b border-white/[0.03] last:border-b-0">
            {source?.icon && (
              source.isSketch ? (
                <img
                  src={source.icon}
                  alt=""
                  className="w-full h-full object-cover object-center opacity-15 filter invert brightness-125 contrast-125 transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20">
                  <img
                    src={source.icon}
                    alt=""
                    className="h-full max-h-[85%] w-auto object-contain filter drop-shadow-md transition-all duration-300"
                  />
                </div>
              )
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-[#131622]/90 via-[#131622]/70 to-[#131622]/90 pointer-events-none" />
      </div>

      <h2 className="font-display text-base font-bold uppercase tracking-wide text-white flex items-center gap-2"><span className="text-[#FFD700] text-xs">❖</span>Skills</h2>
      
      {(buddy || coreVisage) && (
        <div className="flex flex-col gap-2">
          {buddy && (
            <div className="flex flex-col gap-1 p-2.5 rounded-lg border border-orange-500/30 bg-orange-500/10">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Buddy Core Passive — {buddy.name}</span>
              <p className="text-xs text-mh-slate-200 leading-snug">{buddy.core_passive || 'No core passive listed.'}</p>
            </div>
          )}
          {coreVisage && (
            <div className="flex flex-col gap-1 p-2.5 rounded-lg border border-rarity-5/40 bg-rarity-5/5">
              <span className="text-[10px] font-bold text-rarity-5 uppercase tracking-wider">Visage Core Effect — {coreVisage.name}</span>
              <p className="text-xs text-mh-slate-200 leading-snug">{coreVisage.core_effect || 'No core effect listed.'}</p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-mh-slate-500">Loading skills...</p>
      ) : activeSkills.length > 0 ? (
        <div className="flex flex-col gap-2">
          {activeSkills.sort((a, b) => b.level - a.level).map(skill => {
            // skill.id is the level 1 id of the skill; the description belongs to the level reached
            const skillDef = byId.get(skill.id);
            const maxLevel = skillDef?.max_levels ?? skill.level;
            const level = Math.min(skill.level, maxLevel);
            const levelDescription = levelRows.get(skill.id)?.get(level)?.description ?? skillDef?.description;
            const cat = skillDef?.category || 'general';
            const cfg = CATEGORY_CONFIG[CATEGORY_ALIASES[cat] ?? cat] || CATEGORY_CONFIG.general;
            const Icon = cfg.icon;

            return (
              <div 
                key={skill.id} 
                className={`p-2.5 rounded-lg border flex items-center justify-between relative cursor-default transition-all ${hoveredSkillId === skill.id ? 'ring-2 ' + cfg.ring + ' ' + cfg.bg : cfg.bg} ${cfg.border}`}
                onMouseEnter={() => setHoveredSkillId(skill.id, cat)}
                onMouseLeave={() => setHoveredSkillId(null)}
              >
                {/* Tooltip */}
                {hoveredSkillId === skill.id && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-50 pointer-events-none flex flex-col gap-1">
                    
                    <span className="text-xs text-mh-slate-200 leading-snug">
                      {levelDescription || 'No description available for this skill.'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-black/40 ${cfg.color}`}>
                    <Icon size={12} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-mh-slate-100">{skillDef?.name || skill.id}</span>
                  </div>
                </div>
                <div className={`font-display font-black text-sm px-2 ${cfg.color}`}>
                  Lv. {level}{maxLevel > 1 ? '/' + maxLevel : ''}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-mh-slate-500">No skills active.</p>
      )}
    </div>
  );
}
