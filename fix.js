import fs from 'fs';
const code = fs.readFileSync('src/components/build-planner/VisageSelector.tsx', 'utf8');

const INK_SET_BONUSES = `
const INK_SET_BONUSES: Record<string, { pieces: number; description: string }[]> = {
  fire:       [ { pieces: 2, description: 'Fire Attack +1. Attacks have a chance to apply Fireblight.' }, { pieces: 4, description: 'Fire Attack +2. Fireblight damage over time increased.' } ],
  flames:     [ { pieces: 2, description: 'Fire Attack +1. Attacks have a chance to apply Fireblight.' }, { pieces: 4, description: 'Fire Attack +2. Fireblight damage over time increased.' } ],
  water:      [ { pieces: 2, description: 'Water Attack +1. Attacks have a chance to apply Waterblight.' }, { pieces: 4, description: 'Water Attack +2. Waterblight stamina drain increased.' } ],
  thunder:    [ { pieces: 2, description: 'Thunder Attack +1. Attacks have a chance to apply Thunderblight.' }, { pieces: 4, description: 'Thunder Attack +2. Thunderblight stun proc rate increased.' } ],
  ice:        [ { pieces: 2, description: 'Ice Attack +1. Attacks have a chance to apply Iceblight.' }, { pieces: 4, description: 'Ice Attack +2. Iceblight stamina drain increased.' } ],
  frost:      [ { pieces: 2, description: 'Ice Attack +1. Attacks have a chance to apply Iceblight.' }, { pieces: 4, description: 'Ice Attack +2. Iceblight stamina drain increased.' } ],
  dragon:     [ { pieces: 2, description: 'Dragon Attack +1. Attacks have a chance to apply Dragonblight.' }, { pieces: 4, description: 'Dragon Attack +2. Dragonblight elemental negation increased.' } ],
  poison:     [ { pieces: 2, description: 'Poison buildup increased. Poison damage per tick +10%.' }, { pieces: 4, description: 'Poison buildup greatly increased. Poison tick rate doubled.' } ],
  paralysis:  [ { pieces: 2, description: 'Paralysis buildup increased. Paralysis duration +15%.' }, { pieces: 4, description: 'Paralysis buildup greatly increased. Paralysis window widened.' } ],
  blast:      [ { pieces: 2, description: 'Blast buildup increased. Blast explosion damage +15%.' }, { pieces: 4, description: 'Blast buildup greatly increased. Blast radius increased.' } ],
  sleep:      [ { pieces: 2, description: 'Sleep buildup increased. Wake-up hit damage +10%.' }, { pieces: 4, description: 'Sleep buildup greatly increased. Wake-up hit damage +25%.' } ],
  raw:        [ { pieces: 2, description: 'Raw damage +5%. Affinity +5%.' }, { pieces: 4, description: 'Raw damage +10%. Affinity +15%.' } ],
  combat:     [ { pieces: 2, description: 'Raw damage +5%. Affinity +5%.' }, { pieces: 4, description: 'Raw damage +10%. Affinity +15%.' } ],
};
`;

let newCode = code.replace("import { INK_SET_BONUSES } from '../../data/ink_set_bonuses';\n", '');
newCode = newCode.replace("export function VisageSelector() {", INK_SET_BONUSES + "\nexport function VisageSelector() {");

fs.writeFileSync('src/components/build-planner/VisageSelector.tsx', newCode);
