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
