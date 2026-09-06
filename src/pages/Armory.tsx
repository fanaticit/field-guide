import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Armory() {
  const { data: builds, isLoading } = useQuery({
    queryKey: ['mho_builds_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mho_builds')
        .select(`
          id,
          title,
          description,
          upvotes,
          downvotes,
          created_at,
          author_id,
          author:profiles(username),
          adventurer:adventurers(image)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={16} className="text-rarity-5" />
        <span className="rarity-badge rarity-5 text-[10px] py-0.5 px-2">Hunter's Armory</span>
      </div>
      <h1 className="font-display text-xl font-bold text-mh-slate-100 lg:text-2xl">
        Community Builds
      </h1>
      <p className="text-xs text-mh-slate-500 mb-4">
        Browse builds shared by other hunters.
      </p>

      {isLoading ? (
        <p className="text-sm text-mh-slate-500">Loading builds...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {builds?.map((build: any) => {
            let desc = build.description || '';
            let role = 'main';
            if (desc.includes('\n\n<!-- role:support -->')) {
              role = 'support';
              desc = desc.replace('\n\n<!-- role:support -->', '');
            }

            return (
              <Link 
                key={build.id} 
                to={`/build-planner/${build.id}`}
                className="mh-card hover:border-rarity-5 transition-colors group cursor-pointer flex flex-col"
              >
                <div className="flex gap-4 items-start">
                  {/* Adventurer Profile */}
                  <div className="w-12 h-12 rounded-lg bg-mh-slate-800 border border-mh-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {build.adventurer?.image ? (
                      <img src={build.adventurer.image} alt="Adventurer" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-mh-slate-600 font-bold uppercase">Hero</span>
                    )}
                  </div>
                  
                  {/* Title & Role */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {role === 'main' ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase shrink-0">Main</span>
                      ) : (
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase shrink-0">Support</span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-lg text-mh-slate-200 group-hover:text-white transition-colors truncate">{build.title}</h3>
                    <p className="text-xs text-mh-slate-400 truncate">by {build.author?.username || 'Unknown Hunter'}</p>
                  </div>
                </div>

                {desc && (
                  <p className="text-sm text-mh-slate-300 mt-4 line-clamp-2">{desc}</p>
                )}
                
                <div className="flex gap-4 mt-auto pt-4 border-t border-mh-slate-700/50">
                  <span className="text-xs font-bold text-rarity-3">↑ {build.upvotes}</span>
                  <span className="text-xs text-mh-slate-500">{new Date(build.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            );
          })}
          
          {builds?.length === 0 && (
            <p className="text-sm text-mh-slate-500">No builds have been published yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
