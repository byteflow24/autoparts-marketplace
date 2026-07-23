from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from collections import defaultdict
from app.orders.services import (
    create_order,
    add_item_to_order,
    calculate_order_total,
    update_order_status,
    get_user_orders,
    get_garage_orders,
    get_order_details
)
from app.models.part import GaragePart

"""
Orders Routes  (JWT — pure JSON API)

Cart lives in React state. Backend only receives the final cart on
checkout and writes to the DB.

Endpoints:
  POST  /orders/checkout              → validate + create orders (DB write)
  GET   /orders/my-orders             → customer order history (customer only)
  GET   /orders/<order_id>            → order detail (owner or garage)
  PUT   /orders/<order_id>/status     → update status (garage only)
  GET   /orders/user/<user_id>        → orders by user id
  GET   /orders/garage/<garage_id>    → orders by garage id
  GET   /orders/<order_id>/total      → recalculate order total
"""

orders_bp = Blueprint('orders', __name__, url_prefix='/orders')


# ---------------------------------------------------
# POST /orders/checkout  (customer only)
# Body: {
#   "payment_method": "cod",
#   "cart": [
#     { "garage_part_id": 1, "garage_id": 1,
#       "quantity": 2, "service_option": "delivery" }
#   ]
# }
# ---------------------------------------------------
@orders_bp.route("/checkout", methods=["POST"])
@jwt_required()
def checkout():
    claims  = get_jwt()
    user_id = int(get_jwt_identity())

    if claims.get("role") != "customer":
        return jsonify({"error": "Only customers can place orders."}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    cart = data.get("cart", [])
    payment_method = data.get("payment_method", "cod")

    if not cart:
        return jsonify({"error": "Cart is empty."}), 400
    if payment_method not in {"cod"}:
        return jsonify({"error": "Invalid payment method."}), 400

    # Validate every item before any DB write
    for item in cart:
        gp = GaragePart.query.get(item.get("garage_part_id"))
        if not gp:
            return jsonify({"error": f"Part ID {item.get('garage_part_id')} not found."}), 400
        if item.get("quantity", 0) > gp.quantity:
            return jsonify({"error": f"Not enough stock for '{gp.part.name}'. Available: {gp.quantity}"}), 400
        svc = item.get("service_option", "none")
        if svc == "delivery"     and not gp.delivery_available:
            return jsonify({"error": f"Delivery not available for '{gp.part.name}'."}), 400
        if svc == "installation" and not gp.installation_available:
            return jsonify({"error": f"Installation not available for '{gp.part.name}'."}), 400
        if svc == "pickup"       and not gp.pickup_available:
            return jsonify({"error": f"Pickup not available for '{gp.part.name}'."}), 400

    # Group by garage → one order per garage
    grouped = defaultdict(list)
    for item in cart:
        grouped[item["garage_id"]].append(item)

    created_ids = []
    try:
        for garage_id, items in grouped.items():
            order = create_order(user_id=user_id, garage_id=garage_id)
            for item in items:
                add_item_to_order(
                    order_id=order.id,
                    garage_part_id=item["garage_part_id"],
                    quantity=item["quantity"],
                    service_option=item.get("service_option", "none")
                )
            calculate_order_total(order.id)
            created_ids.append(order.id)

        return jsonify({
            "message": "Order placed successfully.",
            "payment_method": payment_method,
            "order_ids": created_ids
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Something went wrong: {str(e)}"}), 500


# ---------------------------------------------------
# GET /orders/my-orders  (customer only)
# ---------------------------------------------------
@orders_bp.route("/my-orders", methods=["GET"])
@jwt_required()
def my_orders():
    user_id = int(get_jwt_identity())
    orders  = get_user_orders(user_id)
    data = [
        {
            "order_id": o.id,
            "garage_id": o.garage_id,
            "status": o.status,
            "total_price": float(o.total_price) if o.total_price else 0,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    return jsonify({"count": len(data), "orders": data}), 200


# ---------------------------------------------------
# GET /orders/<order_id>  (owner or garage)
# ---------------------------------------------------
@orders_bp.route("/<int:order_id>", methods=["GET"])
@jwt_required()
def order_detail(order_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims.get("role")
    garage_id = claims.get("garage_id")

    try:
        order = get_order_details(order_id)

        if role == "customer" and order.user_id != user_id:
            return jsonify({"error": "Access denied."}), 403
        if role == "garage" and order.garage_id != garage_id:
            return jsonify({"error": "Access denied."}), 403

        items = [
            {
                "item_id": item.id,
                "part_name": item.garage_part.part.name,
                "part_number": item.garage_part.part.part_number,
                "price": float(item.price),
                "quantity": item.quantity,
                "service_option": item.service_option,
                "line_total": round(float(item.price) * item.quantity, 2)
            }
            for item in order.order_items
        ]

        return jsonify({
            "order_id": order.id,
            "user_id": order.user_id,
            "garage_id": order.garage_id,
            "status": order.status,
            "total_price": float(order.total_price) if order.total_price else 0,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": items,
            "customer": {
                "name":  order.user.name  if order.user else "—",
                "email": order.user.email if order.user else "—",
                "phone": f"{order.user.country_code or ''} {order.user.phone}".strip()
                        if order.user and order.user.phone else "—"
            },
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# ---------------------------------------------------
# PUT /orders/<order_id>/status  (garage only)
# Body: { "status": "confirmed" }
# ---------------------------------------------------
@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def update_status(order_id):
    claims = get_jwt()
    garage_id = claims.get("garage_id")

    if claims.get("role") != "garage":
        return jsonify({"error": "Only garages can update order status."}), 403

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


# ---------------------------------------------------
# GET /orders/user/<user_id>
# ---------------------------------------------------
@orders_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
def user_orders_route(user_id):
    caller_id = int(get_jwt_identity())
    if caller_id != user_id:
        return jsonify({"error": "Access denied."}), 403

    orders = get_user_orders(user_id)
    data = [
        {
            "order_id": o.id,
            "garage_id": o.garage_id,
            "total_price": float(o.total_price) if o.total_price else 0,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    return jsonify({"count": len(data), "orders": data}), 200


# ---------------------------------------------------
# GET /orders/garage/<garage_id>
# ---------------------------------------------------
@orders_bp.route("/garage/<int:garage_id>", methods=["GET"])
@jwt_required()
def garage_orders_route(garage_id):
    claims = get_jwt()
    if claims.get("role") != "garage" or claims.get("garage_id") != garage_id:
        return jsonify({"error": "Access denied."}), 403

    orders = get_garage_orders(garage_id)
    data = [
        {
            "order_id": o.id,
            "user_id": o.user_id,
            "total_price": float(o.total_price) if o.total_price else 0,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    return jsonify({"count": len(data), "orders": data}), 200


# ---------------------------------------------------
# GET /orders/<order_id>/total
# ---------------------------------------------------
@orders_bp.route("/<int:order_id>/total", methods=["GET"])
@jwt_required()
def calculate_total_route(order_id):
    try:
        total = calculate_order_total(order_id)
        return jsonify({"order_id": order_id, "total_price": total}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404