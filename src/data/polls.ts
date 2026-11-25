// ─────────────────────────────────────────────────────────────
// Site polls. Every poll's votes go into the one `poll_votes` table;
// the questions live here.
//
// To add a poll: add an entry below, then put <PollPrompt pollId="…" />
// where it should appear. Set `active: false` to stop collecting votes
// (results stay in the admin Polls tab).
// ─────────────────────────────────────────────────────────────

export interface PollAnswer {
  id: string;
  label: string;
}

export interface PollDef {
  id: string;
  question: string;
  answers: PollAnswer[];
  /** What a voter sees after answering */
  after: 'results' | 'thanks';
  thanksMessage?: string;
  /** Where the poll appears (shown in the admin tab) */
  page: string;
  active: boolean;
  /** Decision target, e.g. build the feature if 50% say yes */
  goal?: { answer: string; percent: number; note?: string };
  started: string;
}

export const POLLS: PollDef[] = [
  {
    id: 'visage-card-save',
    question: 'Would you want to save this card on the site to see a set’s stats?',
    answers: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
    after: 'results',
    thanksMessage: 'Thanks for voting! We’ll build it if enough hunters want it.',
    page: '/gallery/check',
    active: true,
    goal: { answer: 'yes', percent: 50, note: 'Build "save card for set stats" if half the voters say yes.' },
    started: '2026-11-25',
  },
];

export function getPoll(id: string): PollDef | undefined {
  return POLLS.find((p) => p.id === id);
}
