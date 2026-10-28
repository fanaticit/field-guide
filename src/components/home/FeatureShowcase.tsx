import { Link } from 'react-router-dom';
import { ArrowRight, Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils';

type Accent = 'epic' | 'fine' | 'rare';

interface Feature {
  title: string;
  description: string;
  /** Screenshot in /public/img/home. Omit for features that only show for signed-in hunters. */
  image?: string;
  imageAlt?: string;
  to: string;
  linkLabel: string;
}

interface Section {
  accent: Accent;
  icon: string;
  title: string;
  tagline: string;
  features: Feature[];
}

const SECTIONS: Section[] = [
  {
    accent: 'epic',
    icon: '/img/ui/Equipment%20Icon.png',
    title: 'Armory',
    tagline: 'Find, plan and share the gear builds that power your hunts.',
    features: [
      {
        title: 'Browse community builds',
        description:
          'See what other hunters are running. Search by title, author, hunter or weapon, then upvote the builds you like so the best ones rise to the top of the list.',
        image: 'armory-builds',
        imageAlt: 'Community builds list in the Armory',
        to: '/armory',
        linkLabel: 'Browse builds',
      },
      {
        title: 'Create, save and chase your builds',
        description:
          'Put together your own build in the Build Planner with a hunter, buddy, weapon, armour and visage cards, then save it. Challenge yourself to hunt down the items you are still missing.',
        image: 'build-planner',
        imageAlt: 'Build Planner showing equipment, visage cards and skills',
        to: '/armory/planner',
        linkLabel: 'Open the Build Planner',
      },
      {
        title: 'Browse every armour piece',
        description:
          "Explore all the armour sets with each piece's defence, resistances, skills and set bonuses. Use it to come up with an armour build for each of your main and support characters.",
        image: 'armour-guide',
        imageAlt: 'Armour guide with an example build and combined skills',
        to: '/armory/armour',
        linkLabel: 'Browse armour',
      },
    ],
  },
  {
    accent: 'fine',
    icon: '/img/ui/Visage%20Icon.png',
    title: 'Gallery',
    tagline: 'Visage Cards: manage your collection and build sets worth sharing.',
    features: [
      {
        title: 'Manage your card collection',
        description:
          'Keep track of which Visage Cards you have in game and what level each one is at, with your progress broken down by ink set and rarity.',
        image: 'visage-collection',
        imageAlt: 'Visage Collection album grouped by ink set',
        to: '/gallery/collection',
        linkLabel: 'Open the album',
      },
      {
        title: 'Create sets and link them to your builds',
        description:
          'Assemble a five card Visage set within the point cap, watch the ink set bonuses light up, and send it straight to the Build Planner to attach it to a build.',
        image: 'visage-builder',
        imageAlt: 'Visage set builder with card slots and set bonuses',
        to: '/gallery/collection?mode=builder',
        linkLabel: 'Build a set',
      },
      {
        title: 'Share your sets with others',
        description:
          'Publish your sets for the community to browse. Everyone can see the core effect and active bonuses, and signed in hunters see at a glance which sets they can build with their own cards.',
        image: 'visage-sets',
        imageAlt: 'Community Visage sets with core effects and Send to Planner buttons',
        to: '/gallery',
        linkLabel: 'Browse Visage sets',
      },
    ],
  },
  {
    accent: 'rare',
    icon: '/img/ui/Challenge%20Icon.png',
    title: 'Challenges',
    tagline: 'Your personal field guide for what to hunt next.',
    features: [
      {
        title: 'Know what to hunt each time you log in',
        description:
          'Add the armour and weapons you want to your challenges and your field guide lists the monsters to hunt next for each piece, and the materials you still need to collect.',
        to: '/challenges',
        linkLabel: 'Start a challenge',
      },
      {
        title: 'Track your buddies',
        description:
          'Mark which buddies you own and see at a glance whether your collection is complete. Missing one? Add it to your recruitment list so you know who to aim for.',
        image: 'buddies',
        imageAlt: 'Buddies collection with rarity, role and core passives',
        to: '/challenges/buddies',
        linkLabel: 'View buddies',
      },
    ],
  },
];

const ACCENT: Record<Accent, { text: string; border: string; bg: string; glow: string }> = {
  epic: {
    text: 'text-[var(--rarity-epic)]',
    border: 'border-[var(--rarity-epic)]/40',
    bg: 'bg-[var(--bg-epic)]',
    glow: 'hover:shadow-[0_0_28px_rgba(156,98,214,0.28)]',
  },
  fine: {
    text: 'text-[var(--rarity-fine)]',
    border: 'border-[var(--rarity-fine)]/40',
    bg: 'bg-[var(--bg-fine)]',
    glow: 'hover:shadow-[0_0_28px_rgba(117,182,112,0.28)]',
  },
  rare: {
    text: 'text-[var(--rarity-rare)]',
    border: 'border-[var(--rarity-rare)]/40',
    bg: 'bg-[var(--bg-rare)]',
    glow: 'hover:shadow-[0_0_28px_rgba(98,169,209,0.28)]',
  },
};

function FeatureVisual({ feature, accent }: { feature: Feature; accent: Accent }) {
  const a = ACCENT[accent];

  if (!feature.image) {
    return (
      <div
        className={cn(
          'flex aspect-[1348/860] w-full flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center',
          a.border,
          a.bg,
        )}
      >
        <Crosshair size={44} className={a.text} />
        <p className="font-display text-lg font-bold uppercase tracking-wide text-white">Hunting Targets</p>
        <p className="max-w-xs text-xs leading-relaxed text-[#A3A3A3]">
          Your personal list of monsters and materials appears here once you sign in and add your first challenge.
        </p>
      </div>
    );
  }

  return (
    <Link
      to={feature.to}
      className={cn('block overflow-hidden rounded-xl border shadow-xl transition-shadow', a.border, a.glow)}
    >
      <img
        src={`/img/home/${feature.image}.jpg`}
        alt={feature.imageAlt ?? feature.title}
        width={1348}
        height={860}
        loading="lazy"
        draggable={false}
        className="block h-auto w-full"
      />
    </Link>
  );
}

export default function FeatureShowcase() {
  return (
    <div className="space-y-20">
      {SECTIONS.map((section) => {
        const a = ACCENT[section.accent];
        return (
          <section key={section.title} className="space-y-10">
            <div className="flex items-center gap-4">
              <img src={section.icon} alt="" draggable={false} className="h-12 w-12 shrink-0 object-contain drop-shadow-md" />
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl">
                  <span className={cn('mr-2 text-base', a.text)}>❖</span>
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-[#A3A3A3]">{section.tagline}</p>
              </div>
              <div className="hidden h-px flex-1 bg-white/10 sm:block" />
            </div>

            <div className="space-y-14">
              {section.features.map((feature, i) => (
                <div key={feature.title} className="grid items-center gap-6 lg:grid-cols-5 lg:gap-10">
                  <div className={cn('space-y-3 lg:col-span-2', i % 2 === 1 && 'lg:order-2')}>
                    <h3 className="font-display text-xl font-bold text-white">{feature.title}</h3>
                    <p className="leading-relaxed text-[#A3A3A3]">{feature.description}</p>
                    <Link
                      to={feature.to}
                      className={cn(
                        'group inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-white',
                        a.text,
                      )}
                    >
                      <span>{feature.linkLabel}</span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                  <div className={cn('lg:col-span-3', i % 2 === 1 && 'lg:order-1')}>
                    <FeatureVisual feature={feature} accent={section.accent} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
