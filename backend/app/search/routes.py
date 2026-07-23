from flask import Blueprint, request, jsonify
from app.search.services import search_by_part_number, search_parts, format_search_results
from app.models.car import CarMake, CarModel

"""
Search Routes  (JWT — pure JSON API)

No authentication required — search is public.

Endpoints:
  GET /search/          → search parts (JSON)
  GET /search/filters   → return car makes, models, categories for React dropdowns
"""

search_bp = Blueprint('search', __name__, url_prefix='/search')


# ---------------------------------------------------
# GET /search/
# Params: part_number | car_make_id, car_model_id, year, category, min_price, max_price
# ---------------------------------------------------
@search_bp.route("/", methods=["GET"])
def search():
    part_number = request.args.get("part_number")
    car_make_id = request.args.get("car_make_id", type=int)
    car_model_id = request.args.get("car_model_id", type=int)
    year = request.args.get("year", type=int)
    category = request.args.get("category")
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)

    if part_number:
        results = search_by_part_number(part_number)
    else:
        results = search_parts(
            car_make_id=car_make_id,
            car_model_id=car_model_id,
            year=year,
            category=category,
            min_price=min_price,
            max_price=max_price
        )

    data = format_search_results(results)
    return jsonify({"count": len(data), "results": data}), 200


# ---------------------------------------------------
# GET /search/filters
# Returns dropdown data React needs to build the search form.
# ---------------------------------------------------
@search_bp.route("/filters", methods=["GET"])
def filters():
    from datetime import datetime
    current_year = datetime.now().year

    makes  = CarMake.query.order_by(CarMake.name.asc()).all()
    models = CarModel.query.order_by(CarModel.name.asc()).all()
    years  = list(range(current_year, 1899, -1))

    return jsonify({
        "car_makes": [{"id": m.id, "name": m.name} for m in makes],
        "car_models": [{"id": m.id, "name": m.name, "make_id": m.make_id} for m in models],
        "years": years,
        "categories": [
            "Engine", "Brakes", "Suspension", "Electrical",
            "Transmission", "Body", "Cooling", "Exhaust", "Other"
        ]
    }), 200