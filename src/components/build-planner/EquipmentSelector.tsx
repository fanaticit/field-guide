import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, type Weapon, type ArmourPiece } from '../../store/buildPlannerStore';

export function EquipmentSelector() {
  const { adventurer, weaponType, weapon, setWeapon, helm, chest, gloves, waist, greaves, setArmour } = useBuildPlannerStore();

  const isReady = !!adventurer;

  const activeWeaponTypeId = adventurer?.is_default 
    ? (weaponType?.id || weapon?.weapon_type_id) 
    : adventurer?.allowed_weapon_types?.[0];

  const { data: weapons, isLoading: isWepLoading } = useQuery({
    queryKey: ['weapons', activeWeaponTypeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('weapons').select('*').eq('weapon_type_id', activeWeaponTypeId).eq('is_active', true);
      if (error) throw error;
      return data as Weapon[];
    },
    enabled: !!activeWeaponTypeId
  });

  const { data: armours, isLoading: isArmourLoading } = useQuery({
    queryKey: ['armours'],
    queryFn: async () => {
      const { data, error } = await supabase.from('armour_pieces').select('*').eq('game', 'mho').eq('is_active', true);
      if (error) throw error;
      return data as ArmourPiece[];
    }
  });

  if (!isReady) return null;

  const helms = armours?.filter(a => a.slot === 'helm') || [];
  const chests = armours?.filter(a => a.slot === 'chest') || [];
  const glovesList = armours?.filter(a => a.slot === 'gloves') || [];
  const waists = armours?.filter(a => a.slot === 'waist') || [];
  const greavesList = armours?.filter(a => a.slot === 'greaves') || [];

  const renderDropdown = (
    label: string, 
    items: any[], 
    selected: any, 
    onChange: (val: any) => void, 
    isLoading: boolean
  ) => {
    return (
      <div className="flex flex-col gap-2 bg-mh-slate-800/50 p-3 rounded-lg border border-mh-slate-800">
        <label className="text-sm font-semibold text-mh-slate-400">{label}</label>
        
        <div className="flex items-center gap-3">
          {/* Display Icon if available */}
          <div className="w-12 h-12 rounded bg-mh-slate-900 border border-mh-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {selected?.image ? (
              <img src={selected.image} alt={selected.name || selected.set_name} className="w-full h-full object-contain p-1" />
            ) : selected ? (
              <div className="text-xs text-mh-slate-600 font-bold">No Img</div>
            ) : null}
          </div>

          <div className="flex-1">
            {isLoading ? <p className="text-sm">Loading...</p> : (
              <select 
                className="w-full p-2 rounded bg-mh-slate-800 border border-mh-slate-700 text-mh-slate-200"
                value={selected?.id || ''} 
                onChange={(e) => onChange(items.find(i => i.id === e.target.value) || null)}
              >
                <option value="">Select {label}</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.set_name ? `${i.set_name} ${label}` : (i.name || i.id)}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-mh-slate-800/30 border border-mh-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="font-display text-base font-bold text-mh-slate-200">Equipment</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderDropdown('Weapon', weapons || [], weapon, setWeapon, isWepLoading)}
        {renderDropdown('Helm', helms, helm, (val) => setArmour('helm', val), isArmourLoading)}
        {renderDropdown('Chest', chests, chest, (val) => setArmour('chest', val), isArmourLoading)}
        {renderDropdown('Gloves', glovesList, gloves, (val) => setArmour('gloves', val), isArmourLoading)}
        {renderDropdown('Waist', waists, waist, (val) => setArmour('waist', val), isArmourLoading)}
        {renderDropdown('Greaves', greavesList, greaves, (val) => setArmour('greaves', val), isArmourLoading)}
      </div>
    </div>
  );
}
