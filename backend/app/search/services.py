from app import db
from app.models.part import Part, GaragePart
from app.models.garage import Garage
from app.models.car import CarMake, CarModel, CarSubModel

"""
Search Services (Business Logic)

Handles search and filtering logic.

Responsibilities:
- Query database for matching parts
- Optimize search performance
- Apply filters (price, location, availability)

This is a critical performance-sensitive module.
"""

# ---------------------------------------------------
# ✅ Search for parts using part number
# ---------------------------------------------------
def search_by_term(search_term):
    search_term = search_term.strip()
    if not search_term:
        return []

    # Exact part-number match — no car join needed
    results = (
        db.session.query(GaragePart)
        .join(Part)
        .join(Garage)
        .filter(
            Part.part_number.ilike(search_term),
            GaragePart.is_active.is_(True),
            GaragePart.quantity > 0
        )
        .all()
    )
    if results:
        return results

    # Partial name/number match
    pattern = f"%{search_term}%"
    return (
        db.session.query(GaragePart)
        .join(Part)
        .join(Garage)
        .filter(
            db.or_(
                Part.name.ilike(pattern),
                Part.part_number.ilike(pattern),
                Part.brand.ilike(pattern),
            ),
            GaragePart.is_active.is_(True),
            GaragePart.quantity > 0
        )
        .all()
    )

# ---------------------------------------------------
# ✅ Search for parts using filters
# ---------------------------------------------------

def search_parts(
    search=None,
    car_make_id=None,
    car_model_id=None,
    car_sub_model_id=None,
    year=None,
    category=None,
    subcategory=None,
    min_price=None,
    max_price=None,
    delivery=False,
    installation=False,
):
    # Start with the base query — NO car joins yet
    query = (
        db.session.query(GaragePart)
        .join(Part)
        .join(Garage)
        .filter(
            GaragePart.is_active.is_(True),
            GaragePart.quantity > 0
        )
    )

    # Only join car tables when car filters are actually used
    needs_car_join = car_make_id or car_model_id or car_sub_model_id or year
    if needs_car_join:
        query = (
            query
            .join(CarModel, GaragePart.car_model_id == CarModel.id)
            .join(CarMake,  CarModel.make_id == CarMake.id)
        )

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            db.or_(
                Part.name.ilike(pattern),
                Part.part_number.ilike(pattern),
                Part.oem_number.ilike(pattern),
                Part.brand.ilike(pattern),
                Part.manufacturer.ilike(pattern),
                Part.category.ilike(pattern)
            )
        )

    if car_make_id:
        query = query.filter(CarMake.id == car_make_id)

    if car_model_id:
        query = query.filter(CarModel.id == car_model_id)

    # Sub-model filter: match exact trim OR parts that cover all trims (NULL)
    if car_sub_model_id:
        query = query.filter(
            db.or_(
                GaragePart.car_sub_model_id == car_sub_model_id,
                GaragePart.car_sub_model_id.is_(None),
            )
        )

    if year:
        query = query.filter(
            GaragePart.from_year <= year,
            GaragePart.to_year >= year
        )

    if category:
        query = query.filter(Part.category.ilike(f"%{category}%"))

    if subcategory:
        query = query.filter(Part.subcategory.ilike(f"%{subcategory}%"))

    if min_price is not None:
        query = query.filter(GaragePart.price >= min_price)

    if max_price is not None:
        query = query.filter(GaragePart.price <= max_price)

    if delivery:
        query = query.filter(GaragePart.delivery_available.is_(True))
    if installation:
        query = query.filter(GaragePart.installation_available.is_(True))

    return query.all()

def format_search_results(results):
    data = []

    for item in results:
        # Car compatibility — from GaragePart.car_model → CarModel → CarMake
        car_make  = None
        car_model = None
        car_sub_model = None
        if item.car_model:
            car_model = item.car_model.name
            if item.car_model.make:
                car_make = item.car_model.make.name
        if item.car_sub_model:
            car_sub_model = item.car_sub_model.name

        data.append({
            "garage_part_id": item.id,
            "garage_id": item.garage.id,
            "garage_name": item.garage.garage_name,
            # ✅ Part info
            "part_id": item.part.id,
            "part_name": item.part.name,
            "part_number": item.part.part_number,
            "brand": item.part.brand,
            "category": item.part.category,
            "subcategory": item.part.subcategory,
            "image_url": item.part.image_url,
            "country_of_origin": item.part.country_of_origin,
            "condition": item.condition,
            "car_make": car_make,
            "car_model": car_model,
            "car_sub_model": car_sub_model,
            # ✅ Pricing & stock
            "price": float(item.price),
            "quantity": item.quantity,
            # ✅ Compatibility
            "from_year": item.from_year,
            "to_year": item.to_year,
            # ✅ Services
            "delivery": item.delivery_available,
            "installation": item.installation_available,
            "delivery_zones": [{"city": z.city, "price": float(z.price)} for z in item.garage.delivery_zones],
            "installation_price":  float(item.installation_price)  if item.installation_price  is not None else None,
        })

    return data