#!/bin/bash
# ArmourGuide
sed -i '' 's/import { useNavigate/import { useNavigate/' src/pages/investigation-notes/ArmourGuide.tsx || true
# if missing, add it
grep -q "import { useNavigate }" src/pages/investigation-notes/ArmourGuide.tsx || sed -i '' '/import { useState/a\
import { useNavigate } from '\''react-router-dom'\'';
' src/pages/investigation-notes/ArmourGuide.tsx
sed -i '' 's/Plus,//g' src/pages/investigation-notes/ArmourGuide.tsx
sed -i '' 's/const incrementChallenge = useIncrementChallenge();//g' src/pages/investigation-notes/ArmourGuide.tsx

# WeaponCard
sed -i '' 's/Plus,//g' src/pages/investigation-notes/WeaponCard.tsx
sed -i '' 's/const incrementChallenge = useIncrementChallenge();//g' src/pages/investigation-notes/WeaponCard.tsx

# WeaponGuide
sed -i '' 's/ChevronRight,//g' src/pages/investigation-notes/WeaponGuide.tsx
sed -i '' 's/const incrementChallenge = useIncrementChallenge();//g' src/pages/investigation-notes/WeaponGuide.tsx
sed -i '' 's/const navigate = useNavigate();$//g' src/pages/investigation-notes/WeaponGuide.tsx
sed -i '' '/isCompleted/d' src/pages/investigation-notes/WeaponGuide.tsx
sed -i '' '/isCrafted/d' src/pages/investigation-notes/WeaponGuide.tsx

