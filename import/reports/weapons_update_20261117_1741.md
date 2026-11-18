# Weapon update report — 2026-11-17 17:41

- **Baseline:** git `HEAD` (no saved baseline yet)
- **Current:** `import/MHO_weapons.json` (378 entries, 335 importable, 43 debug) + `MHO_weapon_upgrades.json` (335 weapons)
- **SQL:** `supabase/migrations/20261117000004_update_mho_weapons_part1of5.sql`, `supabase/migrations/20261117000005_update_mho_weapons_part2of5.sql`, `supabase/migrations/20261117000006_update_mho_weapons_part3of5.sql`, `supabase/migrations/20261117000007_update_mho_weapons_part4of5.sql`, `supabase/migrations/20261117000008_update_mho_weapons_part5of5.sql` — run all 5 parts in order

## Summary

| | Count |
|---|---:|
| New weapons | 0 |
| Removed / now debug (will be hidden) | 0 |
| Changed weapons | 0 |
| Changed upgrade paths | 0 |
| Display order changed | 0 |

No changes against the baseline.

## Next steps

1. Review this report and the generated SQL.
2. Run the SQL in the Supabase SQL editor.
3. Run the script with `--accept` so the next run only reports newer changes.
