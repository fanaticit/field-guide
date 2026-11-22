// ─────────────────────────────────────────────────────────────
// GeneralSpoilers — the "General" tab on the Spoilers page: upcoming
// content that isn't a recruitment banner. Currently Nergigante, from
// the update 1.0.9.4 game files (import/Changes/MHO_patch_1.0.9.4.json).
// Only shown behind login + "Show Spoilers"; never pre-rendered.
// ─────────────────────────────────────────────────────────────
import { CalendarClock, Package, Shirt, Swords, Sparkles, Crosshair, Info } from 'lucide-react';
import type { ReactNode } from 'react';

const IMG = '/images/spoilers/nergigante/';
const ARMOUR_SLOTS: { slot: string; name: string }[] = [
  { slot: 'head', name: 'Helm' },
  { slot: 'chest', name: 'Mail' },
  { slot: 'arms', name: 'Vambraces' },
  { slot: 'waist', name: 'Coil' },
  { slot: 'leg', name: 'Greaves' },
];

const WEAPON_SKINS: { name: string; was?: string; note?: string; icon?: string }[] = [
  { name: 'Nergal Judicator', was: 'Nergigante Great Sword' },
  { name: 'Nergal Reaver' },
  { name: 'Nergal Gouge', was: 'Nergigante Dual Blades Model (Nergal Gouge)' },
  { name: 'Nergal Impaler' },
  { name: 'Nergal Roar', was: 'Nergigante Heavy Bowgun Model (Nergal Roar)' },
  { name: 'Nergal Whisper', was: 'Nergigante Bow Model (Nergigante Bow)' },
  { name: 'Nergal Crusher' },
  { name: 'Nergal Lacerator', note: 'Charge Blade, new icon', icon: `${IMG}weaponicon-chargeblade-nergigante-2-huiji.webp` },
];

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-3">
      <div className="flex items-center gap-2.5 pb-2 border-b border-white/5 text-mh-gold-400">
        {icon}
        <h3 className="font-display text-sm sm:text-base font-bold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function GeneralSpoilers({ onImageClick }: { onImageClick: (img: { src: string; alt: string }) => void }) {
  return (
    <div className="space-y-6">
      <div className="mho-panel relative overflow-hidden p-5 sm:p-6 border-white/15 shadow-xl">
        <div className="flex flex-wrap items-center gap-4">
          <img src={`${IMG}armouricon-nergigante-head-m-2.webp`} alt="" width={64} height={64} className="h-16 w-16 rounded-xl bg-black/40 object-contain p-1" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
              Elder Dragon · Spoiler
            </span>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-white">Nergigante</h2>
            <p className="text-xs sm:text-sm text-mh-slate-400">
              Layered gear, a style crate, Visages and event changes found in the update 1.0.9.4 game files.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Block icon={<CalendarClock size={18} />} title="Coming Next">
          <ul className="space-y-2 text-xs sm:text-sm text-mh-slate-300">
            <li><strong className="text-white">27 Nov – 17 Dec 2026:</strong> Nergigante elder dragon rotation.</li>
            <li><strong className="text-white">25 Dec 2026 (Season 2 “Molten Sun &amp; Spark of Blue”):</strong> a new Nergigante Charge Blade adventurer. The banner is prepared in the files but not scheduled yet – see the Recruitment &amp; Events tab.</li>
          </ul>
          <p className="text-[11px] text-mh-slate-500">Dates come from the season and banner data and can change.</p>
        </Block>

        <Block icon={<Swords size={18} />} title="Event Fight Rebalanced: Nergigante Approaches">
          <p className="text-xs text-mh-slate-400">Road to the Throne of Thorns – Hunting Trials and Limited-Time Challenge.</p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-mh-slate-300">
            <li>Time limit: <strong className="text-white">10 → 15 minutes</strong></li>
            <li>Health: <strong className="text-white">676,202 → 231,699</strong> <span className="text-emerald-300 font-semibold">(−66%)</span>; attack 1,480 → 1,190</li>
            <li>Hunting Trial monster level: 15 → 13</li>
            <li>Recommended hunt power by tier: 15,766 / 16,554 / 17,553 / 18,430 → <strong className="text-white">11,457 / 17,553 / 19,800 / 23,500</strong></li>
          </ul>
        </Block>

        <div className="md:col-span-2">
          <Block icon={<Shirt size={18} />} title="Layered Armour (Appearance Only)">
            <p className="text-xs sm:text-sm text-mh-slate-300">
              Season 1 adds Nergigante layered (appearance) gear. It changes looks only – there are no new stats, so the armour and weapon lists are unchanged.
              10 pieces across an <strong className="text-white">α</strong> and a <strong className="text-white">β</strong> set, each worth 10 collection points.
            </p>
            {(['m', 'f'] as const).map((g) => (
              <div key={g}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">{g === 'm' ? 'Male' : 'Female'}</p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {ARMOUR_SLOTS.map(({ slot, name }) => {
                    const src = `${IMG}armouricon-nergigante-${slot}-${g}-2.webp`;
                    const alt = `Nergigante ${name} (${g === 'm' ? 'male' : 'female'})`;
                    return (
                      <li key={slot}>
                        <button
                          type="button"
                          onClick={() => onImageClick({ src, alt })}
                          className="group flex w-full flex-col items-center gap-1 rounded-lg border border-white/10 bg-mh-slate-900/80 p-2 hover:border-mh-gold-500/60 cursor-zoom-in"
                        >
                          <img src={src} alt={alt} width={96} height={96} loading="lazy" className="h-20 w-20 object-contain transition-transform group-hover:scale-110" />
                          <span className="text-[11px] text-mh-slate-300">{name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="text-[11px] text-mh-slate-500">
              Pieces: Nergigante Helm, Mail, Vambraces, Coil and Greaves – each in α and β. The files add new 3D models for both sets (male and female) and update the 10 armour icons shown here.
            </p>
          </Block>
        </div>

        <Block icon={<Sparkles size={18} />} title="Weapon Skins (8)">
          <ul className="space-y-1.5 text-xs sm:text-sm text-mh-slate-300">
            {WEAPON_SKINS.map((w) => (
              <li key={w.name} className="flex items-center gap-2.5">
                {w.icon ? (
                  <button type="button" onClick={() => onImageClick({ src: w.icon!, alt: w.name })} className="shrink-0 cursor-zoom-in">
                    <img src={w.icon} alt={w.name} width={40} height={40} className="h-10 w-10 rounded-md border border-white/10 bg-mh-slate-900 object-contain" />
                  </button>
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mh-gold-400" aria-hidden="true" />
                )}
                <span>
                  <strong className="text-white">{w.name}</strong>
                  {w.was && <span className="text-mh-slate-500"> – was “{w.was}”</span>}
                  {w.note && <span className="text-mh-slate-500"> – {w.note}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-mh-slate-500">
            Also renamed: Annihilation Cannon → <strong className="text-mh-slate-300">Destruction’s Fusillade</strong>, Extermination’s Claws → <strong className="text-mh-slate-300">Perdition’s Hand</strong>.
          </p>
        </Block>

        <Block icon={<Package size={18} />} title="Nergigante Style Crate">
          <p className="text-xs sm:text-sm text-mh-slate-300">Layered equipment made from monster materials.</p>
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Nergigante Style Crate odds</caption>
            <thead>
              <tr className="border-b border-white/10 text-mh-slate-400">
                <th scope="col" className="py-1.5 pr-2 font-semibold">Item</th>
                <th scope="col" className="py-1.5 pr-2 font-semibold">Chance (each)</th>
                <th scope="col" className="py-1.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="text-mh-slate-200">
              <tr className="border-b border-white/5">
                <th scope="row" className="py-1.5 pr-2 font-medium text-white">Armour piece (×10)</th>
                <td className="py-1.5 pr-2">7%</td>
                <td className="py-1.5">70%</td>
              </tr>
              <tr>
                <th scope="row" className="py-1.5 pr-2 font-medium text-white">Weapon skin (×8)</th>
                <td className="py-1.5 pr-2">3.75%</td>
                <td className="py-1.5">30%</td>
              </tr>
            </tbody>
          </table>
          <p className="flex items-start gap-1.5 text-[11px] text-mh-slate-500">
            <Info size={12} className="mt-0.5 shrink-0" /> The crate has a guarantee rule, but its meaning isn’t clear from the files.
          </p>
        </Block>

        <Block icon={<Crosshair size={18} />} title="Nergigante Visages">
          <p className="text-xs sm:text-sm text-mh-slate-300">
            Rare, Epic and Superior Nergigante Visages were “Not released”. They now list the <strong className="text-white">Season Shop</strong> as their source, and the Visage Album shows all four qualities.
          </p>
        </Block>
      </div>

      <p className="text-[11px] text-mh-slate-500">
        From the update 1.0.9.4 game files, not official patch notes. Event dates are set by the server and can change.
      </p>
    </div>
  );
}
