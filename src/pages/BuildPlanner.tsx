import { Shield, Save, Copy, ArrowLeft, ThumbsUp, RotateCcw, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBuildPlannerStore, type WeaponType } from '../store/buildPlannerStore';
import { HeroBuddySelector } from '../components/build-planner/HeroBuddySelector';
import { EquipmentSelector } from '../components/build-planner/EquipmentSelector';
import { VisageSelector } from '../components/build-planner/VisageSelector';
import { SkillSummaryPanel } from '../components/build-planner/SkillSummaryPanel';
import { supabase } from '../lib/supabase';
import { getInkConfig } from '../data/schemas/visage';
import { InkIconComponent } from './investigation-notes/VisageCard';
import { FALLBACK_MONSTER_ICONS } from '../types/armory';

export default function BuildPlanner() {
  const { user } = useAuthStore();
  const store = useBuildPlannerStore();
  const { buildId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(!!buildId);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isUpvoteAnimating, setIsUpvoteAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);

  // Selection Feedback Toast
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFeedback = (message: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setSelectionFeedback(message);
    feedbackTimeoutRef.current = setTimeout(() => {
      setSelectionFeedback(null);
    }, 2200);
  };

  // Queries for live preview icons
  const { data: weaponTypes } = useQuery({
    queryKey: ['weapon_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('weapon_types').select('*').eq('is_active', true);
      if (error) throw error;
      return data as WeaponType[];
    }
  });

  const { data: monsters } = useQuery({
    queryKey: ['monsters_lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('monsters').select('id, name, icon');
      if (error) throw error;
      return data;
    }
  });

  const activeWeaponType = store.adventurer?.is_default
    ? store.weaponType
    : weaponTypes?.find(wt => wt.id === store.adventurer?.allowed_weapon_types?.[0]);

  // Track previous selections for feedback
  const prevSelectionsRef = useRef({
    adv: store.adventurer?.id,
    buddy: store.buddy?.id,
    wep: store.weapon?.id,
    helm: store.helm?.id,
    chest: store.chest?.id,
    gloves: store.gloves?.id,
    waist: store.waist?.id,
    greaves: store.greaves?.id,
    coreVisage: store.coreVisage?.id,
  });

  useEffect(() => {
    const prev = prevSelectionsRef.current;
    if (store.adventurer && store.adventurer.id !== prev.adv) {
      triggerFeedback(`Equipped Adventurer: ${store.adventurer.name}`);
    } else if (store.buddy && store.buddy.id !== prev.buddy) {
      triggerFeedback(`Equipped Buddy: ${store.buddy.name}`);
    } else if (store.weapon && store.weapon.id !== prev.wep) {
      triggerFeedback(`Equipped Weapon: ${store.weapon.name}`);
    } else if (store.helm && store.helm.id !== prev.helm) {
      triggerFeedback(`Equipped Helm: ${store.helm.set_name || 'Helm'}`);
    } else if (store.chest && store.chest.id !== prev.chest) {
      triggerFeedback(`Equipped Chest: ${store.chest.set_name || 'Chest'}`);
    } else if (store.gloves && store.gloves.id !== prev.gloves) {
      triggerFeedback(`Equipped Gloves: ${store.gloves.set_name || 'Gloves'}`);
    } else if (store.waist && store.waist.id !== prev.waist) {
      triggerFeedback(`Equipped Waist: ${store.waist.set_name || 'Waist'}`);
    } else if (store.greaves && store.greaves.id !== prev.greaves) {
      triggerFeedback(`Equipped Greaves: ${store.greaves.set_name || 'Greaves'}`);
    } else if (store.coreVisage && store.coreVisage.id !== prev.coreVisage) {
      triggerFeedback(`Equipped Core Visage: ${store.coreVisage.name}`);
    }

    prevSelectionsRef.current = {
      adv: store.adventurer?.id,
      buddy: store.buddy?.id,
      wep: store.weapon?.id,
      helm: store.helm?.id,
      chest: store.chest?.id,
      gloves: store.gloves?.id,
      waist: store.waist?.id,
      greaves: store.greaves?.id,
      coreVisage: store.coreVisage?.id,
    };
  }, [
    store.adventurer,
    store.buddy,
    store.weapon,
    store.helm,
    store.chest,
    store.gloves,
    store.waist,
    store.greaves,
    store.coreVisage,
  ]);

  // Check if current user/device already upvoted this build
  useEffect(() => {
    if (store.buildId) {
      const voted = localStorage.getItem(`mho_build_upvoted_${store.buildId}`) === 'true';
      setHasUpvoted(voted);
    } else {
      setHasUpvoted(false);
    }
  }, [store.buildId]);

  // Load build if buildId is present
  useEffect(() => {
    if (!buildId) {
      // If we navigate from /armory/planner/123 to /armory/planner, reset the store
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
          if (/<!-- role:support -->/.test(desc)) {
            role = 'support';
            desc = desc.replace(/(?:\r?\n\r?\n)?<!-- role:support -->/, '');
          }
          let savedInks: Record<string, string> = {};
          const inkMatch = desc.match(/(?:\r?\n\r?\n)?<!-- inks:(.*?) -->/);
          if (inkMatch) {
            try {
              savedInks = JSON.parse(inkMatch[1]);
              desc = desc.replace(inkMatch[0], '');
            } catch (e) {
              console.error('Failed to parse saved inks', e);
            }
          }
          store.setDescription(desc);
          store.setBuildRole(role as 'main' | 'support');
          
          store.setAuthorId(data.author_id);
          store.setIsPublished(data.is_published);
          store.setUpvotes(data.upvotes || 0);
          
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
          
          if (Object.keys(savedInks).length > 0) {
            // Because setVisage overrides the inks with auto-selection, we must apply saved inks after
            store.setSelectedInkTypes(savedInks);
          }
        }
      } catch (err: any) {
        console.error('Failed to load build:', err);
        alert('Failed to load build. It may have been deleted or is private.');
        navigate('/armory/planner');
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
      titleInputRef.current?.focus();
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
    const activeInks = Object.entries(store.selectedInkTypes).reduce((acc, [k, v]) => {
      if (v) acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    if (Object.keys(activeInks).length > 0) {
      finalDesc += `\n\n<!-- inks:${JSON.stringify(activeInks)} -->`;
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

    setIsSaving(true);
    try {
      if (store.buildId && !asNew) {
        const { error } = await supabase.from('mho_builds').update(buildData).eq('id', store.buildId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['mho_builds_list'] });
        setIsJustSaved(true);
        triggerFeedback('Changes saved successfully!');
        setTimeout(() => setIsJustSaved(false), 2500);
      } else {
        const { data, error } = await supabase.from('mho_builds').insert(buildData).select('id').single();
        if (error) throw error;
        if (data) {
          store.setBuildId(data.id);
          store.setAuthorId(user.id);
          store.setUpvotes(0);
          queryClient.invalidateQueries({ queryKey: ['mho_builds_list'] });
          setIsJustSaved(true);
          triggerFeedback('Build created and saved!');
          setTimeout(() => setIsJustSaved(false), 2500);
          navigate(`/armory/planner/${data.id}`, { replace: true });
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save build: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpvote = async () => {
    if (!store.buildId || hasUpvoted || isVoting) return;

    setIsVoting(true);
    setIsUpvoteAnimating(true);
    try {
      const { error } = await supabase.rpc('vote_on_mho_build', {
        p_build_id: store.buildId,
        p_vote_type: 'up',
      });
      if (error) throw error;

      store.setUpvotes(store.upvotes + 1);
      setHasUpvoted(true);
      localStorage.setItem(`mho_build_upvoted_${store.buildId}`, 'true');
      queryClient.invalidateQueries({ queryKey: ['mho_builds_list'] });
      triggerFeedback('Upvoted build! +1');
    } catch (err: any) {
      console.error('Failed to upvote build:', err);
      alert('Failed to register upvote. Please try again.');
    } finally {
      setIsVoting(false);
      setTimeout(() => setIsUpvoteAnimating(false), 1200);
    }
  };

  const handleClone = () => {
    const currentTitle = store.title.trim();
    const clonedTitle = currentTitle.startsWith('Clone - ')
      ? currentTitle
      : `Clone - ${currentTitle || 'Untitled Build'}`;
    store.setTitle(clonedTitle);
    store.setBuildId(null);
    store.setAuthorId(user?.id || null);
    store.setUpvotes(0);
    setHasUpvoted(false);
    navigate('/armory/planner', { replace: true });
    triggerFeedback('Cloned build. Edit title & save when ready!');
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 80);
  };

  const handleClearStartNew = () => {
    store.resetBuild();
    setHasUpvoted(false);
    navigate('/armory/planner', { replace: true });
    triggerFeedback('Started new build. Enter a title to begin!');
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 80);
  };

  const isAuthor = user && store.author_id === user.id;
  const isSavedBuild = !!store.buildId;

  // Equipment slots configuration for live loadout overview
  const equipmentSlots = [
    { id: 'helm', name: 'Helm', short: 'H', piece: store.helm, icon: store.helm?.image || monsters?.find(m => m.id === store.helm?.monster_id)?.icon || FALLBACK_MONSTER_ICONS[store.helm?.monster_id || ''] },
    { id: 'chest', name: 'Chest', short: 'C', piece: store.chest, icon: store.chest?.image || monsters?.find(m => m.id === store.chest?.monster_id)?.icon || FALLBACK_MONSTER_ICONS[store.chest?.monster_id || ''] },
    { id: 'gloves', name: 'Gloves', short: 'G', piece: store.gloves, icon: store.gloves?.image || monsters?.find(m => m.id === store.gloves?.monster_id)?.icon || FALLBACK_MONSTER_ICONS[store.gloves?.monster_id || ''] },
    { id: 'waist', name: 'Waist', short: 'W', piece: store.waist, icon: store.waist?.image || monsters?.find(m => m.id === store.waist?.monster_id)?.icon || FALLBACK_MONSTER_ICONS[store.waist?.monster_id || ''] },
    { id: 'greaves', name: 'Greaves', short: 'G', piece: store.greaves, icon: store.greaves?.image || monsters?.find(m => m.id === store.greaves?.monster_id)?.icon || FALLBACK_MONSTER_ICONS[store.greaves?.monster_id || ''] },
  ];

  const equippedVisagesCount = [
    store.coreVisage,
    store.visage2,
    store.visage3,
    store.visage4,
    store.visage5,
  ].filter(Boolean).length;
  const totalVisagePts = store.getTotalVisagePoints();

  // Compute highest level ink (including blended tie)
  const currentInks = Object.values(store.selectedInkTypes).filter(Boolean);
  const inkCounts: Record<string, number> = {};
  currentInks.forEach(ink => {
    inkCounts[ink] = (inkCounts[ink] || 0) + 1;
  });
  let maxCount = 0;
  for (const count of Object.values(inkCounts)) {
    if (count > maxCount) maxCount = count;
  }
  const topInks = maxCount > 0 ? Object.keys(inkCounts).filter(k => inkCounts[k] === maxCount) : [];

  let highestInkRender = null;
  if (topInks.length === 1) {
    const cfg = getInkConfig(topInks[0]);
    highestInkRender = (
      <div
        title={`${cfg.name} (${maxCount} pieces)`}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center border relative shadow-sm ${cfg.bg} ${cfg.border}`}
      >
        <InkIconComponent iconName={cfg.iconName} size={13} className={cfg.text} />
      </div>
    );
  } else if (topInks.length > 1) {
    const cfgA = getInkConfig(topInks[0]);
    const cfgB = getInkConfig(topInks[1]);
    highestInkRender = (
      <div
        title={`Tied Inks: ${cfgA.name} & ${cfgB.name} (${maxCount} pieces each)`}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-md relative overflow-hidden border border-mh-slate-700/90 shadow-sm shrink-0"
        style={{
          background: `linear-gradient(135deg, ${cfgA.glowColor.replace('0.4', '0.25')} 0%, ${cfgA.glowColor.replace('0.4', '0.25')} 48%, rgba(100, 116, 139, 0.5) 50%, ${cfgB.glowColor.replace('0.4', '0.25')} 52%, ${cfgB.glowColor.replace('0.4', '0.25')} 100%)`,
        }}
      >
        <div className="absolute top-0.5 left-0.5">
          <InkIconComponent iconName={cfgA.iconName} size={9} className={cfgA.text} />
        </div>
        <div className="absolute bottom-0.5 right-0.5">
          <InkIconComponent iconName={cfgB.iconName} size={9} className={cfgB.text} />
        </div>
      </div>
    );
  } else {
    highestInkRender = (
      <div
        title="No visages or inks active"
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center border border-dashed border-mh-slate-750 bg-mh-slate-850/30"
      >
        <Sparkles size={11} className="text-mh-slate-600" />
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-mh-slate-400">Loading build...</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      
      {/* 1. Very Top Row: Back to Armory (Left), Centered Title (Center), Action Buttons (Right) */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4 pb-2 border-b border-mh-slate-800/80">
        {/* Left: Back to Armory */}
        <div className="flex items-center">
          <Link
            to="/armory"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-mh-slate-300 hover:text-white transition-colors py-1.5 px-2.5 sm:px-3 rounded-lg bg-mh-slate-800 hover:bg-mh-slate-700 border border-mh-slate-700 shadow-sm shrink-0"
            title="Back to Hunter's Armory"
          >
            <ArrowLeft size={14} className="text-mh-slate-400 group-hover:text-white transition-colors" />
            <span className="hidden sm:inline">Back to </span>
            <span>Armory</span>
          </Link>
        </div>

        {/* Center: Build Planner Badge */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-mh-slate-900/90 px-3 py-1 rounded-full border border-rarity-3/30 shadow-sm">
            <Shield size={16} className="text-rarity-3 shrink-0" />
            <span className="font-display text-xs sm:text-sm font-bold tracking-wider text-rarity-3 uppercase whitespace-nowrap">
              Build Planner
            </span>
          </div>
        </div>

        {/* Right: Action Buttons (Upvote, Save Changes, Clone, Clear/Start New) */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
          {/* Upvote Button (only if saved build) */}
          {isSavedBuild && (
            <button
              type="button"
              onClick={handleUpvote}
              disabled={hasUpvoted || isVoting}
              className={`relative whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 transition-all font-medium border shadow-sm ${
                hasUpvoted
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 cursor-default'
                  : 'bg-mh-slate-800 hover:bg-mh-slate-700 text-mh-slate-200 border-mh-slate-700 hover:border-mh-slate-600 active:scale-95 cursor-pointer'
              }`}
              title={hasUpvoted ? 'You have upvoted this build' : 'Upvote this build'}
            >
              {isUpvoteAnimating && (
                <span className="absolute -top-3.5 right-1 text-xs font-black text-amber-300 pointer-events-none animate-bounce drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                  +1
                </span>
              )}
              <ThumbsUp
                size={14}
                className={`transition-transform duration-300 ${
                  isUpvoteAnimating ? 'scale-125 rotate-[-12deg]' : ''
                } ${hasUpvoted ? 'text-amber-400 fill-amber-400/40' : 'text-mh-slate-400'}`}
              />
              <span className="hidden md:inline">{hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[11px] font-bold transition-all duration-300 ${
                  isUpvoteAnimating ? 'scale-125 text-amber-200 bg-amber-500/40' : ''
                } ${
                  hasUpvoted
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                    : 'bg-mh-slate-900/80 text-rarity-3 border border-mh-slate-750'
                }`}
              >
                {store.upvotes}
              </span>
            </button>
          )}

          {/* Save Changes / Save Build (only if creator or unsaved draft) */}
          {(!isSavedBuild || isAuthor) && (
            <button
              type="button"
              onClick={() => handleSaveBuild(false)}
              disabled={isSaving}
              className={`whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3.5 flex items-center gap-1.5 rounded-lg font-bold transition-all shadow-sm ${
                isJustSaved
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-105'
                  : 'btn-mh'
              }`}
              title={isSavedBuild ? 'Save Changes' : 'Save Build'}
            >
              {isJustSaved ? (
                <CheckCircle2 size={14} className="text-emerald-400 animate-pulse" />
              ) : (
                <Save size={14} />
              )}
              <span className="hidden sm:inline">
                {isJustSaved ? 'Saved!' : isSavedBuild ? 'Save Changes' : 'Save Build'}
              </span>
            </button>
          )}

          {/* Clone Button (only if saved build) */}
          {isSavedBuild && (
            <button
              type="button"
              onClick={handleClone}
              className="btn-mh bg-mh-slate-700 hover:bg-mh-slate-600 whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 text-white shadow-none"
              title="Clone build to create a new copy"
            >
              <Copy size={14} />
              <span className="hidden sm:inline">Clone</span>
            </button>
          )}

          {/* Clear / Start New Button */}
          <button
            type="button"
            onClick={handleClearStartNew}
            className="btn-mh bg-mh-slate-800 hover:bg-mh-slate-700 text-mh-slate-300 hover:text-white border border-mh-slate-700 whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 shadow-none"
            title="Clear all selections and start a new build"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">Clear / Start New</span>
            <span className="hidden sm:inline md:hidden">New</span>
          </button>
        </div>
      </div>

      {/* 2. Second Row: Adventurer, Buddy, Title/Description & Role Toggle */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch bg-mh-slate-800/30 border border-mh-slate-800 rounded-xl p-4">
        {/* Left: Adventurer & Buddy (HeroBuddySelector) */}
        <div className="shrink-0">
          <HeroBuddySelector />
        </div>

        {/* Right: Title, Role Toggle, and Description */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between gap-3 border-b-2 border-mh-slate-700 pb-1">
            <input 
              ref={titleInputRef}
              type="text" 
              placeholder="Build Title"
              className="w-full bg-transparent border-0 font-display text-xl sm:text-2xl font-bold text-mh-slate-100 focus:border-0 focus:ring-0 px-1 py-1 placeholder-mh-slate-600 transition-colors"
              value={store.title}
              onChange={(e) => store.setTitle(e.target.value)}
            />
            {/* Build Role Toggle */}
            <div className="flex rounded-md bg-mh-slate-800 p-0.5 border border-mh-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => { store.setBuildRole('main'); triggerFeedback('Build role set to: Main'); }}
                className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  store.buildRole === 'main' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-mh-slate-500 hover:text-mh-slate-300 border border-transparent'
                }`}
              >
                Main
              </button>
              <button
                type="button"
                onClick={() => { store.setBuildRole('support'); triggerFeedback('Build role set to: Support'); }}
                className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  store.buildRole === 'support' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-mh-slate-500 hover:text-mh-slate-300 border border-transparent'
                }`}
              >
                Support
              </button>
            </div>
          </div>

          <textarea 
            placeholder="Notes or description (optional)"
            className="w-full bg-mh-slate-900 border border-mh-slate-700 rounded-lg text-sm text-mh-slate-200 focus:border-rarity-3 focus:ring-0 p-3 placeholder-mh-slate-600 resize-none h-full min-h-[90px] transition-colors"
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* 2.5 Live Loadout Overview Strip: Real-time feedback on what has been selected */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-mh-slate-850/80 border border-mh-slate-750/70 rounded-xl px-4 py-2.5 shadow-md">
        {/* Left: Loadout Trio (Adventurer -> Buddy -> Weapon) */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 flex items-center gap-1">
            <Sparkles size={12} className="text-rarity-3" />
            <span>Loadout:</span>
          </span>

          <div className="flex items-center gap-1.5">
            {/* Adventurer Icon / Placeholder */}
            <div
              className="w-8 h-8 rounded-lg bg-mh-slate-800 border border-mh-slate-700 overflow-hidden flex items-center justify-center shrink-0"
              title={`Hunter: ${store.adventurer?.name || 'None selected'}`}
            >
              {store.adventurer?.image ? (
                <img src={store.adventurer.image} alt={store.adventurer.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-mh-slate-500 font-bold">Adv</span>
              )}
            </div>

            {/* Buddy Icon / Placeholder */}
            <div
              className="w-6 h-6 rounded-md bg-mh-slate-800 border border-mh-slate-700 overflow-hidden flex items-center justify-center shrink-0"
              title={`Buddy: ${store.buddy?.name || 'None selected'}`}
            >
              {store.buddy?.image ? (
                <img src={store.buddy.image} alt={store.buddy.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[8px] text-mh-slate-500">Bud</span>
              )}
            </div>

            {/* Weapon Type & Weapon Name */}
            <div className="flex items-center gap-1 bg-mh-slate-900/90 px-2 py-1 rounded-md border border-mh-slate-750">
              {activeWeaponType?.icon && (
                <img src={activeWeaponType.icon} alt={activeWeaponType.name} className="w-4 h-4 object-contain opacity-80" />
              )}
              <span className="text-xs font-semibold text-mh-slate-200 truncate max-w-[120px] sm:max-w-[160px]">
                {store.weapon?.name || activeWeaponType?.name || 'No Weapon'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Equipment Monster Showcase (5 Armour pieces) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-500 hidden lg:inline mr-1">
            Armour:
          </span>
          {equipmentSlots.map((slot) => {
            const isEquipped = !!slot.piece;
            return (
              <div
                key={slot.id}
                title={`${slot.name}: ${slot.piece?.set_name || 'Empty'}`}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center overflow-hidden transition-all shrink-0 ${
                  isEquipped
                    ? 'bg-mh-slate-800 border border-rarity-3/60 shadow-sm'
                    : 'bg-mh-slate-900/40 border border-dashed border-mh-slate-700 text-mh-slate-600'
                }`}
              >
                {slot.icon ? (
                  <img src={slot.icon} alt={slot.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold uppercase">{slot.short}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Visages & Ink Showcase */}
        <div className="flex items-center gap-2">
          {/* Visage count & points */}
          <div className="flex items-center gap-1 text-xs text-mh-slate-300 bg-mh-slate-900/90 px-2.5 py-1 rounded-md border border-mh-slate-750">
            <Layers size={13} className="text-purple-400" />
            <span className="font-bold text-white">{equippedVisagesCount}/5</span>
            <span className="text-[10px] text-mh-slate-400">({totalVisagePts} pts)</span>
          </div>

          {/* Highest Ink Icon / Blend */}
          {highestInkRender}
        </div>
      </div>

      {/* 3. Main Layout (3 Columns) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* Left Column: Equipment */}
        <div className="w-full lg:w-[40%]">
          <EquipmentSelector />
        </div>

        {/* Middle Column: Skills */}
        <div className="w-full lg:w-[30%]">
          <SkillSummaryPanel />
        </div>

        {/* Right Column: Visage */}
        <div className="w-full lg:w-[30%]">
          <VisageSelector />
        </div>
      </div>

      {/* Selection Feedback Notification Toast */}
      {selectionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-mh-slate-850/95 border border-rarity-3/50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{selectionFeedback}</span>
        </div>
      )}
    </div>
  );
}
