import fs from 'fs';
let code = fs.readFileSync('src/store/buildPlannerStore.ts', 'utf8');

// Add to interface
code = code.replace(
  "is_published: boolean;",
  "is_published: boolean;\n  hoveredSkillId: string | null;"
);
code = code.replace(
  "resetBuild: () => void;",
  "resetBuild: () => void;\n  setHoveredSkillId: (id: string | null) => void;"
);

// Add to initial state
code = code.replace(
  "is_published: false,",
  "is_published: false,\n  hoveredSkillId: null,"
);

// Add setter
code = code.replace(
  "resetBuild: () => set(initialState),",
  "resetBuild: () => set(initialState),\n  setHoveredSkillId: (id) => set({ hoveredSkillId: id }),"
);

fs.writeFileSync('src/store/buildPlannerStore.ts', code);
