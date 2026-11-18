# Companion (buddy) update report — 2026-11-17 13:22

- **Baseline:** git `HEAD` (no saved baseline yet)
- **Current:** `import/MHO_companions.json` (43 companions, 1 debug)
- **SQL:** `supabase/migrations/20261117000004_update_mho_companions.sql`

## Summary

| | Count |
|---|---:|
| New companions | 0 |
| Removed (will be hidden) | 0 |
| Changed (DB fields) | 0 |
| Changed skills | 1 |
| Display-only changes (not stored in DB) | 2 |
| Display order changed | 0 |

## Changed companions

### Lynn (`320128`)

| Field | Old | New | |
|---|---|---|---|
| how_to_obtain | Comes with Stylia (default buddy); Recruitment | Comes with Stylia (default buddy); Recruitment – Heart of the Thaw banner (2026-11-27 to 2026-12-24) | info |

### Kojiro (`320037`)

| Field | Old | New | |
|---|---|---|---|
| how_to_obtain | Featured in limited Recruitment: Sakura Samurai (2026-03-26 to 2026-05-29); Rutaco's Rumbling Furnace; Rumbling Furnace Exchange; Advanced | Featured in limited Recruitment: Sakura Samurai (2026-03-26 to 2026-05-29); Rutaco's Rumbling Furnace; Rumbling Furnace Exchange | info |

### Pheasant (`320054`)

| Skill | Change | Old | New |
|---|---|---|---|
| Crimson Fang Resonance (other) | changed | Pheasant soars into the sky and chants, granting all adventurers Paralytic Edge for 10s. While Paralytic Edge is active, hitting a monster builds up 0.8% extra paralysis value; once the paralysis value is filled, the monster is inflicted with paralysis. | Pheasant soars into the sky and chants, granting all adventurers Paralytic Edge for 10s. While Paralytic Edge is active, hitting a monster builds up 1.2% extra paralysis value; once the paralysis value is filled, the monster is inflicted with paralysis. |

## Next steps

1. Review this report and the generated SQL.
2. Run the SQL in the Supabase SQL editor.
3. Run the script with `--accept` so the next run only reports newer changes.
