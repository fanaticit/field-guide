import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/EquipmentSelector.tsx', 'utf8');

// Add placeholderIcon to props
code = code.replace(
  "selectedImage?: string;",
  "selectedImage?: string;\n  placeholderIcon?: string;"
);

// Add placeholderIcon to destructured props
code = code.replace(
  "label, items, selectedId, selectedImage, placeholder, isLoading, onChange,",
  "label, items, selectedId, selectedImage, placeholderIcon, placeholder, isLoading, onChange,"
);

// Replace SearchableDropdown return statement
const oldReturnTarget = /return \(\n    <div ref=\{containerRef\} className="relative w-full">.*?<\/div>\n  \);\n\}/s;

const newReturn = `return (
    <div className="flex items-center gap-3 w-full">
      {/* Left: Placeholder Icon */}
      {placeholderIcon ? (
        <div className="w-8 h-8 shrink-0 opacity-60">
          <img src={placeholderIcon} alt={label} className="w-full h-full object-contain filter grayscale invert opacity-70 brightness-200" />
        </div>
      ) : (
        <div className="w-8 h-8 shrink-0" /> // spacer for weapon if it doesn't have one
      )}

      {/* Center: Dropdown Button */}
      <div ref={containerRef} className="relative flex-1 min-w-0">
        <button
          onClick={() => !isLoading && setIsOpen(!isOpen)}
          disabled={isLoading}
          className="w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border border-mh-slate-700 rounded-lg p-2 px-3 transition-colors text-left h-[50px]"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-rarity-3 uppercase tracking-wider mb-0.5">{label}</span>
            {isLoading ? (
              <span className="text-xs text-mh-slate-500 animate-pulse">Loading...</span>
            ) : selected ? (
              <>
                <span className="text-sm font-bold text-white leading-tight truncate">{selected.primaryLabel}</span>
                {selected.secondaryLabel && (
                  <span className="text-[10px] text-mh-slate-400 leading-tight truncate">{selected.secondaryLabel}</span>
                )}
              </>
            ) : (
              <span className="text-xs text-mh-slate-500">{placeholder || \`Select...\`}</span>
            )}
          </div>
          <span className="text-[10px] text-mh-slate-600 shrink-0 ml-2">▼</span>
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b2e] border border-mh-slate-700 rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden" style={{ minWidth: '220px' }}>
            <div className="p-2 border-b border-mh-slate-700/60">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={\`Search \${label.toLowerCase()}...\`}
                className="w-full bg-mh-slate-900 border border-mh-slate-700 rounded px-2 py-1.5 text-xs text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-slate-500"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              <button
                onClick={() => { onChange(null); setIsOpen(false); setQuery(''); }}
                className="w-full px-3 py-2 text-left text-xs text-mh-slate-500 hover:bg-white/5 flex items-center gap-2 border-b border-mh-slate-800"
              >
                <span className="text-mh-slate-600">✕</span> None
              </button>
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-mh-slate-600 italic">No results for "{query}"</p>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onChange(item.id); setIsOpen(false); setQuery(''); }}
                    className={\`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-white/5 transition-colors \${item.id === selectedId ? 'bg-white/10' : ''}\`}
                  >
                    <div className="w-8 h-8 rounded bg-black/20 border border-white/5 flex items-center justify-center shrink-0 p-0.5">
                      {item.icon ? (
                        <img src={item.icon} alt={item.primaryLabel} className="w-full h-full object-contain opacity-90" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-mh-slate-700" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white leading-tight truncate">{item.primaryLabel}</span>
                      {item.secondaryLabel && (
                        <span className="text-[10px] text-mh-slate-400 leading-tight truncate">{item.secondaryLabel}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Selected image preview */}
      <div className="w-[50px] h-[50px] rounded bg-mh-slate-900 border border-mh-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden p-0">
        {selectedImage ? (
          <img src={selectedImage} alt={selected?.primaryLabel || 'Selected'} className="w-[46px] h-[46px] object-contain drop-shadow-md" />
        ) : (
          <div className="w-4 h-4 bg-mh-slate-800 rounded-full" />
        )}
      </div>
    </div>
  );
}`;

code = code.replace(oldReturnTarget, newReturn);

// Update calls to pass placeholderIcon
const weaponSlotCallTarget = `<SearchableDropdown
          label="Weapon"`;
const weaponSlotCallReplacement = `<SearchableDropdown
          label="Weapon"
          placeholderIcon="/images/weapons/great_sword.png"`; // Use a default for weapon if we want, or weaponType?.icon
code = code.replace(weaponSlotCallTarget, weaponSlotCallReplacement);

const armourSlotCallTarget = `<SearchableDropdown
              key={slot}
              label={slotLabel}`;
const armourSlotCallReplacement = `const slotIconPath = \`/images/armor/\${slot}.png\`;
            return (
              <SearchableDropdown
                key={slot}
                label={slotLabel}
                placeholderIcon={slotIconPath}`;
code = code.replace(
  `return (
            <SearchableDropdown
              key={slot}
              label={slotLabel}`,
  armourSlotCallReplacement
);

fs.writeFileSync('src/components/build-planner/EquipmentSelector.tsx', code);
