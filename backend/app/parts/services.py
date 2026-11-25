from app import db
from app.models.part import Part, GaragePart
from app.models.garage import Garage
from app.models.car import CarModel, CarSubModel , GaragePartCompatibleCar
from sqlalchemy import or_, exists, and_

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

def search_catalog(query, brand=None, category=None, subcategory=None,
                   car_model_id=None, year=None, limit=20):
    """
    Search the global parts catalog across multiple fields.

    When car_model_id is supplied the results are narrowed to parts that
    are listed in the inventory for that specific car model, either as the
    primary car on a GaragePart row or as an entry in the
    GaragePartCompatibleCar "also fits" table.  When year is also given the
    year range stored on those rows is respected
    (from_year ≤ year ≤ to_year, with NULL treated as open-ended).

    Ranking priority (highest → lowest):
      1. Exact part_number match
      2. Exact oem_number match
      3. Exact name match  (case-insensitive)
      4. Exact brand match
      5. Partial match on any field

    Returns:
        list[Part]  — ranked, limited to `limit`
    """

    q = Part.query

    # ── Car filter — primary listing OR compatible-car entry ──
    if car_model_id:
        try:
            car_model_id_int = int(car_model_id)
            year_int = int(year) if year else None
        except (TypeError, ValueError):
            car_model_id_int = None
            year_int = None

        if car_model_id_int:
            # Build year-range conditions (NULL = open-ended)
            def year_range_ok(from_col, to_col, yr):
                if yr:
                    return and_(
                        or_(from_col == None, from_col <= yr),  # noqa: E711
                        or_(to_col   == None, to_col   >= yr),  # noqa: E711
                    )
                return True  # no year supplied → don't filter by year

            yr = year_int

            # Subquery 1: part is listed as the primary car on a GaragePart
            primary_match = (
                GaragePart.car_model_id == car_model_id_int
            )
            if yr:
                primary_match = and_(
                    primary_match,
                    or_(GaragePart.from_year == None, GaragePart.from_year <= yr),  # noqa: E711
                    or_(GaragePart.to_year   == None, GaragePart.to_year   >= yr),  # noqa: E711
                )

            primary_sub = exists().where(
                and_(GaragePart.part_id == Part.id, primary_match)
            )

            # Subquery 2: part appears in the "also fits" compat table
            compat_match = (
                GaragePartCompatibleCar.car_model_id == car_model_id_int
            )
            if yr:
                compat_match = and_(
                    compat_match,
                    or_(GaragePartCompatibleCar.from_year == None, GaragePartCompatibleCar.from_year <= yr),  # noqa: E711
                    or_(GaragePartCompatibleCar.to_year   == None, GaragePartCompatibleCar.to_year   >= yr),  # noqa: E711
                )

            compat_sub = exists().where(
                and_(
                    GaragePartCompatibleCar.garage_part_id == GaragePart.id,
                    GaragePart.part_id == Part.id,
                    compat_match,
                )
            )

            q = q.filter(or_(primary_sub, compat_sub))

    # ── Apply text filter ─────────────────────────────────────
    if query:
        like = f"%{query}%"
        q = q.filter(
            or_(
                Part.name.ilike(like),
                Part.part_number.ilike(like),
                Part.oem_number.ilike(like),
                Part.brand.ilike(like),
                Part.manufacturer.ilike(like),
            )
        )

    # ── Apply optional filters ────────────────────────────────
    if brand:
        q = q.filter(Part.brand.ilike(f"%{brand}%"))

    if category:
        q = q.filter(Part.category.ilike(f"%{category}%"))

    if subcategory:
        q = q.filter(Part.subcategory.ilike(f"%{subcategory}%"))

    # ── Fetch then rank in Python ─────────────────────────────
    # Fetching limit * 4 gives the ranker enough candidates
    # without loading the whole table.
    candidates = q.limit(limit * 4).all()

    if not candidates:
        return []

    q_lower = query.lower().strip() if query else ""

    def score(part):
        """
        Lower score = higher rank.

        Exact matches on the most specific identifiers come first.
        Partial matches come last.
        """
        pn  = (part.part_number  or "").lower()
        oem = (part.oem_number   or "").lower()
        nm  = (part.name         or "").lower()
        br  = (part.brand        or "").lower()

        if q_lower:
            if pn  == q_lower: return 0   # exact part number
            if oem == q_lower: return 1   # exact OEM number
            if nm  == q_lower: return 2   # exact name
            if br  == q_lower: return 3   # exact brand
            if pn.startswith(q_lower):  return 4   # part number starts with
            if oem.startswith(q_lower): return 5   # OEM starts with
            if nm.startswith(q_lower):  return 6   # name starts with
            if br.startswith(q_lower):  return 7   # brand starts with

        # Verified parts before unverified within each tier
        base = 8
        if part.verified:
            return base
        return base + 1

    ranked = sorted(candidates, key=score)
    return ranked[:limit]


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
    subcategory=None,
    description=None,
    image_url=None,
    country_of_origin=None,
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
        subcategory=subcategory,
        description=description,
        image_url=image_url,
        country_of_origin=country_of_origin,
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
    subcategory=None,
    description=None,
    image_url=None,
    country_of_origin=None,
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
        subcategory=subcategory,
        description=description,
        image_url=image_url,
        country_of_origin=country_of_origin,
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
        "subcategory",
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
def add_part_to_garage(
    garage_id, part_id, car_model_id, price, quantity, from_year, to_year,
    car_sub_model_id=None, year=None,
    condition="new",
    delivery_available=False, installation_available=False,
    installation_price=None,
    cost_price=None, is_active=True
):
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

    if car_sub_model_id:
        sub = CarSubModel.query.get(car_sub_model_id)
        if not sub or sub.model_id != int(car_model_id):
            raise ValueError("Invalid sub-model for the selected car model")
    else:
        car_sub_model_id = None

    # 🔍 Check duplicate (same garage + part + car_model)
    existing = GaragePart.query.filter_by(
        garage_id=garage_id,
        part_id=part_id,
        car_model_id=car_model_id,
        car_sub_model_id=car_sub_model_id,
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
        car_sub_model_id=car_sub_model_id,
        year=year,
        price=price,
        cost_price=cost_price,
        quantity=quantity,
        from_year=from_year,
        to_year=to_year,
        condition=condition,
        is_active=is_active,
        delivery_available=delivery_available,
        installation_available=installation_available,
        installation_price=installation_price,
    )

    db.session.add(garage_part)
    db.session.commit()

    return garage_part

# ---------------------------------------------------
# ✅ Update Part in Garage
# ---------------------------------------------------
def update_part(
    garage_part_id, price=None, quantity=None,
    from_year=None, to_year=None,
    delivery_available=False, installation_available=False,
    installation_price=None,
    cost_price=None, is_active=None
):
    """
    Update existing garage part.

    Supports:
    - Price update
    - Stock refill/change
    - Year compatibility
    - Service options + prices
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

    # Service prices: allow explicit None to clear, so use sentinel check
    # (caller passes the value from request data, which is None if not sent)
    garage_part.installation_price = installation_price

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
def edit_garage_part(garage_part_id, garage_id, car_sub_model_id="__unset__", **kwargs):
    garage_part = GaragePart.query.get(garage_part_id)

    if not garage_part:
        raise ValueError("Garage part not found")

    if garage_part.garage_id != garage_id:
        raise ValueError("Access denied")

    # Handle sub_model explicitly (can be explicitly set to None to clear it)
    if car_sub_model_id != "__unset__":
        if car_sub_model_id is not None:
            sub = CarSubModel.query.get(car_sub_model_id)
            if not sub or sub.model_id != garage_part.car_model_id:
                raise ValueError("Invalid sub-model for this part's car model")
        garage_part.car_sub_model_id = car_sub_model_id

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