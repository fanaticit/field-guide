import fs from 'fs';
let code = fs.readFileSync('src/store/buildPlannerStore.ts', 'utf8');

// Add interface method
code = code.replace(
  "setSlotInkType: (slot: VisageSlot, ink: string) => void;",
  "setSlotInkType: (slot: VisageSlot, ink: string) => void;\n  setSelectedInkTypes: (inks: Record<string, string>) => void;"
);

// Add implementation
code = code.replace(
  "setSlotInkType: (slot, ink) => set((state) => ({",
  "setSelectedInkTypes: (inks) => set({ selectedInkTypes: inks }),\n  setSlotInkType: (slot, ink) => set((state) => ({"
);

fs.writeFileSync('src/store/buildPlannerStore.ts', code);
