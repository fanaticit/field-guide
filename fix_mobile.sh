#!/bin/bash
# Remove the mobile strip completely
sed -i '' '/{activeMonsters.length > 0 && (/,/<\/div>/ {
  /<!-- ── DESKTOP/!b
}
' src/pages/HunterChallenges.tsx || true
