from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.models.car import CarMake, CarModel, CarSubModel
from app.models.part import Part, GaragePart
from app.parts.services import (
    search_catalog,
    create_or_get_part,
    add_part_to_garage,
    update_part,
    get_garage_inventory,
    delete_garage_part,
    edit_garage_part,
    toggle_garage_part_active
)
from app.parts.lookup_service import lookup_part_by_name
from app.reviews.services import get_part_aggregate
from .utils import _require_garage

"""
Parts Routes  (JWT — pure JSON API)

Endpoints:
  POST  /parts/create                              → create global part
  POST  /parts/add-to-garage                       → add part to inventory
  GET   /parts/garage/<garage_id>                  → get inventory
  PUT   /parts/update/<garage_part_id>             → update garage part
  POST  /parts/garage-part/<garage_part_id>/delete → delete from inventory
  POST  /parts/garage-part/<garage_part_id>/toggle → toggle active/inactive
  GET   /parts/garage-part/<garage_part_id>        → single listing detail (garage only)
  PUT   /parts/garage-part/<garage_part_id>/edit   → full edit
  GET   /parts/car-makes                           → car makes list (for dropdowns)
  GET   /parts/car-models                          → car models list (for dropdowns)
  GET   /parts/car-sub-models?model_id=<id>        → car sub-models list (for dropdowns)
"""

parts_bp = Blueprint('parts', __name__, url_prefix='/parts')

# ---------------------------------------------------
# POST /parts/create  (garage only)
# ---------------------------------------------------
@parts_bp.route("/create", methods=["POST"])
@jwt_required()
def create_part_route():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        part = create_or_get_part(
            name=data.get("name"),
            part_number=data.get("part_number"),
            oem_number=data.get("oem_number"),
            brand=data.get("brand"),
            manufacturer=data.get("manufacturer"),
            category=data.get("category"),
            subcategory=data.get("subcategory"),
            description=data.get("description"),
            image_url=data.get("image_url"),
            source=data.get("source", "manual"),
            external_id=data.get("external_id"),
        )
        return jsonify({
            "id": part.id,
            "name": part.name,
            "part_number": part.part_number,
            "oem_number": part.oem_number,
            "brand": part.brand,
            "manufacturer": part.manufacturer,
            "category": part.category,
            "subcategory": part.subcategory,
            "verified": part.verified
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

# ---------------------------------------------------
# GET /parts/catalog/search
# ---------------------------------------------------
@parts_bp.route("/catalog/search", methods=["GET"])
# @jwt_required()
def search_catalog_route():
    """
    Search the global parts catalog.

    Query parameters:
        q           → search text
        brand       → optional brand filter
        category    → optional category filter
        subcategory → optional subcategory filter
        limit       → optional result limit (default: 20)

    Example:
        GET /parts/catalog/search?q=brake
        GET /parts/catalog/search?q=toyota&brand=Toyota
    """

    query        = request.args.get("q",            "").strip()
    brand        = request.args.get("brand",        "").strip() or None
    category     = request.args.get("category",     "").strip() or None
    subcategory  = request.args.get("subcategory",  "").strip() or None
    car_model_id = request.args.get("car_model_id", "").strip() or None
    year         = request.args.get("year",         "").strip() or None

    try:
        limit = int(request.args.get("limit", 20))
    except (TypeError, ValueError):
        return jsonify({"error": "limit must be a number"}), 400

    # Prevent excessively large requests
    limit = min(max(limit, 1), 50)

    try:
        parts = search_catalog(
            query=query,
            brand=brand,
            category=category,
            subcategory=subcategory,
            car_model_id=car_model_id,
            year=year,
            limit=limit
        )

        return jsonify([
            {
                "id": part.id,
                "name": part.name,
                "part_number": part.part_number,
                "oem_number": part.oem_number,
                "brand": part.brand,
                "manufacturer": part.manufacturer,
                "category": part.category,
                "subcategory": part.subcategory,
                "description": part.description,
                "image_url": part.image_url,
                "verified": part.verified
            }
            for part in parts
        ]), 200

    except Exception:
        return jsonify({
            "error": "Failed to search parts catalog"
        }), 500


# ---------------------------------------------------
# POST /parts/add-to-garage  (garage only)
# ---------------------------------------------------
@parts_bp.route("/add-to-garage", methods=["POST"])
@jwt_required()
def add_part_to_garage_route():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # Parse optional decimal price fields (empty string → None)
    def _parse_price(val):
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    try:
        gp = add_part_to_garage(
            garage_id=garage_id,          # always from JWT — never trust the request body
            part_id=data.get("part_id"),
            car_model_id=data.get("car_model_id"),
            car_sub_model_id=data.get("car_sub_model_id"),
            year=data.get("year"),
            price=data.get("price"),
            cost_price=data.get("cost_price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            condition=data.get("condition", "new"),
            delivery_available=data.get("delivery_available", False),
            installation_available=data.get("installation_available", False),
            installation_price=_parse_price(data.get("installation_price")),
        )

        # Handle compatible cars (also fits)
        compatible_cars = data.get("compatible_cars", [])
        if compatible_cars:
            from app.models.part import GaragePartCompatibleCar
            for compat in compatible_cars:
                car_model_id = compat.get("car_model_id")
                if not car_model_id:
                    continue
                cc = GaragePartCompatibleCar(
                    garage_part_id=gp.id,
                    car_model_id=car_model_id,
                    from_year=compat.get("from_year"),
                    to_year=compat.get("to_year"),
                )
                from app import db
                db.session.add(cc)
            from app import db
            db.session.commit()

        return jsonify({"id": gp.id, "message": "Part added to garage successfully"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# GET /parts/garage/<garage_id>  (garage only)
# ---------------------------------------------------
@parts_bp.route("/garage/<int:garage_id>", methods=["GET"])
@jwt_required()
def get_inventory_route(garage_id):
    claims = get_jwt()
    if claims.get("role") == "garage" and claims.get("garage_id") != garage_id:
        return jsonify({"error": "Access denied."}), 403

    inventory = get_garage_inventory(
        garage_id,
        category=request.args.get("category") or None,
        search=request.args.get("search") or None,
        low_stock_only=bool(request.args.get("low_stock_only")),
        show_inactive=bool(request.args.get("show_inactive"))
    )

    data = [
        {
            "garage_part_id": item.id,
            "part_name": item.part.name,
            "part_number": item.part.part_number,
            "brand": item.part.brand,
            "category": item.part.category,
            "subcategory": item.part.subcategory,
            "price": float(item.price),
            "cost_price": float(item.cost_price) if item.cost_price else None,
            "quantity": item.quantity,
            "is_active": item.is_active,
            "delivery_available": item.delivery_available,
            "installation_available": item.installation_available,
            "installation_price": float(item.installation_price) if item.installation_price is not None else None,
            "from_year": item.from_year,
            "to_year": item.to_year,
        }
        for item in inventory
    ]
    return jsonify({"count": len(data), "inventory": data}), 200


# ---------------------------------------------------
# PUT /parts/update/<garage_part_id>  (garage only)
# ---------------------------------------------------
@parts_bp.route("/update/<int:garage_part_id>", methods=["PUT"])
@jwt_required()
def update_part_route(garage_part_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    def _parse_price(val):
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    try:
        updated = update_part(
            garage_part_id=garage_part_id,
            price=data.get("price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            delivery_available=data.get("delivery_available"),
            installation_available=data.get("installation_available"),
            installation_price=_parse_price(data.get("installation_price")),
        )
        return jsonify({"id": updated.id, "message": "Part updated successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# POST /parts/garage-part/<garage_part_id>/delete  (garage only)
# ---------------------------------------------------
@parts_bp.route("/garage-part/<int:garage_part_id>/delete", methods=["POST"])
@jwt_required()
def delete_garage_part_route(garage_part_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    try:
        delete_garage_part(garage_part_id=garage_part_id, garage_id=garage_id)
        return jsonify({"message": "Part removed from inventory."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# POST /parts/garage-part/<garage_part_id>/toggle  (garage only)
# ---------------------------------------------------
@parts_bp.route("/garage-part/<int:garage_part_id>/toggle", methods=["POST"])
@jwt_required()
def toggle_garage_part_active_route(garage_part_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    try:
        toggle_garage_part_active(garage_part_id=garage_part_id, garage_id=garage_id)
        return jsonify({"message": "Listing status updated."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# GET /parts/garage-part/<garage_part_id>  (garage only)
# ---------------------------------------------------
@parts_bp.route("/garage-part/<int:garage_part_id>", methods=["GET"])
@jwt_required()
def get_garage_part_route(garage_part_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    gp = GaragePart.query.get(garage_part_id)
    if not gp or gp.garage_id != garage_id:
        return jsonify({"error": "Garage part not found."}), 404

    car_model = gp.car_model
    car_make  = car_model.make if car_model else None

    return jsonify({
        "garage_part_id": gp.id,
        "part_name": gp.part.name if gp.part else None,
        "part_number": gp.part.part_number if gp.part else None,
        "brand": gp.part.brand if gp.part else None,
        "category": gp.part.category if gp.part else None,
        "subcategory": gp.part.subcategory if gp.part else None,
        "car_make": car_make.name if car_make else None,
        "car_model": car_model.name if car_model else None,
        "year": gp.year if gp.year is not None else None,
        "price": float(gp.price) if gp.price is not None else None,
        "cost_price": float(gp.cost_price) if gp.cost_price is not None else None,
        "quantity": gp.quantity,
        "from_year": gp.from_year,
        "to_year": gp.to_year,
        "condition": gp.condition or "new",
        "delivery_available": gp.delivery_available,
        "installation_available": gp.installation_available,
        "installation_price": float(gp.installation_price) if gp.installation_price is not None else None,
    }), 200


# ---------------------------------------------------
# PUT /parts/garage-part/<garage_part_id>/edit  (garage only)
# ---------------------------------------------------
@parts_bp.route("/garage-part/<int:garage_part_id>/edit", methods=["PUT"])
@jwt_required()
def edit_garage_part_route(garage_part_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    def _parse_price(val):
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    try:
        edit_garage_part(
            garage_part_id=garage_part_id,
            garage_id=garage_id,
            price=data.get("price"),
            cost_price=data.get("cost_price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            condition=data.get("status"),
            delivery_available=data.get("delivery_available"),
            installation_available=data.get("installation_available"),
            installation_price=_parse_price(data.get("installation_price")),
        )
        return jsonify({"message": "Part updated successfully."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# GET /parts/car-makes  (public — React dropdown data)
# ---------------------------------------------------
@parts_bp.route("/car-makes", methods=["GET"])
def car_makes():
    makes = CarMake.query.order_by(CarMake.name.asc()).all()
    return jsonify([{"id": m.id, "name": m.name} for m in makes]), 200


# ---------------------------------------------------
# GET /parts/car-models?make_id=<id>  (public — React dropdown data)
# ---------------------------------------------------
@parts_bp.route("/car-models", methods=["GET"])
def car_models():
    make_id = request.args.get("make_id", type=int)
    query   = CarModel.query.order_by(CarModel.name.asc())
    if make_id:
        query = query.filter_by(make_id=make_id)
    models = query.all()
    return jsonify([{"id": m.id, "name": m.name, "make_id": m.make_id} for m in models]), 200


# ---------------------------------------------------
# GET /parts/car-sub-models?model_id=<id>  (public — React dropdown data)
# ---------------------------------------------------
@parts_bp.route("/car-sub-models", methods=["GET"])
def car_sub_models():
    model_id = request.args.get("model_id", type=int)
    if not model_id:
        return jsonify({"error": "model_id query parameter is required"}), 400

    sub_models = (
        CarSubModel.query
        .filter_by(model_id=model_id)
        .order_by(CarSubModel.name.asc())
        .all()
    )
    return jsonify([{"id": sm.id, "name": sm.name, "model_id": sm.model_id} for sm in sub_models]), 200


# ---------------------------------------------------
# GET /parts/<part_id>  (public)
# Returns full part info + all garage listings for it
# + related parts in same category
# ---------------------------------------------------
@parts_bp.route("/<int:part_id>", methods=["GET"])
def get_part_detail(part_id):
    part = Part.query.get(part_id)
    if not part:
        return jsonify({"error": "Part not found."}), 404

    # All active garage listings for this part
    listings = (
        GaragePart.query
        .filter_by(part_id=part_id, is_active=True)
        .filter(GaragePart.quantity > 0)
        .order_by(GaragePart.price.asc())   # cheapest first
        .all()
    )

    # Review aggregate (avg rating + count)
    try:
        from app.reviews.services import get_part_aggregate
        agg = get_part_aggregate(part_id)
    except Exception:
        agg = {"average_rating": None, "total_reviews": 0}

    # Related parts — same category, different part_id, active listings only
    related_parts = []
    if part.category:
        related_gp = (
            GaragePart.query
            .join(Part, GaragePart.part_id == Part.id)
            .filter(
                Part.category  == part.category,
                Part.id        != part_id,
                GaragePart.is_active.is_(True),
                GaragePart.quantity > 0
            )
            .order_by(GaragePart.price.asc())
            .limit(8)
            .all()
        )
        seen = set()
        for gp in related_gp:
            if gp.part_id not in seen:
                seen.add(gp.part_id)
                related_parts.append({
                    "part_id":      gp.part.id,
                    "part_name":    gp.part.name,
                    "part_number":  gp.part.part_number,
                    "brand":        gp.part.brand,
                    "category":     gp.part.category,
                    "subcategory":  gp.part.subcategory,
                    "image_url":    gp.part.image_url,
                    "min_price":    float(gp.price),
                    "garage_name":  gp.garage.garage_name,
                    "garage_part_id": gp.id,
                    "delivery":     gp.delivery_available,
                    "installation": gp.installation_available,
                    "quantity":     gp.quantity,
                })

    return jsonify({
        # Part catalog info
        "part_id":      part.id,
        "name":         part.name,
        "part_number":  part.part_number,
        "oem_number":   part.oem_number,
        "brand":        part.brand,
        "manufacturer": part.manufacturer,
        "category":     part.category,
        "subcategory":  part.subcategory,
        "description":  part.description,
        "image_url":    part.image_url,
        "country_of_origin": part.country_of_origin,
        "verified":     part.verified,
        # Review aggregate
        "average_rating": agg["average_rating"],
        "total_reviews":  agg["total_reviews"],
        # Garage listings (price comparison)
        "listings": [
            {
                "garage_part_id":         gp.id,
                "garage_id":              gp.garage.id,
                "garage_name":            gp.garage.garage_name,
                "garage_location":        gp.garage.location,
                "garage_specialization":  gp.garage.specialization,
                "price":                  float(gp.price),
                "quantity":               gp.quantity,
                "condition":              gp.condition or "new",
                "car_make":               gp.car_model.make.name if gp.car_model and gp.car_model.make else None,
                "car_model":              gp.car_model.name      if gp.car_model else None,
                "from_year":              gp.from_year,
                "to_year":                gp.to_year,
                "delivery":               gp.delivery_available,
                "installation":           gp.installation_available,
                "installation_price":     float(gp.installation_price) if gp.installation_price is not None else None,
            }
            for gp in listings
        ],
        # Related parts
        "related_parts": related_parts,
    }), 200

@parts_bp.route("/lookup", methods=["POST"])
def lookup_part_route():
    """
    POST /parts/lookup
    Body: {
        "part_name":     "Front Brake Pad Set",   ← required
        "car_make":      "Toyota",                ← optional but recommended
        "car_model":     "Camry",                 ← optional but recommended
        "car_sub_model": "SE",                    ← optional
        "year":          "2020"                   ← optional
    }

    Searches by part name + car context → returns:
        part_number, category, subcategory, from_year, to_year, description

    No auth required — lookup is read-only.
    """
    data = request.get_json() or {}

    part_name     = (data.get("part_name")     or "").strip()
    car_make      = (data.get("car_make")      or "").strip()
    car_model     = (data.get("car_model")     or "").strip()
    car_sub_model = (data.get("car_sub_model") or "").strip()
    year          = str(data.get("year") or "").strip()

    if not part_name:
        return jsonify({"error": "part_name is required"}), 400

    if len(part_name) < 2:
        return jsonify({"error": "Part name too short — enter at least 2 characters"}), 400

    result = lookup_part_by_name(
        part_name=part_name,
        car_make=car_make,
        car_model=car_model,
        car_sub_model=car_sub_model,
        year=year,
    )

    if "error" in result:
        return jsonify(result), 400

    return jsonify(result), 200