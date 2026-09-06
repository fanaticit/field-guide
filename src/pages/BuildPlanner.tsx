import { Shield, Save, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBuildPlannerStore } from '../store/buildPlannerStore';
import { HeroBuddySelector } from '../components/build-planner/HeroBuddySelector';
import { EquipmentSelector } from '../components/build-planner/EquipmentSelector';
import { VisageSelector } from '../components/build-planner/VisageSelector';
import { SkillSummaryPanel } from '../components/build-planner/SkillSummaryPanel';
import { supabase } from '../lib/supabase';

export default function BuildPlanner() {
  const { user } = useAuthStore();
  const store = useBuildPlannerStore();
  const { buildId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!!buildId);

  // Load build if buildId is present
  useEffect(() => {
    if (!buildId) {
      // If we navigate from /build-planner/123 to /build-planner, reset the store
      if (store.buildId) store.resetBuild();
      return;
    }

    async function fetchBuild() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('mho_builds')
          .select(`
            *,
            adventurer:adventurers(*),
            weapon_type:weapon_types(*),
            weapon:weapons(*),
            helm:armour_pieces!mho_builds_helm_piece_id_fkey(*),
            chest:armour_pieces!mho_builds_chest_piece_id_fkey(*),
            gloves:armour_pieces!mho_builds_gloves_piece_id_fkey(*),
            waist:armour_pieces!mho_builds_waist_piece_id_fkey(*),
            greaves:armour_pieces!mho_builds_greaves_piece_id_fkey(*),
            buddy:buddies(*),
            coreVisage:visages!mho_builds_core_visage_id_fkey(*),
            visage2:visages!mho_builds_visage_2_id_fkey(*),
            visage3:visages!mho_builds_visage_3_id_fkey(*),
            visage4:visages!mho_builds_visage_4_id_fkey(*),
            visage5:visages!mho_builds_visage_5_id_fkey(*)
          `)
          .eq('id', buildId)
          .single();

        if (error) throw error;
        if (data) {
          store.resetBuild();
          store.setBuildId(data.id);
          store.setTitle(data.title || '');
          
          let desc = data.description || '';
          let role = 'main';
          if (desc.includes('\n\n<!-- role:support -->')) {
            role = 'support';
            desc = desc.replace('\n\n<!-- role:support -->', '');
          }
          store.setDescription(desc);
          store.setBuildRole(role as 'main' | 'support');
          
          store.setAuthorId(data.author_id);
          store.setIsPublished(data.is_published);
          
          if (data.adventurer) store.setAdventurer(data.adventurer as any);
          if (data.weapon_type) store.setWeaponType(data.weapon_type as any);
          if (data.weapon) store.setWeapon(data.weapon as any);
          
          if (data.helm) store.setArmour('helm', data.helm as any);
          if (data.chest) store.setArmour('chest', data.chest as any);
          if (data.gloves) store.setArmour('gloves', data.gloves as any);
          if (data.waist) store.setArmour('waist', data.waist as any);
          if (data.greaves) store.setArmour('greaves', data.greaves as any);
          
          if (data.buddy) store.setBuddy(data.buddy as any);
          
          if (data.coreVisage) store.setVisage('core', data.coreVisage as any);
          if (data.visage2) store.setVisage(2, data.visage2 as any);
          if (data.visage3) store.setVisage(3, data.visage3 as any);
          if (data.visage4) store.setVisage(4, data.visage4 as any);
          if (data.visage5) store.setVisage(5, data.visage5 as any);
        }
      } catch (err: any) {
        console.error('Failed to load build:', err);
        alert('Failed to load build. It may have been deleted or is private.');
        navigate('/build-planner');
      } finally {
        setIsLoading(false);
      }
    }

    if (buildId !== store.buildId) {
      fetchBuild();
    } else {
      setIsLoading(false);
    }
  }, [buildId]);

  const handleSaveBuild = async (asNew = false) => {
    if (!user) {
      alert('Please sign in to save a build.');
      return;
    }
    if (!store.title.trim()) {
      alert('Please enter a title for your build.');
      return;
    }
    if (!store.adventurer) {
      alert('Please select an adventurer.');
      return;
    }
    if (store.adventurer.is_default && !store.weaponType) {
      alert('Please select a weapon type for the default adventurer.');
      return;
    }

    let finalDesc = store.description.trim();
    if (store.buildRole === 'support') {
      finalDesc += '\n\n<!-- role:support -->';
    }

    const buildData = {
      author_id: user.id,
      title: store.title.trim(),
      description: finalDesc || null,
      adventurer_id: store.adventurer.id,
      weapon_type_id: store.adventurer.is_default ? store.weaponType?.id : store.adventurer.allowed_weapon_types?.[0],
      weapon_id: store.weapon?.id || null,
      helm_piece_id: store.helm?.id || null,
      chest_piece_id: store.chest?.id || null,
      gloves_piece_id: store.gloves?.id || null,
      waist_piece_id: store.waist?.id || null,
      greaves_piece_id: store.greaves?.id || null,
      buddy_id: store.buddy?.id || null,
      core_visage_id: store.coreVisage?.id || null,
      visage_2_id: store.visage2?.id || null,
      visage_3_id: store.visage3?.id || null,
      visage_4_id: store.visage4?.id || null,
      visage_5_id: store.visage5?.id || null,
      is_published: true, // Auto-publish for now
    };

    try {
      if (store.buildId && !asNew) {
        const { error } = await supabase.from('mho_builds').update(buildData).eq('id', store.buildId);
        if (error) throw error;
        alert('Build updated successfully!');
      } else {
        const { data, error } = await supabase.from('mho_builds').insert(buildData).select('id').single();
        if (error) throw error;
        if (data) {
          store.setBuildId(data.id);
          store.setAuthorId(user.id);
          alert('Build saved successfully!');
          navigate(`/build-planner/${data.id}`, { replace: true });
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save build: ${err.message}`);
    }
  };

  const isAuthor = user && store.author_id === user.id;
  const isSavedBuild = !!store.buildId;

  if (isLoading) {
    return <div className="p-8 text-center text-mh-slate-400">Loading build...</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-2">
        <div className="flex flex-col w-full sm:w-2/3 gap-3">
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-rarity-3" />
              <span className="rarity-badge rarity-3 text-[10px] py-0.5 px-2">Build Planner</span>
            </div>
            
            {/* Build Role Toggle */}
            <div className="flex rounded-md bg-mh-slate-800 p-0.5 border border-mh-slate-700">
              <button
                onClick={() => store.setBuildRole('main')}
                className={`rounded px-3 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  store.buildRole === 'main' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-mh-slate-500 hover:text-mh-slate-300 border border-transparent'
                }`}
              >
                Main
              </button>
              <button
                onClick={() => store.setBuildRole('support')}
                className={`rounded px-3 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  store.buildRole === 'support' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-mh-slate-500 hover:text-mh-slate-300 border border-transparent'
                }`}
              >
                Support
              </button>
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="Build Title"
            className="w-full bg-mh-slate-900 border-0 border-b-2 border-mh-slate-700 font-display text-2xl font-bold text-mh-slate-100 focus:border-rarity-3 focus:ring-0 px-2 py-1 placeholder-mh-slate-600 transition-colors"
            value={store.title}
            onChange={(e) => store.setTitle(e.target.value)}
          />
          <textarea 
            placeholder="Notes or description (optional)"
            className="w-full bg-mh-slate-900 border border-mh-slate-700 rounded-lg text-sm text-mh-slate-200 focus:border-rarity-3 focus:ring-0 p-3 placeholder-mh-slate-600 resize-none h-20 transition-colors"
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 self-start sm:mt-8">
          {(!isSavedBuild || isAuthor) && (
            <button 
              onClick={() => handleSaveBuild(false)}
              className="btn-mh whitespace-nowrap text-sm py-2 px-4 flex items-center gap-2"
            >
              <Save size={16} />
              {isSavedBuild ? 'Update Build' : 'Save Build'}
            </button>
          )}
          {isSavedBuild && (
            <button 
              onClick={() => handleSaveBuild(true)}
              className="btn-mh bg-mh-slate-700 hover:bg-mh-slate-600 whitespace-nowrap text-sm py-2 px-4 flex items-center gap-2 text-white shadow-none"
            >
              <Copy size={16} />
              Clone as New
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start mt-2">
        {/* Left Column: Selectors */}
        <div className="flex flex-col gap-4 w-full lg:w-3/5 xl:w-2/3">
          <HeroBuddySelector />
          <EquipmentSelector />
        </div>

        {/* Right Column: Summary */}
        <div className="flex flex-col gap-4 w-full lg:w-2/5 xl:w-1/3">
          <VisageSelector />
          <SkillSummaryPanel />
        </div>
      </div>
    </div>
  );
}
