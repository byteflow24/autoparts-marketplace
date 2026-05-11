import requests


NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api"


def get_makes_for_year(year):
    """
    Get vehicle makes for a selected year.
    """

    url = f"{NHTSA_BASE_URL}/vehicles/GetMakesForVehicleType/car?format=json"
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    data = response.json().get("Results", [])

    return [
        {
            "id": item.get("MakeId"),
            "name": item.get("MakeName")
        }
        for item in data
    ]


def get_models_for_make_year(make, year):
    """
    Get vehicle models for selected make + year.
    """

    url = f"{NHTSA_BASE_URL}/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json"
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    data = response.json().get("Results", [])

    return [
        {
            "id": item.get("Model_ID"),
            "name": item.get("Model_Name"),
            "make": item.get("Make_Name")
        }
        for item in data
    ]