import datetime
import requests
import os


NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api"

# Optional — get a free key at https://api-ninjas.com (50,000 calls/month free)
# Set in your .env: API_NINJAS_KEY=your_key_here
# If not set, this layer is simply skipped — everything still works.

API_NINJAS_KEY = os.getenv("API_NINJAS_KEY", "")


# ==========================================================
# Database Import Services
# ==========================================================

def get_makes_for_vehicle_type(vehicle_type):
    url = (
        f"{NHTSA_BASE_URL}/vehicles/"
        f"GetMakesForVehicleType/{vehicle_type}"
        f"?format=json"
    )
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    results = response.json().get("Results", [])
    return [
        {
            "nhtsa_id": item["MakeId"],
            "name": item["MakeName"].title(),
        }
        for item in results
    ]


def get_all_makes():
    vehicle_types = [
        "car",
        "truck",
        "multipurpose passenger vehicle (mpv)",
    ]
    makes = {}
    for vehicle_type in vehicle_types:
        for make in get_makes_for_vehicle_type(vehicle_type):
            makes[make["nhtsa_id"]] = make
    return sorted(makes.values(), key=lambda m: m["name"])


def get_models_for_make(make_id):
    url = (
        f"{NHTSA_BASE_URL}/vehicles/"
        f"GetModelsForMakeId/{make_id}?format=json"
    )
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    results = response.json().get("Results", [])
    return [
        {
            "nhtsa_model_id": item["Model_ID"],
            "name": item["Model_Name"],
            "nhtsa_make_id": item["Make_ID"],
            "make_name": item["Make_Name"],
        }
        for item in results
    ]


# ==========================================================
# Search Services
# ==========================================================

def get_models_for_make_year(make, year):
    url = (
        f"{NHTSA_BASE_URL}/vehicles/"
        f"GetModelsForMakeYear/"
        f"make/{make}/"
        f"modelyear/{year}"
        f"?format=json"
    )
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    results = response.json().get("Results", [])
    return [
        {
            "nhtsa_model_id": item["Model_ID"],
            "name": item["Model_Name"],
            "make_name": item["Make_Name"],
        }
        for item in results
    ]


# ==========================================================
# VIN Decoder
# ==========================================================

# ISO 3779 — VIN char 10 encodes model year (universal, all countries)
_YEAR_CODE = {
    'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984,
    'F': 1985, 'G': 1986, 'H': 1987, 'J': 1988, 'K': 1989,
    'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994,
    'S': 1995, 'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999,
    'Y': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
    '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
}

# ISO 3779 — VIN char 1 encodes country of manufacture
_COUNTRY = {
    '1': 'USA', '4': 'USA', '5': 'USA',
    '2': 'Canada', '3': 'Mexico',
    'J': 'Japan', 'K': 'South Korea', 'L': 'China',
    'M': 'Thailand', 'N': 'Turkey', 'P': 'Malaysia',
    'S': 'United Kingdom', 'V': 'France/Spain',
    'W': 'Germany', 'X': 'Russia', 'Y': 'Sweden',
    'Z': 'Italy', '6': 'Australia', '9': 'Brazil',
}


def _decode_year_from_vin(vin: str) -> str:
    """Year from VIN char 10. Works for ALL countries — pure math."""
    if len(vin) < 10:
        return ''
    code = vin[9].upper()
    base = _YEAR_CODE.get(code)
    if base is None:
        return ''
    now = datetime.datetime.now().year
    for offset in [0, 30, 60]:
        candidate = base + offset
        if candidate > now + 1:
            return str(base + offset - 30)
    return str(base)


# ------------------------------------------------------------------
# Layer 1: NHTSA DecodeVinValues
# Best for: US-market vehicles (Ford F-150, Chevy, Dodge, Jeep, etc.)
# Also works for: some EU models sold in USA (BMW, Mercedes, VW)
# ------------------------------------------------------------------
def _try_nhtsa_full(vin: str, year: int = None) -> dict:
    try:
        url = f"{NHTSA_BASE_URL}/vehicles/DecodeVinValues/{vin}?format=json"
        if year:
            url += f"&modelyear={year}"
        r = requests.get(url, timeout=6).json().get('Results', [{}])[0]
        make  = (r.get('Make')  or '').strip()
        model = (r.get('Model') or r.get('Series') or r.get('Trim') or '').strip()
        yr    = (r.get('ModelYear') or '').strip()
        if make:
            return {'make': make, 'model': model, 'year': yr}
    except Exception:
        pass
    return {}


# ------------------------------------------------------------------
# Layer 2: NHTSA DecodeWMI
# Best for: Identifying the manufacturer from first 3 VIN chars
# Worldwide registered manufacturers — no manual table needed
# Returns make name only (no model)
# ------------------------------------------------------------------
def _try_nhtsa_wmi(wmi3: str) -> str:
    try:
        url = f"{NHTSA_BASE_URL}/vehicles/DecodeWMI/{wmi3}?format=json"
        results = requests.get(url, timeout=5).json().get("Results") or []
        for r in results:
            name = (r.get("CommonName") or r.get("Name") or "").strip()
            if name:
                return name
    except Exception:
        pass
    return ''


# ------------------------------------------------------------------
# Layer 3: API Ninjas VIN Lookup
# Best for: Non-US VINs that NHTSA misses — Australian Toyota,
#           Thai Nissan, Chinese Tesla, GCC-spec vehicles, etc.
# Free: 50,000 calls/month — get key at https://api-ninjas.com
# Set API_NINJAS_KEY in your .env to enable this layer.
# ------------------------------------------------------------------
def _try_api_ninjas(vin: str) -> dict:
    if not API_NINJAS_KEY:
        return {}
    try:
        resp = requests.get(
            "https://api.api-ninjas.com/v1/vinlookup",
            params={"vin": vin},
            headers={"X-Api-Key": API_NINJAS_KEY},
            timeout=6,
        )
        if resp.status_code == 200:
            data = resp.json()
            make  = (data.get("manufacturer") or data.get("make") or "").strip()
            model = (data.get("model") or "").strip()
            year  = str(data.get("year") or "").strip()
            if make:
                return {'make': make, 'model': model, 'year': year}
    except Exception:
        pass
    return {}


# ------------------------------------------------------------------
# Main decode function
# ------------------------------------------------------------------
def decode_vin(vin: str, year: int = None) -> dict:
    """
    Decode a VIN into { make, model, year, country }.

    Layered strategy — each layer fills in what the previous missed:

      Math  — Year from char 10, Country from char 1 (ISO 3779, always works)
      L1    — NHTSA DecodeVinValues  (US market + some EU)
      L2    — NHTSA DecodeWMI        (manufacturer name, worldwide)
      L3    — API Ninjas VIN lookup  (global, fills non-US gaps)
      Final — Return what we have; frontend shows "select manually" if partial
    """
    vin = vin.strip().upper()
    if len(vin) != 17:
        return {'error': 'VIN must be 17 characters.'}

    # Always run — pure math, never fails
    decoded_year = str(year) if year else _decode_year_from_vin(vin)
    country = _COUNTRY.get(vin[0], '')

    make = model = ''

    # Layer 1 — NHTSA full decode
    l1 = _try_nhtsa_full(vin, year)
    if l1:
        make  = l1.get('make', '')
        model = l1.get('model', '')
        if not decoded_year:
            decoded_year = l1.get('year', '')

    # Layer 2 — NHTSA WMI (manufacturer name only, fills make when L1 missed)
    if not make:
        make = _try_nhtsa_wmi(vin[:3])

    # Layer 3 — API Ninjas (global coverage, fills both make and model)
    if not make or not model:
        l3 = _try_api_ninjas(vin)
        if l3:
            if not make:
                make = l3.get('make', '')
            if not model:
                model = l3.get('model', '')
            if not decoded_year:
                decoded_year = l3.get('year', '')

    return {
        'make':    make,
        'model':   model,
        'year':    decoded_year,
        'country': country,
    }