import fs from 'fs';

let code = fs.readFileSync('src/components/build-planner/VisageSelector.tsx', 'utf8');

// 1. Add Search import
code = code.replace("import { Plus } from 'lucide-react';", "import { Plus, Search } from 'lucide-react';");

// 2. Add searchQuery state
code = code.replace(
  "const [filterInk, setFilterInk] = useState<string | null>(null);",
  "const [filterInk, setFilterInk] = useState<string | null>(null);\n  const [searchQuery, setSearchQuery] = useState('');"
);

// 3. Update query to order by sort_order
code = code.replace(
  ".select('*').eq('is_active', true);",
  ".select('*').eq('is_active', true).order('sort_order', { ascending: true });"
);

// 4. Reset searchQuery when opening manually
code = code.replace(
  "setFilterInk(null); }}",
  "setFilterInk(null); setSearchQuery(''); }}"
);
// And when clicking plus button
code = code.replace(
  "setInkPickSlot(null);",
  "setInkPickSlot(null);\n                          setSearchQuery('');"
);

// 5. Add search input and layout fix for the popover
const popoverTarget = `<div className="absolute top-[105%] left-1/2 -translate-x-1/2 w-[280px] max-h-[300px] overflow-y-auto bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 border-b border-mh-slate-800 pb-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-mh-slate-300">Select Visage</span>
                {filterInk && (
                  <div className="flex items-center gap-1 bg-mh-slate-800 px-1.5 py-0.5 rounded border border-mh-slate-700">
                    <span className="text-[9px] font-bold text-mh-slate-400">{getInkConfig(filterInk).shortName} Only</span>
                    <button onClick={() => setFilterInk(null)} className="ml-0.5 text-mh-slate-500 hover:text-red-400 leading-none pb-0.5">&times;</button>
                  </div>
                )}
              </div>
              {selected && (
                <button
                  onClick={() => { setVisage(slot, null); setOpenSlot(null); }}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              )}
            </div>`;

const popoverReplacement = `<div className="absolute top-[105%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[320px] max-h-[400px] overflow-hidden bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-2">
            <div className="flex flex-col gap-2 px-1 border-b border-mh-slate-800 pb-2 mb-1 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-mh-slate-300">Select Visage</span>
                  {filterInk && (
                    <div className="flex items-center gap-1 bg-mh-slate-800 px-1.5 py-0.5 rounded border border-mh-slate-700">
                      <span className="text-[9px] font-bold text-mh-slate-400">{getInkConfig(filterInk).shortName} Only</span>
                      <button onClick={() => setFilterInk(null)} className="ml-0.5 text-mh-slate-500 hover:text-red-400 leading-none pb-0.5">&times;</button>
                    </div>
                  )}
                </div>
                {selected && (
                  <button
                    onClick={() => { setVisage(slot, null); setOpenSlot(null); }}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-mh-slate-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-mh-slate-800 border border-mh-slate-700 rounded text-xs px-2 pl-6 py-1.5 text-mh-slate-200 placeholder:text-mh-slate-600 focus:outline-none focus:border-rarity-5 transition-colors"
                />
              </div>
            </div>`;
            
code = code.replace(popoverTarget, popoverReplacement);

// 6. Update the filtering logic and add scroll to the grid container
const filterTarget = `const filtered = visages?.filter(v => {
                if (filterInk && !v.ink_types.includes(filterInk)) return false;
                if (!useCollectionOnly || !user) return true;
                // If collection only, user must own AT LEAST ONE ink version of this card
                return v.ink_types.some(ink => ownedCollection?.has(\`\${v.id}::\${ink}\`));
              }) || [];

              return (
                <div className="grid grid-cols-4 gap-1.5">`;

const filterReplacement = `const filtered = visages?.filter(v => {
                if (filterInk && !v.ink_types.includes(filterInk)) return false;
                if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                if (!useCollectionOnly || !user) return true;
                // If collection only, user must own AT LEAST ONE ink version of this card
                return v.ink_types.some(ink => ownedCollection?.has(\`\${v.id}::\${ink}\`));
              }) || [];

              return (
                <div className="grid grid-cols-4 gap-1.5 overflow-y-auto pr-1 pb-1">`;
                
code = code.replace(filterTarget, filterReplacement);

fs.writeFileSync('src/components/build-planner/VisageSelector.tsx', code);
