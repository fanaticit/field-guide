// ─────────────────────────────────────────────────────────────
// Detail views for the public reference pages. Each one renders a
// plain-English summary first (the part AI answers tend to quote),
// then the facts and tables, then links to related pages.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router';
import type {
  AdventurerPage,
  BuddyPage,
  MonsterPage,
  VisagePage,
  WeaponPage,
  AdventurerGift,
  BuddyPairingRef,
} from '../../seo/publicData';
import { labelOf, weaponTypeName } from '../../seo/publicData';
import { REFERENCE } from '../../seo/pages';
import {
  adventurerSummary,
  buddySummary,
  monsterSummary,
  visageSummary,
  weaponSummary,
} from '../../seo/summaries';
import ReferenceShell, { DataTable, FactList, LinkChips, Section } from './ReferenceShell';

const GIFT_PREFERENCE_LABEL: Record<AdventurerGift['preference'], string> = {
  favourite: 'Favourite',
  neutral: 'Neutral',
  disliked: 'Disliked',
};

/** Plain-text summary of an adventurer's gift preferences (the part search engines and assistants quote). */
function AdventurerGiftSummary({ name, gifts }: { name: string; gifts: AdventurerGift[] }) {
  const names = (pref: AdventurerGift['preference']) => gifts.filter((g) => g.preference === pref).map((g) => g.name);
  const favourites = names('favourite');
  const disliked = names('disliked');
  const best = gifts[0];
  const fav = gifts.find((g) => g.preference === 'favourite');
  const dis = gifts.find((g) => g.preference === 'disliked');
  const neutral = gifts.find((g) => g.preference === 'neutral');
  return (
    <div className="mb-3 space-y-1.5 text-sm leading-relaxed text-mh-slate-200">
      {favourites.length > 0 && (
        <p>
          <strong className="text-white">{name}&rsquo;s favourite gifts</strong>
          {fav ? ` (${fav.multiplier}% bond)` : ''}: {favourites.join(', ')}.
        </p>
      )}
      {disliked.length > 0 && (
        <p>
          <strong className="text-white">Gifts {name} dislikes</strong>
          {dis ? ` (${dis.multiplier}% bond)` : ''}: {disliked.join(', ')}.
        </p>
      )}
      {best && (
        <p>
          The most bond comes from {gifts.filter((g) => g.bond_gained === best.bond_gained).map((g) => g.name).join(' or ')} at
          +{best.bond_gained.toLocaleString('en-GB')} bond per gift.
          {neutral ? ` Neutral gifts give the normal ${neutral.multiplier}% bond.` : ''}
        </p>
      )}
    </div>
  );
}

const PAIRING_RATING_LABEL: Record<BuddyPairingRef['rating'], string> = {
  best: 'Best',
  good: 'Good',
  general: 'General (squad-wide)',
  trigger_only: 'Trigger only (element wasted)',
};

/** Plain-text summary of which adventurers suit a buddy (the part search engines and assistants quote). */
function BuddyPairingSummary({ name, pairings }: { name: string; pairings: BuddyPairingRef[] }) {
  const names = (rating: BuddyPairingRef['rating']) =>
    pairings.filter((p) => p.rating === rating).map((p) => p.name);
  const best = names('best');
  const good = names('good');
  const wasted = names('trigger_only');
  return (
    <div className="mb-3 space-y-1.5 text-sm leading-relaxed text-mh-slate-200">
      {best.length > 0 && (
        <p>
          <strong className="text-white">Best adventurers for {name}</strong>: {best.join(', ')}.
        </p>
      )}
      {good.length > 0 && (
        <p>
          <strong className="text-white">Good adventurers for {name}</strong>: {good.join(', ')}.
        </p>
      )}
      {wasted.length > 0 && (
        <p>
          {wasted.join(', ')} trigger {name}&rsquo;s Core Passive but deal a different element, so the boost is wasted.
        </p>
      )}
    </div>
  );
}

const VISAGE_LEVEL_LABELS = ['Fine', 'Rare', 'Epic', 'Superior', 'Superior+'];

// ── Monster ───────────────────────────────────────────────────

export function MonsterDetail({ page }: { page: MonsterPage }) {
  const m = page.monster;
  const ref = REFERENCE.monsters;
  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: ref.plural, path: '/monsters' },
        { label: m.name, path: `/monsters/${page.slug}` },
      ]}
      title={m.name}
      subtitle={[m.species && labelOf(m.species), m.tier && `${labelOf(m.tier)} tier`, m.is_radiant && 'Radiant', m.name_ja]
        .filter(Boolean)
        .join(' · ')}
      image={m.icon}
      tool={{ label: 'Track Monster Study', path: `${ref.toolPath}?monster=${encodeURIComponent(m.id)}` }}
      updatedAt={page.fetchedAt}
    >
      <Section title="Overview">
        <p className="mb-3 text-sm leading-relaxed text-mh-slate-200">{monsterSummary(page)}</p>
        <FactList
          facts={[
            ['Species', m.species ? labelOf(m.species) : null],
            ['Tier', m.tier ? labelOf(m.tier) : null],
            ['Elements', m.elements.length ? m.elements.map(labelOf).join(', ') : 'None'],
            ['Weaknesses', m.weaknesses.length ? m.weaknesses.map(labelOf).join(', ') : null],
            ['Variant of', page.parent ? <Link key="link" to={`/monsters/${page.parent.slug}/`} className="underline hover:text-mh-gold-400">{page.parent.name}</Link> : null],
            ['Japanese name', m.name_ja],
          ]}
        />
      </Section>

      {page.hitzones.length > 0 && (
        <Section title={`${m.name} hitzones`} id="hitzones">
          <p className="mb-2 text-xs text-mh-slate-400">
            Higher numbers take more damage. Physical values are for cutting, impact (blunt) and shot (ranged) attacks.
          </p>
          <DataTable
            caption={`${m.name} hitzone values`}
            headers={['Part', 'Cut', 'Impact', 'Shot', 'Fire', 'Water', 'Thunder', 'Ice', 'Dragon', 'Weak point']}
            rows={page.hitzones.map((h) => [
              h.state ? `${h.part} (${h.state})` : h.part,
              h.cut, h.impact, h.shot, h.fire, h.water, h.thunder, h.ice, h.dragon,
              h.weak_point_stars ? '★'.repeat(h.weak_point_stars) : '–',
            ])}
          />
        </Section>
      )}

      {page.levels.length > 0 && (
        <Section title={`${m.name} hunt levels & stats`} id="levels">
          <DataTable
            caption={`${m.name} hunt levels`}
            headers={['Hunt', 'Difficulty', 'Monster level', 'Suggested hunt power', 'Health', 'Attack']}
            rows={page.levels.map((l) => [l.content, l.hunt_difficulty, l.monster_level, l.suggested_hunt_power, l.health, l.attack])}
          />
        </Section>
      )}

      {(page.weapons.length > 0 || page.armourSets.length > 0 || page.visages.length > 0) && (
        <Section title={`Gear from ${m.name}`}>
          {page.weapons.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-2 text-xs font-semibold text-mh-slate-300">Weapons</h3>
              <LinkChips base="weapons" items={page.weapons.map((w) => ({ name: `${w.name} (${weaponTypeName(w.weapon_type_id)})`, slug: w.slug }))} />
            </div>
          )}
          {page.armourSets.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-2 text-xs font-semibold text-mh-slate-300">Armour</h3>
              <ul className="space-y-1 text-sm text-mh-slate-200">
                {page.armourSets.map((s) => (
                  <li key={`${s.name}-${s.variant ?? ''}`}>
                    {s.name}
                    {s.variant ? ` (${labelOf(s.variant)})` : ''} — {s.slots.map(labelOf).join(', ')}
                  </li>
                ))}
              </ul>
              <Link to="/armory/armour" className="mt-1 inline-block text-xs text-mh-gold-400 underline">
                Compare armour skills
              </Link>
            </div>
          )}
          {page.visages.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-mh-slate-300">Visage Cards</h3>
              <LinkChips base="visages" items={page.visages} />
            </div>
          )}
        </Section>
      )}

      {page.variants.length > 0 && (
        <Section title={`${m.name} variants`}>
          <LinkChips base="monsters" items={page.variants} />
        </Section>
      )}
    </ReferenceShell>
  );
}

// ── Weapon ────────────────────────────────────────────────────

export function WeaponDetail({ page }: { page: WeaponPage }) {
  const w = page.weapon;
  const ref = REFERENCE.weapons;
  const type = weaponTypeName(w.weapon_type_id);
  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: ref.plural, path: '/weapons' },
        { label: w.name, path: `/weapons/${page.slug}` },
      ]}
      title={w.name}
      subtitle={[type, w.element_type && labelOf(w.element_type), w.rarity != null && `Rarity ${w.rarity}${w.max_rarity ? `–${w.max_rarity}` : ''}`, w.is_apex && 'Apex']
        .filter(Boolean)
        .join(' · ')}
      image={w.image}
      tool={{ label: 'Compare & track', path: `${ref.toolPath}?weapon=${encodeURIComponent(w.id)}` }}
      updatedAt={page.fetchedAt}
    >
      <Section title="Overview">
        <p className="mb-3 text-sm leading-relaxed text-mh-slate-200">{weaponSummary(page)}</p>
        {w.description && <p className="mb-3 text-sm italic text-mh-slate-400">{w.description}</p>}
        <FactList
          facts={[
            ['Weapon type', type],
            ['Made from', page.monster ? <Link key="link" to={`/monsters/${page.monster.slug}/`} className="underline hover:text-mh-gold-400">{page.monster.name}</Link> : null],
            ['Series', w.series],
            ['Attack', w.attack],
            ['Element', w.element_type ? `${labelOf(w.element_type)}${w.element_damage ? ` ${w.element_damage}` : ''}` : null],
            ['Affinity', w.affinity != null ? `${w.affinity}%` : null],
            ['Sharpness', w.sharpness],
            ['Decoration slots', w.deco_slots.length ? w.deco_slots.join(', ') : null],
            ['Rarity', w.rarity != null ? `${w.rarity}${w.max_rarity ? ` (max ${w.max_rarity})` : ''}` : null],
            ['Max name', w.max_name && w.max_name !== w.name ? w.max_name : null],
            ['Apex season', w.is_apex ? w.apex_season ?? 'Yes' : null],
            ['How to obtain', w.source_detail ?? (w.source_type ? labelOf(w.source_type) : null)],
          ]}
        />
      </Section>

      {page.upgrades.length > 0 && (
        <Section title={`${w.name} upgrade stats`}>
          <DataTable
            caption={`${w.name} stats by rarity`}
            headers={['Rarity', 'Name', 'Attack', 'Affinity', 'Element', 'Required level']}
            rows={page.upgrades.map((u) => [
              u.rarity,
              u.name ?? w.name,
              u.attack,
              u.affinity != null ? `${u.affinity}%` : null,
              u.element_type && u.element_type !== 'raw' ? `${labelOf(u.element_type)} ${u.element_damage ?? ''}`.trim() : 'Raw',
              u.required_level,
            ])}
          />
        </Section>
      )}

      <p className="text-xs text-mh-slate-500">
        See all <Link to="/weapons/" className="underline hover:text-mh-gold-400">{type} and other weapons</Link>.
      </p>
    </ReferenceShell>
  );
}

// ── Adventurer ────────────────────────────────────────────────

export function AdventurerDetail({ page }: { page: AdventurerPage }) {
  const a = page.adventurer;
  const ref = REFERENCE.adventurers;
  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: ref.plural, path: '/adventurers' },
        { label: a.name, path: `/adventurers/${page.slug}` },
      ]}
      title={a.name}
      subtitle={[a.title, a.role, a.weapon_type && weaponTypeName(a.weapon_type), a.element_specialization && labelOf(a.element_specialization)]
        .filter(Boolean)
        .join(' · ')}
      image={a.image}
      tool={{ label: 'Track recruitment', path: `${ref.toolPath}?adventurer=${encodeURIComponent(a.id)}` }}
      updatedAt={page.fetchedAt}
    >
      <Section title="Overview">
        <p className="mb-3 text-sm leading-relaxed text-mh-slate-200">{adventurerSummary(page)}</p>
        {a.description && <p className="mb-3 text-sm text-mh-slate-300">{a.description}</p>}
        <FactList
          facts={[
            ['Role', a.role],
            ['Rarity', a.rarity ? labelOf(a.rarity) : null],
            ['Weapon', a.weapon_type ? weaponTypeName(a.weapon_type) : null],
            ['Other weapons', a.allowed_weapon_types.filter((t) => t !== a.weapon_type).map(weaponTypeName).join(', ') || null],
            ['Element', a.element_specialization ? labelOf(a.element_specialization) : null],
            ['Starting buddy', page.defaultBuddy ? <Link key="link" to={`/buddies/${page.defaultBuddy.slug}/`} className="underline hover:text-mh-gold-400">{page.defaultBuddy.name}</Link> : a.default_buddy],
            ['Japanese name', a.name_ja],
          ]}
        />
      </Section>

      {a.playstyle && (
        <Section title="Playstyle">
          <p className="text-sm leading-relaxed text-mh-slate-200">{a.playstyle}</p>
        </Section>
      )}

      {page.skills.length > 0 && (
        <Section title={`${a.name} skills`}>
          <dl className="space-y-3">
            {page.skills.map((s) => (
              <div key={s.name}>
                <dt className="text-sm font-semibold text-white">
                  {s.name}
                  {s.skill_type && <span className="ml-2 text-[11px] font-normal text-mh-slate-500">{labelOf(s.skill_type)}</span>}
                </dt>
                {s.description && <dd className="text-sm text-mh-slate-300">{s.description}</dd>}
              </div>
            ))}
          </dl>
        </Section>
      )}

      {page.gifts.length > 0 && (
        <Section title={`Best gifts for ${a.name}`}>
          <AdventurerGiftSummary name={a.name} gifts={page.gifts} />
          <DataTable
            caption={`${a.name} bond gifts and bond gained per gift`}
            headers={['Gift', 'Category', 'Preference', 'Bond multiplier', 'Bond gained']}
            rows={page.gifts.map((g) => [
              g.name,
              g.category,
              GIFT_PREFERENCE_LABEL[g.preference],
              `${g.multiplier}%`,
              `+${g.bond_gained.toLocaleString('en-GB')}`,
            ])}
          />
        </Section>
      )}

      {a.traits.length > 0 && (
        <Section title="Traits">
          <dl className="space-y-3">
            {a.traits.map((t) => (
              <div key={t.name}>
                <dt className="text-sm font-semibold text-white">{t.name}</dt>
                <dd className="text-sm text-mh-slate-300">{t.description}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </ReferenceShell>
  );
}

// ── Buddy ─────────────────────────────────────────────────────

export function BuddyDetail({ page }: { page: BuddyPage }) {
  const b = page.buddy;
  const ref = REFERENCE.buddies;
  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: ref.plural, path: '/buddies' },
        { label: b.name, path: `/buddies/${page.slug}` },
      ]}
      title={b.name}
      subtitle={[b.tier, b.role, b.species].filter(Boolean).join(' · ')}
      image={b.image}
      tool={{ label: 'Track this buddy', path: `${ref.toolPath}?buddy=${encodeURIComponent(b.id)}` }}
      updatedAt={page.fetchedAt}
    >
      <Section title="Overview">
        <p className="mb-3 text-sm leading-relaxed text-mh-slate-200">{buddySummary(page)}</p>
        {b.description && <p className="mb-3 text-sm text-mh-slate-300">{b.description}</p>}
        <FactList
          facts={[
            ['Rarity', b.tier],
            ['Role', b.role],
            ['Type', b.species],
            ['Core passive', b.core_passive],
            ['Starting buddy of', page.defaultOf ? <Link key="link" to={`/adventurers/${page.defaultOf.slug}/`} className="underline hover:text-mh-gold-400">{page.defaultOf.name}</Link> : null],
            ['Japanese name', b.name_ja],
          ]}
        />
      </Section>

      {page.pairings.length > 0 && (
        <Section title={`Best adventurers for ${b.name}`}>
          <BuddyPairingSummary name={b.name} pairings={page.pairings} />
          <DataTable
            caption={`Adventurers that suit ${b.name} and why`}
            headers={['Adventurer', 'Weapon', 'Rating', 'Trigger', 'Why']}
            rows={page.pairings.map((p) => [
              p.name,
              weaponTypeName(p.weapon_type),
              PAIRING_RATING_LABEL[p.rating],
              p.trigger,
              p.reason,
            ])}
          />
        </Section>
      )}

      {page.skills.length > 0 && (
        <Section title={`${b.name} skills`}>
          <dl className="space-y-3">
            {page.skills.map((s) => (
              <div key={`${s.kind}-${s.name}`}>
                <dt className="text-sm font-semibold text-white">
                  {s.name}
                  <span className="ml-2 text-[11px] font-normal text-mh-slate-500">{labelOf(s.kind)}</span>
                </dt>
                {s.description && <dd className="text-sm text-mh-slate-300">{s.description}</dd>}
              </div>
            ))}
          </dl>
        </Section>
      )}
    </ReferenceShell>
  );
}

// ── Visage Card ───────────────────────────────────────────────

export function VisageDetail({ page }: { page: VisagePage }) {
  const v = page.visage;
  const ref = REFERENCE.visages;
  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: ref.plural, path: '/visages' },
        { label: v.name, path: `/visages/${page.slug}` },
      ]}
      title={v.name}
      subtitle={[page.monster?.name, v.monster_type && `${labelOf(v.monster_type)} monster`, v.points != null && `${v.points} pt`]
        .filter(Boolean)
        .join(' · ')}
      image={page.monster?.icon}
      tool={{ label: 'Track in your collection', path: ref.toolPath }}
      updatedAt={page.fetchedAt}
    >
      <Section title="Overview">
        <p className="mb-3 text-sm leading-relaxed text-mh-slate-200">{visageSummary(page)}</p>
        <FactList
          facts={[
            ['Monster', page.monster ? <Link key="link" to={`/monsters/${page.monster.slug}/`} className="underline hover:text-mh-gold-400">{page.monster.name}</Link> : null],
            ['Card type', v.monster_type ? `${labelOf(v.monster_type)} monster` : null],
            ['Points', v.points],
            ['Ink types', v.ink_types.map(labelOf).join(', ') || null],
            ['Core effect', v.core_effect],
            ['Japanese name', v.name_ja],
          ]}
        />
      </Section>

      {v.max_levels.length > 0 && (
        <Section title="Max level by rarity">
          <DataTable
            caption={`${v.name} max level by card rarity`}
            headers={['Rarity', 'Max level']}
            rows={v.max_levels.map((lvl, i) => [VISAGE_LEVEL_LABELS[i] ?? `Tier ${i + 1}`, lvl])}
          />
        </Section>
      )}

      <p className="text-xs text-mh-slate-500">
        Rate your own copy with the <Link to="/gallery/check" className="underline hover:text-mh-gold-400">Visage Card Checker</Link>.
      </p>
    </ReferenceShell>
  );
}
