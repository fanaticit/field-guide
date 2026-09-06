import fs from 'fs';

const code = `import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import { Sword, Shield, Zap, Heart, Star, Skull, Wrench, Crosshair } from 'lucide-react';

const CATEGORY_CONFIG: Record<string, { color: string, bg: string, border: string, icon: any }> = {
  attack: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Sword },
  critical: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Crosshair },
  defense: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Shield },
  survival: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Heart },
  general: { color: 'text-mh-slate-300', bg: 'bg-mh-slate-600/10', border: 'border-mh-slate-600/20', icon: Star },
  status: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Skull },
  utility: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Wrench },
  health: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Heart },
};

export function SkillSummaryPanel() {
  const { getActiveSkills } = useBuildPlannerStore();
  const activeSkills = getActiveSkills();

  // Fetch full skill definitions to display names and max levels
  const { data: skillsData, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('*');
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="bg-mh-slate-800/30 border border-mh-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="font-display text-base font-bold text-mh-slate-200">Equipment Skills</h2>
      
      {isLoading ? (
        <p className="text-sm text-mh-slate-500">Loading skills...</p>
      ) : activeSkills.length > 0 ? (
        <div className="flex flex-col gap-2">
          {activeSkills.sort((a, b) => b.level - a.level).map(skill => {
            const skillDef = skillsData?.find((s: any) => s.id === skill.id);
            const cat = skillDef?.category || 'general';
            const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
            const Icon = cfg.icon;

            return (
              <div key={skill.id} className={\`p-2.5 rounded-lg border flex items-center justify-between \${cfg.bg} \${cfg.border}\`}>
                <div className="flex items-center gap-3">
                  <div className={\`w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-black/40 \${cfg.color}\`}>
                    <Icon size={12} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-mh-slate-100">{skillDef?.name || skill.id}</span>
                  </div>
                </div>
                <div className={\`font-display font-black text-sm px-2 \${cfg.color}\`}>
                  Lv. {skill.level}
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
`;

fs.writeFileSync('src/components/build-planner/SkillSummaryPanel.tsx', code);
