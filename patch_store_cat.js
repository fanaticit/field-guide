import fs from 'fs';
let code = fs.readFileSync('src/store/buildPlannerStore.ts', 'utf8');

// Add hoveredSkillCategory to interface
code = code.replace(
  "hoveredSkillId: string | null;",
  "hoveredSkillId: string | null;\n  hoveredSkillCategory: string | null;"
);

// Add to resetBuild and initialState
code = code.replace(
  "hoveredSkillId: null,",
  "hoveredSkillId: null,\n  hoveredSkillCategory: null,"
);

// Add to setter
code = code.replace(
  "setHoveredSkillId: (id: string | null) => void;",
  "setHoveredSkillId: (id: string | null, category?: string | null) => void;"
);

code = code.replace(
  "setHoveredSkillId: (id) => set({ hoveredSkillId: id }),",
  "setHoveredSkillId: (id, category = null) => set({ hoveredSkillId: id, hoveredSkillCategory: category }),"
);

fs.writeFileSync('src/store/buildPlannerStore.ts', code);
