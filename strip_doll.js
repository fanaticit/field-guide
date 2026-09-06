import fs from 'fs';

let code = fs.readFileSync('src/components/build-planner/HeroBuddySelector.tsx', 'utf8');

const target = `{/* Equipment Layout (Paper Doll) */}`;
const idx = code.indexOf(target);
if (idx !== -1) {
  // Find the closing div for this block. It's the end of the file basically.
  // The structure is:
  //   {/* Equipment Layout... */}
  //   <div className="flex flex-col gap-3 relative items-center md:items-start ml-0 md:ml-4 flex-1">
  //     ...
  //   </div>
  // </div>
  // );
  // }
  
  // We can just slice from target to the end, then append the closing tags.
  code = code.substring(0, idx) + `    </div>\n  );\n}\n`;
  fs.writeFileSync('src/components/build-planner/HeroBuddySelector.tsx', code);
}
