// ─────────────────────────────────────────────────────────────
// ArmourPageGuide — plain-text guide, FAQ and full armour set list shown
// under the Armour page. Static and server-renderable, so it is in the
// pre-rendered HTML for search engines and AI assistants to read.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import type { ArmourGuideData } from '../../seo/publicData';
import { fillArmourFaq } from './armourGuideFaq';

function Panel({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mho-panel px-4 py-4 sm:px-5 shadow-lg space-y-3">
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-mh-gold-400">{title}</h2>
      {children}
    </section>
  );
}

const p = 'text-sm leading-relaxed text-mh-slate-300';
const chip = 'inline-block rounded-full border border-white/15 px-3 py-1 text-xs text-mh-slate-200 hover:border-mh-gold-400 hover:text-mh-gold-400';

export default function ArmourPageGuide({ data }: { data: ArmourGuideData | null }) {
  const setCount = data?.sets.length ?? 0;
  const faq = fillArmourFaq(setCount, data?.pieceCount ?? 0);

  // Group sets by their starting rarity for the full list.
  const byRarity = new Map<string, ArmourGuideData['sets']>();
  for (const s of data?.sets ?? []) {
    const key = s.rarity != null ? `Rarity ${s.rarity}` : 'Other';
    byRarity.set(key, [...(byRarity.get(key) ?? []), s]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 pb-10 pt-6 sm:px-4 lg:px-6" id="armour-guide">
      <Panel title="Monster Hunter Outlanders armour & skill builder">
        <p className={p}>
          This page lists every armour piece in Monster Hunter Outlanders
          {data ? ` – ${setCount} sets and ${data.pieceCount} pieces –` : ''} with its skills, the rarity each skill level unlocks at, and its set bonus.
          Pick the skills you want, see which pieces give them, and build an example set at your rarity to check how the skills add up before you spend
          materials. When you’re ready to plan a full loadout, take it into the{' '}
          <Link to="/armory/planner/" className="underline hover:text-mh-gold-400">Build Planner</Link>.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-mh-slate-300">
          <li>Set the rarity your armour is at.</li>
          <li>Add the skills you want – matching pieces are highlighted.</li>
          <li>Add pieces to the example build to see total skill levels, capped skills and set bonuses.</li>
          <li>Tap a piece to see every skill level and what the next upgrade unlocks.</li>
        </ol>
      </Panel>

      {data && data.weaponTypes.length > 0 && (
        <Panel title="Builds by weapon" id="builds-by-weapon">
          <p className={p}>
            Looking for a build for your weapon? Community Builds are shared by other hunters – open one in the Build Planner to copy and change it.
          </p>
          <ul className="flex flex-wrap gap-2">
            {data.weaponTypes.map((w) => (
              <li key={w.id}>
                <Link to={`/armory/?weapon=${w.id}`} className={chip}>
                  {w.name} builds
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Frequently asked questions" id="faq">
        <div className="space-y-4">
          {faq.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-bold text-white">{f.q}</h3>
              <p className={`${p} mt-1`}>{f.a}</p>
            </div>
          ))}
        </div>
      </Panel>

      {data && data.sets.length > 0 && (
        <Panel title={`All armour sets (${setCount})`} id="all-armour-sets">
          <p className="text-xs text-mh-slate-400">
            Every set by the rarity it starts at. Monster names link to that monster’s weaknesses, hitzones and other gear.
          </p>
          {[...byRarity.entries()].map(([rarity, sets]) => (
            <div key={rarity}>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-mh-slate-400">{rarity}</h3>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-mh-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                {sets.map((s) => (
                  <li key={`${s.name}-${s.variant ?? ''}`}>
                    <span className="text-white">{s.name}</span>
                    {s.variant ? ` (${s.variant})` : ''}
                    {s.monster && (
                      <>
                        {' – '}
                        <Link to={`/monsters/${s.monster.slug}/`} className="underline hover:text-mh-gold-400">
                          {s.monster.name}
                        </Link>
                      </>
                    )}
                    <span className="text-mh-slate-500"> · {s.pieces} piece{s.pieces === 1 ? '' : 's'}{s.maxRarity ? `, up to rarity ${s.maxRarity}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
