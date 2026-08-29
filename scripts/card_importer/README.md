# Automated Card Processor & Supabase Ingestion

This local Python pipeline automates cropping card images from screenshots, extracting structured metadata using Google AI Studio's Gemini 1.5 Flash (free tier), and uploading the assets directly to Supabase Storage and Postgres.

## Setup Instructions

### 1. Create a Python Virtual Environment
From your terminal:
```bash
cd scripts/card_importer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in:
1. `GEMINI_API_KEY`: Get a free key at [Google AI Studio](https://aistudio.google.com/).
2. `SUPABASE_URL`: Your Supabase project URL (`https://zyjwvjvwhuejzjsyzqoj.supabase.co`).
3. `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase secret service role key (Found in: **Supabase Dashboard > Settings > API > service_role key**).

---

## How to Run

### Step 1: Put your raw images in `input_images/`
Drop any `.png`, `.jpg`, `.jpeg`, or `.webp` files into `scripts/card_importer/input_images/`.

### Step 2: Test with a Dry-Run (Optional)
Test the OpenCV crop and Gemini extraction without modifying Supabase:
```bash
python3 process_cards.py --dry-run
```
Cropped images will be output in `scripts/card_importer/output_images/`.

### Step 3: Run Full Pipeline
When you are satisfied with the extraction:
```bash
python3 process_cards.py
```
This will:
- Crop each card image.
- Extract structured fields matching your `visages` / cards schema.
- Upload cropped images to Supabase Storage (`card_images` bucket).
- Upsert records into your Supabase database table.
