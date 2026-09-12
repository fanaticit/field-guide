import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/EquipmentSelector.tsx', 'utf8');

// Add hoveredSkillId to store destructured variables
code = code.replace(
  "const { adventurer, weaponType, weapon, setWeapon, helm, chest, gloves, waist, greaves, setArmour } = useBuildPlannerStore();",
  "const { adventurer, weaponType, weapon, setWeapon, helm, chest, gloves, waist, greaves, setArmour, hoveredSkillId } = useBuildPlannerStore();"
);

// Add isHighlighted to props interface
code = code.replace(
  "isLoading?: boolean;",
  "isLoading?: boolean;\n  isHighlighted?: boolean;"
);

// Add to component destructure
code = code.replace(
  "label, items, selectedId, selectedImage, placeholderIcon, placeholder, isLoading, onChange,",
  "label, items, selectedId, selectedImage, placeholderIcon, placeholder, isLoading, isHighlighted, onChange,"
);

// Add glow styling to the dropdown button container if highlighted
const oldButton = 'className="w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border border-mh-slate-700 rounded-lg p-2 px-3 transition-colors text-left h-[50px]"';
const newButton = `className={\`w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border rounded-lg p-2 px-3 transition-colors text-left h-[50px] \${isHighlighted ? 'border-rarity-3 ring-1 ring-rarity-3/50 bg-rarity-3/10 shadow-[0_0_15px_rgba(255,215,0,0.15)]' : 'border-mh-slate-700'}\`}`;
code = code.replace(oldButton, newButton);

// Pass the prop from the armour mapping
const armourDropdownRegex = `<SearchableDropdown
                key={slot}
                label={slotLabel}`;
const armourDropdownNew = `<SearchableDropdown
                key={slot}
                label={slotLabel}
                isHighlighted={hoveredSkillId ? current?.skills?.some(s => s.skill_id === hoveredSkillId || (s as any).skillId === hoveredSkillId) : false}`;
code = code.replace(armourDropdownRegex, armourDropdownNew);
code = code.replace(armourDropdownRegex, armourDropdownNew);
code = code.replace(armourDropdownRegex, armourDropdownNew); // wait, it might be in a loop!

fs.writeFileSync('src/components/build-planner/EquipmentSelector.tsx', code);
