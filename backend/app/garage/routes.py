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
  GET   /garage/dashboard/orders           → modal: orders by status (garage only)
  GET   /garage/dashboard/inventory        → modal: inventory by filter (garage only)
  GET   /garage/inventory                  → inventory list (garage only)
  PUT   /garage/profile/edit               → edit own profile (garage only)
  GET   /garage/orders                     → order queue (garage only)
  GET   /garage/orders/<order_id>          → order detail (garage only)
  POST  /garage/orders/<order_id>/status   → update order status (garage only)
"""

garage_bp = Blueprint('garage', __name__, url_prefix='/garage')


# ---------------------------------------------------
# Helpers for car label formatting
# ---------------------------------------------------
def _car_label(gp):
    """
    Build a human-readable car string from a GaragePart.
    e.g.  "2020–2023 Toyota Camry XLE"
          "2021 Honda Civic"
          "Any car"
    """
    parts = []

    # Year range
    if gp.from_year and gp.to_year:
        if gp.from_year == gp.to_year:
            parts.append(str(gp.from_year))
        else:
            parts.append(f"{gp.from_year}–{gp.to_year}")
    elif gp.from_year:
        parts.append(f"{gp.from_year}+")
    elif gp.to_year:
        parts.append(f"up to {gp.to_year}")

    # Make → Model → Sub-model
    if gp.car_model and gp.car_model.make:
        parts.append(gp.car_model.make.name)
    if gp.car_model:
        parts.append(gp.car_model.name)
    if gp.car_sub_model:
        parts.append(gp.car_sub_model.name)

    return ' '.join(parts) if parts else 'Any car'


def _compat_labels(gp):
    """
    Return a list of labels for each compatible_car entry on a GaragePart.
    e.g. ["2018–2022 Honda Accord", "2019 Toyota Camry"]
    """
    labels = []
    for cc in gp.compatible_cars:
        label_parts = []
        if cc.from_year and cc.to_year:
            if cc.from_year == cc.to_year:
                label_parts.append(str(cc.from_year))
            else:
                label_parts.append(f"{cc.from_year}–{cc.to_year}")
        elif cc.from_year:
            label_parts.append(f"{cc.from_year}+")
        elif cc.to_year:
            label_parts.append(f"up to {cc.to_year}")

        if cc.car_model and cc.car_model.make:
            label_parts.append(cc.car_model.make.name)
        if cc.car_model:
            label_parts.append(cc.car_model.name)

        labels.append(' '.join(label_parts) if label_parts else 'Any car')
    return labels


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
# GET /garage/dashboard/orders  (garage only)
# Query param: status=pending|completed|cancelled|all
#
# Returns full order+item detail for the dashboard modal.
# Each item includes primary_car and also_fits labels.
# ---------------------------------------------------
@garage_bp.route("/dashboard/orders", methods=["GET"])
@jwt_required()
def dashboard_orders():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    status_filter = request.args.get("status", "all").strip().lower()

    from app.models.order import Order, OrderItem
    from app.models.part import GaragePart

    # Fetch all orders for this garage, optionally filtered by status
    query = Order.query.filter_by(garage_id=garage_id)
    if status_filter != "all":
        query = query.filter(Order.status == status_filter)

    orders = query.order_by(Order.created_at.desc()).all()

    result = []
    for order in orders:
        for item in order.order_items:
            gp = item.garage_parts   # GaragePart (may be None if deleted)
            if not gp or not gp.part:
                continue

            result.append({
                "order_id":    order.id,
                "status":      order.status,
                "created_at":  order.created_at.isoformat() if order.created_at else None,
                "quantity":    item.quantity,
                "service_option": item.service_option,
                "part_name":   gp.part.name,
                "part_number": gp.part.part_number,
                "category":    gp.part.category,
                "subcategory": gp.part.subcategory,
                "primary_car": _car_label(gp),
                "also_fits":   _compat_labels(gp),
            })

    return jsonify({"count": len(result), "items": result}), 200


# ---------------------------------------------------
# GET /garage/dashboard/inventory  (garage only)
# Query param: filter=all|low_stock|sold
#
# Returns inventory detail for the dashboard modal.
# Each item includes primary_car and also_fits labels.
# ---------------------------------------------------
@garage_bp.route("/dashboard/inventory", methods=["GET"])
@jwt_required()
def dashboard_inventory():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    inv_filter = request.args.get("filter", "all").strip().lower()

    from app.models.part import GaragePart, Part
    from app.models.order import Order, OrderItem
    from app import db

    query = GaragePart.query.filter_by(garage_id=garage_id)

    if inv_filter == "low_stock":
        query = query.filter(GaragePart.quantity < 10)

    elif inv_filter == "sold":
        # Parts that appear in at least one completed order item for this garage
        sold_part_ids = (
            db.session.query(GaragePart.id)
            .join(OrderItem, OrderItem.garage_part_id == GaragePart.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                GaragePart.garage_id == garage_id,
                Order.status == "completed"
            )
            .subquery()
        )
        query = query.filter(GaragePart.id.in_(sold_part_ids))

    parts = query.order_by(GaragePart.quantity.asc()).all()

    result = []
    for gp in parts:
        if not gp.part:
            continue
        result.append({
            "garage_part_id": gp.id,
            "part_name":      gp.part.name,
            "part_number":    gp.part.part_number,
            "category":       gp.part.category,
            "subcategory":    gp.part.subcategory,
            "quantity":       gp.quantity,
            "condition":      gp.condition or "new",
            "is_active":      gp.is_active,
            "primary_car":    _car_label(gp),
            "also_fits":      _compat_labels(gp),
        })

    return jsonify({"count": len(result), "items": result}), 200


# ---------------------------------------------------
# GET /garage/inventory  (garage only)
#
# Query params:
#   search, year, car_make_id, car_model_id,
#   car_sub_model_id, category, subcategory,
#   low_stock_only
#
# Returns all listings (active + inactive) so the
# garage can manage and toggle them from one view.
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
        search=request.args.get("search") or None,
        year=request.args.get("year") or None,
        car_make_id=request.args.get("car_make_id") or None,
        car_model_id=request.args.get("car_model_id") or None,
        car_sub_model_id=request.args.get("car_sub_model_id") or None,
        category=request.args.get("category") or None,
        subcategory=request.args.get("subcategory") or None,
        low_stock_only=bool(request.args.get("low_stock_only")),
    )

    data = []
    for p in parts:
        if not p.part:
            continue

        # Resolve car make / model / sub-model names
        car_make      = p.car_model.make.name  if (p.car_model and p.car_model.make) else None
        car_model     = p.car_model.name        if p.car_model  else None
        car_sub_model = p.car_sub_model.name    if p.car_sub_model else None

        data.append({
            "garage_part_id":          p.id,
            "part_name":               p.part.name,
            "part_number":             p.part.part_number,
            "brand":                   p.part.brand,
            "category":                p.part.category,
            "subcategory":             getattr(p.part, "subcategory", None),
            "price":                   float(p.price),
            "quantity":                p.quantity,
            "is_active":               p.is_active,
            "delivery_available":      p.delivery_available,
            "installation_available":  p.installation_available,
            "from_year":               p.from_year,
            "to_year":                 p.to_year,
            "car_make":                car_make,
            "car_model":               car_model,
            "car_sub_model":           car_sub_model,
        })

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

        # Save delivery zones if provided
        delivery_zones = data.get("delivery_zones")  # [{city, price}, ...]
        if delivery_zones is not None:
            from app.models.garage import GarageDeliveryZone
            from app import db

            # Replace all existing zones for this garage
            GarageDeliveryZone.query.filter_by(garage_id=garage_id).delete()
            for zone in delivery_zones:
                city  = zone.get("city", "").strip()
                price = zone.get("price")
                if city and price is not None:
                    try:
                        price = float(price)
                    except (TypeError, ValueError):
                        continue
                    db.session.add(GarageDeliveryZone(
                        garage_id=garage_id,
                        city=city,
                        price=price,
                    ))
            db.session.commit()

        return jsonify({"id": garage.id, "message": "Garage profile updated successfully."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

# ---------------------------------------------------
# GET /garage/profile/edit
# ---------------------------------------------------
@garage_bp.route("/profile/edit", methods=["GET"])
@jwt_required()
def get_own_profile():
    claims = get_jwt()
    garage_id, err = _require_garage(claims)
    if err:
        return err

    from app.models.garage import GarageDeliveryZone
    garage = get_garage_by_id(garage_id)
    zones = GarageDeliveryZone.query.filter_by(garage_id=garage_id).all()

    return jsonify({
        "id":               garage.id,
        "garage_name":      garage.garage_name,
        "location":         garage.location,
        "national_address": garage.national_address,
        "specialization":   garage.specialization,
        "delivery_zones": [{"city": z.city, "price": float(z.price)} for z in zones],
    }), 200


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

    # Optional filter: ?customer_id=<user_id>
    customer_id = request.args.get("customer_id")
    if customer_id:
        try:
            orders = [o for o in orders if o.user_id == int(customer_id)]
        except (ValueError, TypeError):
            pass

    orders = sorted(
        orders,
        key=lambda o: (o.status != "pending", o.created_at is None, o.created_at)
    )

    def _item_summary(item):
        gp = item.garage_parts
        item_status = getattr(item, 'item_status', None) or 'pending'
        if not gp or not gp.part:
            return {
                "part_name":   "Deleted Part",
                "part_number": None,
                "year":        None,
                "car_make":    None,
                "car_model":   None,
                "car_sub_model": None,
                "category":    None,
                "subcategory": None,
                "item_status": item_status,
            }
        return {
            "part_name":    gp.part.name,
            "part_number":  gp.part.part_number,
            "year":         gp.year,
            "car_make":     gp.car_model.make.name if (gp.car_model and gp.car_model.make) else None,
            "car_model":    gp.car_model.name      if gp.car_model else None,
            "car_sub_model": gp.car_sub_model.name if gp.car_sub_model else None,
            "category":     gp.part.category,
            "subcategory":  gp.part.subcategory,
            "item_status":  item_status,
        }

    data = [
        {
            "order_id":      o.id,
            "user_id":       o.user_id,
            "customer_name": o.user.name if o.user else "—",
            "status":        o.status,
            "total_price":   float(o.total_price) if o.total_price else 0,
            "created_at":    o.created_at.isoformat() if o.created_at else None,
            "items":         [_item_summary(item) for item in o.order_items],
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

        def _item_detail(item):
            gp = item.garage_parts
            part = gp.part if gp else None
            return {
                "item_id":       item.id,
                "part_name":     part.name        if part else "Deleted Part",
                "part_number":   part.part_number if part else None,
                "year":          gp.year          if gp else None,
                "car_make":      gp.car_model.make.name if (gp and gp.car_model and gp.car_model.make) else None,
                "car_model":     gp.car_model.name      if (gp and gp.car_model) else None,
                "car_sub_model": gp.car_sub_model.name  if (gp and gp.car_sub_model) else None,
                "category":      part.category    if part else None,
                "subcategory":   part.subcategory if part else None,
                "price":         float(item.price),
                "quantity":      item.quantity,
                "service_option": item.service_option,
            }

        items = [_item_detail(item) for item in order.order_items]

        return jsonify({
            "order_id": order.id,
            "user_id": order.user_id,
            "status": order.status,
            "total_price": float(order.total_price) if order.total_price else 0,
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

# ---------------------------------------------------
# GET /garage/public/<garage_id>  (public)
# Returns: garage info + review aggregate + featured parts
# ---------------------------------------------------
@garage_bp.route("/public/<int:garage_id>", methods=["GET"])
def get_garage_public(garage_id):
    try:
        garage = get_garage_by_id(garage_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    # Review aggregate
    try:
        from app.reviews.services import get_garage_aggregate, get_garage_reviews
        agg     = get_garage_aggregate(garage_id)
        reviews = get_garage_reviews(garage_id, limit=5)
    except Exception:
        agg     = {"average_rating": None, "total_reviews": 0}
        reviews = {"reviews": [], "average_rating": None, "total_reviews": 0}

    # Active parts — ordered cheapest first, limit 12 for the profile page
    from app.models.part import GaragePart, Part
    from app.models.garage import GarageDeliveryZone

    active_parts = (
        GaragePart.query
        .filter_by(garage_id=garage_id, is_active=True)
        .filter(GaragePart.quantity > 0)
        .order_by(GaragePart.price.asc())
        .limit(12)
        .all()
    )

    # Category breakdown (unique categories this garage sells)
    all_active = (
        GaragePart.query
        .join(Part)
        .filter(GaragePart.garage_id == garage_id, GaragePart.is_active == True)
        .with_entities(Part.category)
        .distinct()
        .all()
    )
    categories = sorted(set(r[0] for r in all_active if r[0]))

    zones = GarageDeliveryZone.query.filter_by(garage_id=garage_id).all()
    delivery_zones = [{"city": z.city, "price": float(z.price)} for z in zones]

    parts_data = [
        {
            "garage_part_id":    gp.id,
            "part_id":           gp.part.id,
            "part_name":         gp.part.name,
            "part_number":       gp.part.part_number,
            "brand":             gp.part.brand,
            "category":          gp.part.category,
            "image_url":         gp.part.image_url,
            "price":             float(gp.price),
            "quantity":          gp.quantity,
            "from_year":         gp.from_year,
            "to_year":           gp.to_year,
            "delivery":          gp.delivery_available,
            "installation":      gp.installation_available,
            "installation_price": float(gp.installation_price) if gp.installation_price is not None else None,
        }
        for gp in active_parts
    ]

    # Total active listing count
    total_listings = GaragePart.query.filter_by(
        garage_id=garage_id, is_active=True
    ).filter(GaragePart.quantity > 0).count()

    return jsonify({
        # Garage profile
        "id":               garage.id,
        "garage_name":      garage.garage_name,
        "location":         garage.location,
        "national_address": garage.national_address,
        "specialization":   garage.specialization,
        "delivery_zones": delivery_zones,
        # Stats
        "total_listings":   total_listings,
        "categories":       categories,
        # Reviews
        "average_rating":   agg["average_rating"],
        "total_reviews":    agg["total_reviews"],
        "recent_reviews":   reviews["reviews"],
        # Featured parts
        "featured_parts":   parts_data,
    }), 200