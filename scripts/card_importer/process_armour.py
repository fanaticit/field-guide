#!/usr/bin/env python3
"""
Armour & Skills Automation & Ingestion Pipeline:
1. Focused Right-Panel OCR (x >= 1800): Reads piece title, set name, variant, skills, set bonuses, and defense.
2. Auto-Detects 140x140 Icon Selection Box: Finds the highlighted active piece border with OpenCV.
3. Missing Skills Detection: Checks Supabase 'skills' table and automatically creates missing skills.
4. Armour Pieces Ingestion:
   - Stores piece icon in 'armour' Supabase Storage bucket.
   - Populates set_name, set_variant, image, and attached skills.
   - Upserts into 'armour_pieces' table.
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
STORAGE_BUCKET = os.getenv("SUPABASE_ARMOUR_BUCKET", "armour")
TABLE_NAME = "armour_pieces"
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# Slot definitions and fallback coordinates (baseline 2556x1179)
ARMOUR_SLOT_COORDS = {
    "helm": {
        "label": "Head (Helm)",
        "slot_key": "helm",
        "x": 385,
        "y": 215,
        "w": 140,
        "h": 140
    },
    "chest": {
        "label": "Mail (Chest)",
        "slot_key": "chest",
        "x": 540,
        "y": 215,
        "w": 140,
        "h": 140
    },
    "gloves": {
        "label": "Vambraces (Arms/Gloves)",
        "slot_key": "gloves",
        "x": 222,
        "y": 380,
        "w": 140,
        "h": 140
    },
    "waist": {
        "label": "Coil (Waist)",
        "slot_key": "waist",
        "x": 385,
        "y": 380,
        "w": 140,
        "h": 140
    },
    "greaves": {
        "label": "Greaves (Legs)",
        "slot_key": "greaves",
        "x": 540,
        "y": 380,
        "w": 140,
        "h": 140
    }
}


def init_clients(dry_run: bool = False):
    """Initializes Gemini and Supabase clients."""
    if not GEMINI_API_KEY:
        print("\n[ERROR] GEMINI_API_KEY is missing! Set it in your .env file.")
        print("Get a free key from: https://aistudio.google.com/app/apikey (starts with AIzaSy...)")
        sys.exit(1)

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


def ensure_armour_bucket(supabase: Client):
    """Ensures the 'armour' storage bucket exists in Supabase."""
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
# RIGHT PANEL OCR PROMPT (x >= 1800)
# -------------------------------------------------------------
ARMOUR_OCR_PROMPT = """
You are an expert game data analyst for Monster Hunter (specifically Monster Hunter Outlanders / Now equipment screens).
Analyze this cropped right-hand UI panel of an armour piece inspection screen.

Look closely at the UI sections from top to bottom:
1. Piece Title: Topmost title (e.g. "Radiant Rathian Greaves I", "Legiana Helm III", "Rathalos Mail Alpha").
2. Starting Equipment Rarity: Look directly under the piece title for "Rarity X" (e.g. "Rarity 3", "Rarity 7"). Extract X as an integer (e.g. 3, 7) into "rarity".
3. Base Skills (under "Skill Info"): Inherent skills that have no unlock requirements. These have unlock_rarity = null.
4. Rarity-Locked Equipment Skills: Look for headers like:
   - "Equipment Skill: Unlocks at Rarity 9" -> unlock_rarity = 9
   - "Equipment Skill: Unlocks at Rarity 12" -> unlock_rarity = 12
   - "Unlocks at Grade 8" -> unlock_rarity = 8
   - "Unlocks at Rarity X" -> unlock_rarity = X
   - "R9", "R12", etc.
   Extract each skill name, level, and its specific unlock_rarity integer (or null if base skill).
5. Set Bonus / Set Effects (under "Set Effects"):
   - Read the set bonus name (e.g. "Rathian Gleam", "Legiana Flight", "Radiant Sense 1").
   - IMPORTANT: The numbers in parentheses at the end like "(1/2)", "(2/2)", "(3/2)", "(1/4)" ONLY indicate the current player's equipped piece count. Do NOT include "(1/2)" or piece counters in the set bonus name! Clean name only.

Extract all information:
1. Piece Title: Full name of the armour piece (e.g. "Radiant Rathian Greaves I").
2. Set Name: The armour set display title (e.g. "Radiant Rathian Set", "Legiana Set").
3. Set Variant: e.g. "I", "VII", "alpha", "beta" (defaults to "I" if not specified).
4. Monster Name: Monster name (e.g. "Radiant Rathian", "Legiana", "Rathalos").
5. Monster ID: Normalized lowercase snake_case monster ID (e.g. "radiant_rathian", "legiana").
6. Slot Type: Must be exactly one of:
   - "helm" (if title contains Helm, Head, Cap, Mask, Headdress, Crown, etc.)
   - "chest" (if title contains Mail, Chest, Vest, Armor, Plate, Jacket, etc.)
   - "gloves" (if title contains Vambraces, Arms, Gloves, Braces, Sleeves, etc.)
   - "waist" (if title contains Coil, Waist, Belt, Faulds, Tassets, etc.)
   - "greaves" (if title contains Greaves, Legs, Boots, Pants, Trousers, Feet, etc.)
7. Starting Rarity: Integer rarity right below title (e.g. 3, 7).
8. Skills: List of ALL skills attached to this piece (both base and rarity-locked):
   [
     {
       "name": "Skill Name",
       "level": integer (e.g. 1, 2),
       "unlock_rarity": integer or null (e.g. 9 if "Unlocks at Rarity 9", 12 if "Unlocks at Rarity 12", or null if base/Skill Info),
       "description": "Skill description if visible",
       "category": "attack" | "critical" | "defense" | "survival" | "general" | "status" | "utility" | "health"
     }
   ]
9. Set Bonus (if shown): Clean name and description of any set bonus effect.
10. Defense: Numeric defense value if visible.
11. All Detected Text Lines: Complete list of every single readable line of text from top to bottom.

Return a STRICT JSON object:
{
  "piece_name": "Full piece name (e.g. 'Radiant Rathian Greaves I')",
  "set_name": "Set name (e.g. 'Radiant Rathian Set')",
  "set_variant": "I",
  "monster_name": "Monster name (e.g. 'Radiant Rathian')",
  "monster_id": "Lowercase snake_case ID (e.g. 'radiant_rathian')",
  "slot": "helm" | "chest" | "gloves" | "waist" | "greaves",
  "rarity": 3,
  "skills": [
    {
      "name": "Skill Name",
      "level": 1,
      "unlock_rarity": 9,
      "description": "Skill description",
      "category": "general"
    }
  ],
  "set_bonus": {
    "name": "Clean Set Bonus Name (e.g. 'Rathian Gleam')",
    "description": "Set bonus description text"
  },
  "defense": integer or null,
  "all_detected_text_lines": [
    "Line 1",
    "Line 2"
  ]
}
"""


def extract_armour_ocr(right_panel_crop: np.ndarray, ai_client, max_retries: int = 3) -> dict:
    """Sends the right-panel crop (x >= 1800) to Gemini Vision for OCR."""
    print("  [*] OCR'ing right panel (x >= 1800) with Gemini...")
    rgb_panel = cv2.cvtColor(right_panel_crop, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_panel)

    for attempt in range(1, max_retries + 1):
        try:
            if USE_MODERN_SDK:
                response = ai_client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[ARMOUR_OCR_PROMPT, pil_image],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                raw_text = response.text
            else:
                response = ai_client.generate_content(
                    [ARMOUR_OCR_PROMPT, pil_image],
                    generation_config={"response_mime_type": "application/json"}
                )
                raw_text = response.text

            return json.loads(raw_text)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait_time = 15 * attempt
                print(f"  [!] Rate limit (429). Waiting {wait_time}s before retry ({attempt}/{max_retries})...")
                time.sleep(wait_time)
            else:
                print(f"  [!] OCR Error: {e}")
                break

    return {}


SLOT_KEYWORDS = [
    (r"\b(helm|headdress|head|cap|mask|crown)\b", "helm"),
    (r"\b(mail|chest|vest|armor|armour|plate|jacket)\b", "chest"),
    (r"\b(vambraces|vambrace|gloves|glove|gauntlets|gauntlet|arms|arm|braces|brace|sleeves|sleeve)\b", "gloves"),
    (r"\b(coil|waist|belt|faulds|fauld|tassets|tasset)\b", "waist"),
    (r"\b(greaves|greave|legs|leg|boots|boot|pants|pant|trousers|trouser|feet)\b", "greaves"),
]


def parse_armour_title(title: str):
    """
    Parses a piece title like 'Radiant Rathian Greaves I' into:
    - monster_name: 'Radiant Rathian'
    - monster_id: 'radiant_rathian'
    - slot: 'greaves'
    - set_variant: 'I'
    """
    import re
    cleaned = title.strip()
    slot_key = "helm"
    monster_part = cleaned
    variant_part = "I"

    for pattern, slot in SLOT_KEYWORDS:
        match = re.search(pattern, cleaned, flags=re.IGNORECASE)
        if match:
            slot_key = slot
            start_pos = match.start()
            end_pos = match.end()
            monster_part = cleaned[:start_pos].strip()
            rest = cleaned[end_pos:].strip()
            if rest:
                variant_part = rest
            break

    if not monster_part:
        monster_part = cleaned

    monster_id = monster_part.lower().replace(" ", "_").replace("-", "_").replace("'", "")
    monster_id = re.sub(r"[^a-z0-9_]", "", monster_id)

    return monster_part, monster_id, slot_key, variant_part


NON_MONSTER_SETS = {
    "high_metal", "leather", "bone", "chainmail", "alloy", "ingot",
    "hunter", "hunters", "guild_knight", "guild_cross", "bnahabra",
    "vespoid", "hornetaur", "kestodon", "gajau", "shamos", "girros"
}


def ensure_monster_exists(monster_id: str, monster_name: str, supabase: Client):
    """Ensures genuine monsters exist in public.monsters without creating dummy rows for material/generic armour sets."""
    if not supabase or not monster_id:
        return
    if monster_id in NON_MONSTER_SETS:
        return
    try:
        res = supabase.table("monsters").select("id").eq("id", monster_id).limit(1).execute()
        if not res.data or len(res.data) == 0:
            print(f"  [+] Monster '{monster_name}' (ID: '{monster_id}') not in 'monsters' table. Creating...")
            supabase.table("monsters").insert({
                "id": monster_id,
                "name": monster_name,
                "games": ["mho"],
                "is_active": True
            }).execute()
            print(f"  [✓] Created monster '{monster_name}' in 'monsters' table.")
    except Exception as e:
        print(f"  [!] Note on monster check '{monster_id}': {e}")


# -------------------------------------------------------------
# AUTO-DETECT HIGHLIGHTED SELECTION BOX
# -------------------------------------------------------------
def find_highlighted_armour_box(img, fallback_slot: str = "helm"):
    """
    Auto-detects the glowing yellow selection box of the active armour icon on screen.
    Falls back to static slot coordinates if no highlighted box is found.
    """
    h_img, w_img = img.shape[:2]
    scale_x = w_img / 2556.0
    scale_y = h_img / 1179.0

    # Convert to HSV to detect the bright yellow glowing selection border
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_yellow = np.array([20, 100, 180])
    upper_yellow = np.array([40, 255, 255])
    mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # Search in left-center area where armour icons are located
    search_y1 = int(140 * scale_y)
    search_y2 = int(720 * scale_y)
    search_x1 = int(100 * scale_x)
    search_x2 = int(1100 * scale_x)

    search_roi = mask[search_y1:search_y2, search_x1:search_x2]
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(search_roi, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        min_dim = int(115 * scale_x)
        max_dim = int(165 * scale_x)
        if min_dim <= w <= max_dim and min_dim <= h <= max_dim:
            actual_x = search_x1 + x
            actual_y = search_y1 + y
            print(f"  [✓] Auto-detected active selection box: x={actual_x}, y={actual_y}, w={w}, h={h}")
            return apply_pixel_crop(img, actual_x, actual_y, w, h)

    # Fallback to static slot coordinates
    slot_info = ARMOUR_SLOT_COORDS.get(fallback_slot, ARMOUR_SLOT_COORDS["helm"])
    crop_x = int(slot_info["x"] * scale_x)
    crop_y = int(slot_info["y"] * scale_y)
    crop_w = int(slot_info["w"] * scale_x)
    crop_h = int(slot_info["h"] * scale_y)
    print(f"  [!] Selection box not detected; using slot coordinates: x={crop_x}, y={crop_y}, w={crop_w}, h={crop_h}")
    return apply_pixel_crop(img, crop_x, crop_y, crop_w, crop_h)


# -------------------------------------------------------------
# SKILLS SYNCHRONIZATION & CREATION
# -------------------------------------------------------------
def sync_or_create_skill(skill_dict: dict, supabase: Client, dry_run: bool = True, enable_updates: bool = False) -> str:
    """
    Checks if a skill exists in public.skills.
    If missing, identifies it and creates the new skill record in Supabase.
    Returns the resolved canonical skill ID (e.g. 'poison_attack').
    """
    import re
    raw_name = skill_dict.get("name", "").strip()
    if not raw_name:
        return ""

    # 1. Strip equipped piece counters like '(1/2)', '(2/2)', '(3/2)', '(0/4)', '(1/4)'
    cleaned_name = re.sub(r"\s*[\(\[]\s*\d+\s*/\s*\d+\s*[\)\]]\s*$", "", raw_name).strip()
    # 2. Strip bracket prefix like '[ 2-Piece Set ]', '[ 4-Piece Set ]', '[ 2–Piece Set ]'
    cleaned_name = re.sub(r"^\[\s*\d+[–\-]\w+\s*Set\s*\]\s*", "", cleaned_name, flags=re.IGNORECASE).strip()
    # 3. Strip trailing colons or dashes
    cleaned_name = re.sub(r"[:\-–]+$", "", cleaned_name).strip()
    if not cleaned_name:
        cleaned_name = raw_name

    skill_level = skill_dict.get("level", 1)
    description = skill_dict.get("description", "")
    category = skill_dict.get("category", "general")
    is_set_bonus = bool(skill_dict.get("is_set_bonus", False) or "ink of" in cleaned_name.lower() or "set" in raw_name.lower())

    # Generate canonical slug ID
    skill_id = cleaned_name.lower().replace(" ", "_").replace("-", "_").replace("'", "").replace(":", "")
    skill_id = re.sub(r"[^a-z0-9_]", "", skill_id)

    if supabase is None:
        return skill_id

    try:
        res = (
            supabase.table("skills")
            .select("*")
            .or_(f"id.eq.{skill_id},name.ilike.{cleaned_name}")
            .limit(1)
            .execute()
        )

        if res.data and len(res.data) > 0:
            existing = res.data[0]
            existing_id = existing["id"]
            existing_games = existing.get("games") or []
            existing_max_levels = existing.get("max_levels") or {}

            needs_game_update = "mho" not in existing_games
            current_mho_max = existing_max_levels.get("mho", 0)
            needs_level_update = skill_level > current_mho_max

            if needs_game_update or needs_level_update:
                updated_games = list(set(existing_games + ["mho"]))
                existing_max_levels["mho"] = max(current_mho_max, skill_level, 3)
                print(f"    [⇄] Skill '{existing['name']}' ({existing_id}): updating 'mho' support in database")
                if enable_updates and not dry_run:
                    supabase.table("skills").update({
                        "games": updated_games,
                        "max_levels": existing_max_levels
                    }).eq("id", existing_id).execute()
            else:
                print(f"    [✓] Skill exists in DB: '{existing['name']}' (ID: '{existing_id}')")

            return existing_id

        # Missing skill!
        print(f"    [+] MISSING SKILL DETECTED: '{cleaned_name}' (ID: '{skill_id}')")
        new_skill_payload = {
            "id": skill_id,
            "name": cleaned_name,
            "category": category if category in ['attack', 'critical', 'defense', 'survival', 'general', 'status', 'utility', 'health'] else 'general',
            "games": ["mho"],
            "max_levels": {"mho": max(skill_level, 3)},
            "description": description or "",
            "is_active": True,
            "is_set_bonus": is_set_bonus,
            "set_thresholds": [2, 4] if is_set_bonus else []
        }

        if dry_run:
            print(f"        [DRY-RUN] -> Would create missing skill: ID='{skill_id}', name='{cleaned_name}'")
        elif enable_updates:
            supabase.table("skills").insert(new_skill_payload).execute()
            print(f"        [✓] Successfully created missing skill '{cleaned_name}' in Supabase 'skills' table!")

        return skill_id

    except Exception as e:
        print(f"    [!] Note on skill sync '{cleaned_name}': {e}")
        return skill_id


def normalize_piece_skills_delta(raw_skills, set_bonus_id=None):
    """
    Normalizes skill entries so that higher rarity tiers store the INCREMENTAL level added (+1)
    rather than the cumulative total displayed in the game UI.
    Example:
    If Flash Draw is Lv 1 at Base and displayed as Lv 2 at R12:
    - Base entry: { id: 'flash_draw', level: 1 }
    - R12 entry:  { id: 'flash_draw', level: 1, unlock_rarity: 12 }
    When summed at R12, the player gets 1 + 1 = 2 total levels.
    """
    def sort_key(s):
        ur = s.get("unlock_rarity")
        return 0 if (ur is None or ur <= 1) else int(ur)

    sorted_raw = sorted(raw_skills, key=sort_key)
    skill_cumulative = {}
    normalized = []

    for s in sorted_raw:
        s_id = s.get("id")
        raw_lvl = int(s.get("level", 1))
        ur = s.get("unlock_rarity")
        clean_ur = int(ur) if (ur is not None and int(ur) > 1) else None

        # If it is a set bonus, it's always level 1
        if set_bonus_id and s_id == set_bonus_id:
            normalized.append({"id": s_id, "level": 1})
            continue

        prev_cum = skill_cumulative.get(s_id, 0)
        if prev_cum > 0:
            # Already has a lower tier on this piece
            if raw_lvl > prev_cum:
                incremental = raw_lvl - prev_cum
                skill_cumulative[s_id] = raw_lvl
            else:
                incremental = 1
                skill_cumulative[s_id] = prev_cum + 1
        else:
            incremental = raw_lvl
            skill_cumulative[s_id] = raw_lvl

        entry = {
            "id": s_id,
            "level": incremental,
        }
        if clean_ur is not None:
            entry["unlock_rarity"] = clean_ur

        normalized.append(entry)

    # Sort: 1. Base skill(s) -> 2. Inherent Set Bonus -> 3. Rarity bonuses ascending (R6, R8, R9, R12)
    def final_sort(s):
        ur = s.get("unlock_rarity")
        is_sb = (set_bonus_id and s.get("id") == set_bonus_id)
        if is_sb:
            return (1, 0, s.get("id", ""))
        if ur is not None and int(ur) > 1:
            return (2, int(ur), s.get("id", ""))
        return (0, 0, s.get("id", ""))

    normalized.sort(key=final_sort)
    return normalized


# -------------------------------------------------------------
# MAIN PROCESS FUNCTION
# -------------------------------------------------------------
def process_single_image(
    file_path: Path,
    ai_client,
    supabase: Client,
    output_dir: Path,
    enable_updates: bool = False,
    enable_image_update: bool = False,
    dry_run: bool = True
):
    print(f"\n{'='*75}")
    print(f"[+] Processing Armour Screenshot: {file_path.name}")
    print(f"{'='*75}")

    img = cv2.imread(str(file_path))
    if img is None:
        print(f"  [X] Failed to load image: {file_path}")
        return False

    h_img, w_img = img.shape[:2]
    scale_x = w_img / 2556.0
    scale_y = h_img / 1179.0

    # 1. Crop right panel (x >= 1800)
    x_split = int(1800 * scale_x)
    right_panel = img[:, x_split:]

    # 2. Run OCR on right panel
    ocr_data = extract_armour_ocr(right_panel, ai_client)

    piece_name = ocr_data.get("piece_name") or file_path.stem
    parsed_monster_name, parsed_monster_id, slot_key, parsed_variant = parse_armour_title(piece_name)

    monster_name = parsed_monster_name
    monster_id = parsed_monster_id
    set_variant = parsed_variant if parsed_variant else (ocr_data.get("set_variant") or "I")
    
    # Base set name strictly on the monster name so the variant Roman numeral is never duplicated
    clean_base_monster = re.sub(r"\s+(Set\s+)?(I|II|III|IV|V|VI|VII|VIII|IX|X|\d+|Alpha|Beta|Gamma)(\+)?$", "", monster_name, flags=re.IGNORECASE).strip()
    if not clean_base_monster.endswith("Set"):
        set_name = f"{clean_base_monster} Set"
    else:
        set_name = clean_base_monster

    slot_info = ARMOUR_SLOT_COORDS.get(slot_key, ARMOUR_SLOT_COORDS["helm"])

    raw_skills = ocr_data.get("skills") or []
    set_bonus = ocr_data.get("set_bonus") or {}
    defense = ocr_data.get("defense")
    rarity = ocr_data.get("rarity")
    detected_lines = ocr_data.get("all_detected_text_lines") or []

    # 3. Dynamic Crop with Auto-Detection of Highlighted Selection Box
    cropped_icon = find_highlighted_armour_box(img, fallback_slot=slot_key)

    file_slug = f"{monster_id}_{set_variant.lower()}_{slot_key}" if set_variant != "I" else f"{monster_id}_{slot_key}"
    output_filename = f"{file_slug}.png"
    output_path = output_dir / output_filename
    cv2.imwrite(str(output_path), cropped_icon)

    # 4. Check Existing Record in Supabase
    existing_record = None
    existing_image_url = None
    has_custom_image = False

    if supabase:
        if not dry_run and enable_updates:
            ensure_monster_exists(monster_id, monster_name, supabase)

        try:
            # Query by unique composite key: game, monster_id, set_variant, slot
            res = (
                supabase.table(TABLE_NAME)
                .select("*")
                .eq("game", "mho")
                .eq("monster_id", monster_id)
                .eq("set_variant", set_variant)
                .eq("slot", slot_key)
                .execute()
            )
            if res.data and len(res.data) > 0:
                existing_record = res.data[0]
                existing_image_url = existing_record.get("image")
                if existing_image_url and not existing_image_url.startswith("/images/armor/") and "placeholder" not in existing_image_url.lower():
                    has_custom_image = True
                    print(f"  [✓] Existing Record Found in DB: ID='{existing_record.get('id')}' (Custom image exists)")
                else:
                    print(f"  [✓] Existing Record Found in DB: ID='{existing_record.get('id')}' (Default/no image -> will update with cropped piece image)")
            else:
                print(f"  [+] NEW / MISSING ARMOUR PIECE: Not found in database (will be inserted)")
        except Exception as e:
            print(f"  [!] DB lookup note: {e}")

    # Use existing record ID if found, otherwise standard format mho:monster:variant:slot
    if existing_record:
        piece_id = existing_record["id"]
    else:
        piece_id = f"mho:{monster_id}:{set_variant}:{slot_key}"

    # 5. Handle Storage Upload (upload if new piece, default placeholder, or forced)
    needs_image_upload = (not has_custom_image) or enable_image_update
    uploaded_image_url = existing_image_url

    if needs_image_upload:
        if not dry_run and supabase:
            try:
                storage_dest = f"pieces/{output_filename}"
                with open(output_path, "rb") as f:
                    supabase.storage.from_(STORAGE_BUCKET).upload(
                        path=storage_dest,
                        file=f,
                        file_options={"upsert": "true", "content-type": "image/png"}
                    )
                uploaded_image_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_dest)
                print(f"  [✓] Uploaded piece icon to Storage: {uploaded_image_url}")
            except Exception as e:
                print(f"  [!] Storage upload note: {e}")
        else:
            uploaded_image_url = f"[Storage URL: {STORAGE_BUCKET}/pieces/{output_filename}]"
    else:
        print(f"  [i] Custom piece image exists in DB. Skipping re-upload (pass --enable-image-update to overwrite).")

    # 6. Print Summary & Crop Details
    print(f"\n  [ARMOUR PIECE IDENTIFIED]")
    print(f"  - Title        : {piece_name}")
    print(f"  - Set Name     : {set_name} (Variant: {set_variant})")
    print(f"  - Monster      : {monster_name} (ID: '{monster_id}')")
    print(f"  - Slot         : {slot_info['label']} (Key: '{slot_key}')")
    print(f"  - Icon Crop    : Saved to '{output_filename}' ({cropped_icon.shape[1]}x{cropped_icon.shape[0]}px)")
    if defense:
        print(f"  - Defense      : {defense}")
    if rarity:
        print(f"  - Rarity       : {rarity}")

    # 7. Check & Sync Skills with Supabase
    print(f"\n  [SKILLS VERIFICATION & SYNCHRONIZATION]")
    raw_piece_skills = []
    if raw_skills:
        for sk in raw_skills:
            resolved_id = sync_or_create_skill(sk, supabase, dry_run=dry_run, enable_updates=enable_updates)
            lvl = sk.get("level", 1)
            ur = sk.get("unlock_rarity")
            ur_val = None
            if ur is not None:
                try:
                    parsed_ur = int(ur)
                    if parsed_ur > 1:
                        ur_val = parsed_ur
                except (ValueError, TypeError):
                    ur_val = None

            skill_entry = {
                "id": resolved_id,
                "level": lvl
            }
            if ur_val is not None:
                skill_entry["unlock_rarity"] = ur_val

            raw_piece_skills.append(skill_entry)

            ur_label = f" (Unlocks at Rarity {ur_val})" if ur_val else " (Base / Skill Info)"
            print(f"    * Detected: {sk.get('name')} (Displayed Lv {lvl}){ur_label} -> id: '{resolved_id}'")
    else:
        print(f"    (No individual skills detected)")

    set_bonus_id = None
    if set_bonus and set_bonus.get("name"):
        sb_name = set_bonus.get("name")
        set_bonus_id = sync_or_create_skill(
            {"name": sb_name, "description": set_bonus.get("description", ""), "is_set_bonus": True},
            supabase,
            dry_run=dry_run,
            enable_updates=enable_updates
        )
        if set_bonus_id and not any(s.get("id") == set_bonus_id for s in raw_piece_skills):
            raw_piece_skills.append({"id": set_bonus_id, "level": 1})
            print(f"    * Set Bonus: {sb_name} -> id: '{set_bonus_id}' (Attached)")
        else:
            print(f"    * Set Bonus: {sb_name} -> id: '{set_bonus_id}'")

    # Normalize cumulative levels to incremental delta levels (+1 at upgrade milestones)
    resolved_piece_skills = normalize_piece_skills_delta(raw_piece_skills, set_bonus_id=set_bonus_id)

    print(f"\n  [FINAL ATTACHED SKILLS (Incremental levels per rarity milestone)]")
    for s in resolved_piece_skills:
        ur = s.get("unlock_rarity")
        ur_str = f" [Unlocks at R{ur}]" if ur else " [Base]"
    print(f"\n  [ALL OCR'ED TEXT FROM RIGHT PANEL (x >= 1800)]")
    for idx, line in enumerate(detected_lines, start=1):
        print(f"    [{idx:02d}] {line}")

    # 8. Database Upsert Payload
    rarity_val = 1
    if rarity is not None:
        try:
            rarity_val = int(rarity)
        except (ValueError, TypeError):
            rarity_val = 1
    elif existing_record and existing_record.get("rarity") is not None:
        try:
            rarity_val = int(existing_record.get("rarity"))
        except (ValueError, TypeError):
            rarity_val = 1

    db_payload = {
        "id": piece_id,
        "game": "mho",
        "monster_id": monster_id,
        "set_variant": set_variant,
        "set_name": set_name,
        "rarity": rarity_val,
        "slot": slot_key,
        "skills": resolved_piece_skills,
        "notes": json.dumps({"set_bonus": set_bonus, "defense": defense, "rarity": rarity}),
        "is_active": True
    }
    if uploaded_image_url and not uploaded_image_url.startswith("["):
        db_payload["image"] = uploaded_image_url
    elif existing_record and existing_record.get("image"):
        db_payload["image"] = existing_record.get("image")

    if existing_record and existing_record.get("set_icon"):
        db_payload["set_icon"] = existing_record.get("set_icon")

    print(f"\n  [PROPOSED ARMOUR DB RECORD]")
    print(f"  - ID          : {db_payload['id']}")
    print(f"  - Set Name    : {db_payload['set_name']}")
    print(f"  - Variant     : {db_payload['set_variant']}")
    print(f"  - Rarity      : {db_payload['rarity']}")
    print(f"  - Slot        : {db_payload['slot']}")
    print(f"  - Skills JSON : {db_payload['skills']}")
    if db_payload.get("image"):
        print(f"  - Image       : {db_payload['image']}")

    if dry_run:
        print(f"\n  [DRY-RUN] No changes written to database. (Run with --enable-updates to apply)")
    elif enable_updates:
        if supabase:
            try:
                supabase.table(TABLE_NAME).upsert(
                    db_payload,
                    on_conflict="game,monster_id,set_variant,slot"
                ).execute()
                print(f"\n  [✓] SUCCESSFULLY UPSERTED '{piece_name}' into '{TABLE_NAME}' with ID '{piece_id}'!")
            except Exception as e:
                print(f"\n  [!] Supabase write error: {e}")
        else:
            print(f"\n  [!] Supabase not connected.")

    return True


def main():
    parser = argparse.ArgumentParser(description="Automated Armour & Skills OCR, Dynamic Cropping & Ingestion.")
    parser.add_argument("--input", "-i", default="input_armour", help="Directory of input armour screenshots")
    parser.add_argument("--output", "-o", default="output_armour", help="Directory for cropped armour icons")
    parser.add_argument("--dry-run", "-d", action="store_true", default=True, help="Safe preview mode (default: True)")
    parser.add_argument("--enable-updates", action="store_true", help="Write updates to Supabase (creates missing skills & upserts armour pieces)")
    parser.add_argument("--enable-image-update", "-u", action="store_true", help="Force re-uploading piece image to Supabase Storage")
    parser.add_argument("--delay", type=float, default=4.0, help="Delay between API calls in seconds")

    args = parser.parse_args()

    # If --enable-updates is passed explicitly, turn off dry-run
    dry_run = not args.enable_updates

    base_dir = Path(__file__).parent
    input_dir = base_dir / args.input
    output_dir = base_dir / args.output

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_files = sorted([f for f in input_dir.iterdir() if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}])

    if not image_files:
        print(f"\n[!] No images found in: {input_dir.resolve()}")
        print("    Drop your armour screenshots into that folder and run this script.")
        sys.exit(0)

    print(f"\n{'='*75}")
    print(f" Armour & Skills Automation Pipeline")
    print(f" Images Found       : {len(image_files)}")
    print(f" Mode               : {'DRY-RUN (Safe preview mode)' if dry_run else 'LIVE INGESTION'}")
    print(f" Updates to DB      : {'ENABLED (--enable-updates)' if args.enable_updates else 'DISABLED (View only)'}")
    print(f" Image Bucket       : {STORAGE_BUCKET}")
    print(f"{'='*75}")

    ai_client, supabase = init_clients(dry_run=dry_run)
    if supabase and not dry_run:
        ensure_armour_bucket(supabase)

    for idx, img_path in enumerate(image_files, start=1):
        process_single_image(
            img_path,
            ai_client,
            supabase,
            output_dir,
            enable_updates=args.enable_updates,
            enable_image_update=args.enable_image_update,
            dry_run=dry_run
        )
        if idx < len(image_files):
            time.sleep(args.delay)


if __name__ == "__main__":
    main()
