from flask import Blueprint, request, jsonify
from app.search.services import search_by_term, search_parts, format_search_results
from app.models.car import CarMake, CarModel, CarSubModel

"""
Search Routes  (JWT — pure JSON API)

No authentication required — search is public.

Endpoints:
  GET /search/          → search parts (JSON)
  GET /search/filters   → return car makes, models, categories, subcategories for React dropdowns
"""

search_bp = Blueprint('search', __name__, url_prefix='/search')

# Subcategory map — mirrors the frontend SUBCATEGORY_MAP constant.
# Update both when adding new categories/subcategories.
SUBCATEGORY_MAP = {
    "Engine": [
        "Air Filter", "Oil Filter", "Fuel Filter", "Spark Plugs", "Ignition Coil",
        "Timing Belt / Chain", "Timing Kit", "Engine Gasket", "Head Gasket",
        "Valve Cover Gasket", "Oil Pump", "Water Pump", "Thermostat",
        "Engine Mount", "Crankshaft", "Camshaft", "Piston & Rings",
        "Connecting Rod", "Flywheel", "Engine Sensor", "Other Engine",
    ],
    "Brakes": [
        "Brake Pads", "Brake Rotors / Discs", "Brake Drums", "Brake Caliper",
        "Brake Master Cylinder", "Brake Booster", "Brake Lines & Hoses",
        "Brake Fluid Reservoir", "ABS Sensor", "ABS Module", "Other Brakes",
    ],
    "Suspension": [
        "Shock Absorber", "Strut Assembly", "Coil Spring", "Leaf Spring",
        "Control Arm", "Ball Joint", "Tie Rod", "Sway Bar Link",
        "Sway Bar Bushing", "Wheel Bearing & Hub", "Steering Rack",
        "Power Steering Pump", "CV Axle / Shaft", "Other Suspension",
    ],
    "Electrical": [
        "Battery", "Alternator", "Starter Motor", "Fuse & Relay",
        "Headlight Bulb", "Tail Light", "Turn Signal", "Sensor (O2 / MAF / MAP)",
        "ECU / ECM", "Body Control Module", "Wiring Harness",
        "Horn", "Wiper Motor", "Window Motor", "Other Electrical",
    ],
    "Transmission": [
        "Transmission Fluid", "Transmission Filter", "Clutch Kit", "Clutch Disc",
        "Pressure Plate", "Release Bearing", "Flywheel", "Gear Shift Cable",
        "CV Joint", "Differential", "Transfer Case", "Other Transmission",
    ],
    "Cooling": [
        "Radiator", "Coolant Reservoir", "Coolant Hose", "Radiator Cap",
        "Fan Clutch", "Electric Cooling Fan", "Water Pump", "Thermostat",
        "Heater Core", "Other Cooling",
    ],
    "Exhaust": [
        "Muffler", "Exhaust Pipe", "Catalytic Converter", "Oxygen Sensor",
        "Exhaust Manifold", "Exhaust Gasket", "Flex Pipe", "Other Exhaust",
    ],
    "Body": [
        "Hood", "Front Bumper", "Rear Bumper", "Fender", "Door Panel",
        "Side Mirror", "Windshield", "Rear Glass", "Door Handle",
        "Grille", "Headlight Assembly", "Tail Light Assembly",
        "Trunk Lid", "Roof Panel", "Other Body",
    ],
    "A/C & Heating": [
        "A/C Compressor", "A/C Condenser", "A/C Evaporator", "A/C Expansion Valve",
        "Cabin Air Filter", "Blower Motor", "Heater Hose", "Other A/C & Heating",
    ],
    "Fuel": [
        "Fuel Pump", "Fuel Injector", "Fuel Tank", "Fuel Cap",
        "Fuel Pressure Regulator", "Carburetor", "Throttle Body", "Other Fuel",
    ],
    "Other": ["Other"],
}


# ---------------------------------------------------
# GET /search/
# Params: search | car_make_id, car_model_id, car_sub_model_id, year,
#         category, subcategory, min_price, max_price
# ---------------------------------------------------
@search_bp.route("/", methods=["GET"])
def search():

    search_term = request.args.get("search")

    car_make_id      = request.args.get("car_make_id", type=int)
    car_model_id     = request.args.get("car_model_id", type=int)
    car_sub_model_id = request.args.get("car_sub_model_id", type=int)
    year             = request.args.get("year", type=int)
    category         = request.args.get("category")
    subcategory      = request.args.get("subcategory")
    min_price        = request.args.get("min_price", type=float)
    max_price        = request.args.get("max_price", type=float)
    delivery         = request.args.get("delivery") == "true"
    installation     = request.args.get("installation") == "true"

    if search_term:
        results = search_by_term(search_term)
    else:
        results = search_parts(
            car_make_id=car_make_id,
            car_model_id=car_model_id,
            car_sub_model_id=car_sub_model_id,
            year=year,
            category=category,
            subcategory=subcategory,
            min_price=min_price,
            max_price=max_price,
            delivery=delivery,
            installation=installation, 
        )

    data = format_search_results(results)

    return jsonify({
        "count": len(data),
        "results": data
    }), 200


# ---------------------------------------------------
# GET /search/filters
# Returns dropdown data React needs to build the search form.
# ---------------------------------------------------
@search_bp.route("/filters", methods=["GET"])
def filters():
    from datetime import datetime
    current_year = datetime.now().year

    make_id  = request.args.get("make_id", type=int)
    model_id = request.args.get("model_id", type=int)

    makes = CarMake.query.order_by(CarMake.name.asc()).all()

    models_q = CarModel.query.order_by(CarModel.name.asc())
    if make_id:
        models_q = models_q.filter_by(make_id=make_id)
    models = models_q.all()

    # Sub-models only when a model is selected — avoids returning all trims at once
    sub_models_q = CarSubModel.query.order_by(CarSubModel.name.asc())
    if model_id:
        sub_models_q = sub_models_q.filter_by(model_id=model_id)
        sub_models = sub_models_q.all()
    else:
        sub_models = []   # empty until a model is chosen

    years = list(range(current_year, 1899, -1))

    return jsonify({
        "car_makes": [{"id": m.id, "name": m.name} for m in makes],
        "car_models": [{"id": m.id, "name": m.name, "make_id": m.make_id} for m in models],
        "car_sub_models": [{"id": sm.id, "name": sm.name, "model_id": sm.model_id} for sm in sub_models],
        "years": years,
        "categories": list(SUBCATEGORY_MAP.keys()),
        "subcategory_map": SUBCATEGORY_MAP,
    }), 200