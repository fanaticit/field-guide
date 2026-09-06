# VisageSelector Updates

1. Imports:
   - `import { getInkConfig } from '../../data/schemas/visage';`
   - `import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';`
   - Remove `INK_COLORS`, `inkLabel`, `inkShort`, `defaultInkColor`.

2. Layout changes:
   - Use a `flex` container where the Core slot takes ~25% and the remaining 4 slots share the rest evenly (`flex-1 grid grid-cols-4 gap-2`).
   - Cards will have `w-full aspect-[4/5]` instead of fixed `w-[44px]`. This naturally expands them across the box space.

3. Ink styling (Cards):
   - Replace the circle below the portrait:
     ```tsx
     <button className={`w-5 h-5 rounded-full flex items-center justify-center ${inkCfg.dotColor} text-white ...`}>
       <InkIconComponent iconName={inkCfg.iconName} size={12} />
     </button>
     ```
   - In the popover for multiple inks, use the icon as well:
     ```tsx
     {selected.ink_types.map(ink => {
       const cfg = getInkConfig(ink);
       return (
         <button className={`... ${cfg.dotColor} text-white`}>
           <InkIconComponent iconName={cfg.iconName} size={10} />
           <span>{cfg.shortName}</span>
         </button>
       )
     })}
     ```

4. Ink styling (Set Bonuses list):
   - `const cfg = getInkConfig(ink);`
   - `cfg.name` for the label.
   - `<InkIconComponent iconName={cfg.iconName} size={12} className={cfg.text} />` instead of the dot? The user said "use those icons and colours". We can use the icon next to the text.
