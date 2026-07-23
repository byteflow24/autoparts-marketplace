from app import db
from app.models.part import Part, GaragePart
from app.models.garage import Garage
from app.models.car import CarModel
from sqlalchemy import or_

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


# =====================================================
# Catalog Services
# =====================================================

def search_catalog(query, brand=None, category=None, limit=20):
    """
    Search the global parts catalog.

    Searches by:
    - name
    - part number
    - OEM number
    - brand

    Returns:
        list[Part]
    """

    q = Part.query

    if query:
        like = f"%{query}%"

        q = q.filter(
            or_(
                Part.name.ilike(like),
                Part.part_number.ilike(like),
                Part.oem_number.ilike(like),
                Part.brand.ilike(like),
            )
        )

    if brand:
        q = q.filter(Part.brand.ilike(f"%{brand}%"))

    if category:
        q = q.filter(Part.category.ilike(f"%{category}%"))

    return (
        q.order_by(Part.name.asc())
        .limit(limit)
        .all()
    )


def find_existing_part(part_number=None, oem_number=None, name=None, brand=None):
    """
    Returns an existing Part if a likely match exists.

    Priority:
    1. Part Number
    2. OEM Number
    3. Brand + Name
    """

    if part_number:
        part = Part.query.filter_by(part_number=part_number).first()
        if part:
            return part

    if oem_number:
        part = Part.query.filter_by(oem_number=oem_number).first()
        if part:
            return part

    if name and brand:
        part = Part.query.filter(
            Part.name.ilike(name),
            Part.brand.ilike(brand)
        ).first()

        if part:
            return part

    return None


def get_part(part_id):
    """
    Returns a Part or None.
    """

    return Part.query.get(part_id)


def create_part(
    *,
    name,
    part_number=None,
    oem_number=None,
    brand=None,
    manufacturer=None,
    category=None,
    description=None,
    image_url=None,
    source="manual",
    external_id=None,
    verified=False
):
    """
    Creates a NEW catalog part.

    This function NEVER checks for duplicates.

    Duplicate checking belongs to
    find_existing_part().
    """

    part = Part(
        name=name,
        part_number=part_number,
        oem_number=oem_number,
        brand=brand,
        manufacturer=manufacturer,
        category=category,
        description=description,
        image_url=image_url,
        source=source,
        external_id=external_id,
        verified=verified
    )

    db.session.add(part)
    db.session.commit()

    return part
    

def create_or_get_part(
    *,
    name,
    part_number=None,
    oem_number=None,
    brand=None,
    manufacturer=None,
    category=None,
    description=None,
    image_url=None,
    source="manual",
    external_id=None,
    verified=False
):
    """
    Returns an existing catalog part if found,
    otherwise creates a new one.
    """

    existing = find_existing_part(
        part_number=part_number,
        oem_number=oem_number,
        name=name,
        brand=brand
    )

    if existing:
        return existing

    return create_part(
        name=name,
        part_number=part_number,
        oem_number=oem_number,
        brand=brand,
        manufacturer=manufacturer,
        category=category,
        description=description,
        image_url=image_url,
        source=source,
        external_id=external_id,
        verified=verified
    )


def update_catalog_part(part_id, **kwargs):
    """
    Updates catalog information only.

    Does NOT update garage inventory.
    """

    part = get_part(part_id)

    if not part:
        raise ValueError("Part not found")

    allowed_fields = {
        "name",
        "part_number",
        "oem_number",
        "brand",
        "manufacturer",
        "category",
        "description",
        "image_url",
        "verified",
        "source",
        "external_id",
    }

    for key, value in kwargs.items():
        if key in allowed_fields and value is not None:
            setattr(part, key, value)

    db.session.commit()

    return part


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
    # Note: cost_price is optional now (used later for profit reporting).
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

    # Update fields only if provided (keeps partial updates safe)
    if price is not None:
        garage_part.price = price

    # ✅ Profit tracking support
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

    # ✅ Seller can hide a listing without deleting it
    if is_active is not None:
        garage_part.is_active = is_active

    db.session.commit()

    return garage_part

# ---------------------------------------------------
# ✅ Get Garage Inventory
# ---------------------------------------------------
def get_garage_inventory(garage_id, category=None, search=None, low_stock_only=False, show_inactive=False):
    """
    Returns all parts for a specific garage.

    Useful for:
    - Dashboard
    - Inventory view
    """

    query = GaragePart.query.filter(GaragePart.garage_id == garage_id)

    if not show_inactive:
        query = query.filter(GaragePart.is_active.is_(True))
    if low_stock_only:
        query = query.filter(GaragePart.quantity < 10)
    if search:
        query = query.join(Part).filter(
            db.or_(Part.name.ilike(f"%{search}%"),
            Part.part_number.ilike(f"%{search}%"))
            )
    if category:
        query = query.join(Part).filter(Part.category.ilike(f"%{category}%"))
        
    return query.all()


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


# ---------------------------------------------------
# ✅ Toggle Listing Active/Inactive
# ---------------------------------------------------
# A safer alternative to delete: allows garage to hide a part temporarily.
def toggle_garage_part_active(garage_part_id, garage_id):
    garage_part = GaragePart.query.get(garage_part_id)

    if not garage_part:
        raise ValueError("Garage part not found")

    if garage_part.garage_id != garage_id:
        raise ValueError("Access denied")

    garage_part.is_active = not bool(garage_part.is_active)
    db.session.commit()

    return garage_part