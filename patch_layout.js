import fs from 'fs';

let code = fs.readFileSync('src/pages/BuildPlanner.tsx', 'utf8');

const target = /return \(\n    <div className="flex flex-col gap-4 p-4 lg:p-6">.*?<\/div>\n    <\/div>\n  \);\n\}/s;

const newReturn = `return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      
      {/* Top Row: Build Metadata & Hero/Buddy */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch">
        
        {/* Left: Metadata (Title, Desc, Save Buttons) */}
        <div className="flex-1 flex flex-col gap-3 bg-mh-slate-800/30 border border-mh-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-rarity-3" />
                <span className="rarity-badge rarity-3 text-[10px] py-0.5 px-2">Build Planner</span>
              </div>
              
              {/* Build Role Toggle */}
              <div className="flex rounded-md bg-mh-slate-800 p-0.5 border border-mh-slate-700">
                <button
                  onClick={() => store.setBuildRole('main')}
                  className={\`rounded px-3 py-0.5 text-[10px] font-bold uppercase transition-all \${
                    store.buildRole === 'main' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-mh-slate-500 hover:text-mh-slate-300 border border-transparent'
                  }\`}
                >
                  Main
                </button>
                <button
                  onClick={() => store.setBuildRole('support')}
                  className={\`rounded px-3 py-0.5 text-[10px] font-bold uppercase transition-all \${
                    store.buildRole === 'support' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-mh-slate-500 hover:text-mh-slate-300 border border-transparent'
                  }\`}
                >
                  Support
                </button>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-2">
              {(!isSavedBuild || isAuthor) && (
                <button 
                  onClick={() => handleSaveBuild(false)}
                  className="btn-mh whitespace-nowrap text-sm py-1.5 px-4 flex items-center gap-2"
                >
                  <Save size={14} />
                  {isSavedBuild ? 'Update' : 'Save'}
                </button>
              )}
              {isSavedBuild && (
                <button 
                  onClick={() => handleSaveBuild(true)}
                  className="btn-mh bg-mh-slate-700 hover:bg-mh-slate-600 whitespace-nowrap text-sm py-1.5 px-3 flex items-center gap-2 text-white shadow-none"
                >
                  <Copy size={14} />
                  Clone
                </button>
              )}
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="Build Title"
            className="w-full bg-transparent border-0 border-b-2 border-mh-slate-700 font-display text-2xl font-bold text-mh-slate-100 focus:border-rarity-3 focus:ring-0 px-1 py-1 placeholder-mh-slate-600 transition-colors"
            value={store.title}
            onChange={(e) => store.setTitle(e.target.value)}
          />
          <textarea 
            placeholder="Notes or description (optional)"
            className="w-full bg-mh-slate-900 border border-mh-slate-700 rounded-lg text-sm text-mh-slate-200 focus:border-rarity-3 focus:ring-0 p-3 placeholder-mh-slate-600 resize-none h-16 transition-colors mt-1"
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
          />
        </div>

        {/* Right: Hero/Buddy Selectors */}
        <div className="w-full xl:w-[45%] shrink-0">
          <HeroBuddySelector />
        </div>
      </div>

      {/* Main Layout (3 Columns) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* Left Column: Equipment */}
        <div className="w-full lg:w-[40%]">
          <EquipmentSelector />
        </div>

        {/* Middle Column: Skills */}
        <div className="w-full lg:w-[30%]">
          <SkillSummaryPanel />
        </div>

        {/* Right Column: Visage */}
        <div className="w-full lg:w-[30%]">
          <VisageSelector />
        </div>
      </div>
    </div>
  );
}`;

code = code.replace(target, newReturn);
fs.writeFileSync('src/pages/BuildPlanner.tsx', code);
