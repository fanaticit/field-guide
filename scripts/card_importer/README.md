# Visage Card Automation & Supabase Ingestion Pipeline

### Features
1. **Title OCR**: Reads the top title (`Visage: <Monster Name>`) to determine the card identifier.
2. **Supabase Check**: Checks Supabase `visages` table to see if this card already exists.
3. **Smart Image Skip**: Skips cutting/uploading the image if it is already present in Supabase (override with `--enable-image-update`).
4. **Full Vision OCR**: Analyzes the rest of the screenshot to extract Core Effects, Potential Set Effects (Ink types), and Points.
5. **Smart Merging**:
   - **Core Effect**: Updates the core effect description.
   - **Potential Set Effects**: Appends new sets/ink types to the card's existing pool without deleting previously discovered sets.
   - **Points Tracking**: Detects point values and explicitly reports whenever the database value is changed.

---

## CLI Options & Usage Examples

### 1. Safe Dry-Run (Inspect extracted text, sets, and points)
```bash
python3 process_cards.py --dry-run
```

### 2. Live Update to Supabase (Merge new sets & update core effects/points)
```bash
python3 process_cards.py --enable-updates
```

### 3. Re-cut and upload images while updating data
```bash
python3 process_cards.py --enable-updates --enable-image-update
```

### 4. Clear and Rebuild Fresh (Reset card fields from scratch)
```bash
python3 process_cards.py --enable-updates --clear-visage
```
