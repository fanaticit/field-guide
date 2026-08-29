---
name: add-monster
description: >-
  Use this skill when the user wants to add a new monster to the field-guide database. 
  It guides the agent to extract the monster icon from a user-provided image, ask the user for details, and update the project's data and database seeds.
---

# Add Monster Skill

Follow these steps to add a new monster to the project.

## Steps

1. **Request Image & Coordinates**: Ask the user to upload an image containing the monster's icon, and if necessary, ask for the bounding box coordinates (left, upper, right, lower) to crop the icon from the image.
2. **Extract Icon**: Once the user provides the image and coordinates, use the provided Python script to crop and resize the icon to 256x256.
   Run:
   `python .agents/skills/add-monster/scripts/extract_icon.py --input <USER_IMAGE_PATH> --output public/images/monsters/MHNow-<MonsterName>_Icon.png [--crop left,upper,right,lower]`
3. **Ask for Details**: Ask the user for the following monster details:
   - ID (e.g., `new_monster`)
   - Name (e.g., `New Monster`)
   - Japanese Name (optional)
   - Tier / Type (e.g., `low`, `small`, etc.)
   - Elements (array of strings, e.g., `['fire']`)
   - Weaknesses (array of strings, e.g., `['water']`)
4. **Update JSON Data**: Read `hc_data/monsters.json`, parse the JSON, and append the new monster object to the `monsters` array. Ensure the `icon` field is set to the correct path (e.g., `/images/monsters/MHNow-<MonsterName>_Icon.png`). Save the file.
5. **Generate Database Seed**: Run the seed generation script to update the SQL seed file:
   `node scripts/generate-monsters-seed.cjs`
6. **Confirm**: Notify the user that the monster has been successfully added to the JSON data and database seeds.
