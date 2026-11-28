// ─────────────────────────────────────────────────────────────
// /investigation-journey — guide to the in-game Investigation Journey:
// the hidden monsters it unlocks, the path, what each step needs and the
// rewards. Pre-rendered from investigation_journey_steps (imported from
// import/MHO_monster_investigation_journey.json), so a new export updates it.
// ─────────────────────────────────────────────────────────────
import type React from 'react';
import { Link, useLoaderData } from 'react-router';
import type { MetaArgs } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowDown, Gift, PlayCircle } from 'lucide-react';
import { publicData, type JourneyPage, type JourneyPageStep, type JourneyMonsterRef } from '../seo/publicData';
import { PAGES, INVESTIGATION_JOURNEY_VIDEO_URL } from '../seo/pages';
import { breadcrumbJsonLd, buildMeta } from '../seo/meta';
import { absoluteUrl, canonicalPath } from '../seo/site';
import { extractYouTubeId, getYouTubeEmbedUrl } from '../lib/youtube';
import ReferenceShell, { DataTable, Section } from '../components/reference/ReferenceShell';

const page = PAGES.investigationJourney;

async function load(): Promise<JourneyPage> {
  return publicData().investigationJourney();
}

export async function loader() {
  return load();
}

export async function clientLoader() {
  return load();
}

// ── Wording helpers (all from the data) ──────────────────────

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const rewardText = (s: JourneyPageStep) =>
  s.rewards.map((r) => `${r.count.toLocaleString('en-GB')} ${r.item}`.replace(/^1 /, '')).join(', ');

const monsterSteps = (steps: JourneyPageStep[]) => steps.filter((s) => !s.isGrandPrize);

/** "Server day 13 · 180 studies · 5 studies of Radiant Paolumu" */
function needsText(s: JourneyPageStep): string[] {
  const out: string[] = [];
  if (s.serverDay != null) out.push(`your game server to have been open for ${s.serverDay} days`);
  if (s.totalStudies != null) out.push(`${s.totalStudies} Investigation Notes studies in total (any monster)`);
  if (s.monsterStudies && s.studiesOf) out.push(`${s.monsterStudies} Investigation Notes studies of ${s.studiesOf.name}`);
  return out;
}

function unlockAnswer(s: JourneyPageStep): string {
  const needs = needsText(s);
  const extra: string[] = [];
  if (s.ecologicalRank) extra.push(`It can then appear in the field from Ecological Rank ${s.ecologicalRank}`);
  if (s.lairDifficulty) extra.push(`its lair (Free Hunt) opens once you have unlocked lair Difficulty ${s.lairDifficulty}`);
  return `${s.unlocks.name} is step ${s.step} of Investigation Journey ${s.journey}. It needs ${list(needs)}.${extra.length ? ` ${extra.join(', and ')}.` : ''}${s.rewards.length ? ` Reward: ${rewardText(s)}.` : ''}`;
}

function summary(steps: JourneyPageStep[]): string {
  const monsters = monsterSteps(steps).map((s) => s.unlocks.name);
  const journeys = [...new Set(steps.map((s) => s.journey))];
  return `The Investigation Journey in Monster Hunter Outlanders unlocks ${monsters.length} hidden monsters in ${journeys.length} parts: ${list(monsters)}. Each step needs Investigation Notes studies and, for most steps, a number of days since your game server opened.`;
}

// ── Meta ─────────────────────────────────────────────────────

export function meta({ loaderData }: MetaArgs<typeof loader>) {
  const steps = loaderData?.steps ?? [];
  const video = getYouTubeEmbedUrl(INVESTIGATION_JOURNEY_VIDEO_URL);
  const videoId = extractYouTubeId(INVESTIGATION_JOURNEY_VIDEO_URL);
  const url = absoluteUrl(canonicalPath(page.path));
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.heading,
      name: page.title,
      description: page.description,
      url,
      about: { '@type': 'VideoGame', name: 'Monster Hunter Outlanders' },
      ...(loaderData?.fetchedAt ? { dateModified: loaderData.fetchedAt } : {}),
    },
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Monsters', path: '/monsters' },
      { name: page.heading, path: page.path },
    ]),
  ];
  if (steps.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What monsters does the Investigation Journey unlock?',
          acceptedAnswer: { '@type': 'Answer', text: summary(steps) },
        },
        ...monsterSteps(steps).map((s) => ({
          '@type': 'Question',
          name: `How do I unlock ${s.unlocks.name} in Monster Hunter Outlanders?`,
          acceptedAnswer: { '@type': 'Answer', text: unlockAnswer(s) },
        })),
      ],
    });
  }
  if (video && videoId) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `${page.heading} guide – Monster Hunter Outlanders`,
      description: page.description,
      embedUrl: video,
      contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  return buildMeta({ title: page.title, rawTitle: true, description: page.description, path: page.path, type: 'article', jsonLd });
}

export function HydrateFallback() {
  return <div className="p-8 text-center text-sm text-mh-slate-500">Loading…</div>;
}

// ── Page parts ───────────────────────────────────────────────

function MonsterName({ m }: { m: JourneyMonsterRef }) {
  return m.slug ? (
    <Link to={`/monsters/${m.slug}/`} className="font-semibold text-white underline decoration-white/20 underline-offset-2 hover:text-mh-gold-300">
      {m.name}
    </Link>
  ) : (
    <span className="font-semibold text-white">{m.name}</span>
  );
}

function PathNode({ m, label, sub, grand = false }: { m: JourneyMonsterRef; label: string; sub?: string; grand?: boolean }) {
  return (
    <li className="flex w-full flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/25 px-2 py-2 text-center sm:w-28">
      {grand ? (
        <Gift size={36} className="text-mh-gold-400" aria-hidden="true" />
      ) : m.icon ? (
        <img src={m.icon} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 object-contain" />
      ) : (
        <span className="h-12 w-12 rounded bg-white/5" aria-hidden="true" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-gold-400">{label}</span>
      <span className="text-xs leading-tight"><MonsterName m={m} /></span>
      {sub && <span className="text-[10px] text-mh-slate-400">{sub}</span>}
    </li>
  );
}

function Arrow() {
  return (
    <li aria-hidden="true" className="flex items-center justify-center text-mh-gold-400/80">
      <ArrowRight size={18} className="hidden sm:block" />
      <ArrowDown size={18} className="sm:hidden" />
    </li>
  );
}

function JourneyPath({ steps }: { steps: JourneyPageStep[] }) {
  const first = steps[0];
  const items: React.ReactElement[] = [];
  if (first?.studiesOf && first.monsterStudies) {
    items.push(<PathNode key="start" m={first.studiesOf} label="Start" sub={`Study it ${first.monsterStudies}×`} />);
  }
  for (const s of steps) {
    if (items.length) items.push(<Arrow key={`a-${s.id}`} />);
    items.push(
      s.isGrandPrize ? (
        <PathNode key={s.id} m={s.unlocks} label="Grand Prize" sub={rewardText(s)} grand />
      ) : (
        <PathNode key={s.id} m={s.unlocks} label={`Step ${s.step}`} sub={s.serverDay != null ? `Server day ${s.serverDay}` : 'No day limit'} />
      ),
    );
  }
  return <ol className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">{items}</ol>;
}

// ── Page ─────────────────────────────────────────────────────

export default function InvestigationJourneyPage() {
  const initial = useLoaderData<typeof loader>();
  const { data } = useQuery({
    queryKey: ['public-investigation-journey'],
    queryFn: load,
    initialData: initial,
    initialDataUpdatedAt: Date.parse(initial.fetchedAt),
    staleTime: 5 * 60 * 1000,
  });
  const steps = data.steps;
  const journeys = [...new Set(steps.map((s) => s.journey))];
  const monsters = monsterSteps(steps);
  const video = getYouTubeEmbedUrl(INVESTIGATION_JOURNEY_VIDEO_URL);

  const monsterReward = monsters.find((s) => s.rewards.length);
  const grand = steps.find((s) => s.isGrandPrize && s.rewards.length);
  const studyCounts = [...new Set(monsters.map((s) => s.monsterStudies).filter(Boolean))];
  const noMonsterNeeded = monsters.filter((s) => !s.studiesOf);
  const ranks = monsters.map((s) => s.ecologicalRank).filter((x): x is number => x != null);
  const difficulties = [...new Set(monsters.map((s) => s.lairDifficulty).filter(Boolean))] as string[];

  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: 'Monsters', path: '/monsters' },
        { label: page.heading, path: page.path },
      ]}
      title="Investigation Journey – Monster Hunter Outlanders"
      subtitle={steps.length ? `${monsters.length} hidden monsters · ${journeys.length} journeys · requirements and rewards` : page.description}
      tool={{ label: 'Track it in the Monster Field Guide', path: '/challenges/monsters?journey=1' }}
      updatedAt={data.fetchedAt}
    >
      {steps.length === 0 ? (
        <Section title="Investigation Journey">
          <p className="text-sm text-mh-slate-300">The Investigation Journey details are being added. Check back soon.</p>
        </Section>
      ) : (
        <>
          <Section title="Quick answer">
            <p className="text-sm leading-relaxed text-mh-slate-200">{summary(steps)}</p>
            <p className="mt-2 text-sm leading-relaxed text-mh-slate-300">
              Each journey unlocks {monsterSteps(steps.filter((s) => s.journey === journeys[0])).length} monsters in order and ends with a
              Grand Prize.
              {monsterReward && ` Every monster step rewards ${rewardText(monsterReward)}`}
              {grand && `, and each Grand Prize is a ${grand.rewards.map((r) => r.item).join(', ')} (a gift box from the Rutacos)`}.
            </p>
          </Section>

          {video && (
            <Section title="Video guide">
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10">
                <iframe
                  src={video}
                  title="Investigation Journey video guide"
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </Section>
          )}
          {!video && (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-mh-slate-500">
              <PlayCircle size={13} aria-hidden="true" /> A video guide for the Investigation Journey is coming soon.
            </p>
          )}

          <Section title="The journey path">
            <div className="space-y-4">
              {journeys.map((j) => (
                <div key={j}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mh-slate-300">Investigation Journey {j}</h3>
                  <JourneyPath steps={steps.filter((s) => s.journey === j)} />
                </div>
              ))}
            </div>
          </Section>

          {journeys.map((j) => {
            const js = steps.filter((s) => s.journey === j);
            return (
              <Section key={j} title={`Journey ${j} requirements and rewards`}>
                <DataTable
                  caption={`Investigation Journey ${j}: what each step needs and gives`}
                  headers={['Step', 'Unlocks', 'Server day', 'Total studies', 'Monster studies', 'Ecological Rank', 'Lair difficulty', 'Reward']}
                  rows={js.map((s) => [
                    s.step,
                    s.unlocks.name,
                    s.serverDay != null ? `Day ${s.serverDay}` : '–',
                    s.totalStudies ?? '–',
                    s.monsterStudies && s.studiesOf ? `${s.monsterStudies} × ${s.studiesOf.name}` : '–',
                    s.ecologicalRank ?? '–',
                    s.lairDifficulty ?? '–',
                    rewardText(s) || '–',
                  ])}
                />
              </Section>
            );
          })}

          <Section title="How the requirements work">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-mh-slate-300">
              <li>
                Most steps need <strong className="text-white">both</strong> a total number of Investigation Notes studies across all
                monsters <strong className="text-white">and</strong>{' '}
                {studyCounts.length === 1 ? `${studyCounts[0]} studies` : 'studies'} of the previous monster on the journey.
              </li>
              <li>
                The time gate is the number of <strong className="text-white">days since your game server opened</strong>, not a
                calendar date. The game works it out from your server's open time, so it is different on every server.
              </li>
              {first(monsters)?.studiesOf && (
                <li>The first step needs studies of {first(monsters)!.studiesOf!.name}, which starts the journey.</li>
              )}
              {noMonsterNeeded.map((s) => (
                <li key={s.id}>
                  Journey {s.journey}, step {s.step} ({s.unlocks.name}) has no monster requirement — only the server day and total studies.
                </li>
              ))}
              {grand && <li>The Grand Prizes only need the monster studies of the journey's last monster.</li>}
              {ranks.length > 0 && (
                <li>
                  Unlocking a monster lets it appear in the field and opens its lair (Free Hunt). Each needs a minimum Ecological Rank (
                  {Math.min(...ranks)}–{Math.max(...ranks)}){difficulties.length ? ` and lair difficulty (${difficulties.join(', ')})` : ''}.
                </li>
              )}
            </ul>
          </Section>

          <Section title="How to unlock each monster">
            <div className="space-y-4">
              {monsters.map((s) => (
                <div key={s.id} id={s.unlocks.slug ?? s.id} className="flex gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  {s.unlocks.icon && <img src={s.unlocks.icon} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 object-contain" />}
                  <div className="min-w-0">
                    <h3 className="text-sm">
                      How to unlock <MonsterName m={s.unlocks} />
                      <span className="ml-2 text-[11px] font-normal text-mh-slate-500">Journey {s.journey} · Step {s.step}</span>
                    </h3>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-mh-slate-300">
                      {s.serverDay != null && <li>Available from server day {s.serverDay}</li>}
                      {s.totalStudies != null && <li>{s.totalStudies} Investigation Notes studies (any monster)</li>}
                      {s.monsterStudies && s.studiesOf && (
                        <li>
                          {s.monsterStudies} Investigation Notes studies of <MonsterName m={s.studiesOf} />
                        </li>
                      )}
                    </ul>
                    {s.whatUnlockingDoes && <p className="mt-1 text-xs leading-relaxed text-mh-slate-400">{s.whatUnlockingDoes}</p>}
                    {s.rewards.length > 0 && <p className="mt-1 text-xs text-mh-gold-300">Reward: {rewardText(s)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Track your journey">
            <p className="text-sm leading-relaxed text-mh-slate-300">
              In the <Link to="/challenges/monsters?journey=1" className="text-sky-300 underline hover:text-white">Monster Field Guide</Link>,
              turn on <strong className="text-white">Investigation Journey</strong> to see the monsters you've unlocked joined up on the grid.
              Log your Free Hunt Studies on each monster, and when the previous monster has enough studies the next one is marked as unlocked
              for you. Every monster's "How to unlock" link shows what its step needs.
            </p>
          </Section>
        </>
      )}
    </ReferenceShell>
  );
}

function first<T>(items: T[]): T | undefined {
  return items[0];
}
