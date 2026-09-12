import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/EquipmentSelector.tsx', 'utf8');

// 1. Destructure hoveredSkillCategory
code = code.replace(
  "hoveredSkillId } = useBuildPlannerStore();",
  "hoveredSkillId, hoveredSkillCategory } = useBuildPlannerStore();"
);

// 2. Change isHighlighted to highlightClasses
code = code.replace(
  "isHighlighted?: boolean;",
  "highlightClasses?: string;"
);
code = code.replace(
  "isLoading, isHighlighted, onChange,",
  "isLoading, highlightClasses, onChange,"
);

// 3. Update the SearchableDropdown button className
const oldButton = "className={`w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border rounded-lg p-2 px-3 transition-colors text-left h-[50px] ${isHighlighted ? 'border-rarity-3 ring-1 ring-rarity-3/50 bg-rarity-3/10 shadow-[0_0_15px_rgba(255,215,0,0.15)]' : 'border-mh-slate-700'}`}";
const newButton = "className={`w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border rounded-lg p-2 px-3 transition-colors text-left h-[50px] ${highlightClasses ? highlightClasses : 'border-mh-slate-700'}`}";
code = code.replace(oldButton, newButton);

// 4. Add getHighlightClasses helper
const helperCode = `
const getHighlightClasses = (cat: string | null) => {
  if (!cat) return '';
  switch (cat) {
    case 'attack': return 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/20';
    case 'critical': return 'border-purple-500 ring-1 ring-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/20';
    case 'defense': return 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20';
    case 'survival': return 'border-orange-500 ring-1 ring-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/20';
    case 'status': return 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/20';
    case 'utility': return 'border-yellow-500 ring-1 ring-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/20';
    case 'health': return 'border-green-500 ring-1 ring-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20';
    case 'general':
    default: return 'border-mh-slate-400 ring-1 ring-mh-slate-400/50 bg-mh-slate-400/10 shadow-lg shadow-mh-slate-400/20';
  }
};
`;
// Insert helper before export function EquipmentSelector
code = code.replace("export function EquipmentSelector() {", helperCode + "\nexport function EquipmentSelector() {");

// 5. Replace isHighlighted prop with highlightClasses
code = code.replace(
  /isHighlighted=\{hoveredSkillId \? current\?\.skills\?\.some\(s => s\.id === hoveredSkillId\) : false\}/g,
  "highlightClasses={hoveredSkillId && current?.skills?.some(s => s.id === hoveredSkillId) ? getHighlightClasses(hoveredSkillCategory) : undefined}"
);

fs.writeFileSync('src/components/build-planner/EquipmentSelector.tsx', code);
