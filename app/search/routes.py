from flask import Blueprint, request, jsonify, render_template
from app.search.services import search_by_part_number, search_parts, format_search_results
from app.models.car import CarMake, CarModel
from datetime import datetime

"""
Search Routes

Handles part searching functionality.

Responsibilities:
- Search by part number
- Filter by car type, year, category, etc.
- Return list of garages with matching parts

Main entry point for customer discovery.
"""

search_bp = Blueprint('search', __name__, url_prefix='/search')


# ---------------------------------------------------
# ✅ Search Endpoint
# ---------------------------------------------------
@search_bp.route("/", methods=["GET"])
def search():
    """
    Search endpoint

    Supports:
    - part_number (priority)
    - car_make_id
    - car_model_id
    - year
    - category
    - price range
    """

    part_number = request.args.get("part_number")

    car_make_id = request.args.get("car_make_id", type=int)
    car_model_id = request.args.get("car_model_id", type=int)
    year = request.args.get("year", type=int)

    category = request.args.get("category")

    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)

    # -----------------------------
    # Priority: part number search
    # -----------------------------
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

    return jsonify({
        "count": len(data),
        "results": data
    }), 200

# ---------------------------------------------------
# ✅ Search Page (HTML)
# ---------------------------------------------------
# Renders a normal HTML page for testing customer search
# using the same search services as the JSON API.
@search_bp.route("/page", methods=["GET"])
def search_page():
    part_number = request.args.get("part_number")

    car_make_id = request.args.get("car_make_id", type=int)
    car_model_id = request.args.get("car_model_id", type=int)
    year = request.args.get("year", type=int)

    category = request.args.get("category")

    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)

    current_year = datetime.now().year
    years = list(range(current_year, 1899, -1))

    results = []

    # Priority: search by part number first
    if part_number:
        results = search_by_part_number(part_number)
    elif any([car_make_id, car_model_id, year, category, min_price, max_price]):
        results = search_parts(
            car_make_id=car_make_id,
            car_model_id=car_model_id,
            year=year,
            category=category,
            min_price=min_price,
            max_price=max_price
        )

    car_makes = CarMake.query.order_by(CarMake.name.asc()).all()
    car_models = CarModel.query.order_by(CarModel.name.asc()).all()

    return render_template(
        "search/index.html",
        results=results,
        car_makes=car_makes,
        car_models=car_models,
        years=years
    )