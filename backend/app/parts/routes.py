from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.models.car import CarMake, CarModel
from app.models.part import GaragePart
from app.parts.services import (
    create_or_get_part,
    add_part_to_garage,
    update_part,
    get_garage_inventory,
    delete_garage_part,
    edit_garage_part,
    toggle_garage_part_active
)

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
            "verified": part.verified
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


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

    try:
        gp = add_part_to_garage(
            garage_id=garage_id,          # always from JWT — never trust the request body
            part_id=data.get("part_id"),
            car_model_id=data.get("car_model_id"),
            price=data.get("price"),
            cost_price=data.get("cost_price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            delivery_available=data.get("delivery_available", False),
            installation_available=data.get("installation_available", False),
            pickup_available=data.get("pickup_available", False)
        )
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
            "price": float(item.price),
            "cost_price": float(item.cost_price) if item.cost_price else None,
            "quantity": item.quantity,
            "is_active": item.is_active,
            "delivery_available": item.delivery_available,
            "installation_available": item.installation_available,
            "pickup_available": item.pickup_available,
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

    try:
        updated = update_part(
            garage_part_id=garage_part_id,
            price=data.get("price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            delivery_available=data.get("delivery_available"),
            installation_available=data.get("installation_available"),
            pickup_available=data.get("pickup_available")
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
        "car_make": car_make.name if car_make else None,
        "car_model": car_model.name if car_model else None,
        "price": float(gp.price) if gp.price is not None else None,
        "cost_price": float(gp.cost_price) if gp.cost_price is not None else None,
        "quantity": gp.quantity,
        "from_year": gp.from_year,
        "to_year": gp.to_year,
        "delivery_available": gp.delivery_available,
        "installation_available": gp.installation_available,
        "pickup_available": gp.pickup_available,
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

    try:
        edit_garage_part(
            garage_part_id=garage_part_id,
            garage_id=garage_id,
            price=data.get("price"),
            cost_price=data.get("cost_price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            delivery_available=data.get("delivery_available"),
            installation_available=data.get("installation_available"),
            pickup_available=data.get("pickup_available")
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
        query = query.filter_by(car_make_id=make_id)
    models = query.all()
    return jsonify([{"id": m.id, "name": m.name, "make_id": m.make_id} for m in models]), 200