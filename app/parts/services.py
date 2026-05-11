from app import db
from app.models.part import Part, GaragePart
from app.models.garage import Garage
from app.models.car import CarModel

"""
Parts Services (Business Logic)

Handles logic for parts and inventory.

Responsibilities:
- Create or reuse parts
- Add parts to garage inventory
- Validate inputs
- Update stock & details
- Fetch garage inventory

This is the core logic layer of the system.
"""

# ---------------------------------------------------
# ✅ Create or Get Existing Part
# ---------------------------------------------------
def create_part(part_number=None, name=None, brand=None, category=None):
    """
    Create a global part OR reuse existing one.

    Logic:
    - If part_number exists and already found -> reuse it
    - Otherwise create a new part
    """

    if part_number:
        existing_part = Part.query.filter_by(part_number=part_number).first()
        if existing_part:
            return existing_part

    new_part = Part(
        part_number=part_number,
        name=name,
        brand=brand,
        category=category
    )

    db.session.add(new_part)
    db.session.commit()

    return new_part

# ---------------------------------------------------
# ✅ Add Part to Garage Inventory
# ---------------------------------------------------
def add_part_to_garage( garage_id, part_id, car_model_id, price, quantity, from_year, to_year,
                       delivery_available=False, installation_available=False, pickup_available=False,
                       cost_price=None, is_active=True):
    """
    Adds a part to a garage inventory (GaragePart).

    Validations:
    - Garage must exist
    - Part must exist
    - Car model must exist
    - Prevent duplicate entries
    """

    # 🔍 Validate garage
    garage = Garage.query.get(garage_id)
    if not garage:
        raise ValueError("Garage not found")
    # 🔍 Validate part
    part = Part.query.get(part_id)
    if not part:
        raise ValueError("Part not found")
    # 🔍 Validate car model
    car_model = CarModel.query.get(car_model_id)
    if not car_model:
        raise ValueError("Car model not found")
    
    # 🔍 Check duplicate (same garage + part + car_model)
    existing = GaragePart.query.filter_by(
        garage_id=garage_id,
        part_id=part_id,
        car_model_id=car_model_id,
        from_year=from_year,
        to_year=to_year
    ).first()

    if existing:
        # Instead of creating duplicate → update quantity
        existing.quantity += quantity
        db.session.commit()
        return existing
    
    # ✅ Create new GaragePart
    garage_part = GaragePart(
        garage_id=garage_id,
        part_id=part_id,
        car_model_id=car_model_id,
        price=price,
        cost_price=cost_price,
        quantity=quantity,
        from_year=from_year,
        to_year=to_year,
        is_active=is_active,
        delivery_available=delivery_available,
        installation_available=installation_available,
        pickup_available=pickup_available
    )

    db.session.add(garage_part)
    db.session.commit()

    return garage_part

# ---------------------------------------------------
# ✅ Update Part in Garage
# ---------------------------------------------------
def update_part( garage_part_id, price=None, quantity=None,
                from_year=None, to_year=None,
                delivery_available=False, installation_available=False, pickup_available=False,
                cost_price=None, is_active=None):
    """
    Update existing garage part.

    Supports:
    - Price update
    - Stock refill/change
    - Year compatibility
    - Service options
    """

    garage_part = GaragePart.query.get(garage_part_id)
    if not garage_part:
        raise ValueError("Garage part not found")

    # Update fields only if provided
    if price is not None:
        garage_part.price = price

    if cost_price is not None:
        garage_part.cost_price = cost_price

    if quantity is not None:
        garage_part.quantity = quantity

    if from_year is not None:
        garage_part.from_year = from_year

    if to_year is not None:
        garage_part.to_year = to_year

    if delivery_available is not None:
        garage_part.delivery_available = delivery_available

    if installation_available is not None:
        garage_part.installation_available = installation_available
    
    if pickup_available is not None:
        garage_part.pickup_available = pickup_available

    if is_active is not None:
        garage_part.is_active = is_active

    db.session.commit()

    return garage_part

# ---------------------------------------------------
# ✅ Get Garage Inventory
# ---------------------------------------------------
def get_garage_inventory(garage_id):
    """
    Returns all parts for a specific garage.

    Useful for:
    - Dashboard
    - Inventory view
    """

    inventory = GaragePart.query.filter_by(garage_id=garage_id).all()

    return inventory

# ---------------------------------------------------
# ✅ Delete Part from Inventory
# ---------------------------------------------------
def delete_garage_part(garage_part_id, garage_id):
    garage_part = GaragePart.query.get(garage_part_id)

    if not garage_part:
        raise ValueError("Garage part not found")

    if garage_part.garage_id != garage_id:
        raise ValueError("Access denied")

    db.session.delete(garage_part)
    db.session.commit()

    return True

# ---------------------------------------------------
# ✅ Edit Part from Inventory
# ---------------------------------------------------
def edit_garage_part(garage_part_id, garage_id, **kwargs):
    garage_part = GaragePart.query.get(garage_part_id)

    if not garage_part:
        raise ValueError("Garage part not found")

    if garage_part.garage_id != garage_id:
        raise ValueError("Access denied")

    # Update only provided fields
    for key, value in kwargs.items():
        if hasattr(garage_part, key) and value is not None:
            setattr(garage_part, key, value)

    db.session.commit()
    return garage_part


def toggle_garage_part_active(garage_part_id, garage_id):
    garage_part = GaragePart.query.get(garage_part_id)

    if not garage_part:
        raise ValueError("Garage part not found")

    if garage_part.garage_id != garage_id:
        raise ValueError("Access denied")

    garage_part.is_active = not bool(garage_part.is_active)
    db.session.commit()

    return garage_part