#!/usr/bin/env python3
"""
Generate the recruitment-banner migration from import/MHO_banners.json and convert each banner's
key art from "import/image add/Banners" into small WebP files in public/images/banners/.

  public.banners   one row per banner: dates, featured adventurer/buddy, rate-up text, SSR pool,
                   icon, hero image and a small gallery.

Spoilers
  * Banners are only shown on the Spoilers page. The database only returns them to logged-in
    hunters with "Show Spoilers" on (and admins) – there is no public read access.
  * Rows with Debug = yes, or with no start date (prepared but not scheduled), are also flagged
    is_spoiler so the page can label them as datamined.

Status (Coming soon / Live / Ended) is NOT stored: the site works it out from start/end times,
so a banner switches over on the day without a re-import.

Images (needs Pillow: pip install pillow)
  hero     the loading poster (falls back to face-shot background, then portrait)  ≤1600px wide
  gallery  bust, portrait, outfit variants, weapon skin, face-shot background        ≤1024px
  icon     the in-game banner icon                                                    256px
  Existing WebP files are kept unless --force is given.

Usage:
  python3 scripts/import_mho_banners.py [--out supabase/migrations/<ts>_import_mho_banners.sql]
                                        [--force] [--no-images]
"""
import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANNERS_JSON = ROOT / "import" / "MHO_banners.json"
IMAGES_JSON = ROOT / "import" / "MHO_banner_images.json"
IMAGE_SRC = ROOT / "import" / "image add" / "Banners"
IMAGE_DST = ROOT / "public" / "images" / "banners"
IMAGE_URL = "/images/banners/"
MIGRATIONS = ROOT / "supabase" / "migrations"

CATEGORY = {
    "Featured Recruitment": "featured",
    "Festival Recruitment": "festival",
    "Rotating Recruitment": "rotating",
    "Buddy Recruitment": "buddy",
    "Standard Recruitment": "standard",
    "Beginner's Recruitment": "beginner",
}
SORT = {"featured": 1, "festival": 2, "rotating": 3, "buddy": 4, "standard": 8, "beginner": 9, "other": 7}
GALLERY_MAX = 6


def q(v):
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def ts(v):
    v = (v or "").strip()
    return "NULL" if not v else q(v + ":00+00")


def next_stamp():
    today = dt.datetime.now().strftime("%Y%m%d")
    seqs = [int(p.name[8:14]) for p in MIGRATIONS.glob(f"{today}*_*.sql") if p.name[8:14].isdigit()]
    return f"{today}{(max(seqs) + 1 if seqs else 1):06d}"


def folder_ids(folder):
    """Banner_3001-3003_AutumnRefrain_Midori -> {'3001', '3003'} (a hyphen lists IDs, not a range)."""
    m = re.match(r"Banner_([\d-]+)_", folder)
    return set(m.group(1).split("-")) if m else set()


def resolve(png_path):
    """PNG\\Banners\\<folder>\\MHMobile\\... -> the file under import/image add/Banners (case-insensitive)."""
    parts = png_path.replace("\\", "/").split("/")[2:]
    p = IMAGE_SRC.joinpath(*parts)
    if p.exists():
        return p
    cur = IMAGE_SRC
    for part in parts:
        if not cur.is_dir():
            return None
        match = next((c for c in cur.iterdir() if c.name.lower() == part.lower()), None)
        if match is None:
            return None
        cur = match
    return cur


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


class Converter:
    def __init__(self, force, enabled):
        self.force = force
        self.enabled = enabled
        self.converted = 0
        self.kept = 0
        if enabled:
            try:
                from PIL import Image  # noqa: F401
            except ImportError:
                sys.exit("Pillow is needed for the banner images: pip install pillow  (or use --no-images)")

    def __call__(self, src, folder, max_side, *, max_width=None):
        name = slug(src.stem) + ".webp"
        dst = IMAGE_DST / slug(folder) / name
        url = IMAGE_URL + slug(folder) + "/" + name
        if not self.enabled:
            return url
        if dst.exists() and not self.force:
            self.kept += 1
            return url
        from PIL import Image

        dst.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            im = im.convert("RGBA")
            if max_width and im.width > max_width:
                im = im.resize((max_width, round(im.height * max_width / im.width)), Image.LANCZOS)
            im.thumbnail((max_side, max_side), Image.LANCZOS)
            im.save(dst, "WEBP", quality=82, method=6)
        self.converted += 1
        return url


def variant_of(stem, code):
    """RolePortrait_FTwoA03_Nyx -> 'Nyx'; RolePortrait_FTwoA03 -> ''."""
    tail = stem.split(code, 1)[1] if code and code in stem else ""
    return tail.strip("_")


def pick_images(rows, featured, convert, folder):
    by_type = {}
    for r in rows:
        src = resolve(r["PNG path"]) if r.get("PNG path") else None
        if src:
            by_type.setdefault(r["Image type"], []).append(src)

    icon = None
    if by_type.get("Banner icon"):
        icon = convert(by_type["Banner icon"][0], folder, 256)

    portraits = by_type.get("Portrait", [])
    busts = by_type.get("Bust", [])
    code = None
    if portraits:
        m = re.match(r"(?:Role|Pet)Portrait_([A-Za-z0-9]+)", portraits[0].stem)
        code = m.group(1) if m else None

    def find(type_, pred):
        return next((p for p in by_type.get(type_, []) if pred(p.stem)), None)

    poster = find("Loading poster", lambda s: True)
    face_bg = find("Face shot", lambda s: s.endswith("_BG"))
    base_portrait = next((p for p in portraits if not variant_of(p.stem, code)), portraits[0] if portraits else None)

    hero_src = poster or face_bg or base_portrait
    hero = convert(hero_src, folder, 1920, max_width=1600) if hero_src else None

    name = featured or "Featured"
    gallery = []

    def add(src, caption):
        if src and src != hero_src and len(gallery) < GALLERY_MAX and all(g[0] != src for g in gallery):
            gallery.append((src, caption))

    add(next((b for b in busts if not variant_of(b.stem, code)), None), f"{name} bust")
    add(base_portrait, f"{name} full art")
    for p in portraits:
        v = variant_of(p.stem, code)
        if v and v.lower() != "preview":
            add(p, f"{name} – {re.sub(r'(?<!^)(?=[A-Z])', ' ', v)} outfit")
    add(find("Weapon skin", lambda s: s.startswith("WeaponDisplay_")), f"{name} weapon skin")
    add(face_bg, f"{name} showcase")
    add(find("Portrait", lambda s: s.lower().endswith("_preview")), f"{name} preview art")

    return icon, hero, [{"src": convert(src, folder, 1024), "caption": cap} for src, cap in gallery]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    ap.add_argument("--force", action="store_true", help="re-convert images that already exist")
    ap.add_argument("--no-images", action="store_true", help="skip image conversion (paths are still written)")
    args = ap.parse_args()

    banners = json.loads(BANNERS_JSON.read_text(encoding="utf-8"))
    image_rows = json.loads(IMAGES_JSON.read_text(encoding="utf-8")) if IMAGES_JSON.exists() else []
    convert = Converter(args.force, not args.no_images)

    folders = {}
    for r in image_rows:
        if r.get("Folder"):
            folders.setdefault(r["Folder"], []).append(r)

    rows = []
    for b in banners:
        bid = str(b["Banner ID"])
        category = CATEGORY.get(b.get("Type") or "", "other")
        start, end = (b.get("Start (UTC)") or "").strip(), (b.get("End (UTC)") or "").strip()
        permanent = (b.get("Status") or "").lower() == "permanent"
        is_debug = (b.get("Debug") or "").strip().lower() == "yes"
        is_spoiler = is_debug or (not start and not permanent)
        featured = (b.get("Featured") or "").strip()
        featured_type = (b.get("Featured type") or "").strip()
        item_id = str(b.get("Featured item ID") or "").strip()
        adv_id = str(b.get("Featured adventurer ID") or "").strip()
        buddy_id = item_id if featured_type == "Buddy" else ""
        name = (b.get("Banner") or "").strip()
        if not name or name.startswith("("):
            name = f"Unnamed banner ({featured})" if featured else "Unnamed banner"

        folder = next((f for f in folders if bid in folder_ids(f)), None)
        icon = hero = None
        gallery = []
        if folder:
            icon, hero, gallery = pick_images(folders[folder], featured, convert, folder)

        pool = [p.strip() for p in (b.get("SSR pool") or "").split("|") if p.strip()]
        rows.append(
            "  ("
            + ", ".join([
                q(bid), q(name), q(b.get("Type")), q(category), str(int(b["Series"])) if b.get("Series") not in (None, "") else "NULL",
                q(featured_type), q(item_id), q(featured), q(adv_id), q(buddy_id),
                q(b.get("Featured monster (note)")), q(b.get("Featured weapon (note)")),
                ts(start), ts(end), "TRUE" if permanent else "FALSE",
                q(b.get("Rate-up text")), q(b.get("Featured pity")),
                "ARRAY[" + ", ".join(q(p) for p in pool) + "]::text[]" if pool else "'{}'::text[]",
                q(icon), q(hero), q(json.dumps(gallery, ensure_ascii=False)) + "::jsonb",
                "TRUE" if is_spoiler else "FALSE", str(SORT[category] * 10000 + int(bid) % 10000),
            ])
            + ")"
        )

    ids = ", ".join(q(str(b["Banner ID"])) for b in banners)
    values = ",\n".join(rows)
    sql = f"""-- ============================================================
-- Migration: recruitment banners
-- Source: import/MHO_banners.json (+ MHO_banner_images.json) — generated by scripts/import_mho_banners.py
--   * status (Coming soon / Live / Ended) is worked out by the site from start_at / end_at
--   * banners are spoiler content: only logged-in hunters with "Show Spoilers" on (and admins)
--     can read them
--   * safe to re-run; banners missing from the import are removed
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.banners (
  id                     TEXT        PRIMARY KEY,
  name                   TEXT        NOT NULL,
  banner_type            TEXT,
  category               TEXT        NOT NULL DEFAULT 'other',  -- featured | festival | rotating | buddy | standard | beginner | other
  series                 INTEGER,
  featured_type          TEXT,                                 -- Adventurer | Buddy
  featured_item_id       TEXT,
  featured_name          TEXT,
  featured_adventurer_id TEXT,
  featured_buddy_id      TEXT,
  featured_monster       TEXT,
  featured_weapon        TEXT,
  start_at               TIMESTAMPTZ,
  end_at                 TIMESTAMPTZ,
  is_permanent           BOOLEAN     NOT NULL DEFAULT FALSE,
  rate_up_text           TEXT,
  featured_pity          TEXT,
  ssr_pool               TEXT[]      NOT NULL DEFAULT '{{}}',
  icon                   TEXT,
  hero_image             TEXT,
  gallery                JSONB       NOT NULL DEFAULT '[]',     -- [{{ "src": "...", "caption": "..." }}]
  is_spoiler             BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  notes                  TEXT,
  sort_order             INTEGER     NOT NULL DEFAULT 0,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON public.banners(start_at, end_at);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Banners are spoiler content: there is no public read access at all.
DROP POLICY IF EXISTS "banners_select_public" ON public.banners;

-- Logged-in hunters with "Show Spoilers" on, and admins: everything.
DROP POLICY IF EXISTS "banners_select_spoilers" ON public.banners;
CREATE POLICY "banners_select_spoilers" ON public.banners FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.show_spoilers OR p.role = 'admin')));

DROP POLICY IF EXISTS "banners_admin_all" ON public.banners;
CREATE POLICY "banners_admin_all" ON public.banners FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.banners (
  id, name, banner_type, category, series,
  featured_type, featured_item_id, featured_name, featured_adventurer_id, featured_buddy_id,
  featured_monster, featured_weapon,
  start_at, end_at, is_permanent,
  rate_up_text, featured_pity, ssr_pool,
  icon, hero_image, gallery,
  is_spoiler, sort_order
) VALUES
{values}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, banner_type = EXCLUDED.banner_type, category = EXCLUDED.category, series = EXCLUDED.series,
  featured_type = EXCLUDED.featured_type, featured_item_id = EXCLUDED.featured_item_id,
  featured_name = EXCLUDED.featured_name, featured_adventurer_id = EXCLUDED.featured_adventurer_id,
  featured_buddy_id = EXCLUDED.featured_buddy_id, featured_monster = EXCLUDED.featured_monster,
  featured_weapon = EXCLUDED.featured_weapon, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at,
  is_permanent = EXCLUDED.is_permanent, rate_up_text = EXCLUDED.rate_up_text, featured_pity = EXCLUDED.featured_pity,
  ssr_pool = EXCLUDED.ssr_pool, icon = EXCLUDED.icon, hero_image = EXCLUDED.hero_image, gallery = EXCLUDED.gallery,
  is_spoiler = EXCLUDED.is_spoiler, sort_order = EXCLUDED.sort_order, updated_at = now();

DELETE FROM public.banners WHERE id NOT IN ({ids});

COMMIT;
"""
    out = Path(args.out) if args.out else MIGRATIONS / f"{next_stamp()}_import_mho_banners.sql"
    out.write_text(sql, encoding="utf-8")
    spoilers = sum(1 for r in rows if r.rstrip(")").split(", ")[-2] == "TRUE")
    print(f"{len(rows)} banners ({spoilers} spoiler), images: {convert.converted} converted, {convert.kept} kept -> {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")


if __name__ == "__main__":
    main()
