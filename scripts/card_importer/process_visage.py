#!/usr/bin/env python3
"""
Visage Card Automation & Supabase Ingestion Pipeline:
1. Unified 1-Pass OCR: Reads title, core effect, potential set bonuses, and points in a single API call.
2. Automatic 429 Retry & Rate Limiting: Gracefully handles quota limits.
3. Supabase Lookup: Checks if the visage record and its image already exist in the database.
4. Smart Image Skip: Skips card cropping/upload if an image already exists (override with --enable-image-update).
5. Auto Storage Bucket Creation: Creates the public Supabase storage bucket if missing.
6. Smart Merging & Ingestion:
   - Updates core_effect.
   - Merges Potential Set Effects / Ink Types (never removes existing sets).
   - Updates Points and reports any point value changes.
   - Supports --enable-updates to apply changes to Supabase.
   - Supports --clear-visage to reset attributes and start fresh from monster title.
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
load_dotenv(Path(__file__).parent / ".env")

try:
    import cv2
    import numpy as np
except ImportError:
    print("Error: opencv-python is not installed. Run: pip install opencv-python")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Error: pillow is not installed. Run: pip install pillow")
    sys.exit(1)

USE_MODERN_SDK = False
try:
    from google import genai
    from google.genai import types
    USE_MODERN_SDK = True
except ImportError:
    try:
        import google.generativeai as legacy_genai
        USE_MODERN_SDK = False
    except ImportError:
        print("Error: Neither google-genai nor google-generativeai is installed.")
        print("Run: pip install google-genai pillow")
        sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase is not installed. Run: pip install supabase")
    sys.exit(1)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "card_images")
TABLE_NAME = os.getenv("SUPABASE_TABLE_NAME", "visages")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# Known Monster Hunter Outlanders Ink Types (from INK_OPTIONS)
VALID_INK_TYPES = {
    "might", "flames", "fire", "water", "thunder",
    "combat", "guidance", "grace", "ice", "dragon",
    "poison", "paralysis", "sleep", "blast",
    "resonance", "protection"
}

# Zoomed bounding box for the scroll icon in 2556x1179 screenshots (excluding bottom banner)
DEFAULT_BOX = {
    "x": 998,
    "y": 170,
    "w": 292,
    "h": 255
}


# -------------------------------------------------------------
# ANSI TERMINAL COLOR HELPERS
# -------------------------------------------------------------
class TermColor:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[91m"
    BOLD_RED = "\033[1;91m"
    GREEN = "\033[92m"
    BOLD_GREEN = "\033[1;92m"
    YELLOW = "\033[93m"
    BOLD_YELLOW = "\033[1;93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    BOLD_MAGENTA = "\033[1;95m"
    CYAN = "\033[96m"
    BOLD_CYAN = "\033[1;96m"
    WHITE = "\033[97m"

def c_err(msg: str) -> str:
    return f"{TermColor.BOLD_RED}{msg}{TermColor.RESET}"

def c_warn(msg: str) -> str:
    return f"{TermColor.BOLD_YELLOW}{msg}{TermColor.RESET}"

def c_success(msg: str) -> str:
    return f"{TermColor.BOLD_GREEN}{msg}{TermColor.RESET}"

def c_info(msg: str) -> str:
    return f"{TermColor.BOLD_CYAN}{msg}{TermColor.RESET}"

def c_highlight(msg: str) -> str:
    return f"{TermColor.BOLD_MAGENTA}{msg}{TermColor.RESET}"


def init_clients(dry_run: bool = False):
    """Initializes Gemini and Supabase clients."""
    if not GEMINI_API_KEY:
        print(c_err("\n[ERROR] GEMINI_API_KEY is missing! Set it in your .env file."))
        print(c_warn("Get a free key from: https://aistudio.google.com/app/apikey (starts with AIzaSy...)"))
        sys.exit(1)

    if GEMINI_API_KEY.startswith("AQ."):
        print(c_warn("\n[WARNING] Your GEMINI_API_KEY starts with 'AQ.'."))
        print(c_warn("This key has very low quota limits (20 requests/day)."))
        print(c_warn("For 1,500 free requests/day, generate an API key at: https://aistudio.google.com/app/apikey (starts with AIzaSy...)\n"))

    if USE_MODERN_SDK:
        ai_client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        legacy_genai.configure(api_key=GEMINI_API_KEY)
        ai_client = legacy_genai.GenerativeModel(MODEL_NAME)

    supabase: Client = None
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(c_err(f"  [!] Note on Supabase client init: {e}"))

    return ai_client, supabase


def ensure_storage_bucket(supabase: Client):
    """Ensures the storage bucket exists in Supabase."""
    if not supabase:
        return
    try:
        buckets = supabase.storage.list_buckets()
        existing = [b.name for b in buckets] if buckets else []
        if STORAGE_BUCKET not in existing:
            supabase.storage.create_bucket(STORAGE_BUCKET, options={"public": True})
            print(c_success(f"  [✓] Created public storage bucket '{STORAGE_BUCKET}' in Supabase."))
    except Exception:
        pass


def apply_pixel_crop(img, x: int, y: int, w: int, h: int):
    """Crops an image using pixel coordinates."""
    h_img, w_img = img.shape[:2]
    x1 = max(0, min(x, w_img - 1))
    y1 = max(0, min(y, h_img - 1))
    x2 = max(x1 + 10, min(x + w, w_img))
    y2 = max(y1 + 10, min(y + h, h_img))
    return img[y1:y2, x1:x2]


# -------------------------------------------------------------
# UNIFIED OCR PROMPT (1 API CALL FOR EVERYTHING)
# -------------------------------------------------------------
UNIFIED_OCR_PROMPT = """
You are an expert game data analyzer for Monster Hunter Outlanders / Now Visage cards.
Analyze this complete game screenshot carefully. Extract all visible text, numbers, core effects, potential set bonuses, and points.

Specifically extract:
1. Title / Header: Look at the top center header starting with "Visage: <Monster Name>" (e.g. "Visage: Pukei-Pukei", "Visage: Great Girros", "Visage: Kulu-Ya-Ku").
2. Monster Name: Clean display name (e.g. "Pukei-Pukei", "Great Girros").
3. Visage ID: Normalized lowercase snake_case identifier (e.g. "pukei_pukei", "great_girros", "kulu_ya_ku").
4. Core Effect: The primary inherent skill effect title and full description text shown under "Core Effect".
5. Potential Set Effects / Ink Types: Look for any ink or set bonus type mentioned (e.g. "Ink of Poison", "Ink of Thunder", "Ink of Fire", "Ink of Water", "Ink of Ice", "Ink of Dragon", "Ink of Paralysis", "Ink of Sleep", "Ink of Blast", "Ink of Resonance", "Ink of Grace", "Ink of Protection").
6. Points: The card point cost value (integer, e.g. 1, 2, 3).
7. Monster Tier / Type: "small" or "large".

Return a STRICT JSON object:
{
  "title": "Full title (e.g. 'Visage: Pukei-Pukei')",
  "monster_name": "Monster name (e.g. 'Pukei-Pukei')",
  "visage_id": "Lowercase snake_case ID (e.g. 'pukei_pukei')",
  "file_slug": "Filename slug (e.g. 'visage_pukei_pukei')",
  "monster_type": "'small' or 'large'",
  "points": integer (e.g. 1, 2),
  "rarity": integer (1 to 10),
  "core_effect": {
    "name": "Effect title if shown",
    "description": "Full description text of the core effect"
  },
  "potential_set_effects": [
    {
      "name": "e.g. 'Ink of Poison'",
      "ink_type": "lowercase ink type (e.g. 'poison', 'thunder', 'fire', 'water', 'ice', 'dragon', 'paralysis', 'sleep', 'blast', 'resonance', 'grace', 'protection')",
      "description": "Set effect description if shown"
    }
  ],
  "ink_types": ["array of lowercase ink types found, e.g. 'poison'"],
  "secondary_effects": []
}
"""


def extract_unified_ocr(image_path: Path, ai_client, max_retries: int = 3) -> dict:
    """Performs unified OCR in 1 API call with automatic 429 retry backoff."""
    print(c_info("  [*] Running Unified OCR for Title, Core Effect, Potential Sets & Points..."))
    pil_image = Image.open(image_path)

    for attempt in range(1, max_retries + 1):
        try:
            if USE_MODERN_SDK:
                response = ai_client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[UNIFIED_OCR_PROMPT, pil_image],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                raw_text = response.text
            else:
                response = ai_client.generate_content(
                    [UNIFIED_OCR_PROMPT, pil_image],
                    generation_config={"response_mime_type": "application/json"}
                )
                raw_text = response.text

            return json.loads(raw_text)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait_time = 15 * attempt
                print(c_warn(f"  [!] Rate limit (429) hit. Waiting {wait_time}s before retry (Attempt {attempt}/{max_retries})..."))
                time.sleep(wait_time)
            else:
                print(c_err(f"  [!] OCR ERROR on {image_path.name}: {e}"))
                break

    return {}


# -------------------------------------------------------------
# SUPABASE LOOKUPS
# -------------------------------------------------------------
def lookup_supabase_visage(visage_id: str, monster_name: str, supabase: Client):
    """Checks if the visage record exists in Supabase."""
    if supabase is None:
        return None

    try:
        res = (
            supabase.table(TABLE_NAME)
            .select("*")
            .or_(f"id.eq.{visage_id},name.ilike.%{monster_name}%")
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        print(c_err(f"  [!] Supabase lookup error for '{monster_name}': {e}"))
    return None


# -------------------------------------------------------------
# MAIN PROCESS FUNCTION
# -------------------------------------------------------------
def process_single_image(
    file_path: Path,
    ai_client,
    supabase: Client,
    output_dir: Path,
    enable_image_update: bool = False,
    enable_updates: bool = False,
    clear_visage: bool = False,
    dry_run: bool = False
) -> tuple[bool, str]:
    """Processes a single visage card image. Returns (success_bool, message)."""
    print(f"\n{'='*70}")
    print(c_info(f"[+] Processing: {file_path.name}"))
    print(f"{'='*70}")

    # 1. Unified OCR (1 API call)
    ocr_data = extract_unified_ocr(file_path, ai_client)
    if not ocr_data:
        err_msg = f"OCR failed to extract data from '{file_path.name}'"
        print(c_err(f"  [ERROR] {err_msg}"))
        return False, err_msg

    visage_id = ocr_data.get("visage_id") or file_path.stem.lower().replace("img_", "")
    monster_name = ocr_data.get("monster_name") or file_path.stem
    title = ocr_data.get("title") or f"Visage: {monster_name}"
    file_slug = ocr_data.get("file_slug") or f"visage_{visage_id}"

    print(f"  [1] Title OCR Detected: '{title}'")
    print(f"      -> ID: '{visage_id}' | Name: '{monster_name}' | Slug: '{file_slug}'")

    # 2. Supabase DB Lookup
    existing_record = lookup_supabase_visage(visage_id, monster_name, supabase)
    has_existing_image = False
    existing_img_url = None

    if existing_record:
        existing_img_url = existing_record.get("image_small")
        has_existing_image = bool(existing_img_url)
        print(c_success(f"  [2] Database Record: FOUND (id='{existing_record.get('id')}', points={existing_record.get('points')}, sets={existing_record.get('ink_types')})"))
        if has_existing_image:
            print(f"      Current Small Image: {existing_img_url}")
    else:
        print(c_warn(f"  [2] Database Record: NOT FOUND in Supabase (will be inserted as new)"))

    # 3. Smart Image Crop & Upload Decision
    uploaded_image_url = existing_img_url

    if has_existing_image and not enable_image_update:
        print(f"  [3] Card Small Image: SKIPPED (image_small exists in DB. Use --enable-image-update to overwrite)")
    else:
        action_reason = "Overwriting existing small image" if has_existing_image else "New small image needed"
        print(f"  [3] Card Small Image: CROPPING ({action_reason})")

        img = cv2.imread(str(file_path))
        if img is not None:
            h_img, w_img = img.shape[:2]
            scale_x = w_img / 2556.0
            scale_y = h_img / 1179.0

            x = int(DEFAULT_BOX["x"] * scale_x)
            y = int(DEFAULT_BOX["y"] * scale_y)
            w = int(DEFAULT_BOX["w"] * scale_x)
            h = int(DEFAULT_BOX["h"] * scale_y)

            final_crop = apply_pixel_crop(img, x, y, w, h)
            output_filename = f"{file_slug}.png"
            output_path = output_dir / output_filename
            cv2.imwrite(str(output_path), final_crop)
            print(c_success(f"      [✓] Saved crop to: {output_path.name}"))

            if not dry_run and supabase and (enable_image_update or not has_existing_image):
                try:
                    storage_dest = f"visages/small/{output_filename}"
                    with open(output_path, "rb") as f:
                        supabase.storage.from_(STORAGE_BUCKET).upload(
                            path=storage_dest,
                            file=f,
                            file_options={"upsert": "true"}
                        )
                    uploaded_image_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_dest)
                    print(c_success(f"      [✓] Uploaded small image to Storage: {uploaded_image_url}"))
                except Exception as e:
                    print(c_err(f"      [!] Storage upload error: {e}"))
        else:
            print(c_err(f"      [!] Failed to read image file: {file_path.name}"))

    # 4. Parse Extracted Values
    extracted_points = ocr_data.get("points") or 1
    core_effect_obj = ocr_data.get("core_effect", {})
    extracted_core_desc = core_effect_obj.get("description") or core_effect_obj.get("name") or ""
    
    # Collect extracted ink types
    new_ink_types = set()
    for ink in ocr_data.get("ink_types", []):
        ink_clean = ink.strip().lower().replace("ink of ", "").replace("ink_", "")
        if ink_clean == "fire":
            ink_clean = "flames"
        if ink_clean in VALID_INK_TYPES:
            new_ink_types.add(ink_clean)

    for pot in ocr_data.get("potential_set_effects", []):
        ink_val = pot.get("ink_type") or pot.get("name", "")
        ink_clean = ink_val.strip().lower().replace("ink of ", "").replace("ink_", "")
        if ink_clean == "fire":
            ink_clean = "flames"
        if ink_clean in VALID_INK_TYPES:
            new_ink_types.add(ink_clean)

    # 5. Build Merge / Update Payload
    if clear_visage:
        print(c_warn(f"\n  [*] --clear-visage active: Clearing existing data and building fresh from monster title."))
        final_ink_types = sorted(list(new_ink_types))
        final_core_effect = extracted_core_desc
        final_points = extracted_points
    else:
        existing_ink_types = set(existing_record.get("ink_types", [])) if existing_record else set()
        merged_ink_types = existing_ink_types.union(new_ink_types)
        final_ink_types = sorted(list(merged_ink_types))
        
        final_core_effect = extracted_core_desc if extracted_core_desc else (existing_record.get("core_effect") or existing_record.get("description") or "" if existing_record else "")
        final_points = extracted_points

    # Point Change Detection & Reporting
    current_db_points = existing_record.get("points") if existing_record else None
    points_changed = False
    if current_db_points is not None and current_db_points != final_points:
        points_changed = True
        print(c_highlight(f"\n  [!] POINTS CHANGED: Database had {current_db_points} pts -> OCR extracted {final_points} pts"))
    else:
        print(f"\n  [i] Points: {final_points} pts")

    # Build DB Payload
    db_payload = {
        "id": visage_id,
        "name": monster_name,
        "monster_type": ocr_data.get("monster_type", (existing_record.get("monster_type") if existing_record else "large")),
        "points": final_points,
        "rarity": ocr_data.get("rarity", 1),
        "ink_types": final_ink_types,
        "core_effect": final_core_effect,
        "notes": json.dumps(ocr_data.get("secondary_effects", [])),
        "is_active": True
    }
    if uploaded_image_url:
        db_payload["image_small"] = uploaded_image_url

    print(f"\n  [PROPOSED DATA SUMMARY]")
    print(f"  - Core Effect Text : {final_core_effect or '(None)'}")
    print(f"  - Potential Sets   : {final_ink_types} (Merged)")
    print(f"  - Points Value     : {final_points} {c_highlight('(Changed from DB!)') if points_changed else ''}")
    if uploaded_image_url:
        print(f"  - Small Image URL  : {uploaded_image_url}")

    # 6. Apply to Supabase if --enable-updates and not in --dry-run
    if dry_run:
        print(c_info(f"\n  [DRY-RUN] No changes written to database."))
        return True, "Dry run completed"
    elif enable_updates:
        if supabase:
            try:
                supabase.table(TABLE_NAME).upsert(db_payload).execute()
                print(c_success(f"\n  [✓] SUCCESSFULLY UPDATED '{monster_name}' in Supabase '{TABLE_NAME}' table!"))
                return True, "Successfully updated in Supabase"
            except Exception as e:
                err_msg = f"Supabase DB write error on '{monster_name}': {e}"
                print(c_err(f"\n  [!] {err_msg}"))
                return False, err_msg
        else:
            err_msg = "Supabase client not connected. Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."
            print(c_err(f"\n  [!] {err_msg}"))
            return False, err_msg
    else:
        print(f"\n  [INFO] Data update skipped. Pass --enable-updates to write these changes to Supabase.")
        return True, "View only (skipped write)"


def main():
    parser = argparse.ArgumentParser(description="Automated Visage Card OCR, Supabase Lookup & Ingestion.")
    parser.add_argument("--input", "-i", default="input_images", help="Directory of input images")
    parser.add_argument("--output", "-o", default="output_images", help="Directory for cropped output images")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Run OCR & Supabase check without making changes")
    parser.add_argument("--enable-updates", action="store_true", help="Allow updating the visage data in Supabase with newly found fields")
    parser.add_argument("--enable-image-update", "-u", action="store_true", help="Force re-cutting and uploading image even if it already exists in Supabase")
    parser.add_argument("--clear-visage", action="store_true", help="Clear existing visage data and rebuild fresh from monster title & new OCR data")
    parser.add_argument("--delay", type=float, default=4.0, help="Delay between API calls in seconds")

    args = parser.parse_args()

    base_dir = Path(__file__).parent
    input_dir = base_dir / args.input
    output_dir = base_dir / args.output

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_files = sorted([f for f in input_dir.iterdir() if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}])

    if not image_files:
        print(c_err(f"[!] No images found in {input_dir.resolve()}"))
        sys.exit(0)

    print(f"\n{'='*70}")
    print(c_info(" Visage Card Automation Pipeline"))
    print(f" Images Found       : {len(image_files)}")
    print(f" Mode               : {c_warn('DRY-RUN (Safe mode)') if args.dry_run else c_success('LIVE INGESTION')}")
    print(f" Data Updates       : {c_success('ENABLED (--enable-updates)') if args.enable_updates else c_warn('DISABLED (View only)')}")
    print(f" Image Updates      : {c_success('ENABLED (--enable-image-update)') if args.enable_image_update else 'DISABLED (Skip if exists)'}")
    print(f" Clear Visage Mode  : {c_warn('ACTIVE (--clear-visage)') if args.clear_visage else 'MERGE MODE (Preserve existing sets)'}")
    print(f"{'='*70}")

    ai_client, supabase = init_clients(dry_run=args.dry_run)
    if supabase and not args.dry_run:
        ensure_storage_bucket(supabase)

    errors = []
    successes = []

    for idx, img_path in enumerate(image_files, start=1):
        ok, msg = process_single_image(
            img_path,
            ai_client,
            supabase,
            output_dir,
            enable_image_update=args.enable_image_update,
            enable_updates=args.enable_updates,
            clear_visage=args.clear_visage,
            dry_run=args.dry_run
        )
        if ok:
            successes.append(img_path.name)
        else:
            errors.append((img_path.name, msg))

        if idx < len(image_files):
            time.sleep(args.delay)

    # ── Final Execution Summary ──────────────────────────────────
    print(f"\n{'='*70}")
    print(c_info(" INGESTION RUN SUMMARY"))
    print(f"{'='*70}")
    print(f" Total Processed : {len(image_files)}")
    print(f" Succeeded       : {c_success(str(len(successes)))}")
    
    if errors:
        print(f" Errors/Failures : {c_err(str(len(errors)))}")
        print(c_err("\n[!] The following cards encountered errors:"))
        for name, err_detail in errors:
            print(c_err(f"  • {name} -> {err_detail}"))
    else:
        print(f" Errors/Failures : {c_success('0')}")
        print(c_success("\n[✓] All visage cards processed without errors!"))
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
