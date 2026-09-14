import fs from 'fs';
let code = fs.readFileSync('src/pages/BuildPlanner.tsx', 'utf8');

// Update Save Logic
const saveRegex = /let finalDesc = store\.description\.trim\(\);\n    if \(store\.buildRole === 'support'\) \{\n      finalDesc \+= '\\n\\n<!-- role:support -->';\n    \}/;
const saveNew = `let finalDesc = store.description.trim();
    if (store.buildRole === 'support') {
      finalDesc += '\\n\\n<!-- role:support -->';
    }
    const activeInks = Object.entries(store.selectedInkTypes).reduce((acc, [k, v]) => {
      if (v) acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    if (Object.keys(activeInks).length > 0) {
      finalDesc += \`\\n\\n<!-- inks:\${JSON.stringify(activeInks)} -->\`;
    }`;
code = code.replace(saveRegex, saveNew);

// Update Load Logic
const loadRegex = /let desc = data\.description \|\| '';\n          let role = 'main';\n          if \(desc\.includes\('\\n\\n<!-- role:support -->'\)\) \{\n            role = 'support';\n            desc = desc\.replace\('\\n\\n<!-- role:support -->', ''\);\n          \}/;
const loadNew = `let desc = data.description || '';
          let role = 'main';
          if (desc.includes('\\n\\n<!-- role:support -->')) {
            role = 'support';
            desc = desc.replace('\\n\\n<!-- role:support -->', '');
          }
          let savedInks: Record<string, string> = {};
          const inkMatch = desc.match(/\\n\\n<!-- inks:(.*?) -->/);
          if (inkMatch) {
            try {
              savedInks = JSON.parse(inkMatch[1]);
              desc = desc.replace(inkMatch[0], '');
            } catch (e) {
              console.error('Failed to parse saved inks', e);
            }
          }`;
code = code.replace(loadRegex, loadNew);

const applyVisageRegex = /if \(data\.visage5\) store\.setVisage\(5, data\.visage5 as any\);/;
const applyVisageNew = `if (data.visage5) store.setVisage(5, data.visage5 as any);
          
          if (Object.keys(savedInks).length > 0) {
            // Because setVisage overrides the inks with auto-selection, we must apply saved inks after
            store.setSelectedInkTypes(savedInks);
          }`;
code = code.replace(applyVisageRegex, applyVisageNew);

fs.writeFileSync('src/pages/BuildPlanner.tsx', code);
