// Shape of a game patch on the /updates/ page. To add a patch, create a
// file like patch-1.0.9.4.ts and add it to the top of PATCHES in index.ts.
// Keep spoilers (unreleased monsters, adventurers, dated future banners)
// out of these files — they are public and pre-rendered for search engines.

export type PatchIcon = 'new' | 'items' | 'balance' | 'health' | 'progression' | 'recruitment' | 'content' | 'fixes' | 'info';

export interface PatchTable {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface PatchSection {
  id: string;
  title: string;
  icon: PatchIcon;
  summary?: string;
  bullets?: string[];
  table?: PatchTable;
  /** Small print under the section */
  note?: string;
  /** Span both columns */
  wide?: boolean;
}

export interface PatchNotes {
  version: string;
  /** ISO date the update was released / extracted */
  date: string;
  headlines: string[];
  /** Points to the Spoilers page for content that is held back here */
  spoilerNotice?: string;
  sections: PatchSection[];
  disclaimer?: string;
}
