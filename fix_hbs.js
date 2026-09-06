import fs from 'fs';
let code = fs.readFileSync('src/components/build-planner/HeroBuddySelector.tsx', 'utf8');

// Change root div
code = code.replace(
  '<div className="flex flex-col md:flex-row gap-4 mb-2">',
  '<div className="flex flex-col md:flex-row gap-8 items-start h-full">'
);

// Center Adventurer and Weapon selector underneath
code = code.replace(
  '<div className="flex flex-col gap-3 relative items-center md:items-start">',
  '<div className="flex flex-col gap-3 relative items-center">'
);

// Center Buddy
code = code.replace(
  '<div className="flex flex-col gap-3 relative items-center md:items-start">',
  '<div className="flex flex-col gap-3 relative items-center">'
);

fs.writeFileSync('src/components/build-planner/HeroBuddySelector.tsx', code);
