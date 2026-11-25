const fs = require('fs');
const path = require('path');

const SPECIES_MAP = {
  'Fanged Wyvern': 'fanged_wyvern',
  'Bird Wyvern': 'bird_wyvern',
  'Brute Wyvern': 'brute_wyvern',
  'Piscine Wyvern': 'piscine_wyvern',
  'Fish': 'piscine_wyvern',
  'Flying Wyvern': 'flying_wyvern',
  'Elder Dragons': 'elder_dragon',
  'Herbivore': 'herbivore',
  'Neopteron': 'neopteron',
  'Winged Wingdrakes': 'wingdrake',
  'Lynian': 'lynian'
};

// Read CSV
const csv = fs.readFileSync(path.join(__dirname, '../import/MHO_monsters.csv'), 'utf8');
const lines = csv.split('\n');
const csvMap = {};
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const match = line.match(/^(\d+),([^,]+),([^,]+),([^,]*),([^,]+),(\d+),(\d+),(\d+),(\d+),(\d+),([^,]*),(\d*),(\d*),(\d*),(\d*),(\d*)/);
  if (match) {
    const id = match[1];
    csvMap[id] = {
      id,
      name: match[2].trim(),
      rawSpecies: match[3].trim(),
      species: SPECIES_MAP[match[3].trim()] || null,
      bestElement: match[5].trim(),
      fire: parseInt(match[6], 10),
      water: parseInt(match[7], 10),
      thunder: parseInt(match[8], 10),
      ice: parseInt(match[9], 10),
      dragon: parseInt(match[10], 10),
      poison: parseInt(match[12], 10) || 0,
      sleep: parseInt(match[13], 10) || 0,
      paralysis: parseInt(match[14], 10) || 0,
      blast: parseInt(match[15], 10) || 0,
      stun: parseInt(match[16], 10) || 0
    };
  }
}

// Fetch DB monsters via REST API
const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: dbMonsters, error } = await supabase.from('monsters').select('*').order('id');
  if (error) {
    console.error('Error fetching monsters:', error);
    process.exit(1);
  }

  const updates = [];

  for (const m of dbMonsters) {
    const csvData = csvMap[m.id];
    let species = m.species;
    if (!species && csvData) {
      species = csvData.species;
    }
    if (m.id === '206102') {
      species = 'lynian';
    }

    // Weaknesses
    let weaknesses = [];
    if (csvData) {
      // Primary element from bestElement
      const best = csvData.bestElement.split('/').map(e => e.trim().toLowerCase());
      for (const b of best) {
        if (b && !weaknesses.includes(b)) weaknesses.push(b);
      }
      // Any other element with 3 stars
      const elMap = { fire: csvData.fire, water: csvData.water, thunder: csvData.thunder, ice: csvData.ice, dragon: csvData.dragon };
      for (const [el, stars] of Object.entries(elMap)) {
        if (stars >= 3 && !weaknesses.includes(el)) weaknesses.push(el);
      }
      // Ailments with 3 stars
      const ailMap = { poison: csvData.poison, sleep: csvData.sleep, paralysis: csvData.paralysis, blast: csvData.blast, stun: csvData.stun };
      for (const [ail, stars] of Object.entries(ailMap)) {
        if (stars >= 3 && !weaknesses.includes(ail)) weaknesses.push(ail);
      }
    } else if (m.id === '206102') {
      weaknesses = ['thunder', 'ice'];
    }

    // Keep existing base monster weaknesses if they already had valid weaknesses and are not radiant/small
    if (!m.is_radiant && m.tier !== 'small' && m.weaknesses && m.weaknesses.length > 0) {
      if (m.id !== '140001') {
        weaknesses = m.weaknesses;
      }
    }

    // Elements dealt
    let elements = m.elements && m.elements.length > 0 ? [...m.elements] : [];
    if (m.is_radiant) {
      const parent = dbMonsters.find(p => p.id === m.parent_id);
      if (parent && parent.elements && parent.elements.length > 0) {
        elements = [...parent.elements];
      } else {
        elements = ['none'];
      }
    } else if (m.tier === 'small' || m.id === '140001') {
      if (elements.length === 0) elements = ['none'];
    }

    // Specific known adjustments for Radiant monsters:
    if (m.id === '199901') {
      elements = ['fire', 'poison'];
    }
    if (m.id === '111210') {
      elements = ['paralysis'];
    }
    if (m.id === '110910') {
      elements = ['thunder'];
    }
    if (m.id === '111410') {
      elements = ['sleep'];
    }
    if (m.id === '111110') {
      elements = ['ice'];
    }
    if (m.id === '110210') {
      elements = ['poison'];
    }
    if (m.id === '104410') {
      elements = ['water'];
    }
    if (m.id === '110810') {
      elements = ['water'];
    }
    if (m.id === '110010') {
      elements = ['fire'];
    }
    if (m.id === '100210') {
      elements = ['fire', 'poison'];
    }
    if (m.id === '100111') {
      elements = ['fire', 'poison'];
    }

    // Include if radiant, small, Ruger Aidal, or if any field changed
    const speciesChanged = species !== m.species;
    const weaknessesChanged = JSON.stringify([...(m.weaknesses || [])].sort()) !== JSON.stringify([...weaknesses].sort());
    const elementsChanged = JSON.stringify([...(m.elements || [])].sort()) !== JSON.stringify([...elements].sort());

    if (m.is_radiant || m.tier === 'small' || m.id === '140001' || speciesChanged || weaknessesChanged || elementsChanged) {
      updates.push({
        id: m.id,
        name: m.name,
        is_radiant: m.is_radiant,
        tier: m.tier,
        species,
        weaknesses,
        elements,
        oldSpecies: m.species,
        oldWeaknesses: m.weaknesses,
        oldElements: m.elements,
      });
    }
  }

  console.log(`Found ${updates.length} monsters in migration.`);

  // Generate SQL migration file
  let sql = `-- ============================================================\n`;
  sql += `-- Migration: 20261125000001 — Update MHO monster weaknesses, species, and elements\n`;
  sql += `-- Source: import/MHO_monsters.csv (+ import/MHO_monsters.json)\n`;
  sql += `-- Updates all Radiant monsters, Small monsters, and Ruger Aidal with complete\n`;
  sql += `-- species, element attacks, and element/status weaknesses.\n`;
  sql += `-- ============================================================\n\n`;
  sql += `BEGIN;\n\n`;
  sql += `UPDATE public.monsters AS m\n`;
  sql += `SET\n`;
  sql += `  species = v.species,\n`;
  sql += `  elements = v.elements,\n`;
  sql += `  weaknesses = v.weaknesses,\n`;
  sql += `  updated_at = now()\n`;
  sql += `FROM (VALUES\n`;

  const valuesRows = updates.map(u => {
    const speciesSql = u.species ? `'${u.species}'` : 'NULL';
    const elementsSql = `ARRAY[${u.elements.map(e => `'${e}'`).join(',')}]::text[]`;
    const weaknessesSql = `ARRAY[${u.weaknesses.map(w => `'${w}'`).join(',')}]::text[]`;
    return `  ('${u.id}', '${u.name.replace(/'/g, "''")}', ${speciesSql}, ${elementsSql}, ${weaknessesSql})`;
  });

  sql += valuesRows.join(',\n');
  sql += `\n) AS v(id, name, species, elements, weaknesses)\n`;
  sql += `WHERE m.id = v.id;\n\n`;
  sql += `COMMIT;\n`;

  const migrationPath = path.join(__dirname, '../supabase/migrations/20261125000001_update_mho_monster_weaknesses_and_species.sql');
  fs.writeFileSync(migrationPath, sql, 'utf8');
  console.log(`\nWritten migration to: ${migrationPath}`);
}

main();
