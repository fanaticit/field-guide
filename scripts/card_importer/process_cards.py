#!/usr/bin/env python3
"""
Card Image Pre-processor, AI Vision Data Extractor, and Supabase Ingestion Pipeline.

Supports both modern `google-genai` and `google-generativeai` SDKs.
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
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

# Check which GenAI library is installed
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


# Setup Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "card_images")
TABLE_NAME = os.getenv("SUPABASE_TABLE_NAME", "visages")


def init_clients(dry_run: bool = False):
    """Initialize and validate API clients."""
    if not GEMINI_API_KEY:
        print("\n[ERROR] GEMINI_API_KEY is missing! Set it in your .env file or environment.")
        print("Get your free key at: https://aistudio.google.com/app/apikey (starts with AIzaSy...)")
        sys.exit(1)

    if GEMINI_API_KEY.startswith("AQ."):
        print("\n[WARNING] Your GEMINI_API_KEY starts with 'AQ.'.")
        print("Google AI Studio API keys always start with 'AIzaSy...'.")
        print("Please visit https://aistudio.google.com/app/apikey and generate a key there.\n")

    if USE_MODERN_SDK:
        ai_client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        legacy_genai.configure(api_key=GEMINI_API_KEY)
        ai_client = legacy_genai.GenerativeModel("gemini-1.5-flash")

    supabase: Client = None
    if not dry_run:
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("\n[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when not in --dry-run mode.")
            sys.exit(1)
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    return ai_client, supabase


def crop_card(image_path: str, output_path: str, min_area_ratio: float = 0.15) -> bool:
    """
    Detects the main card in an image using OpenCV contours.
    Falls back to centered region if no clear bounding contour is found.
    """
    img = cv2.imread(image_path)
    if img is None:
        print(f"  [!] Could not read image: {image_path}")
        return False

    h_img, w_img = img.shape[:2]
    total_area = h_img * w_img

    # Convert to grayscale & blur
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)

    # Edge detection
    edges = cv2.Canny(blurred, 30, 120)

    # Dilate edges to close small gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=2)

    # Find external contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    cropped = None

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area / total_area < min_area_ratio:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = float(w) / h if h > 0 else 0
        if 0.4 <= aspect_ratio <= 2.5:
            # Add small 2% padding
            pad_x = int(w * 0.02)
            pad_y = int(h * 0.02)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(w_img, x + w + pad_x)
            y2 = min(h_img, y + h + pad_y)
            cropped = img[y1:y2, x1:x2]
            break

    # Fallback if no card contour detected: center crop 70%
    if cropped is None:
        print("  [*] Contour not distinct; applying centered 70% crop fallback.")
        margin_y = int(h_img * 0.15)
        margin_x = int(w_img * 0.15)
        cropped = img[margin_y:h_img - margin_y, margin_x:w_img - margin_x]

    cv2.imwrite(output_path, cropped)
    return True


EXTRACTION_PROMPT = """
You are an expert game data analyst for Monster Hunter.
Inspect this cropped card/icon image and extract all relevant information.

Return a STRICT JSON object with these exact fields:
{
  "id": "slug_lowercase_with_underscores (e.g. 'rathalos', 'great_jagras', 'mernos')",
  "name": "English display name (e.g. 'Rathalos')",
  "name_ja": "Japanese name if visible, or null",
  "monster_type": "'small' or 'large'",
  "points": integer (card points / cost, default 1 if not shown),
  "rarity": integer (1 to 10, default 1 if not shown),
  "ink_types": ["array of element/ink types visible, e.g. 'thunder', 'fire', 'water', 'ice', 'dragon', 'poison', 'paralysis', 'sleep', 'blast'"],
  "description": "Short card description or lore text if present, else null",
  "notes": "Any additional stat details or bonus information visible on the card, else null"
}
"""


def process_single_image(
    file_path: Path,
    ai_client,
    supabase: Client,
    output_dir: Path,
    dry_run: bool = False
):
    print(f"\n[+] Processing: {file_path.name}")
    cropped_filename = f"cropped_{file_path.name}"
    cropped_path = output_dir / cropped_filename

    # 1. Crop image
    success = crop_card(str(file_path), str(cropped_path))
    if not success:
        print(f"  [X] Failed to crop {file_path.name}")
        return False

    print(f"  [✓] Cropped card saved to: {cropped_path}")

    # 2. Extract structured data with Gemini
    print("  [*] Calling Gemini Vision API...")
    try:
        pil_image = Image.open(cropped_path)
        if USE_MODERN_SDK:
            response = ai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[EXTRACTION_PROMPT, pil_image],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            raw_text = response.text
        else:
            response = ai_client.generate_content(
                [EXTRACTION_PROMPT, pil_image],
                generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text

        card_data = json.loads(raw_text)
        print(f"  [✓] Extracted Card Data:\n{json.dumps(card_data, indent=2)}")
    except Exception as e:
        print(f"  [X] Gemini extraction failed: {e}")
        return False

    if dry_run:
        print("  [INFO] Dry-run mode active. Skipping Supabase Storage and DB insertion.")
        return True

    # 3. Upload cropped image to Supabase Storage
    try:
        storage_dest = f"visages/{file_path.name}"
        with open(cropped_path, "rb") as f:
            supabase.storage.from_(STORAGE_BUCKET).upload(
                path=storage_dest,
                file=f,
                file_options={"upsert": "true"}
            )

        public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_dest)
        card_data["image_large"] = public_url
        print(f"  [✓] Image uploaded to Supabase Storage: {public_url}")
    except Exception as e:
        print(f"  [!] Storage upload note: {e}")

    # 4. Upsert to Supabase Postgres DB
    try:
        supabase.table(TABLE_NAME).upsert(card_data).execute()
        print(f"  [✓] Record upserted successfully into table '{TABLE_NAME}' with ID '{card_data.get('id')}'")
    except Exception as e:
        print(f"  [X] Supabase DB insertion failed: {e}")
        return False

    return True


def main():
    parser = argparse.ArgumentParser(description="Bulk crop, extract, and upload cards to Supabase.")
    parser.add_argument("--input", "-i", default="input_images", help="Directory of input images")
    parser.add_argument("--output", "-o", default="output_images", help="Directory for cropped output images")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Run local crop and Gemini extraction without pushing to Supabase")
    parser.add_argument("--delay", type=float, default=4.0, help="Delay between API calls in seconds (to respect free tier 15 RPM)")

    args = parser.parse_args()

    base_dir = Path(__file__).parent
    input_dir = (base_dir / args.input) if not Path(args.input).is_absolute() else Path(args.input)
    output_dir = (base_dir / args.output) if not Path(args.output).is_absolute() else Path(args.output)

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    valid_extensions = {".png", ".jpg", ".jpeg", ".webp"}
    image_files = [f for f in input_dir.iterdir() if f.suffix.lower() in valid_extensions]

    if not image_files:
        print(f"\n[!] No images found in: {input_dir.resolve()}")
        print("    Drop your card images or screenshots into that folder and run this script again.")
        sys.exit(0)

    print(f"\nFound {len(image_files)} image(s) to process in '{input_dir}'")
    if args.dry_run:
        print("Running in DRY-RUN mode (No changes will be made to Supabase).")

    ai_client, supabase = init_clients(dry_run=args.dry_run)

    success_count = 0
    for idx, img_path in enumerate(image_files, start=1):
        print(f"\n--- [{idx}/{len(image_files)}] ---")
        if process_single_image(img_path, ai_client, supabase, output_dir, dry_run=args.dry_run):
            success_count += 1

        if idx < len(image_files):
            print(f"Sleeping {args.delay}s to respect free-tier rate limits...")
            time.sleep(args.delay)

    print(f"\n==========================================")
    print(f" Finished! Successfully processed: {success_count}/{len(image_files)} cards.")
    print(f" Cropped images saved to: {output_dir.resolve()}")
    print(f"==========================================\n")


if __name__ == "__main__":
    main()
