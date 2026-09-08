#!/usr/bin/env python3
"""
===========================================================================
 Monster Hunter Outlanders — Weapon OCR & Import Pipeline
===========================================================================
Description:
  Automates the ingestion of Weapons from mobile screenshots:
  1. Crops the high-resolution 3D weapon model from the center of the screen
     using calibrated normalized coordinates.
  2. Isolates the right-hand panel (x >= 0.65 * width) and runs Gemini Vision
     OCR to extract:
     - Weapon Name
     - Starting Rarity (Grade)
     - Weapon Type (Great Sword, Long Sword, etc.)
     - Element / Status / Raw damage type
     - Linked Monster (if mentioned in title/lore, else 'unknown')
     - Affinity & Defense bonus
     - Skills (Base & Rarity Unlock bonuses)
     - Description / Flavour text
  3. Automatically checks Supabase 'skills' table and inserts missing skills.
  4. Uploads cropped weapon icon to Supabase Storage ('weapons' bucket).
  5. Upserts weapon record into Supabase 'weapons' table.
  6. Displays a clean final report listing imported weapons, damage types,
     and linked monsters (or UNKNOWN if manual link is needed).

Usage:
  # Safe dry-run (no DB changes):
  python3 process_weapons.py --dry-run

  # Live Ingestion (writes to DB & Storage):
  python3 process_weapons.py --enable-updates --enable-image-update

  # Process a single image:
  python3 process_weapons.py --single IMG_1234.PNG --enable-updates
===========================================================================
"""

import os
import sys
import re
import json
import time
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

try:
    from google import genai
    from google.genai import types
    USE_MODERN_SDK = True
except ImportError:
    try:
        import google.generativeai as genai
        USE_MODERN_SDK = False
    except ImportError:
        print("Error: Neither google-genai nor google-generativeai is installed.")
        print("Run: pip install google-genai pillow opencv-python supabase")
        sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase is not installed. Run: pip install supabase")
    sys.exit(1)

# Config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
STORAGE_BUCKET = os.getenv("SUPABASE_WEAPON_STORAGE_BUCKET", "weapons")
TABLE_NAME = "weapons"
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# Calibrated Normalized Weapon Model Bounding Box
# Derived from 2556x1179 screenshots (x=970, y=92, w=710, h=929)
WEAPON_CROP_BOX = {
    "x_pct": 0.3793,
    "y_pct": 0.0778,
    "w_pct": 0.2779,
    "h_pct": 0.7877
}

VALID_WEAPON_TYPES = {
    "great_sword": "Great Sword",
    "long_sword": "Long Sword",
    "sword_shield": "Sword & Shield",
    "dual_blades": "Dual Blades",
    "hammer": "Hammer",
    "hunting_horn": "Hunting Horn",
    "lance": "Lance",
    "gunlance": "Gunlance",
    "switch_axe": "Switch Axe",
    "charge_blade": "Charge Blade",
    "insect_glaive": "Insect Glaive",
    "bow": "Bow",
    "light_bowgun": "Light Bowgun",
    "heavy_bowgun": "Heavy Bowgun"
}

VALID_ELEMENTS = {
    "raw", "fire", "water", "thunder", "ice", "dragon",
    "poison", "paralysis", "blast", "sleep"
}


# -------------------------------------------------------------
# RIGHT PANEL WEAPON OCR PROMPT
# -------------------------------------------------------------
WEAPON_OCR_PROMPT = """
You are an expert game data analyst for Monster Hunter (specifically Monster Hunter Outlanders / Now equipment screens).
Analyze this cropped right-hand UI panel (x >= 1800) of a weapon inspection / forge screen.

Look closely at all sections from top to bottom:
1. Weapon Title: Topmost weapon name (e.g. "Radiant Flame Blade III", "Legiana Heavy Bowgun I", "Radiant Thunder Blade II", "Freeze Blade III").
2. Starting Rarity: Look directly under the weapon title for "Rarity X" (e.g. "Rarity 10", "Rarity 6", "Rarity 7"). Extract X as an integer into "rarity".
3. Weapon Type: Identify the exact weapon archetype:
   - Read the lore description text at the bottom. It often explicitly states the weapon archetype:
     - "heavy bowgun" -> "heavy_bowgun"
     - "light bowgun" -> "light_bowgun"
     - "great sword" -> "great_sword"
     - "long sword" -> "long_sword"
     - "sword and shield" / "sword & shield" -> "sword_shield"
     - "dual blades" -> "dual_blades"
     - "hammer" -> "hammer"
     - "hunting horn" -> "hunting_horn"
     - "lance" -> "lance"
     - "gunlance" -> "gunlance"
     - "switch axe" -> "switch_axe"
     - "charge blade" -> "charge_blade"
     - "insect glaive" -> "insect_glaive"
     - "bow" -> "bow"
   - If not stated in description, infer from weapon title keywords.
4. Element / Status / Damage Type:
   - Check description text and title for element keywords:
     - "fire" / "flame" / "burn" -> "fire"
     - "water" / "aqua" / "torrent" -> "water"
     - "thunder" / "lightning" / "spark" / "shock" -> "thunder"
     - "ice" / "frost" / "freeze" / "glacier" -> "ice"
     - "dragon" -> "dragon"
     - "poison" / "toxin" / "venom" -> "poison"
     - "paralysis" / "paralyze" -> "paralysis"
     - "blast" / "explosion" -> "blast"
     - "sleep" -> "sleep"
     - If non-elemental (e.g. iron/bone), output "raw".
5. Monster Affiliation:
   - Read the lore text and title for monster parts mentioned (e.g. "Legiana parts", "Radiant Rathalos", "Rathian", "Kulu-Ya-Ku", "Pukei-Pukei", "Diablos").
   - If a monster is identified, return the clean monster_name (e.g. "Legiana", "Radiant Rathalos") and normalized snake_case monster_id (e.g. "legiana", "radiant_rathalos").
   - If no specific monster is mentioned (e.g. general iron/bone weapon), return null for monster_name and monster_id.
6. Stats:
   - Affinity: Percentage integer if shown (e.g. 5 for "Affinity 5%", 0 if not shown).
   - Defense Bonus: Integer defense bonus if shown, or 0.
7. Skills (under "Skill Info"):
   - Extract attached skills with name, level, unlock_rarity (if locked to Rarity 9 or 12), and description.
   - Note: The game shows cumulative level at that rarity. Extract the displayed level number.
8. Lore Description: Full text of the equipment lore at the bottom.

Return a STRICT JSON object:
{
  "weapon_name": "Full weapon name (e.g. 'Radiant Flame Blade III')",
  "rarity": 10,
  "weapon_type_id": "great_sword",
  "element_type": "fire",
  "monster_name": "Radiant Rathalos",
  "monster_id": "radiant_rathalos",
  "source_type": "monster",
  "affinity": 5,
  "defense_bonus": 0,
  "skills": [
    {
      "name": "Radiant Power Surge",
      "level": 1,
      "unlock_rarity": null,
      "description": "Reduces maximum health and increases damage.",
      "category": "attack"
    }
  ],
  "description": "Residual heat in the Radiant Rathalos parts used in this great sword grants it a searing strike.",
  "all_detected_text_lines": [
    "Line 1",
    "Line 2"
  ]
}
"""


def extract_weapon_ocr(right_panel_crop: np.ndarray, ai_client, max_retries: int = 3) -> dict:
    """Sends the right-panel crop (x >= 0.65) to Gemini Vision for OCR."""
    print("  [*] OCR'ing right panel with Gemini Vision...")
    rgb_panel = cv2.cvtColor(right_panel_crop, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_panel)

    for attempt in range(1, max_retries + 1):
        try:
            if USE_MODERN_SDK:
                response = ai_client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[WEAPON_OCR_PROMPT, pil_image],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                raw_text = response.text
            else:
                response = ai_client.generate_content(
                    [WEAPON_OCR_PROMPT, pil_image],
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


# -------------------------------------------------------------
# SKILLS & NORMALIZATION HELPERS
# -------------------------------------------------------------
def sync_or_create_skill(skill_dict: dict, supabase: Client, dry_run: bool = True, enable_updates: bool = False) -> str:
    """Checks if a skill exists in public.skills and creates it if missing."""
    raw_name = skill_dict.get("name", "").strip()
    if not raw_name:
        return ""

    cleaned_name = re.sub(r"\s*[\(\[]\s*\d+\s*/\s*\d+\s*[\)\]]\s*$", "", raw_name).strip()
    cleaned_name = re.sub(r"^\[\s*\d+[–\-]\w+\s*Set\s*\]\s*", "", cleaned_name, flags=re.IGNORECASE).strip()
    cleaned_name = re.sub(r"[:\-–]+$", "", cleaned_name).strip()
    if not cleaned_name:
        cleaned_name = raw_name

    skill_level = skill_dict.get("level", 1)
    description = skill_dict.get("description", "")
    category = skill_dict.get("category", "general")

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
                print(f"    [⇄] Skill '{existing['name']}' ({existing_id}): updating 'mho' support in DB")
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
            "description": description or f"Grants {cleaned_name} effect.",
            "is_active": True,
            "is_set_bonus": False,
            "set_thresholds": []
        }
        if dry_run:
            print(f"        [DRY-RUN] -> Would insert missing skill '{cleaned_name}' into 'skills' table")
        elif enable_updates:
            supabase.table("skills").insert(new_skill_payload).execute()
            print(f"        [✓] Successfully created skill '{cleaned_name}' in Supabase 'skills' table!")

        return skill_id

    except Exception as e:
        print(f"    [!] Skill lookup error: {e}")
        return skill_id


def normalize_piece_skills_delta(raw_skills):
    """Normalizes cumulative displayed skill levels into incremental delta levels."""
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

        prev_cum = skill_cumulative.get(s_id, 0)
        if prev_cum > 0:
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

    def final_sort(s):
        ur = s.get("unlock_rarity")
        if ur is not None and int(ur) > 1:
            return (1, int(ur), s.get("id", ""))
        return (0, 0, s.get("id", ""))

    normalized.sort(key=final_sort)
    return normalized


# -------------------------------------------------------------
# MAIN WEAPON PROCESS FUNCTION
# -------------------------------------------------------------
def process_single_weapon(
    file_path: Path,
    ai_client,
    supabase: Client,
    output_dir: Path,
    enable_updates: bool = False,
    enable_image_update: bool = False,
    dry_run: bool = True
) -> dict:
    """Processes a single weapon screenshot. Returns record summary dict."""
    print(f"\n{'='*75}")
    print(f"[+] Processing Weapon Screenshot: {file_path.name}")
    print(f"{'='*75}")

    img = cv2.imread(str(file_path))
    if img is None:
        print(f"  [X] Failed to load image: {file_path}")
        return None

    h_img, w_img = img.shape[:2]

    # 1. Crop 3D Weapon Model (Center Screen)
    crop_x = int(round(WEAPON_CROP_BOX["x_pct"] * w_img))
    crop_y = int(round(WEAPON_CROP_BOX["y_pct"] * h_img))
    crop_w = int(round(WEAPON_CROP_BOX["w_pct"] * w_img))
    crop_h = int(round(WEAPON_CROP_BOX["h_pct"] * h_img))

    # Guard boundaries
    crop_x1 = max(0, min(crop_x, w_img - 1))
    crop_y1 = max(0, min(crop_y, h_img - 1))
    crop_x2 = max(crop_x1 + 10, min(crop_x + crop_w, w_img))
    crop_y2 = max(crop_y1 + 10, min(crop_y + crop_h, h_img))

    cropped_weapon = img[crop_y1:crop_y2, crop_x1:crop_x2]

    # 2. Crop Right Panel for OCR (x >= 1800 on 2556 scale)
    scale_x = w_img / 2556.0
    x_split = int(1800 * scale_x)
    right_panel = img[:, x_split:]

    # 3. Run OCR on Right Panel
    ocr_data = extract_weapon_ocr(right_panel, ai_client)

    if not ocr_data or not ocr_data.get("weapon_name"):
        print(f"  [X] Failed to extract valid OCR data from '{file_path.name}'. Skipping DB write.")
        return None

    weapon_name = ocr_data.get("weapon_name").strip()
    weapon_type_id = (ocr_data.get("weapon_type_id") or "great_sword").lower().strip()
    if weapon_type_id not in VALID_WEAPON_TYPES:
        weapon_type_id = "great_sword"
    weapon_type_label = VALID_WEAPON_TYPES.get(weapon_type_id, "Great Sword")

    element_type = (ocr_data.get("element_type") or "raw").lower().strip()
    if element_type not in VALID_ELEMENTS:
        element_type = "raw"

    rarity = ocr_data.get("rarity") or 1
    try:
        rarity_val = int(rarity)
    except (ValueError, TypeError):
        rarity_val = 1

    monster_name = ocr_data.get("monster_name")
    monster_id = ocr_data.get("monster_id")
    if monster_id:
        monster_id = monster_id.lower().replace(" ", "_").replace("-", "_")
        monster_id = re.sub(r"[^a-z0-9_]", "", monster_id)

    source_type = "monster" if (monster_id and monster_name) else (ocr_data.get("source_type") or "general")

    affinity = ocr_data.get("affinity") or 0
    defense_bonus = ocr_data.get("defense_bonus") or 0
    description = ocr_data.get("description") or ""
    raw_skills = ocr_data.get("skills") or []
    detected_lines = ocr_data.get("all_detected_text_lines") or []

    # Weapon Slug & ID
    clean_slug = weapon_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")
    clean_slug = re.sub(r"[^a-z0-9_]", "", clean_slug)
    weapon_id = f"mho:{weapon_type_id}:{clean_slug}"
    output_filename = f"{clean_slug}.png"
    output_path = output_dir / output_filename
    cv2.imwrite(str(output_path), cropped_weapon)

    # 4. Check Existing Record in Supabase
    existing_record = None
    existing_image_url = None
    has_custom_image = False

    if supabase:
        try:
            res = supabase.table(TABLE_NAME).select("*").eq("id", weapon_id).execute()
            if res.data and len(res.data) > 0:
                existing_record = res.data[0]
                existing_image_url = existing_record.get("image")
                if existing_image_url and "placeholder" not in existing_image_url.lower():
                    has_custom_image = True
                    print(f"  [✓] Existing Weapon in DB: ID='{weapon_id}' (Custom image exists)")
                else:
                    print(f"  [✓] Existing Weapon in DB: ID='{weapon_id}' (Default image -> will update)")
            else:
                print(f"  [+] NEW WEAPON: Not found in database (will be inserted)")
        except Exception as e:
            print(f"  [!] DB lookup note: {e}")

    # 5. Handle Storage Upload
    needs_image_upload = (not has_custom_image) or enable_image_update
    uploaded_image_url = existing_image_url

    if needs_image_upload:
        if not dry_run and supabase:
            try:
                storage_dest = f"weapons/{output_filename}"
                with open(output_path, "rb") as f:
                    supabase.storage.from_(STORAGE_BUCKET).upload(
                        path=storage_dest,
                        file=f,
                        file_options={"upsert": "true", "content-type": "image/png"}
                    )
                uploaded_image_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_dest)
                print(f"  [✓] Uploaded weapon model to Storage: {uploaded_image_url}")
            except Exception as e:
                print(f"  [!] Storage upload note: {e}")
        else:
            uploaded_image_url = f"[Storage URL: {STORAGE_BUCKET}/weapons/{output_filename}]"
    else:
        print(f"  [i] Custom weapon image exists in DB. Skipping re-upload.")

    # 6. Print Weapon Summary
    print(f"\n  [WEAPON IDENTIFIED]")
    print(f"  - Name         : {weapon_name}")
    print(f"  - Weapon Type  : {weapon_type_label} ({weapon_type_id})")
    print(f"  - Rarity / Grd : Rarity {rarity_val}")
    print(f"  - Damage Type  : {element_type.upper()}")
    print(f"  - Monster Link : {monster_name or 'UNKNOWN (Not linked)'} (ID: '{monster_id or 'none'}')")
    print(f"  - Affinity     : {affinity}%")
    if defense_bonus:
        print(f"  - Defense Bonus: +{defense_bonus}")
    print(f"  - Model Crop   : Saved to '{output_filename}' ({cropped_weapon.shape[1]}x{cropped_weapon.shape[0]}px)")

    # 7. Check & Sync Skills
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

            skill_entry = {"id": resolved_id, "level": lvl}
            if ur_val is not None:
                skill_entry["unlock_rarity"] = ur_val

            raw_piece_skills.append(skill_entry)
            ur_label = f" (Unlocks at Rarity {ur_val})" if ur_val else " (Base)"
            print(f"    * Detected: {sk.get('name')} (Displayed Lv {lvl}){ur_label} -> id: '{resolved_id}'")
    else:
        print(f"    (No skills detected)")

    resolved_skills = normalize_piece_skills_delta(raw_piece_skills)

    print(f"\n  [ALL OCR'ED TEXT FROM RIGHT PANEL]")
    for idx, line in enumerate(detected_lines, start=1):
        print(f"    [{idx:02d}] {line}")

    # 8. Database Upsert Payload
    db_payload = {
        "id": weapon_id,
        "game": "mho",
        "name": weapon_name,
        "weapon_type_id": weapon_type_id,
        "monster_id": monster_id if monster_id else None,
        "source_type": source_type,
        "element_type": element_type,
        "affinity": affinity,
        "defense_bonus": defense_bonus,
        "skills": resolved_skills,
        "rarity": rarity_val,
        "grade": rarity_val,
        "description": description,
        "notes": json.dumps({"affinity": affinity, "defense_bonus": defense_bonus}),
        "is_active": True
    }
    if uploaded_image_url and not uploaded_image_url.startswith("["):
        db_payload["image"] = uploaded_image_url
    elif existing_record and existing_record.get("image"):
        db_payload["image"] = existing_record.get("image")

    print(f"\n  [PROPOSED WEAPON DB RECORD]")
    print(f"  - ID          : {db_payload['id']}")
    print(f"  - Type        : {db_payload['weapon_type_id']}")
    print(f"  - Monster ID  : {db_payload['monster_id'] or '(None - UNKNOWN)'}")
    print(f"  - Element     : {db_payload['element_type']}")
    print(f"  - Rarity      : {db_payload['rarity']}")
    print(f"  - Skills JSON : {db_payload['skills']}")
    if db_payload.get("image"):
        print(f"  - Image       : {db_payload['image']}")

    if dry_run:
        print(f"\n  [DRY-RUN] No changes written to database. (Run with --enable-updates to apply)")
    elif enable_updates:
        if supabase:
            try:
                supabase.table(TABLE_NAME).upsert(db_payload, on_conflict="id").execute()
                print(f"\n  [✓] SUCCESSFULLY UPSERTED '{weapon_name}' into '{TABLE_NAME}' with ID '{weapon_id}'!")
            except Exception as e:
                print(f"\n  [!] Supabase write error: {e}")
        else:
            print(f"\n  [!] Supabase not connected.")

    return {
        "name": weapon_name,
        "type": weapon_type_label,
        "rarity": f"R{rarity_val}",
        "element": element_type.upper(),
        "monster": monster_name if monster_name else "UNKNOWN (manual link needed)"
    }


def crop_weapon_image_only(file_path: Path, output_dir: Path) -> dict:
    """Crops only the weapon 3D model without running OCR or contacting DB."""
    img = cv2.imread(str(file_path))
    if img is None:
        print(f"  [X] Failed to load image: {file_path.name}")
        return None

    h_img, w_img = img.shape[:2]

    # Crop 3D Weapon Model (Center Screen)
    crop_x = int(round(WEAPON_CROP_BOX["x_pct"] * w_img))
    crop_y = int(round(WEAPON_CROP_BOX["y_pct"] * h_img))
    crop_w = int(round(WEAPON_CROP_BOX["w_pct"] * w_img))
    crop_h = int(round(WEAPON_CROP_BOX["h_pct"] * h_img))

    crop_x1 = max(0, min(crop_x, w_img - 1))
    crop_y1 = max(0, min(crop_y, h_img - 1))
    crop_x2 = max(crop_x1 + 10, min(crop_x + crop_w, w_img))
    crop_y2 = max(crop_y1 + 10, min(crop_y + crop_h, h_img))

    cropped_weapon = img[crop_y1:crop_y2, crop_x1:crop_x2]

    clean_stem = file_path.stem.lower().replace(" ", "_")
    output_filename = f"{clean_stem}.png"
    output_path = output_dir / output_filename
    cv2.imwrite(str(output_path), cropped_weapon)

    print(f"  [✓] Cropped & saved: {file_path.name} -> output_weapons/{output_filename} ({cropped_weapon.shape[1]}x{cropped_weapon.shape[0]}px)")
    return {
        "file": file_path.name,
        "output": output_filename,
        "dimensions": f"{cropped_weapon.shape[1]}x{cropped_weapon.shape[0]}px"
    }


# -------------------------------------------------------------
# CLI ENTRY POINT
# -------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Monster Hunter Outlanders — Weapon OCR & Import Pipeline")
    parser.add_argument("--crop-only", "--images-only", action="store_true", default=False, help="Extract & crop weapon images only (no OCR, no database writes)")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Run OCR and cropping without writing to database")
    parser.add_argument("--enable-updates", action="store_true", default=False, help="Enable live writes to Supabase database")
    parser.add_argument("--enable-image-update", action="store_true", default=False, help="Force overwrite of weapon images in Supabase storage")
    parser.add_argument("--single", type=str, default=None, help="Process only a specific image filename in input_weapons/")
    args = parser.parse_args()

    input_dir = Path(__file__).parent / "input_weapons"
    output_dir = Path(__file__).parent / "output_weapons"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find screenshots
    if args.single:
        single_path = input_dir / args.single
        if not single_path.exists():
            print(f"[X] Specified image not found: {single_path}")
            return
        image_files = [single_path]
    else:
        image_files = sorted(list(input_dir.glob("*.PNG")) + list(input_dir.glob("*.png")) + list(input_dir.glob("*.JPG")) + list(input_dir.glob("*.jpg")))

    # 1. CROP-ONLY / IMAGES-ONLY MODE
    if args.crop_only:
        print("=" * 75)
        print(" Monster Hunter Outlanders — Weapon Image Cropper (CROP-ONLY MODE)")
        print(f" Images Found       : {len(image_files)}")
        print(" Mode               : IMAGE CROPPING ONLY (No OCR, No DB updates)")
        print(f" Output Directory   : {output_dir}")
        print("=" * 75)

        if not image_files:
            print(f"\nNo weapon screenshots found in '{input_dir.name}/'.")
            return

        cropped_reports = []
        for img_path in image_files:
            r = crop_weapon_image_only(img_path, output_dir)
            if r:
                cropped_reports.append(r)

        print("\n" + "=" * 75)
        print("                           CROP EXPORT SUMMARY")
        print("=" * 75)
        print(f" {'#':<3} | {'Original Screenshot':<30} | {'Saved Output File':<25} | {'Dimensions'}")
        print("-" * 75)
        for idx, cr in enumerate(cropped_reports, start=1):
            print(f" {idx:02d}  | {cr['file']:<30} | {cr['output']:<25} | {cr['dimensions']}")
        print("=" * 75 + "\n")
        return

    # 2. FULL OCR & INGESTION MODE
    dry_run = args.dry_run or (not args.enable_updates)

    # Initialize Gemini AI Client
    if not GEMINI_API_KEY:
        print("[!] Warning: GEMINI_API_KEY is not set in .env. OCR will fail.")
        ai_client = None
    else:
        if USE_MODERN_SDK:
            ai_client = genai.Client(api_key=GEMINI_API_KEY)
        else:
            genai.configure(api_key=GEMINI_API_KEY)
            ai_client = genai.GenerativeModel(MODEL_NAME)

    # Initialize Supabase Client
    supabase_client = None
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"[!] Supabase connection warning: {e}")
    else:
        print("[!] Note: SUPABASE_URL / SUPABASE_KEY not found in .env.")

    print("=" * 75)
    print(" Monster Hunter Outlanders — Weapons Automation Pipeline")
    print(f" Images Found       : {len(image_files)}")
    print(f" Mode               : {'DRY-RUN (Preview Only)' if dry_run else 'LIVE INGESTION'}")
    print(f" Updates to DB      : {'ENABLED (--enable-updates)' if args.enable_updates else 'DISABLED (Dry Run)'}")
    print(f" Image Bucket       : {STORAGE_BUCKET}")
    print(f" Output Directory   : {output_dir}")
    print("=" * 75)

    if not image_files:
        print(f"\nNo weapon screenshots found in '{input_dir.name}/'.")
        print(f"Please drop your weapon inspection screenshots into:")
        print(f"  {input_dir.resolve()}")
        print("\nSupported formats: .png, .PNG, .jpg, .JPG")
        return

    processed_reports = []

    for img_path in image_files:
        report = process_single_weapon(
            file_path=img_path,
            ai_client=ai_client,
            supabase=supabase_client,
            output_dir=output_dir,
            enable_updates=args.enable_updates,
            enable_image_update=args.enable_image_update,
            dry_run=dry_run
        )
        if report:
            processed_reports.append(report)

    # Final Summary Report
    print("\n" + "=" * 90)
    print("                           WEAPON INGESTION REPORT SUMMARY")
    print("=" * 90)
    print(f" {'#':<3} | {'Weapon Name':<28} | {'Type':<14} | {'Rarity':<7} | {'Element':<9} | {'Linked Monster'}")
    print("-" * 90)
    for idx, r in enumerate(processed_reports, start=1):
        monster_str = r['monster']
        if "UNKNOWN" in monster_str:
            monster_display = f"\033[93m{monster_str}\033[0m"
        else:
            monster_display = f"\033[92m{monster_str}\033[0m"
        print(f" {idx:02d}  | {r['name']:<28} | {r['type']:<14} | {r['rarity']:<7} | {r['element']:<9} | {monster_display}")
    print("=" * 90 + "\n")


if __name__ == "__main__":
    main()
