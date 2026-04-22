from app import db
from app.models.garage import Garage
from app.models.user import User
from app.models.part import GaragePart

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
    Returns dashboard data for garage.

    Includes:
    - total parts
    - low stock alerts
    - total inventory value
    """

    garage = Garage.query.get(garage_id)
    if not garage:
        raise ValueError("Garage not found")
    
    parts = GaragePart.query.filter_by(garage_id=garage_id).all()
    total_parts = len(parts)

    # Low stock (less than 10)
    low_stock = [p for p in parts if p.quantity < 10]

    # Total inventory value
    total_value = round(sum(float(p.price) * p.quantity for p in parts), 2)

    return {
        "garage_name": garage.garage_name,
        "total_parts": total_parts,
        "low_stock_count": len(low_stock),
        "total_inventory_value": total_value
    }

# ---------------------------------------------------
# ✅ Get all parts
# ---------------------------------------------------
def get_garage_parts(garage_id):

    """
    Get all parts for a garage
    """

    return GaragePart.query.filter_by(garage_id=garage_id).all()