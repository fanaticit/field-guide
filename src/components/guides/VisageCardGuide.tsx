// ─────────────────────────────────────────────────────────────
// VisageCardGuide — plain-text guide and FAQ shown under the Visage
// Card Checker. Static and server-renderable, so it is in the
// pre-rendered HTML for search engines and AI assistants to quote.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import {
  BASE_TIER_ODDS,
  RESKETCH_COSTS,
  RESKETCH_EFFECTS,
  RESKETCH_RANGES,
  ROLL_QUALITY_ODDS,
  SLOT_UNLOCK_LEVELS,
  VERDICT_BANDS,
  VISAGE_FAQ,
} from './visageGuideData';

function Panel({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mho-panel px-4 py-4 sm:px-5 shadow-lg space-y-3">
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-mh-gold-400">{title}</h2>
      {children}
    </section>
  );
}

function Table({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-white/10 text-mh-slate-400">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-2 py-1.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 odd:bg-white/[0.02] text-mh-slate-200">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-2 py-1.5 font-medium text-white">{c}</th>
                ) : (
                  <td key={j} className="px-2 py-1.5 tabular-nums">{c}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const p = 'text-sm leading-relaxed text-mh-slate-300';

export default function VisageCardGuide() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 pt-6" id="visage-card-guide">
      <Panel title="Visage Card guide: should you upgrade or resketch?">
        <p className={p}>
          A Visage Card in Monster Hunter Outlanders has two kinds of stats. <strong className="text-white">Base effects</strong> are rolled when the card
          drops and never change. <strong className="text-white">Resketch slots</strong> unlock as you level the card and can be rerolled with brushes.
          A good card has high-tier base effects and resketch rolls in the effects your build uses. Use the checker above to rate your own card, or read on
          for how the rolls work.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Base effects (fixed)" id="base-effects">
          <p className={p}>
            Each card has up to 2 base effects: <strong className="text-white">Affinity</strong>, <strong className="text-white">Ultimate Charge Rate</strong> or{' '}
            <strong className="text-white">Elemental damage</strong>, depending on the monster. Each rolls a tier when the card drops, and the value grows as you
            level the card to 10.
          </p>
          <Table
            caption="Base effect tier chances"
            headers={['Tier', 'Chance', 'Rating']}
            rows={BASE_TIER_ODDS.map((t) => [`Tier ${t.tier}`, t.chance, t.label])}
          />
          <p className="text-xs text-mh-slate-400">
            Elder dragon Visages have a single fixed roll, so every copy has the same base values.
          </p>
        </Panel>

        <Panel title="Resketch slots (rerollable)" id="resketch-slots">
          <p className={p}>
            Rare, Epic and Superior cards unlock a resketch slot at levels {SLOT_UNLOCK_LEVELS.join(', ')}. Each slot rolls one of 9 effects with an equal
            chance – {RESKETCH_EFFECTS.join(', ')} – and a roll quality:
          </p>
          <Table caption="Resketch roll quality chances" headers={['Roll quality', 'Chance per slot']} rows={ROLL_QUALITY_ODDS.map((r) => [r.quality, r.chance])} />
          <p className="text-xs text-mh-slate-400">A resketch rerolls every unlocked slot at once, so you can lose good rolls as well as gain them.</p>
        </Panel>
      </div>

      <Panel title="Resketch value ranges by card quality" id="value-ranges">
        <p className={p}>
          Higher-quality cards roll bigger numbers. A Superior roll on a Superior card is the best possible result for that effect.
        </p>
        <Table
          caption="Resketch value ranges by effect, card quality and roll quality"
          headers={['Effect', 'Card', 'Rare roll', 'Epic roll', 'Superior roll']}
          rows={RESKETCH_RANGES.map((r) => [r.effect, r.card, ...r.ranges])}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Resketch cost" id="resketch-cost">
          <Table
            caption="Resketch cost per unlocked slot"
            headers={['Card', 'Per slot', 'All 5 slots']}
            rows={RESKETCH_COSTS.map((c) => [
              c.card,
              `${c.perSlot} ${c.brush}es + ${c.zennyPerSlot.toLocaleString('en-GB')} Zenny`,
              `${c.perSlot * 5} ${c.brush}es + ${(c.zennyPerSlot * 5).toLocaleString('en-GB')} Zenny`,
            ])}
          />
        </Panel>

        <Panel title="When to keep a card" id="keep-or-reroll">
          <p className={p}>The checker scores your slots against every possible set and gives the chance one more resketch beats it:</p>
          <Table caption="Resketch verdicts" headers={['Chance a resketch beats it', 'Verdict']} rows={VERDICT_BANDS.map((v) => [v.band, v.verdict])} />
        </Panel>
      </div>

      <Panel title="Frequently asked questions" id="faq">
        <div className="space-y-4">
          {VISAGE_FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-bold text-white">{f.q}</h3>
              <p className={`${p} mt-1`}>{f.a}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-mh-slate-500">
          Looking for a specific card? See every card’s core effect and inks in the{' '}
          <Link to="/visages/" className="underline hover:text-mh-gold-400">Visage Card list</Link>, or plan a full set in the{' '}
          <Link to="/gallery/set/" className="underline hover:text-mh-gold-400">Visage Set Builder</Link>. Values are from the game data for version 1.0.9.
        </p>
      </Panel>
    </div>
  );
}
