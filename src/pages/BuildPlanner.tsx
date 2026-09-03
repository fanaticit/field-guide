import { Shield, Save } from 'lucide-react';
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

  const handleSaveBuild = async () => {
    if (!user) {
      alert('Please sign in to save a build.');
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

    const title = prompt('Enter a title for this build:');
    if (!title) return;

    const buildData = {
      author_id: user.id,
      title,
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
      if (store.buildId) {
        const { error } = await supabase.from('mho_builds').update(buildData).eq('id', store.buildId);
        if (error) throw error;
        alert('Build updated successfully!');
      } else {
        const { data, error } = await supabase.from('mho_builds').insert(buildData).select('id').single();
        if (error) throw error;
        if (data) store.setBuildId(data.id);
        alert('Build saved successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save build: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-rarity-3" />
            <span className="rarity-badge rarity-3 text-[10px] py-0.5 px-2">Build Planner</span>
          </div>
          <h1 className="font-display text-xl font-bold text-mh-slate-100 lg:text-2xl">
            Loadout Workshop (MHO)
          </h1>
          <p className="text-xs text-mh-slate-500">
            Plan your weapon, armour, and companion combinations.
          </p>
        </div>
        
        <button 
          onClick={handleSaveBuild}
          className="btn-mh whitespace-nowrap self-start sm:self-auto text-sm py-1.5 px-4"
        >
          <Save size={14} />
          Save Build
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
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
