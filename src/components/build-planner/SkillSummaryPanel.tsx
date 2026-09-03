import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';

export function SkillSummaryPanel() {
  const { getActiveSkills, buddy } = useBuildPlannerStore();
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
    <div className="mh-card sticky top-6">
      <h2 className="font-display text-lg font-bold text-mh-slate-200 mb-4">Build Summary</h2>
      
      <div className="flex flex-col gap-6">
        {/* Buddy Bonus */}
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-mh-slate-400">Buddy</h3>
          {buddy ? (
            <div className="p-3 bg-mh-slate-800 rounded border border-mh-slate-700">
              <div className="font-bold text-mh-slate-200">{buddy.name}</div>
              <div className="text-sm text-mh-slate-400 mt-1">{buddy.core_passive || 'No passive effect.'}</div>
            </div>
          ) : (
            <p className="text-sm text-mh-slate-500">No buddy selected.</p>
          )}
        </div>


        {/* Equipment Skills */}
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-mh-slate-400">Equipment Skills</h3>
          {isLoading ? (
            <p className="text-sm text-mh-slate-500">Loading skills...</p>
          ) : activeSkills.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activeSkills.sort((a, b) => b.level - a.level).map(skill => {
                const skillDef = skillsData?.find((s: any) => s.id === skill.id);
                return (
                  <div key={skill.id} className="p-3 bg-mh-slate-800 rounded border border-mh-slate-700 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-mh-slate-200">{skillDef?.name || skill.id}</div>
                    </div>
                    <div className="text-rarity-3 font-bold text-lg">
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
      </div>
    </div>
  );
}
