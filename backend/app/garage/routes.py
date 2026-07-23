from flask import Blueprint, jsonify, request

from app.orders.services import (
    get_garage_orders,
    get_order_details,
    update_order_status,
)
from flask_jwt_extended import get_jwt, jwt_required

from app.garage.services import (
    create_garage as create_garage_service,
    get_garage_by_id,
    get_garage_dashboard,
    get_garage_parts,
    update_garage as update_garage_service,
)

from .utils import _require_garage

"""
Garage Routes  (JWT — pure JSON API)

Endpoints:
  POST  /garage/create                     → create garage profile
  PUT   /garage/update/<garage_id>         → update garage profile
  GET   /garage/<garage_id>                → get public garage profile
  GET   /garage/dashboard                  → dashboard stats (garage only)
  GET   /garage/inventory                  → inventory list (garage only)
  PUT   /garage/profile/edit               → edit own profile (garage only)
  GET   /garage/orders                     → order queue (garage only)
  GET   /garage/orders/<order_id>          → order detail (garage only)
  POST  /garage/orders/<order_id>/status   → update order status (garage only)
"""

garage_bp = Blueprint('garage', __name__, url_prefix='/garage')

# ---------------------------------------------------
# POST /garage/create
# ---------------------------------------------------
@garage_bp.route("/create", methods=["POST"])
@jwt_required()
def create_garage():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    try:
        garage = create_garage_service(
            user_id=data.get("user_id"),
            garage_name=data.get("garage_name"),
            CR_number=data.get("CR_number"),
            location=data.get("location"),
            national_address=data.get("national_address"),
            specialization=data.get("specialization")
        )
        return jsonify({"id": garage.id, "garage_name": garage.garage_name,
                        "message": "Garage created successfully"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# PUT /garage/update/<garage_id>
# ---------------------------------------------------
@garage_bp.route("/update/<int:garage_id>", methods=["PUT"])
@jwt_required()
def update_garage(garage_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    try:
        garage = update_garage_service(
            garage_id,
            garage_name=data.get("garage_name"),
            location=data.get("location"),
            national_address=data.get("national_address"),
            specialization=data.get("specialization")
        )
        return jsonify({"id": garage.id, "message": "Garage updated successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# ---------------------------------------------------
# GET /garage/<garage_id>  (public)
# ---------------------------------------------------
@garage_bp.route("/<int:garage_id>", methods=["GET"])
def get_garage(garage_id):
    try:
        garage = get_garage_by_id(garage_id)
        return jsonify({
            "id": garage.id,
            "garage_name": garage.garage_name,
            "CR_number": garage.CR_number,
            "location": garage.location,
            "national_address": garage.national_address,
            "specialization": garage.specialization
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# ---------------------------------------------------
# GET /garage/dashboard  (garage only)
# ---------------------------------------------------
@garage_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err
    data = get_garage_dashboard(garage_id)
    return jsonify(data), 200


# ---------------------------------------------------
# GET /garage/inventory  (garage only)
# ---------------------------------------------------
@garage_bp.route("/inventory", methods=["GET"])
@jwt_required()
def inventory():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    parts = get_garage_parts(
        garage_id,
        category=request.args.get("category") or None,
        search=request.args.get("search") or None,
        low_stock_only=bool(request.args.get("low_stock_only")),
        show_inactive=bool(request.args.get("show_inactive"))
    )

    data = [
        {
            "garage_part_id": p.id,
            "part_name": p.part.name,
            "part_number": p.part.part_number,
            "brand": p.part.brand,
            "category": p.part.category,
            "price": float(p.price),
            "cost_price": float(p.cost_price) if p.cost_price else None,
            "quantity": p.quantity,
            "is_active": p.is_active,
            "delivery_available": p.delivery_available,
            "installation_available": p.installation_available,
            "pickup_available": p.pickup_available,
            "from_year": p.from_year,
            "to_year": p.to_year,
        }
        for p in parts
    ]
    return jsonify({"count": len(data), "inventory": data}), 200


# ---------------------------------------------------
# PUT /garage/profile/edit  (garage only)
# ---------------------------------------------------
@garage_bp.route("/profile/edit", methods=["PUT"])
@jwt_required()
def edit_profile():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        garage = update_garage_service(
            garage_id,
            garage_name=data.get("garage_name"),
            location=data.get("location"),
            national_address=data.get("national_address"),
            specialization=data.get("specialization")
        )
        return jsonify({"id": garage.id, "message": "Garage profile updated successfully."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# GET /garage/orders  (garage only)
# ---------------------------------------------------
@garage_bp.route("/orders", methods=["GET"])
@jwt_required()
def orders_queue():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    orders = get_garage_orders(garage_id)
    orders = sorted(
        orders,
        key=lambda o: (o.status != "pending", o.created_at is None, o.created_at)
    )

    data = [
        {
            "order_id": o.id,
            "user_id": o.user_id,
            "customer_name": o.user.name if o.user else "—",
            "status": o.status,
            "total_price": float(o.total_price) if o.total_price else 0,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    return jsonify({"count": len(data), "orders": data}), 200


# ---------------------------------------------------
# GET /garage/orders/<order_id>  (garage only)
# ---------------------------------------------------
@garage_bp.route("/orders/<int:order_id>", methods=["GET"])
@jwt_required()
def order_detail(order_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    try:
        order = get_order_details(order_id)
        if order.garage_id != garage_id:
            return jsonify({"error": "Access denied."}), 403

        items = [
            {
                "item_id": item.id,
                "part_name": item.garage_part.part.name,
                "part_number": item.garage_part.part.part_number,
                "price": float(item.price),
                "quantity": item.quantity,
                "service_option": item.service_option
            }
            for item in order.items
        ]

        return jsonify({
            "order_id": order.id,
            "user_id": order.user_id,
            "status": order.status,
            "total_price":float(order.total_price) if order.total_price else 0,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": items
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# ---------------------------------------------------
# POST /garage/orders/<order_id>/status  (garage only)
# Body: { "status": "confirmed" }
# ---------------------------------------------------
@garage_bp.route("/orders/<int:order_id>/status", methods=["POST"])
@jwt_required()
def update_order_status_route(order_id):
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    status = data.get("status")
    try:
        order = get_order_details(order_id)
        if order.garage_id != garage_id:
            return jsonify({"error": "Access denied."}), 403

        update_order_status(order_id=order_id, status=status)
        return jsonify({"order_id": order_id, "new_status": status}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400