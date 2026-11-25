from app import db
from app.models.garage import Garage
from app.models.user import User
from app.models.part import GaragePart, Part
from app.models.order import Order, OrderItem
from app.models.car import CarMake, CarModel, CarSubModel
from collections import defaultdict

"""
Garage Services (Business Logic)

Contains core logic related to garages.

Responsibilities:
- Create/update garage profile
- Fetch dashboard data (inventory, low stock, etc.)
- Process garage-related operations

This keeps routes clean by separating business logic.
"""

# ---------------------------------------------------
# ✅ Create a garage profile
# ---------------------------------------------------
def create_garage(user_id, garage_name, CR_number, location=None,
                  national_address=None, specialization=None):

    """
    Create a garage profile for a user.

    Rules:
    - User must exist
    - User must NOT already have a garage
    - CR_number must be unique
    """

    # Validate user
    user = User.query.get(user_id)
    if not user:
        raise ValueError("User not found")

    # Prevent multiple garages per user
    if user.garage:
        raise ValueError("User already has a garage")

    # Check CR uniqueness
    existing = Garage.query.filter_by(CR_number=CR_number).first()
    if existing:
        raise ValueError("CR number already exists")

    # Create garage
    garage = Garage(
        user_id=user_id,
        garage_name=garage_name,
        CR_number=CR_number,
        location=location,
        national_address=national_address,
        specialization=specialization
    )

    db.session.add(garage)
    db.session.commit()

    return garage

# ---------------------------------------------------
# ✅ Update garage information
# ---------------------------------------------------
def update_garage(garage_id, **kwargs):

    """
    Update garage information.

    Supports:
    - name
    - location
    - specialization
    - national_address
    """

    garage = Garage.query.get(garage_id)
    if not garage:
        raise ValueError("Garage not found")

    # Update only provided fields
    for key, value in kwargs.items():
        if hasattr(garage, key) and value is not None:
            setattr(garage, key, value)

    db.session.commit()
    return garage

# ---------------------------------------------------
# ✅ Fetch garage information
# ---------------------------------------------------
def get_garage_by_id(garage_id):

    """
    Fetch single garage with details.
    """

    garage = Garage.query.get(garage_id)
    if not garage:
        raise ValueError("Garage not found")

    return garage

# ---------------------------------------------------
# ✅ Fetch garage dashboard
# ---------------------------------------------------
def get_garage_dashboard(garage_id):
    """
    Returns full dashboard data for garage.

    Includes:
    - inventory summary
    - stock by category
    - low stock items
    - order summary
    - sales/revenue summary
    - top selling parts
    """

    garage = Garage.query.get(garage_id)
    if not garage:
        raise ValueError("Garage not found")

    parts = GaragePart.query.filter_by(garage_id=garage_id).all()
    orders = Order.query.filter_by(garage_id=garage_id).all()

    inventory_listings = len(parts)
    total_units = sum(p.quantity for p in parts)
    total_inventory_value = round(sum(float(p.price) * p.quantity for p in parts), 2)

    category_units = defaultdict(int)

    for p in parts:
        category = p.part.category if p.part and p.part.category else "Uncategorized"
        category_units[category] += p.quantity

    categories_count = len(category_units)

    low_stock_items = [
        {
            "part_name": p.part.name if p.part else "Deleted Part",
            "category": p.part.category if p.part and p.part.category else "Uncategorized",
            "quantity": p.quantity,
            "part_number": p.part.part_number if p.part else None
        }
        for p in parts
        if p.quantity < 10
    ]

    total_orders = len(orders)
    pending_orders = len([o for o in orders if o.status == "pending"])
    confirmed_orders = len([o for o in orders if o.status == "confirmed"])
    completed_orders = len([o for o in orders if o.status == "completed"])
    cancelled_orders = len([o for o in orders if o.status == "cancelled"])

    ordering_items = []
    for order in orders:
        for item in order.order_items:
            ordering_items.append(item)

    total_units_sold = sum(item.quantity for item in ordering_items)
    total_revenue = round(sum(float(item.price) * item.quantity for item in ordering_items), 2)

    # ✅ Cost/profit support (requires cost_price on GaragePart)
    total_cost = 0.0

    sold_by_category = defaultdict(int)
    top_selling_parts = defaultdict(lambda: {
        "part_name": "",
        "part_number": "",
        "quantity_sold": 0,
        "revenue": 0
    })

    for item in ordering_items:
        garage_part = item.garage_parts

        # If the inventory item was deleted, skip it to avoid dashboard crash
        if not garage_part or not garage_part.part:
            continue

        part = garage_part.part

        category = part.category if part and part.category else "Uncategorized"
        sold_by_category[category] += item.quantity

        key = part.id
        top_selling_parts[key]["part_name"] = part.name
        top_selling_parts[key]["part_number"] = part.part_number
        top_selling_parts[key]["quantity_sold"] += item.quantity
        top_selling_parts[key]["revenue"] += float(item.price) * item.quantity

        # ✅ Calculate cost only when cost_price exists
        if garage_part.cost_price is not None:
            total_cost += float(garage_part.cost_price) * item.quantity

    top_selling_parts_list = sorted(
        top_selling_parts.values(),
        key=lambda x: x["quantity_sold"],
        reverse=True
    )[:5]

    # ✅ Profit is optional until garage fills cost_price fields
    estimated_profit = None
    if total_cost > 0:
        estimated_profit = round(total_revenue - total_cost, 2)

    return {
        "garage_name": garage.garage_name,
        "CR_number": garage.CR_number,
        "location": garage.location,
        "national_address": garage.national_address,
        "specialization": garage.specialization,
        "inventory_listings": inventory_listings,
        "total_units": total_units,
        "categories_count": categories_count,
        "low_stock_count": len(low_stock_items),
        "total_inventory_value": total_inventory_value,

        "category_units": dict(category_units),
        "low_stock_items": low_stock_items,

        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "confirmed_orders": confirmed_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,

        "total_units_sold": total_units_sold,
        "total_revenue": total_revenue,

        "sold_by_category": dict(sold_by_category),
        "top_selling_parts": top_selling_parts_list,

        "estimated_profit": estimated_profit
    }

# ---------------------------------------------------
# ✅ Get all parts for a garage (inventory page)
# ---------------------------------------------------
def get_garage_parts(
    garage_id,
    search=None,
    year=None,
    car_make_id=None,
    car_model_id=None,
    car_sub_model_id=None,
    category=None,
    subcategory=None,
    low_stock_only=False,
):
    """
    Return all GaragePart rows for a garage, with optional filtering.

    Filters:
    - search:          Part.name / Part.part_number partial match
    - year:            GaragePart.from_year <= year <= GaragePart.to_year
    - car_make_id:     CarMake.id
    - car_model_id:    CarModel.id
    - car_sub_model_id: CarSubModel.id (or NULL — parts covering all trims)
    - category:        Part.category partial match
    - subcategory:     Part.subcategory partial match
    - low_stock_only:  quantity < 10

    Active/inactive: ALL listings are returned (the inventory page shows
    both and lets the garage toggle them).
    """

    query = GaragePart.query.filter(GaragePart.garage_id == garage_id)

    # ── Low stock ──────────────────────────────────────────────
    if low_stock_only:
        query = query.filter(GaragePart.quantity < 10)

    # ── Text search on part name / part number ─────────────────
    if search:
        query = query.join(Part, GaragePart.part_id == Part.id)
        query = query.filter(
            db.or_(
                Part.name.ilike(f"%{search}%"),
                Part.part_number.ilike(f"%{search}%")
            )
        )
    else:
        # Still need Part for category / subcategory filters
        if category or subcategory:
            query = query.join(Part, GaragePart.part_id == Part.id)

    # ── Category ───────────────────────────────────────────────
    if category:
        query = query.filter(Part.category.ilike(f"%{category}%"))

    # ── Subcategory ────────────────────────────────────────────
    if subcategory:
        query = query.filter(Part.subcategory.ilike(f"%{subcategory}%"))

    # ── Car filters (need CarModel / CarMake joins) ────────────
    needs_car_join = car_make_id or car_model_id or car_sub_model_id or year
    if needs_car_join:
        query = (
            query
            .join(CarModel, GaragePart.car_model_id == CarModel.id)
            .join(CarMake,  CarModel.make_id == CarMake.id)
        )

    if car_make_id:
        query = query.filter(CarMake.id == int(car_make_id))

    if car_model_id:
        query = query.filter(CarModel.id == int(car_model_id))

    if car_sub_model_id:
        # Match exact trim OR parts that cover all trims (NULL sub-model)
        query = query.filter(
            db.or_(
                GaragePart.car_sub_model_id == int(car_sub_model_id),
                GaragePart.car_sub_model_id.is_(None),
            )
        )

    if year:
        try:
            y = int(year)
            query = query.filter(
                GaragePart.from_year <= y,
                GaragePart.to_year   >= y,
            )
        except (ValueError, TypeError):
            pass  # ignore malformed year param

    return query.all()