import requests

NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api"


# ==========================================================
# Database Import Services
# ==========================================================

def get_makes_for_vehicle_type(vehicle_type):
    """
    Retrieve all vehicle makes for a specific vehicle type.

    Examples:
        - car
        - truck
        - multipurpose passenger vehicle (mpv)
    """

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
    """
    Retrieve all passenger vehicle makes.

    Combines:
        - Cars
        - Trucks
        - MPVs (SUVs/Crossovers)
    """

    vehicle_types = [
        "car",
        "truck",
        "multipurpose passenger vehicle (mpv)",
    ]

    makes = {}

    for vehicle_type in vehicle_types:
        for make in get_makes_for_vehicle_type(vehicle_type):
            makes[make["nhtsa_id"]] = make

    return sorted(
        makes.values(),
        key=lambda m: m["name"],
    )


def get_models_for_make(make_id):
    """
    Retrieve all models for a specific make.

    Used to populate the car_models table.
    """

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
    """
    Return models for a make in a specific year.

    Used by the search page.
    """

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
# Future
# ==========================================================

def decode_vin(vin, year=None):
    """
    Decode a VIN using the NHTSA API.

    This will be used later for the VIN Decoder feature.
    """

    url = (
        f"{NHTSA_BASE_URL}/vehicles/"
        f"DecodeVin/{vin}"
        f"?format=json"
    )

    if year:
        url += f"&modelyear={year}"

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    return response.json().get("Results", [])