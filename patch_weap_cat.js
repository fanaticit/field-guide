import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/EquipmentSelector.tsx', 'utf8');

const weaponTarget = `<SearchableDropdown
          label="Weapon"
          placeholderIcon="/images/weapons/great_sword.png"`;

const weaponNew = `<SearchableDropdown
          label="Weapon"
          placeholderIcon="/images/weapons/great_sword.png"
          highlightClasses={hoveredSkillId && weapon?.skills?.some(s => s.id === hoveredSkillId) ? getHighlightClasses(hoveredSkillCategory) : undefined}`;

code = code.replace(weaponTarget, weaponNew);
fs.writeFileSync('src/components/build-planner/EquipmentSelector.tsx', code);
