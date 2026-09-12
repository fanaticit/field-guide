import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/SkillSummaryPanel.tsx', 'utf8');

// 1. Update CATEGORY_CONFIG to include ring colors
const configRegex = /const CATEGORY_CONFIG: Record<string, \{ color: string, bg: string, border: string, icon: any \}> = \{([\s\S]*?)\};/;
const newConfig = `const CATEGORY_CONFIG: Record<string, { color: string, bg: string, border: string, ring: string, icon: any }> = {
  attack: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', ring: 'ring-red-500/50', icon: Sword },
  critical: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', ring: 'ring-purple-500/50', icon: Crosshair },
  defense: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'ring-blue-500/50', icon: Shield },
  survival: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', ring: 'ring-orange-500/50', icon: Heart },
  general: { color: 'text-mh-slate-300', bg: 'bg-mh-slate-600/10', border: 'border-mh-slate-600/20', ring: 'ring-mh-slate-400/50', icon: Star },
  status: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'ring-emerald-500/50', icon: Skull },
  utility: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', ring: 'ring-yellow-500/50', icon: Wrench },
  health: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', ring: 'ring-green-500/50', icon: Heart },
};`;
code = code.replace(configRegex, newConfig);

// 2. Update the hovered row className to use cfg.ring instead of ring-rarity-3/50
const rowClassName = "className={`p-2.5 rounded-lg border flex items-center justify-between relative cursor-default transition-all ${hoveredSkillId === skill.id ? 'ring-2 ring-rarity-3/50 ' + cfg.bg : cfg.bg} ${cfg.border}`}";
const newRowClassName = "className={`p-2.5 rounded-lg border flex items-center justify-between relative cursor-default transition-all ${hoveredSkillId === skill.id ? 'ring-2 ' + cfg.ring + ' ' + cfg.bg : cfg.bg} ${cfg.border}`}";
code = code.replace(rowClassName, newRowClassName);

// 3. Remove "Skill Description" title from the tooltip
const tooltipRegex = /<span className="text-\[10px\] font-bold text-rarity-3 uppercase tracking-wider mb-1">Skill Description<\/span>/;
code = code.replace(tooltipRegex, "");

fs.writeFileSync('src/components/build-planner/SkillSummaryPanel.tsx', code);
