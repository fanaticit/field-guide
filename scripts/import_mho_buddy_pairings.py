#!/usr/bin/env python3
"""
Generate the buddy pairing migration from import/MHO_buddy_pairings.csv.

  buddy_pairings  one row per buddy per adventurer (or Fated Adventurer weapon style):
                  rating, trigger, the skills that trigger the buddy's Core Passive, and why

Ratings (from the export):
  best          buddy trigger in 2+ of the adventurer's skills and matching element
  good          buddy trigger in 1 skill and matching element
  general       squad-wide SR boost that suits this style
  trigger_only  trigger matches but the element boost does not apply

Fated Adventurer rows (ID like "1-14") have no adventurer_id; style_id keeps the export's ID.
The "Why" text has the buddy's Core Passive removed from the front (the modal already shows it).
The migration replaces every pairing, so it is safe to re-run after the CSV changes.

Usage:
  python3 scripts/import_mho_buddy_pairings.py [--out supabase/migrations/<ts>_import_mho_buddy_pairings.sql]
"""
import argparse
import csv
import datetime as dt
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "import" / "MHO_buddy_pairings.csv"
MIGRATIONS = ROOT / "supabase" / "migrations"
RATINGS = {"Best": "best", "Good": "good", "General": "general", "Trigger only": "trigger_only"}
RATING_ORDER = {"best": 1, "good": 2, "general": 3, "trigger_only": 4}
KINDS = {"Adventurer": "adventurer", "Fated": "fated"}
ELEMENTS = {"fire", "water", "thunder", "ice", "dragon"}
OTHER = "other skill text"


def q(v):
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def arr(items):
    if not items:
        return "'{}'::text[]"
    return "ARRAY[" + ", ".join(q(i) for i in items) + "]::text[]"


def snake(v):
    return re.sub(r"[^a-z0-9]+", "_", v.strip().lower()).strip("_")


def element(v):
    v = (v or "").strip().lower()
    return v if v in ELEMENTS else None


def next_stamp():
    today = dt.datetime.now().strftime("%Y%m%d")
    seqs = [int(p.name[8:14]) for p in MIGRATIONS.glob(f"{today}*_*.sql") if p.name[8:14].isdigit()]
    return f"{today}{(max(seqs) + 1 if seqs else 1):06d}"


def reason(row, problems):
    """The Why text without the leading "<Buddy>'s Core Passive: <passive>." sentence(s)."""
    why = row["Why"].strip()
    prefix = f"{row['Buddy'].strip()}'s Core Passive: "
    if why.startswith(prefix):
        rest = why[len(prefix):]
        style = row["Adventurer / style"].strip()
        starts = [style, "The Fated", "It ", "Fated Adventurer"]
        cut = min((i for i in (rest.find(". " + s) for s in starts) if i >= 0), default=-1)
        if cut >= 0:
            why = rest[cut + 2:]
        else:
            problems.append(f"Could not split the Why text for {row['Buddy']} / {style}")
    why = why.replace(OTHER, "other skill effects")
    why = re.sub(r"\bUse a (?=[AEIOU])", "Use an ", why)
    return why


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8-sig", newline="")))
    pairings, seen, problems = [], set(), []
    for r in rows:
        kind = KINDS.get(r["Kind"].strip())
        rating = RATINGS.get(r["Rating"].strip())
        if not kind or not rating:
            problems.append(f"Unknown kind/rating '{r['Kind']}' / '{r['Rating']}' ({r['Adventurer / style']} / {r['Buddy']})")
            continue
        buddy_id, style_id = r["Buddy ID"].strip(), r["Adventurer ID"].strip()
        if (buddy_id, style_id) in seen:
            problems.append(f"Duplicate pairing {r['Buddy']} / {r['Adventurer / style']}")
            continue
        seen.add((buddy_id, style_id))
        skills = [s.strip() for s in r["Trigger skills"].split(";") if s.strip()]
        skills = [("Other skill effects" if s == OTHER else s) for s in skills]
        pairings.append({
            "buddy_id": buddy_id,
            "style_id": style_id,
            "adventurer_id": style_id if kind == "adventurer" else None,
            "kind": kind,
            "style_name": r["Adventurer / style"].strip(),
            "weapon_type": snake(r["Weapon"]) if r["Weapon"].strip() else None,
            "adventurer_element": element(r["Adventurer element"]),
            "buddy_element": element(r["Buddy element"]),
            "rating": rating,
            "trigger_type": r["Trigger"].strip() or None,
            "trigger_skills": skills,
            "bonus_links": [s.strip() for s in r["Bonus links"].split(";") if s.strip()],
            "element_match": rating != "trigger_only" if r["Trigger"].strip() else None,
            "reason": reason(r, problems),
        })
    if problems:
        sys.exit("\n".join(problems))

    pairings.sort(key=lambda p: (p["buddy_id"], RATING_ORDER[p["rating"]], p["kind"] != "adventurer", p["style_name"]))
    stamp = next_stamp()
    out = Path(args.out) if args.out else MIGRATIONS / f"{stamp}_import_mho_buddy_pairings.sql"

    def em(v):
        return "NULL" if v is None else ("TRUE" if v else "FALSE")

    values = ",\n".join(
        f"  ({q(p['buddy_id'])}, {q(p['style_id'])}, {q(p['adventurer_id'])}, {q(p['kind'])}, {q(p['style_name'])}, "
        f"{q(p['weapon_type'])}, {q(p['adventurer_element'])}, {q(p['buddy_element'])}, {q(p['rating'])}, "
        f"{q(p['trigger_type'])}, {arr(p['trigger_skills'])}, {arr(p['bonus_links'])}, {em(p['element_match'])}, "
        f"{q(p['reason'])}, {n})"
        for n, p in enumerate(pairings, start=1))

    sql = f"""-- ============================================================
-- Migration: {out.stem.split('_')[0]} — Buddy / adventurer pairings
-- Source: import/MHO_buddy_pairings.csv — generated by scripts/import_mho_buddy_pairings.py
--   * buddy_pairings: which adventurers (and Fated Adventurer weapon styles) suit each buddy, and why
--   * rating: best / good / general / trigger_only (trigger matches but the element boost is wasted)
--   * replaces all pairings; rows only for buddies/adventurers in the database; safe to re-run
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.buddy_pairings (
  buddy_id           TEXT    NOT NULL REFERENCES public.buddies(id) ON UPDATE CASCADE ON DELETE CASCADE,
  style_id           TEXT    NOT NULL,  -- adventurer id, or the export's Fated style id (e.g. '1-14')
  adventurer_id      TEXT    REFERENCES public.adventurers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  kind               TEXT    NOT NULL CHECK (kind IN ('adventurer', 'fated')),
  style_name         TEXT    NOT NULL,  -- adventurer name or 'Fated Adventurer (Bow)'
  weapon_type        TEXT,              -- e.g. 'long_sword'
  adventurer_element TEXT,              -- NULL for Fated (uses the weapon's element)
  buddy_element      TEXT,              -- element the buddy's Core Passive boosts (NULL for squad-wide SR boosts)
  rating             TEXT    NOT NULL CHECK (rating IN ('best', 'good', 'general', 'trigger_only')),
  trigger_type       TEXT,              -- e.g. 'Parry', 'Charge' (NULL for squad-wide boosts)
  trigger_skills     TEXT[]  NOT NULL DEFAULT '{{}}',
  bonus_links        TEXT[]  NOT NULL DEFAULT '{{}}',
  element_match      BOOLEAN,
  reason             TEXT,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (buddy_id, style_id)
);
CREATE INDEX IF NOT EXISTS idx_buddy_pairings_adventurer ON public.buddy_pairings(adventurer_id);

ALTER TABLE public.buddy_pairings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buddy_pairings_select_all" ON public.buddy_pairings;
CREATE POLICY "buddy_pairings_select_all" ON public.buddy_pairings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "buddy_pairings_admin_all" ON public.buddy_pairings;
CREATE POLICY "buddy_pairings_admin_all" ON public.buddy_pairings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TEMP TABLE _buddy_pairings (
  buddy_id TEXT, style_id TEXT, adventurer_id TEXT, kind TEXT, style_name TEXT, weapon_type TEXT,
  adventurer_element TEXT, buddy_element TEXT, rating TEXT, trigger_type TEXT, trigger_skills TEXT[],
  bonus_links TEXT[], element_match BOOLEAN, reason TEXT, sort_order INTEGER
) ON COMMIT DROP;

INSERT INTO _buddy_pairings VALUES
{values};

DELETE FROM public.buddy_pairings;

INSERT INTO public.buddy_pairings
SELECT p.*
FROM _buddy_pairings p
WHERE EXISTS (SELECT 1 FROM public.buddies b WHERE b.id = p.buddy_id)
  AND (p.adventurer_id IS NULL OR EXISTS (SELECT 1 FROM public.adventurers a WHERE a.id = p.adventurer_id));

COMMIT;
"""
    out.write_text(sql, encoding="utf-8")
    from collections import Counter
    counts = Counter(p["rating"] for p in pairings)
    print(f"{len(pairings)} pairings for {len({p['buddy_id'] for p in pairings})} buddies "
          f"({', '.join(f'{k} {v}' for k, v in counts.items())}) -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
