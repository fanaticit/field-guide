#!/usr/bin/env python3
"""
Buddy (Companion) Automation & Supabase Ingestion Pipeline:
1. Crops buddy art/portrait with calibrated coordinates:
   - x: 500, y: 280, width: 676, height: 803 (scaled to screenshot resolution)
2. Unified Vision OCR: Extracts buddy name, tier (SSR/SR/R), role (Assault/Disruptor/Support), core passive, and notes.
3. Supabase Lookup: Checks if the buddy already exists and if an image is already uploaded.
4. Smart Image Skip: Skips image cutting/upload if image already exists in Supabase (override with --enable-image-update).
5. Ingestion & Updates:
   - Supports --dry-run (safe preview mode).
   - Supports --enable-updates to write metadata to Supabase.
   - Supports --clear-buddy to reset existing buddy fields and rebuild fresh.
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
TABLE_NAME = "buddies"
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# Valid Buddy Tiers and Roles matching DB schema
VALID_TIERS = {"SSR", "SR", "R"}
VALID_ROLES = {"Assault", "Disruptor", "Support"}

# Calibrated Buddy crop coordinates (baseline: 2556x1179)
DEFAULT_BOX = {
    "x": 501,
    "y": 280,
    "w": 676,
    "h": 803
}


def init_clients(dry_run: bool = False):
    """Initializes Gemini and Supabase clients."""
    if not GEMINI_API_KEY:
        print("\n[ERROR] GEMINI_API_KEY is missing! Set it in your .env file.")
        print("Get a free key from: https://aistudio.google.com/app/apikey (starts with AIzaSy...)")
        sys.exit(1)

    if GEMINI_API_KEY.startswith("AQ."):
        print("\n[WARNING] Your GEMINI_API_KEY starts with 'AQ.'.")
        print("This key has low quota limits (20 requests/day).")
        print("For 1,500 free requests/day, generate a key at: https://aistudio.google.com/app/apikey (starts with AIzaSy...)\n")

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
            print(f"  [!] Note on Supabase client init: {e}")

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
            print(f"  [✓] Created public storage bucket '{STORAGE_BUCKET}' in Supabase.")
    except Exception:
        pass


def apply_pixel_crop(img, x: int, y: int, w: int, h: int):
    """Crops an image using pixel coordinates safely within bounds."""
    h_img, w_img = img.shape[:2]
    x1 = max(0, min(x, w_img - 1))
    y1 = max(0, min(y, h_img - 1))
    x2 = max(x1 + 10, min(x + w, w_img))
    y2 = max(y1 + 10, min(y + h, h_img))
    return img[y1:y2, x1:x2]


# -------------------------------------------------------------
# BUDDY OCR PROMPT
# -------------------------------------------------------------
BUDDY_OCR_PROMPT = """
You are an expert game data analyzer for Monster Hunter Outlanders (Companions / Buddies system).
Analyze this complete companion/buddy screenshot carefully.

Extract the following information:
1. Buddy Name: English name of the companion (e.g. "Rondine", "Felyne", "Hinoa", "Minoto", "Fugen", etc.).
2. Japanese Name (if visible): Name in Japanese or null.
3. ID: Clean lowercase snake_case identifier (e.g. "rondine", "felyne_guard").
4. Tier: Exact rarity tier, must be one of ["SSR", "SR", "R"].
5. Role: Exact companion combat role, must be one of ["Assault", "Disruptor", "Support"].
6. Core Passive / Trait: Full name and text description of the primary core passive skill or talent.
7. Secondary Skills / Notes: Any other visible attributes, weapons, stats, or skill descriptions.

Return a STRICT JSON object:
{
  "name": "Buddy Name (e.g. 'Rondine')",
  "name_ja": "Japanese name if shown or null",
  "id": "Lowercase snake_case id (e.g. 'rondine')",
  "file_slug": "Filename slug (e.g. 'buddy_rondine')",
  "tier": "SSR" | "SR" | "R",
  "role": "Assault" | "Disruptor" | "Support",
  "core_passive": {
    "name": "Passive title",
    "description": "Full description of core passive"
  },
  "notes": "Any additional skill details, combat notes, or stat lines",
  "all_detected_text": [
    "Array of all key readable text lines found across the UI"
  ]
}
"""


def extract_buddy_ocr(image_path: Path, ai_client, max_retries: int = 3) -> dict:
    """Performs OCR on the buddy screenshot with automatic 429 retry backoff."""
    print("  [*] Running Vision OCR for Buddy Name, Tier, Role & Core Passive...")
    pil_image = Image.open(image_path)

    for attempt in range(1, max_retries + 1):
        try:
            if USE_MODERN_SDK:
                response = ai_client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[BUDDY_OCR_PROMPT, pil_image],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                raw_text = response.text
            else:
                response = ai_client.generate_content(
                    [BUDDY_OCR_PROMPT, pil_image],
                    generation_config={"response_mime_type": "application/json"}
                )
                raw_text = response.text

            return json.loads(raw_text)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait_time = 15 * attempt
                print(f"  [!] Rate limit (429) hit. Waiting {wait_time}s before retry (Attempt {attempt}/{max_retries})...")
                time.sleep(wait_time)
            else:
                print(f"  [!] OCR error: {e}")
                break

    return {}


# -------------------------------------------------------------
# SUPABASE LOOKUPS
# -------------------------------------------------------------
def lookup_supabase_buddy(buddy_id: str, buddy_name: str, supabase: Client):
    """Checks if the buddy record exists in Supabase."""
    if supabase is None:
        return None

    try:
        res = (
            supabase.table(TABLE_NAME)
            .select("*")
            .or_(f"id.eq.{buddy_id},name.ilike.%{buddy_name}%")
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        print(f"  [!] Supabase lookup note: {e}")
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
    clear_buddy: bool = False,
    dry_run: bool = False
):
    print(f"\n{'='*70}")
    print(f"[+] Processing Buddy Image: {file_path.name}")
    print(f"{'='*70}")

    # 1. OCR on Screenshot
    ocr_data = extract_buddy_ocr(file_path, ai_client)
    buddy_name = ocr_data.get("name") or file_path.stem
    buddy_id = ocr_data.get("id") or file_path.stem.lower().replace("img_", "buddy_")
    file_slug = ocr_data.get("file_slug") or f"buddy_{buddy_id}"
    name_ja = ocr_data.get("name_ja")

    # Normalize Tier & Role
    raw_tier = (ocr_data.get("tier") or "R").upper()
    tier = raw_tier if raw_tier in VALID_TIERS else "R"

    raw_role = (ocr_data.get("role") or "Assault").capitalize()
    role = raw_role if raw_role in VALID_ROLES else "Assault"

    core_passive_obj = ocr_data.get("core_passive", {})
    if isinstance(core_passive_obj, dict):
        core_passive_text = core_passive_obj.get("description") or core_passive_obj.get("name") or ""
    else:
        core_passive_text = str(core_passive_obj)

    notes_text = ocr_data.get("notes") or ""

    print(f"  [1] Buddy Detected : '{buddy_name}' (ID: '{buddy_id}')")
    print(f"      Tier           : {tier}")
    print(f"      Role           : {role}")
    print(f"      Core Passive   : {core_passive_text or '(None)'}")

    # 2. Supabase DB Lookup
    existing_record = lookup_supabase_buddy(buddy_id, buddy_name, supabase)
    has_existing_image = False
    existing_img_url = None

    if existing_record:
        existing_img_url = existing_record.get("image")
        has_existing_image = bool(existing_img_url)
        print(f"  [2] Database Record: FOUND in Supabase (id='{existing_record.get('id')}', tier='{existing_record.get('tier')}', role='{existing_record.get('role')}')")
        if has_existing_image:
            print(f"      Current Image  : {existing_img_url}")
    else:
        print(f"  [2] Database Record: NOT FOUND in Supabase (will be inserted)")

    # 3. Smart Image Crop & Upload Decision
    uploaded_image_url = existing_img_url

    if has_existing_image and not enable_image_update:
        print(f"  [3] Buddy Image    : SKIPPED (Image exists. Use --enable-image-update to overwrite)")
    else:
        action_reason = "Overwriting existing image" if has_existing_image else "New image needed"
        print(f"  [3] Buddy Image    : CROPPING ({action_reason})")

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
            print(f"      [✓] Saved crop to: {output_path.name} (Size: {final_crop.shape[1]}x{final_crop.shape[0]}px)")

            if not dry_run and supabase and (enable_image_update or not has_existing_image):
                try:
                    storage_dest = f"buddies/{output_filename}"
                    with open(output_path, "rb") as f:
                        supabase.storage.from_(STORAGE_BUCKET).upload(
                            path=storage_dest,
                            file=f,
                            file_options={"upsert": "true"}
                        )
                    uploaded_image_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_dest)
                    print(f"      [✓] Uploaded to Storage: {uploaded_image_url}")
                except Exception as e:
                    print(f"      [!] Storage upload note: {e}")

    # 4. Build Merge / Update Payload
    if clear_buddy:
        print(f"\n  [*] --clear-buddy active: Resetting existing data and rebuilding fresh.")
        final_core_passive = core_passive_text
        final_notes = notes_text
        final_tier = tier
        final_role = role
    else:
        final_core_passive = core_passive_text if core_passive_text else (existing_record.get("core_passive") if existing_record else "")
        final_notes = notes_text if notes_text else (existing_record.get("notes") if existing_record else "")
        final_tier = tier if tier else (existing_record.get("tier") if existing_record else "R")
        final_role = role if role else (existing_record.get("role") if existing_record else "Assault")

    # Build DB Payload
    db_payload = {
        "id": buddy_id,
        "name": buddy_name,
        "name_ja": name_ja if name_ja else (existing_record.get("name_ja") if existing_record else None),
        "tier": final_tier,
        "role": final_role,
        "core_passive": final_core_passive,
        "notes": final_notes,
        "is_active": True
    }
    if uploaded_image_url:
        db_payload["image"] = uploaded_image_url
    elif existing_record and existing_record.get("image"):
        db_payload["image"] = existing_record.get("image")

    print(f"\n  [PROPOSED BUDDY DATA SUMMARY]")
    print(f"  - ID           : {db_payload['id']}")
    print(f"  - Name         : {db_payload['name']} {f'({name_ja})' if name_ja else ''}")
    print(f"  - Tier         : {db_payload['tier']}")
    print(f"  - Role         : {db_payload['role']}")
    print(f"  - Core Passive : {db_payload['core_passive'] or '(None)'}")
    print(f"  - Notes        : {db_payload['notes'] or '(None)'}")
    if db_payload.get("image"):
        print(f"  - Image URL    : {db_payload['image']}")

    # 5. Apply to Supabase if --enable-updates and not in --dry-run
    if dry_run:
        print(f"\n  [DRY-RUN] No changes written to database.")
    elif enable_updates:
        if supabase:
            try:
                supabase.table(TABLE_NAME).upsert(db_payload).execute()
                print(f"\n  [✓] SUCCESSFULLY UPDATED '{buddy_name}' in Supabase '{TABLE_NAME}' table!")
            except Exception as e:
                print(f"\n  [!] Supabase DB write error: {e}")
        else:
            print(f"\n  [!] Supabase client not connected. Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.")
    else:
        print(f"\n  [INFO] Data update skipped. Pass --enable-updates to write these changes to Supabase.")

    return True


def main():
    parser = argparse.ArgumentParser(description="Automated Buddy (Companion) OCR, Cropping & Ingestion.")
    parser.add_argument("--input", "-i", default="input_buddies", help="Directory of input buddy screenshots")
    parser.add_argument("--output", "-o", default="output_buddies", help="Directory for cropped buddy output images")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Run OCR & Supabase check without making changes")
    parser.add_argument("--enable-updates", action="store_true", help="Allow updating the buddy data in Supabase with newly found fields")
    parser.add_argument("--enable-image-update", "-u", action="store_true", help="Force re-cutting and uploading image even if it already exists in Supabase")
    parser.add_argument("--clear-buddy", action="store_true", help="Clear existing buddy data and rebuild fresh from new OCR data")
    parser.add_argument("--delay", type=float, default=4.0, help="Delay between API calls in seconds")

    args = parser.parse_args()

    base_dir = Path(__file__).parent
    input_dir = base_dir / args.input
    output_dir = base_dir / args.output

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_files = sorted([f for f in input_dir.iterdir() if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}])

    if not image_files:
        print(f"\n[!] No images found in: {input_dir.resolve()}")
        print("    Drop your buddy screenshots into that folder and run this script again.")
        sys.exit(0)

    print(f"\n{'='*70}")
    print(f" Buddy (Companion) Automation Pipeline")
    print(f" Images Found       : {len(image_files)}")
    print(f" Mode               : {'DRY-RUN (Safe preview mode)' if args.dry_run else 'LIVE INGESTION'}")
    print(f" Data Updates       : {'ENABLED (--enable-updates)' if args.enable_updates else 'DISABLED (View only)'}")
    print(f" Image Updates      : {'ENABLED (--enable-image-update)' if args.enable_image_update else 'DISABLED (Skip if exists)'}")
    print(f" Clear Buddy Mode   : {'ACTIVE (--clear-buddy)' if args.clear_buddy else 'NORMAL (Preserve existing)'}")
    print(f" Crop Coordinates   : x={DEFAULT_BOX['x']}, y={DEFAULT_BOX['y']}, w={DEFAULT_BOX['w']}, h={DEFAULT_BOX['h']}")
    print(f"{'='*70}")

    ai_client, supabase = init_clients(dry_run=args.dry_run)
    if supabase and not args.dry_run:
        ensure_storage_bucket(supabase)

    for idx, img_path in enumerate(image_files, start=1):
        process_single_image(
            img_path,
            ai_client,
            supabase,
            output_dir,
            enable_image_update=args.enable_image_update,
            enable_updates=args.enable_updates,
            clear_buddy=args.clear_buddy,
            dry_run=args.dry_run
        )
        if idx < len(image_files):
            time.sleep(args.delay)


if __name__ == "__main__":
    main()
