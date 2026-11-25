// Checks visage_power.js against cards read from the game (2026-11-25). Run: node visage_power.test.js
const { visagePower, visagePowerByElement } = require('./visage_power.js');
const rathSup = { quality: 'Superior', level: 10, randomEffects: [
  { effect: 'Dragon Attack', value: 30 }, { effect: 'Elemental Critical Damage', value: 1.52 },
  { effect: 'Water Attack', value: 42 }, { effect: 'Dragon Attack', value: 20 }, { effect: 'Thunder Attack', value: 36 }] };
const T = [
  ['Rathian Superior Lv1', { quality: 'Superior', level: 1, randomEffects: [] }, 'Fire', 118],
  ['Rathian Superior Lv10 on Midori (fire)', rathSup, 'Fire', 327],
  ['Rathian Superior Lv10 on Luxheart (thunder)', rathSup, 'Thunder', 399],
  ['Rathian Superior Lv10, Hunter non-elemental weapon', rathSup, 'None', 318],
  ['Rathian Epic Lv10, Hunter fire weapon', { quality: 'Epic', level: 10, randomEffects: [
    { effect: 'Physical Attack', value: 23 }, { effect: 'Defense', value: 4 }, { effect: 'Physical Attack', value: 27 },
    { effect: 'Physical Attack', value: 18 }, { effect: 'Fire Attack', value: 23 }] }, 'Fire', 287],
  ['Radiant Odogaron Superior Lv10, Hunter fire weapon', { quality: 'Superior', level: 10, randomEffects: [
    { effect: 'Damage', value: 1.01 }, { effect: 'Physical Attack', value: 30 }, { effect: 'Dragon Attack', value: 30 },
    { effect: 'Dragon Attack', value: 30 }, { effect: 'Thunder Attack', value: 48 }] }, 'Fire', 357],
  ['Barnos Epic Lv10, Midori', { quality: 'Epic', level: 10, randomEffects: [
    { effect: 'Elemental Critical Damage', value: 1.14 }, { effect: 'Physical Attack', value: 36 },
    { effect: 'Defense', value: 3 }, { effect: 'Ice Attack', value: 15 }] }, 'Fire', 221],
  ['Great Jagras Rare Lv10, dragon adventurer', { quality: 'Rare', level: 10, randomEffects: [
    { effect: 'Damage', value: 0.51 }, { effect: 'Damage', value: 0.84 }] }, 'Dragon', 111],
  ['Noios Rare Lv10, Midori', { quality: 'Rare', level: 10, randomEffects: [
    { effect: 'Damage', value: 0.84 }, { effect: 'Water Attack', value: 10 }] }, 'Fire', 97],
  ['Great Jagras Rare Lv10, Hunter non-elemental weapon', { quality: 'Rare', level: 10, randomEffects: [
    { effect: 'Damage', value: 0.51 }, { effect: 'Damage', value: 0.84 }] }, 'None', 111],
  ['Rathian Epic Lv10, Hunter non-elemental weapon', { quality: 'Epic', level: 10, randomEffects: [
    { effect: 'Physical Attack', value: 23 }, { effect: 'Defense', value: 4 }, { effect: 'Physical Attack', value: 27 },
    { effect: 'Physical Attack', value: 18 }, { effect: 'Fire Attack', value: 23 }] }, 'None', 241],
  ['Radiant Odogaron Superior Lv10, Hunter non-elemental weapon', { quality: 'Superior', level: 10, randomEffects: [
    { effect: 'Damage', value: 1.01 }, { effect: 'Physical Attack', value: 30 }, { effect: 'Dragon Attack', value: 30 },
    { effect: 'Dragon Attack', value: 30 }, { effect: 'Thunder Attack', value: 48 }] }, 'None', 357],
];
let fails = 0;
for (const [name, card, el, want] of T) {
  const got = visagePower(card, el).power;
  if (got !== want) fails++;
  console.log(got === want ? 'OK  ' : 'FAIL', name, got, 'expected', want);
}
console.log('Rathian Superior Lv10 by element:', JSON.stringify(visagePowerByElement(rathSup)));
process.exit(fails ? 1 : 0);
