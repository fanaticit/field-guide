#!/bin/bash
sed -i '' 's/useIncrementChallenge,//g' src/pages/investigation-notes/ArmourGuide.tsx
sed -i '' 's/useIncrementChallenge,//g' src/pages/investigation-notes/WeaponCard.tsx
sed -i '' 's/useIncrementChallenge,//g' src/pages/investigation-notes/WeaponGuide.tsx
sed -i '' '/useIncrementChallenge/d' src/pages/investigation-notes/ArmourGuide.tsx
sed -i '' '/useIncrementChallenge/d' src/pages/investigation-notes/WeaponCard.tsx
sed -i '' '/useIncrementChallenge/d' src/pages/investigation-notes/WeaponGuide.tsx

sed -i '' '/const addChallenge = useAddWeaponChallenge();/a\
  const navigate = useNavigate();
' src/pages/investigation-notes/WeaponGuide.tsx

