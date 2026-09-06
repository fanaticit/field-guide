# Field Guide Automation Scripts

### 1. Armour & Skills Importer (`process_armour.py`)
- **OCR Focus**: Only scans right panel (`x >= 1800`), ignoring all other text.
- **Dynamic Icon Cropping**: Automatically selects the 140x140 icon location based on the detected slot:
  - **Head (Helm)**: `(385, 215)`
  - **Mail (Chest)**: `(540, 215)`
  - **Vambraces (Arms)**: `(222, 380)`
  - **Coil (Waist)**: `(385, 380)`
  - **Greaves (Legs)**: `(540, 380)`
- **Input Folder**: `input_armour/`
- **Output Folder**: `output_armour/`
- **Supabase Table**: `armour_pieces`

```bash
# Dry-run test (Inspect cropped icon & view right-panel OCR lines)
python3 process_armour.py

# Live Ingestion
python3 process_armour.py --enable-updates
```

---

### 2. Visage Importer (`process_visage.py`)
- **Input Folder**: `input_images/`
- **Output Folder**: `output_images/`
- **Supabase Table**: `visages`

```bash
python3 process_visage.py --dry-run
python3 process_visage.py --enable-updates --enable-image-update
```

---

### 3. Buddy Importer (`process_buddies.py`)
- **Input Folder**: `input_buddies/`
- **Output Folder**: `output_buddies/`
- **Supabase Table**: `buddies`

```bash
python3 process_buddies.py --dry-run
python3 process_buddies.py --enable-updates --enable-image-update
```

---

### 4. Weapons Importer (`process_weapons.py`)
- **3D Model Cropping**: Automatically crops the centered high-resolution 3D weapon model from the inspection screen.
- **OCR Focus**: Scans the right-side equipment stats panel to extract:
  - Weapon Title & Starting Rarity (Grade)
  - Weapon Type (Great Sword, Long Sword, etc.)
  - Element / Damage Type (`fire`, `water`, `ice`, `thunder`, `raw`, etc.)
  - Linked Monster (or `UNKNOWN` if not explicitly mentioned)
  - Affinity % and Defense Bonus
  - Attached Skills (with incremental level delta calculation)
  - Flavour Description
- **Missing Skills Sync**: Automatically detects and creates missing skills in the Supabase `skills` table.
- **Summary Report**: Prints a clean table at the end highlighting all imported weapons, element types, and linked monsters (or flags `UNKNOWN` for manual admin linking).
- **Input Folder**: `input_weapons/`
- **Output Folder**: `output_weapons/`
- **Supabase Table**: `weapons`
- **Storage Bucket**: `weapons`

```bash
# Dry-run test (Crop weapon model, run OCR, print report):
python3 process_weapons.py --dry-run

# Live Ingestion (Writes to weapons table and uploads to Storage):
python3 process_weapons.py --enable-updates --enable-image-update
```
