#!/usr/bin/env python3
"""
Card Image Extractor & Vision Validator.

Extracts the clean card/scroll image, verifies the crop using Gemini Vision,
and automatically adjusts the bounding box if the initial cut is misaligned.
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

# Zoomed bounding box for the scroll icon in 2556x1179 screenshots (excluding bottom banner)
DEFAULT_BOX = {
    "x": 998,
    "y": 170,
    "w": 292,
    "h": 255
}


def init_clients(dry_run: bool = False):
    """Initializes Gemini and Supabase clients."""
    if not GEMINI_API_KEY:
        print("\n[ERROR] GEMINI_API_KEY is missing! Set it in your .env file.")
        sys.exit(1)

    if GEMINI_API_KEY.startswith("AQ."):
        print("\n[WARNING] Your GEMINI_API_KEY starts with 'AQ.'.")
        print("Google AI Studio API keys always start with 'AIzaSy...'.")
        print("Please visit https://aistudio.google.com/app/apikey and generate a key there.\n")

    if USE_MODERN_SDK:
        ai_client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        legacy_genai.configure(api_key=GEMINI_API_KEY)
        ai_client = legacy_genai.GenerativeModel(MODEL_NAME)

    supabase: Client = None
    if not dry_run and SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    return ai_client, supabase


def apply_pixel_crop(img, x: int, y: int, w: int, h: int):
    """Crops an image using pixel coordinates."""
    h_img, w_img = img.shape[:2]
    x1 = max(0, min(x, w_img - 1))
    y1 = max(0, min(y, h_img - 1))
    x2 = max(x1 + 10, min(x + w, w_img))
    y2 = max(y1 + 10, min(y + h, h_img))
    return img[y1:y2, x1:x2]


def apply_normalized_crop(img, box_2d: list):
    """
    Crops an image using normalized [ymin, xmin, ymax, xmax] coordinates (0-1000 scale).
    """
    h_img, w_img = img.shape[:2]
    ymin, xmin, ymax, xmax = box_2d
    
    y1 = int((ymin / 1000) * h_img)
    x1 = int((xmin / 1000) * w_img)
    y2 = int((ymax / 1000) * h_img)
    x2 = int((xmax / 1000) * w_img)

    return img[max(0, y1):min(h_img, y2), max(0, x1):min(w_img, x2)]


CROP_VERIFICATION_PROMPT = """
You are an expert image cropping assistant.
Look at the full game screenshot. We want to extract ONLY the Monster Visage scroll card icon (which can be yellow, purple, or other parchment colors) featuring the monster emblem located in the upper-middle area of the screen.

Initial crop coordinates provided: x={x}, y={y}, width={w}, height={h} on a {w_img}x{h_img} image.

Determine if this initial cut accurately and cleanly captures the complete scroll without cutting off the corners, curled edges, or including the lower 'Core Effect' banner.

Return a STRICT JSON object:
{{
  "is_good_crop": boolean,
  "feedback": "Short feedback on the crop quality",
  "box_2d": [ymin, xmin, ymax, xmax]
}}

Note: `box_2d` must be the exact normalized bounding box [ymin, xmin, ymax, xmax] on a scale of 0 to 1000 relative to the FULL screenshot.
"""


def verify_and_refine_crop(image_path: Path, ai_client) -> np.ndarray:
    """
    Loads full image, inspects with AI, and returns the best cropped image.
    """
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"  [!] Could not read image: {image_path}")
        return None

    h_img, w_img = img.shape[:2]

    # Calculate default crop coordinates scaled to resolution
    scale_x = w_img / 2556.0
    scale_y = h_img / 1179.0

    x = int(DEFAULT_BOX["x"] * scale_x)
    y = int(DEFAULT_BOX["y"] * scale_y)
    w = int(DEFAULT_BOX["w"] * scale_x)
    h = int(DEFAULT_BOX["h"] * scale_y)

    prompt = CROP_VERIFICATION_PROMPT.format(
        x=x, y=y, w=w, h=h, w_img=w_img, h_img=h_img
    )

    print("  [*] Verifying crop area with Gemini...")
    try:
        pil_image = Image.open(image_path)
        if USE_MODERN_SDK:
            response = ai_client.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt, pil_image],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            raw_text = response.text
        else:
            response = ai_client.generate_content(
                [prompt, pil_image],
                generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text

        result = json.loads(raw_text)
        print(f"  [*] AI Crop Check: {result.get('feedback')}")

        if result.get("is_good_crop", False):
            print("  [✓] Initial crop validated successfully.")
            return apply_pixel_crop(img, x, y, w, h)
        
        box_2d = result.get("box_2d")
        if box_2d and len(box_2d) == 4:
            print(f"  [✓] Applying AI-corrected bounding box: {box_2d}")
            return apply_normalized_crop(img, box_2d)

    except Exception as e:
        print(f"  [!] AI validation fallback to default slice: {e}")

    # Fallback to initial pixel crop if AI fails
    return apply_pixel_crop(img, x, y, w, h)


CARD_EXTRACTION_PROMPT = """
You are an expert game data analyzer for Monster Hunter.
Look at this game screenshot.

1. Locate the header text directly above the monster scroll icon in the top-center of the screen.
   It starts with "Visage:" followed by the monster/card name (e.g. "Visage: Pukei-Pukei", "Visage: Great Girros", "Visage: Kulu-Ya-Ku", etc.).
2. Extract the full title (e.g. "Visage: Pukei-Pukei") and the clean monster name (e.g. "Pukei-Pukei").
3. Create a clean filename slug in lowercase snake_case (e.g. "visage_pukei_pukei").
4. If visible on screen, extract any stats, ink types, or core effect details.

Return a STRICT JSON object:
{{
  "title": "Full title string (e.g. 'Visage: Pukei-Pukei')",
  "name": "Monster or card name (e.g. 'Pukei-Pukei')",
  "id": "Clean snake_case id (e.g. 'visage_pukei_pukei' or 'pukei_pukei')",
  "file_slug": "Clean filename slug (e.g. 'visage_pukei_pukei')",
  "monster_type": "'small' or 'large'",
  "points": 1,
  "rarity": 1,
  "ink_types": ["array of elements/ink types visible on card or null"],
  "description": "Any visible effect or notes text"
}}
"""


def extract_card_metadata(image_path: Path, ai_client) -> dict:
    """
    Sends the header region (containing 'Visage: ...') to Gemini to read the title text
    and extract structured metadata without saving title images to disk.
    """
    print("  [*] Reading 'Visage: ...' title text with Gemini Vision...")
    try:
        img = cv2.imread(str(image_path))
        if img is None:
            return {}
        h_img, w_img = img.shape[:2]
        scale_x = w_img / 2556.0
        scale_y = h_img / 1179.0
        
        # Crop header area in memory for clean OCR
        y1, y2 = int(30 * scale_y), int(160 * scale_y)
        x1, x2 = int(700 * scale_x), int(1850 * scale_x)
        header_crop = img[y1:y2, x1:x2]
        header_rgb = cv2.cvtColor(header_crop, cv2.COLOR_BGR2RGB)
        pil_header = Image.fromarray(header_rgb)

        if USE_MODERN_SDK:
            response = ai_client.models.generate_content(
                model=MODEL_NAME,
                contents=[CARD_EXTRACTION_PROMPT, pil_header],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            raw_text = response.text
        else:
            response = ai_client.generate_content(
                [CARD_EXTRACTION_PROMPT, pil_header],
                generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text

        data = json.loads(raw_text)
        return data
    except Exception as e:
        print(f"  [!] AI title extraction note: {e}")
        return {}


def process_single_image(
    file_path: Path,
    ai_client,
    supabase: Client,
    output_dir: Path,
    dry_run: bool = False
):
    print(f"\n[+] Processing: {file_path.name}")

    # 1. Extract Title / Name with AI
    metadata = extract_card_metadata(file_path, ai_client)
    title = metadata.get("title") or f"Visage_{file_path.stem}"
    file_slug = metadata.get("file_slug") or metadata.get("id") or f"visage_{file_path.stem.lower()}"
    card_name = metadata.get("name") or file_path.stem

    print(f"  [✓] Detected Card Title: '{title}' (Name: '{card_name}')")

    # 2. Crop zoomed scroll
    img = cv2.imread(str(file_path))
    if img is None:
        print(f"  [X] Failed to read image: {file_path}")
        return False

    h_img, w_img = img.shape[:2]
    scale_x = w_img / 2556.0
    scale_y = h_img / 1179.0

    x = int(DEFAULT_BOX["x"] * scale_x)
    y = int(DEFAULT_BOX["y"] * scale_y)
    w = int(DEFAULT_BOX["w"] * scale_x)
    h = int(DEFAULT_BOX["h"] * scale_y)

    final_crop = apply_pixel_crop(img, x, y, w, h)
    
    # 3. Save cropped card with the extracted slug/name
    output_filename = f"{file_slug}.png"
    output_path = output_dir / output_filename
    cv2.imwrite(str(output_path), final_crop)
    print(f"  [✓] Saved clean crop as: {output_path.name}")

    if dry_run or supabase is None:
        return True

    # 4. Upload clean crop to Supabase Storage
    try:
        storage_dest = f"extracted_cards/{output_filename}"
        with open(output_path, "rb") as f:
            supabase.storage.from_(STORAGE_BUCKET).upload(
                path=storage_dest,
                file=f,
                file_options={"upsert": "true"}
            )
        public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_dest)
        print(f"  [✓] Uploaded to Storage: {public_url}")
        
        # 5. Insert / Upsert to Database
        db_payload = {
            "id": metadata.get("id", file_slug),
            "name": card_name,
            "monster_type": metadata.get("monster_type", "large"),
            "points": metadata.get("points", 1),
            "image_large": public_url,
            "description": metadata.get("description", "")
        }
        supabase.table(TABLE_NAME).upsert(db_payload).execute()
        print(f"  [✓] Record upserted into Supabase table '{TABLE_NAME}'")
    except Exception as e:
        print(f"  [!] Storage / DB upload note: {e}")

    return True


def main():
    parser = argparse.ArgumentParser(description="Extract and validate clean card images from screenshots.")
    parser.add_argument("--input", "-i", default="input_images", help="Input directory")
    parser.add_argument("--output", "-o", default="output_images", help="Output directory")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Save locally without uploading to Supabase")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between API requests")

    args = parser.parse_args()

    base_dir = Path(__file__).parent
    input_dir = base_dir / args.input
    output_dir = base_dir / args.output

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_files = [f for f in input_dir.iterdir() if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]

    if not image_files:
        print(f"[!] No images found in {input_dir.resolve()}")
        sys.exit(0)

    ai_client, supabase = init_clients(dry_run=args.dry_run)

    for idx, img_path in enumerate(image_files, start=1):
        process_single_image(img_path, ai_client, supabase, output_dir, dry_run=args.dry_run)
        if idx < len(image_files):
            time.sleep(args.delay)


if __name__ == "__main__":
    main()