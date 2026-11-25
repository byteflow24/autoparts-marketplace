import os
import re
import requests

"""
Part Lookup Service  (v3 — name-based lookup, improved part number extraction)
==============================================================================
Searches Google via SerpAPI using part name + car context
(make / model / sub-model / year) and extracts:
  - part_number   (OEM / manufacturer number)
  - name          (clean part name from search results)
  - from_year / to_year  (fitment range)
  - category / subcategory
  - description

The input is part_name + car context.  Part number is what we're trying to FIND.

v3 changes vs v2:
  - _extract_part_number now checks snippet_highlighted_words first (most reliable)
  - Added pure-numeric OEM pattern (e.g. GM 84339532)
  - Added _extract_name() — returns a clean part name from results
  - _parse_results now returns "name" in the dict
"""

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
SERPAPI_URL = "https://serpapi.com/search"

# ── Category keywords → normalized category ──────────────────
CATEGORY_MAP = {
    "brake":         "Brakes",
    "rotor":         "Brakes",
    "caliper":       "Brakes",
    "pad":           "Brakes",
    "drum":          "Brakes",
    "abs":           "Brakes",
    "engine":        "Engine",
    "piston":        "Engine",
    "gasket":        "Engine",
    "filter":        "Engine",
    "spark":         "Engine",
    "timing":        "Engine",
    "oil pump":      "Engine",
    "alternator":    "Electrical",
    "battery":       "Electrical",
    "starter":       "Electrical",
    "sensor":        "Electrical",
    "fuse":          "Electrical",
    "wiring":        "Electrical",
    "headlight":     "Electrical",
    "taillight":     "Electrical",
    "suspension":    "Suspension",
    "shock":         "Suspension",
    "strut":         "Suspension",
    "control arm":   "Suspension",
    "ball joint":    "Suspension",
    "bushing":       "Suspension",
    "tie rod":       "Suspension",
    "sway bar":      "Suspension",
    "wheel bearing": "Suspension",
    "transmission":  "Transmission",
    "clutch":        "Transmission",
    "gearbox":       "Transmission",
    "axle":          "Transmission",
    "driveshaft":    "Transmission",
    "cv joint":      "Transmission",
    "exhaust":       "Exhaust",
    "muffler":       "Exhaust",
    "catalytic":     "Exhaust",
    "manifold":      "Exhaust",
    "radiator":      "Cooling",
    "coolant":       "Cooling",
    "thermostat":    "Cooling",
    "water pump":    "Cooling",
    "bumper":        "Body",
    "fender":        "Body",
    "hood":          "Body",
    "door":          "Body",
    "mirror":        "Body",
    "windshield":    "Body",
    "compressor":    "A/C & Heating",
    "condenser":     "A/C & Heating",
    "evaporator":    "A/C & Heating",
    "blower":        "A/C & Heating",
    "cabin air":     "A/C & Heating",
    "fuel pump":     "Fuel",
    "injector":      "Fuel",
    "fuel tank":     "Fuel",
    "throttle":      "Fuel",
}

# ── Subcategory hints ─────────────────────────────────────────
SUBCATEGORY_MAP = {
    "brake pad":        "Brake Pads",
    "brake pads":       "Brake Pads",
    "rotor":            "Brake Rotors / Discs",
    "disc":             "Brake Rotors / Discs",
    "caliper":          "Brake Caliper",
    "brake drum":       "Brake Drums",
    "abs sensor":       "ABS Sensor",
    "air filter":       "Air Filter",
    "oil filter":       "Oil Filter",
    "fuel filter":      "Fuel Filter",
    "spark plug":       "Spark Plugs",
    "ignition coil":    "Ignition Coil",
    "timing belt":      "Timing Belt / Chain",
    "timing chain":     "Timing Belt / Chain",
    "water pump":       "Water Pump",
    "thermostat":       "Thermostat",
    "alternator":       "Alternator",
    "battery":          "Battery",
    "starter":          "Starter Motor",
    "shock absorber":   "Shock Absorber",
    "strut":            "Strut Assembly",
    "control arm":      "Control Arm",
    "ball joint":       "Ball Joint",
    "tie rod":          "Tie Rod",
    "wheel bearing":    "Wheel Bearing & Hub",
    "cv axle":          "CV Axle / Shaft",
    "cv shaft":         "CV Axle / Shaft",
    "clutch":           "Clutch Kit",
    "radiator":         "Radiator",
    "fuel pump":        "Fuel Pump",
    "fuel injector":    "Fuel Injector",
    "throttle body":    "Throttle Body",
    "a/c compressor":   "A/C Compressor",
    "ac compressor":    "A/C Compressor",
    "cabin air filter": "Cabin Air Filter",
    "head gasket":      "Head Gasket",
    "gasket":           "Gasket",
    "sunroof":          "Sunroof / Moonroof",
    "window":           "Window Glass",
}

# ── OEM part number patterns ──────────────────────────────────
# Ordered from most specific to least specific
PART_NUMBER_PATTERNS = [
    # Hyphenated style: Toyota/Honda/GM with dashes (04465-02190, 45251-SDA-A00)
    r'\b([A-Z0-9]{2,6}-[A-Z0-9]{3,10}(?:-[A-Z0-9]{1,6})?)\b',
    # Pure-numeric OEM (GM, Ford, etc.) — 6–10 digits, NOT a year
    r'\b([0-9]{6,10})\b',
    # Alpha-led OEM (GDB1234, ACDelco style)
    r'\b([A-Z]{1,4}[0-9]{3,8}[A-Z]{0,4})\b',
    # Digit-led OEM (1234AB style)
    r'\b([0-9]{4,6}[A-Z]{1,4}[0-9]{0,4})\b',
]

# Noise words that look like part numbers but aren't
PART_NUMBER_BLACKLIST = {
    "HTML", "HTTP", "HTTPS", "USA", "OEM", "FIT", "NEW",
    "SET", "KIT", "FOR", "THE", "AND", "WITH", "FROM",
}


def lookup_part_by_name(part_name: str, car_make: str = "", car_model: str = "",
                        car_sub_model: str = "", year: str = "") -> dict:
    """
    Main entry point.
    Searches by part name + car context, returns structured part data.
    """
    part_name = part_name.strip()
    if not part_name:
        return {"error": "Part name is required."}

    if not SERPAPI_KEY:
        return {"error": "SERPAPI_KEY not configured on server."}

    # Build search query: "2014 Ford Focus Thermostat part number"
    # Format: {year} {make} {model} {sub_model} {part_name} part number
    # If the search term looks like a part number already, skip the "part number" suffix
    # to avoid redundancy (e.g. "2014 Ford Focus 84339532" not "84339532 part number")
    query_parts = [p for p in [year, car_make, car_model, car_sub_model, part_name] if p]
    looks_like_number = bool(re.search(r'\d{4,}', part_name) and not part_name[0].isalpha())
    suffix = "" if looks_like_number else " part number"
    query = " ".join(query_parts) + suffix

    raw = _serpapi_search(query)
    if "error" in raw:
        return raw

    return _parse_results(part_name, car_make, car_model, year, raw)


def _serpapi_search(query: str) -> dict:
    """Calls SerpAPI and returns the raw response."""
    try:
        params = {
            "q":       query,
            "hl":      "en",
            "gl":      "us",
            "num":     8,
            "api_key": SERPAPI_KEY,
        }
        resp = requests.get(SERPAPI_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            return {"error": f"SerpAPI: {data['error']}"}
        return data
    except requests.exceptions.Timeout:
        return {"error": "Search timed out. Try again."}
    except requests.exceptions.RequestException as e:
        return {"error": f"Search failed: {str(e)}"}


def _parse_results(part_name: str, car_make: str, car_model: str,
                   year: str, data: dict) -> dict:
    """Extract structured fields from SerpAPI results."""
    organic  = data.get("organic_results", [])
    knowledge = data.get("knowledge_graph", {})

    # Collect all text for parsing
    texts_raw = []
    if knowledge:
        texts_raw.append(knowledge.get("title", ""))
        texts_raw.append(knowledge.get("description", ""))
        for v in knowledge.get("attributes", {}).values():
            texts_raw.append(str(v))
    for r in organic[:6]:
        texts_raw.append(r.get("title", ""))
        texts_raw.append(r.get("snippet", ""))

    combined_raw = " ".join(t for t in texts_raw if t)
    combined     = combined_raw.lower()

    part_number  = _extract_part_number(combined_raw, organic, knowledge, part_name)
    name         = _extract_name(part_name, organic, knowledge)
    category     = _extract_category(combined, part_name)
    subcategory  = _extract_subcategory(combined, part_name)
    from_year, to_year = _extract_year_range(combined, year)
    description  = _extract_description(organic, knowledge)

    confidence = "high" if part_number else ("medium" if category != "Other" else "low")

    return {
        "part_number":  part_number,
        "name":         name,
        "category":     category,
        "subcategory":  subcategory,
        "from_year":    from_year,
        "to_year":      to_year,
        "description":  description,
        "confidence":   confidence,
        "source":       "serpapi",
    }


def _is_valid_part_number(candidate: str) -> bool:
    """Returns True if candidate looks like a real part number."""
    if not candidate or len(candidate) < 4:
        return False
    if candidate.upper() in PART_NUMBER_BLACKLIST:
        return False
    # Skip plain years (1900–2099)
    if re.fullmatch(r'(19|20)\d{2}', candidate):
        return False
    # Pure numeric: must be 6–10 digits (not 4-5 which are likely prices/years)
    if re.fullmatch(r'\d+', candidate):
        return 6 <= len(candidate) <= 10
    return True


def _extract_part_number(text_raw: str, organic: list, knowledge: dict,
                         part_name: str) -> str:
    """
    Try to find an OEM/manufacturer part number in the search results.

    Priority order:
    1. snippet_highlighted_words — SerpAPI marks these explicitly (most reliable)
    2. Anchored search near "OEM", "part number", "part #", etc.
    3. Fallback regex patterns over all text
    """

    # ── 1. snippet_highlighted_words (highest confidence) ───────
    for result in organic[:6]:
        for word in result.get("snippet_highlighted_words", []):
            word = word.strip()
            if _is_valid_part_number(word):
                return word

    # ── 2. Anchored context search ───────────────────────────────
    anchored_pattern = re.compile(
        r'(?:oem|part\s*#|part\s*number|item\s*#|mfr\.?\s*part|oe\s*part)[:\s#]*'
        r'([A-Z0-9][A-Z0-9\-]{3,20})',
        re.IGNORECASE
    )
    for m in anchored_pattern.finditer(text_raw):
        candidate = m.group(1).strip(" -")
        if _is_valid_part_number(candidate):
            return candidate

    # Also check list-style snippets: "1. 84339532 - Description"
    list_pattern = re.compile(
        r'(?:^|\s)\d+\.\s+([A-Z0-9][A-Z0-9\-]{5,20})(?:\s*[-–]|\s|$)',
        re.IGNORECASE | re.MULTILINE
    )
    for result in organic[:6]:
        snippet = result.get("snippet", "")
        for m in list_pattern.finditer(snippet):
            candidate = m.group(1).strip(" -")
            if _is_valid_part_number(candidate):
                return candidate

    # ── 3. Fallback: regex patterns over all combined text ────────
    for pattern in PART_NUMBER_PATTERNS:
        for m in re.finditer(pattern, text_raw):
            candidate = m.group(1).strip(" -")
            if _is_valid_part_number(candidate):
                return candidate

    return ""


def _extract_name(part_name: str, organic: list, knowledge: dict) -> str:
    """
    Return a clean, normalized part name.

    Priority:
    1. Knowledge graph title (most authoritative)
    2. Clean up the input part_name (title-case it)
    3. First organic title that contains the part name keywords
    """
    # Knowledge graph title
    kg_title = knowledge.get("title", "").strip()
    if kg_title and len(kg_title) > 3:
        # Strip trailing brand/site names like " | AutoZone" or " - RockAuto"
        kg_title = re.split(r'\s*[\|–-]\s*\w+$', kg_title)[0].strip()
        if kg_title:
            return kg_title

    # Try to find a clean title from organic results that contains part name keywords
    part_keywords = [w.lower() for w in part_name.split() if len(w) > 2]
    for result in organic[:4]:
        title = result.get("title", "").strip()
        if not title:
            continue
        title_lower = title.lower()
        matches = sum(1 for kw in part_keywords if kw in title_lower)
        if matches >= max(1, len(part_keywords) // 2):
            # Strip trailing site name
            clean = re.split(r'\s*[\|–-]\s*\w[\w\s]*$', title)[0].strip()
            if clean and len(clean) > 3:
                return clean

    # Fall back to title-casing the input part name
    return part_name.title()


def _extract_category(combined_lower: str, part_name: str) -> str:
    """Match category from combined text, also checking the part name itself."""
    search_text = (part_name + " " + combined_lower).lower()
    for keyword, category in CATEGORY_MAP.items():
        if keyword in search_text:
            return category
    return "Other"


def _extract_subcategory(combined_lower: str, part_name: str) -> str:
    """Match subcategory from combined text + part name."""
    search_text = (part_name + " " + combined_lower).lower()
    for keyword, subcategory in SUBCATEGORY_MAP.items():
        if keyword in search_text:
            return subcategory
    return ""


def _extract_year_range(combined_lower: str, year_hint: str) -> tuple:
    """
    Try to extract fitment year range from text.
    Looks for patterns like "2018-2024", "fits 2018 to 2024", "2018+".
    Falls back to year_hint if nothing found.
    """
    # "2018-2024" or "2018 - 2024"
    m = re.search(r'\b((?:19|20)\d{2})\s*[-–to]+\s*((?:19|20)\d{2})\b', combined_lower)
    if m:
        from_y = int(m.group(1))
        to_y   = int(m.group(2))
        if from_y <= to_y:
            return from_y, to_y

    # "fits 2018+" or "2018 and up"
    m = re.search(r'\b((?:19|20)\d{2})\s*(?:\+|and up|onwards)', combined_lower)
    if m:
        return int(m.group(1)), None

    # Use year_hint as both from and to if present
    if year_hint:
        try:
            y = int(year_hint)
            return y, y
        except ValueError:
            pass

    return None, None


def _extract_description(organic: list, knowledge: dict) -> str:
    """Best snippet for description."""
    kg_desc = knowledge.get("description", "").strip()
    if kg_desc and len(kg_desc) > 20:
        return kg_desc

    for r in organic[:3]:
        snippet = r.get("snippet", "").strip()
        # Skip pure price/listing snippets
        if snippet and len(snippet) > 20 and not snippet.startswith("No. Part #"):
            return snippet

    # Fall back even to a listing snippet if nothing better
    for r in organic[:3]:
        snippet = r.get("snippet", "").strip()
        if snippet and len(snippet) > 20:
            return snippet

    return ""