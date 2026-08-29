const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'hc_data/monsters.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const newMonster = {
  id: 'radiant_great_girros',
  name: 'Radiant Great Girros',
  nameJa: '',
  type: 'large',
  tier: 'low',
  element: [],
  weaknesses: ['dragon', 'sleep'],
  icon: '/images/monsters/MHNow-Radiant_Great_Girros_Icon.png',
  sortOrder: 1000
};

// Check if it already exists
if (!data.monsters.find(m => m.id === newMonster.id)) {
  data.monsters.push(newMonster);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  console.log('Added to monsters.json');
} else {
  console.log('Monster already exists in JSON.');
}

// Update generate-monsters-seed.cjs
const seedScriptPath = path.join(__dirname, 'scripts/generate-monsters-seed.cjs');
let scriptContent = fs.readFileSync(seedScriptPath, 'utf8');

// Add to SPECIES_MAP (Great Girros is fanged_wyvern)
if (!scriptContent.includes("radiant_great_girros: 'fanged_wyvern'")) {
    scriptContent = scriptContent.replace(
        /great_girros: 'bird_wyvern',/, 
        "great_girros: 'fanged_wyvern',\n  radiant_great_girros: 'fanged_wyvern',"
    );
}

// Add to PARENT_MAP
if (!scriptContent.includes("radiant_great_girros: 'great_girros'")) {
    scriptContent = scriptContent.replace(
        /const PARENT_MAP = \{/, 
        "const PARENT_MAP = {\n  radiant_great_girros: 'great_girros',"
    );
}

fs.writeFileSync(seedScriptPath, scriptContent);
console.log('Updated seed script.');
