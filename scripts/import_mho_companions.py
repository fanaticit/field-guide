#!/usr/bin/env python3
"""
import_mho_companions.py — Parse import/MHO_companions.csv and generate
migration to add status, status_reason, is_spoiler, and is_debug columns to public.buddies and populate them.

Usage:
  python3 scripts/import_mho_companions.py [--out supabase/migrations/20261105000005_buddies_status_and_spoilers.sql]
"""
import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "import" / "MHO_companions.csv"
DEFAULT_OUT = ROOT / "supabase" / "migrations" / "20261105000005_buddies_status_and_spoilers.sql"


def main():
    parser = argparse.ArgumentParser(description="Generate SQL migration for buddy status & spoilers")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output SQL migration path")
    args = parser.parse_args()

    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Missing CSV at {CSV_PATH}")

    rows = []
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            buddy_id = (r.get("ID") or r.get("\ufeffID") or "").strip()
            name = (r.get("Name") or "").strip()
            raw_status = (r.get("Status") or "In game").strip()
            debug_raw = (r.get("Debug") or "").strip().lower()
            if not buddy_id:
                continue

            in_game = raw_status.lower() == "in game"
            upcoming = raw_status.lower().startswith("upcoming")
            status = "in_game" if in_game else "not_in_game"
            status_reason = None if in_game else raw_status
            is_spoiler = upcoming or not in_game
            is_debug = debug_raw in ("true", "1", "yes", "debug") or "debug" in raw_status.lower()

            rows.append({
                "id": buddy_id,
                "name": name,
                "status": status,
                "status_reason": status_reason,
                "is_spoiler": is_spoiler,
                "is_debug": is_debug,
            })

    sql_lines = [
        "-- ============================================================",
        "-- Migration: 20261105000005 — Buddy status & spoiler fields",
        "-- Source: import/MHO_companions.csv",
        "--   * adds status, status_reason, is_spoiler, is_debug to public.buddies",
        "--   * gates upcoming buddies (e.g. Lynn) and debug buddies behind user spoiler preference",
        "-- ============================================================",
        "",
        "BEGIN;",
        "",
        "-- 1. Add columns to public.buddies",
        "ALTER TABLE public.buddies",
        "  ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'in_game',",
        "  ADD COLUMN IF NOT EXISTS status_reason TEXT,",
        "  ADD COLUMN IF NOT EXISTS is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE,",
        "  ADD COLUMN IF NOT EXISTS is_debug      BOOLEAN NOT NULL DEFAULT FALSE;",
        "",
        "ALTER TABLE public.buddies DROP CONSTRAINT IF EXISTS buddies_status_check;",
        "ALTER TABLE public.buddies ADD CONSTRAINT buddies_status_check CHECK (status IN ('in_game', 'not_in_game'));",
        "",
        "CREATE INDEX IF NOT EXISTS idx_buddies_visible ON public.buddies(is_active, is_spoiler);",
        "",
        "-- 2. Temporary table for buddy status updates",
        "CREATE TEMP TABLE _buddy_status_import (",
        "  id            TEXT PRIMARY KEY,",
        "  status        TEXT NOT NULL,",
        "  status_reason TEXT,",
        "  is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE,",
        "  is_debug      BOOLEAN NOT NULL DEFAULT FALSE",
        ") ON COMMIT DROP;",
        "",
        "INSERT INTO _buddy_status_import (id, status, status_reason, is_spoiler, is_debug) VALUES",
    ]

    val_lines = []
    for r in rows:
        reason_sql = f"'{r['status_reason'].replace(chr(39), chr(39)+chr(39))}'" if r["status_reason"] else "NULL"
        spoiler_sql = "TRUE" if r["is_spoiler"] else "FALSE"
        debug_sql = "TRUE" if r["is_debug"] else "FALSE"
        val_lines.append(f"  ('{r['id']}', '{r['status']}', {reason_sql}, {spoiler_sql}, {debug_sql})")

    sql_lines.append(",\n".join(val_lines) + ";")
    sql_lines.extend([
        "",
        "-- 3. Update public.buddies from import data",
        "UPDATE public.buddies b",
        "SET",
        "  status        = s.status,",
        "  status_reason = s.status_reason,",
        "  is_spoiler    = s.is_spoiler,",
        "  is_debug      = s.is_debug",
        "FROM _buddy_status_import s",
        "WHERE b.id = s.id;",
        "",
        "COMMIT;",
        "",
    ])

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(sql_lines), encoding="utf-8")
    print(f"Generated {args.out} with {len(rows)} buddy updates.")


if __name__ == "__main__":
    main()
