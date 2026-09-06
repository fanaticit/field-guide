import fs from 'fs';

let code = fs.readFileSync('src/components/build-planner/VisageSelector.tsx', 'utf8');

// Add Plus to imports
code = code.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Plus } from 'lucide-react';");

// Add filterInk state
code = code.replace("const [useCollectionOnly, setUseCollectionOnly] = useState(false);", "const [useCollectionOnly, setUseCollectionOnly] = useState(false);\n  const [filterInk, setFilterInk] = useState<string | null>(null);");

// Clear filterInk when manually opening
code = code.replace("setOpenSlot(openSlot === slot ? null : slot); setInkPickSlot(null);", "setOpenSlot(openSlot === slot ? null : slot); setInkPickSlot(null); setFilterInk(null);");

// Filter by filterInk in popover
code = code.replace("const filtered = visages?.filter(v => {", "const filtered = visages?.filter(v => {\n                if (filterInk && !v.ink_types.includes(filterInk)) return false;");

// setSlotInkType when adding
code = code.replace(
  "onClick={() => { handleVisageChange(slot, v.id); setOpenSlot(null); }}",
  "onClick={() => { handleVisageChange(slot, v.id); if (filterInk && v.ink_types.includes(filterInk)) setSlotInkType(slot, filterInk); setOpenSlot(null); setFilterInk(null); }}"
);

// Add filter indicator in popover header
const headerTarget = `<span className="text-xs font-bold text-mh-slate-300">Select Visage</span>`;
const headerReplacement = `<div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-mh-slate-300">Select Visage</span>
                {filterInk && (
                  <div className="flex items-center gap-1 bg-mh-slate-800 px-1.5 py-0.5 rounded border border-mh-slate-700">
                    <span className="text-[9px] font-bold text-mh-slate-400">{getInkConfig(filterInk).shortName} Only</span>
                    <button onClick={() => setFilterInk(null)} className="ml-0.5 text-mh-slate-500 hover:text-red-400 leading-none pb-0.5">&times;</button>
                  </div>
                )}
              </div>`;
code = code.replace(headerTarget, headerReplacement);

// Add Plus button in activeInks map
const inkLabelTarget = `<span className={\`text-xs font-bold shrink-0 \${c.text}\`}>{c.name}</span>`;
const inkLabelReplacement = `<span className={\`text-xs font-bold shrink-0 \${c.text}\`}>{c.name}</span>
                  {/* Plus button to add card for this ink */}
                  {(() => {
                    const firstEmptySlot = [2, 3, 4, 5].find(s => !slots.find(x => x.slot === s)?.card);
                    if (!firstEmptySlot) return null;
                    return (
                      <button
                        onClick={() => {
                          setOpenSlot(firstEmptySlot as VisageSlot);
                          setFilterInk(ink);
                          setInkPickSlot(null);
                        }}
                        title={\`Add \${c.name} card\`}
                        className="w-4 h-4 flex items-center justify-center rounded-full bg-mh-slate-700/50 hover:bg-mh-slate-600 text-mh-slate-400 hover:text-white transition-colors"
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    );
                  })()}`;
code = code.replace(inkLabelTarget, inkLabelReplacement);

fs.writeFileSync('src/components/build-planner/VisageSelector.tsx', code);
