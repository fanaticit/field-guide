import fs from 'fs';

let code = fs.readFileSync('src/components/build-planner/VisageSelector.tsx', 'utf8');

// Remove redundant setSearchQuery
code = code.replace(
  "setSearchQuery(''); setFilterInk(null); setSearchQuery(''); }}",
  "setFilterInk(null); setSearchQuery(''); }}"
);

// Add setSearchQuery to Plus button
const plusTarget = `setOpenSlot(firstEmptySlot as VisageSlot);
                          setFilterInk(ink);
                          setInkPickSlot(null);
                        }}`;
                        
const plusReplacement = `setOpenSlot(firstEmptySlot as VisageSlot);
                          setFilterInk(ink);
                          setSearchQuery('');
                          setInkPickSlot(null);
                        }}`;

code = code.replace(plusTarget, plusReplacement);

fs.writeFileSync('src/components/build-planner/VisageSelector.tsx', code);
