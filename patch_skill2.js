import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/SkillSummaryPanel.tsx', 'utf8');

// Add hoveredSkillId state from store
code = code.replace(
  "const { getActiveSkills } = useBuildPlannerStore();",
  "const { getActiveSkills, hoveredSkillId, setHoveredSkillId } = useBuildPlannerStore();"
);

// Add relative positioning, onMouse events, and tooltip UI to the row
const rowRegex = /<div key=\{skill\.id\} className=\{\`p-2\.5 rounded-lg border flex items-center justify-between \$\{cfg\.bg\} \$\{cfg\.border\}\`\}>/g;
const replacement = `<div 
                key={skill.id} 
                className={\`p-2.5 rounded-lg border flex items-center justify-between relative cursor-default transition-all \${hoveredSkillId === skill.id ? 'ring-2 ring-rarity-3/50 ' + cfg.bg : cfg.bg} \${cfg.border}\`}
                onMouseEnter={() => setHoveredSkillId(skill.id)}
                onMouseLeave={() => setHoveredSkillId(null)}
              >
                {/* Tooltip */}
                {hoveredSkillId === skill.id && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-50 pointer-events-none flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-rarity-3 uppercase tracking-wider mb-1">Skill Description</span>
                    <span className="text-xs text-mh-slate-200 leading-snug">
                      {skillDef?.description || 'No description available for this skill.'}
                    </span>
                  </div>
                )}`;

code = code.replace(rowRegex, replacement);

fs.writeFileSync('src/components/build-planner/SkillSummaryPanel.tsx', code);
