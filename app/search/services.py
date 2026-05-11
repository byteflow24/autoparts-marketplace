from app import db
from app.models.part import Part, GaragePart
from app.models.garage import Garage
from app.models.car import CarMake, CarModel

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
def search_by_part_number(part_number):
    """
    Search for parts using part number.

    Returns all garage listings that have this part.
    """

    results = (
        db.session.query(GaragePart)
        .join(Part)
        .join(Garage)
        .filter(
            Part.part_number == part_number,
            GaragePart.is_active.is_(True),
            GaragePart.quantity > 0
        )
        .all()
    )

    return results

# ---------------------------------------------------
# ✅ Search for parts using filters
# ---------------------------------------------------
def search_parts(
    car_make_id=None, car_model_id=None, year=None,
    category=None, min_price=None, max_price=None):

    """
    Advanced search with filters.
    """

    query = (
        db.session.query(GaragePart)
        .join(Part)
        .join(Garage)
        .join(CarModel)
        .join(CarMake)
        .filter(GaragePart.is_active.is_(True), GaragePart.quantity > 0)
    )

    # Car filters
    if car_make_id:
        query = query.filter(CarMake.id == car_make_id)

    if car_model_id:
        query = query.filter(CarModel.id == car_model_id)

    if year:
        query = query.filter(
            GaragePart.from_year <= year,
            GaragePart.to_year >= year
        )

    # Part filters
    if category:
        query = query.filter(Part.category.ilike(f"%{category}%"))

    # Price filters
    if min_price:
        query = query.filter(GaragePart.price >= min_price)

    if max_price:
        query = query.filter(GaragePart.price <= max_price)

    return query.all()

def format_search_results(results):
    data = []

    for item in results:
        data.append({
            "garage_id": item.garage.id,
            "garage_name": item.garage.garage_name,
            # ✅ Part info
            "part_id": item.part.id,
            "part_name": item.part.name,
            "part_number": item.part.part_number,
            # ✅ Pricing & stock
            "price": float(item.price),
            "quantity": item.quantity,
            # ✅ Compatibility
            "from_year": item.from_year,
            "to_year": item.to_year,
            # ✅ Services
            "delivery": item.delivery_available,
            "installation": item.installation_available,
            "pickup": item.pickup_available
        })

    return data