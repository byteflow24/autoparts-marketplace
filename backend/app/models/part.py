from .. import db
from sqlalchemy import Integer, String, ForeignKey, Boolean, DECIMAL, TIMESTAMP, func, Date, Text, text

"""
Part Models

Defines parts and inventory relationships.

Includes:
- Part (global part info)
- GaragePart (inventory per garage)

Handles:
- pricing
- quantity
- compatibility (year range)
"""

# Parts table
class Part(db.Model):
    __tablename__ = "parts"

    id = db.Column(Integer, primary_key=True)

    # Basic Information
    name = db.Column(String(150), nullable=False, index=True)
    part_number = db.Column(String(100), nullable=True, index=True)
    oem_number = db.Column(String(100), nullable=True, index=True)

    # Manufacturer Information
    brand = db.Column(String(100), nullable=True, index=True)
    manufacturer = db.Column(String(150), nullable=True)
    country_of_origin = db.Column(String(100), nullable=True)

    # Classification
    category = db.Column(String(100), nullable=True, index=True)
    subcategory = db.Column(String(100), nullable=True, index=True)
    description = db.Column(Text, nullable=True)

    # Media
    image_url = db.Column(String(500), nullable=True)

    # Catalog Management
    verified = db.Column(Boolean, default=False, nullable=False)
    source = db.Column(String(50), nullable=False, default="manual")
    external_id = db.Column(String(100), nullable=True)

    # Audit
    created_at = db.Column(TIMESTAMP, server_default=func.now(), nullable=False)

    updated_at = db.Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    garage_parts = db.relationship("GaragePart", back_populates="part", cascade="all, delete-orphan")

# GaragePart table
class GaragePart(db.Model):
    __tablename__ = "garage_parts"

    id = db.Column(Integer, primary_key=True)
    garage_id = db.Column(Integer, ForeignKey('garages.id', ondelete='CASCADE'))
    part_id = db.Column(Integer, ForeignKey('parts.id', ondelete='CASCADE'))
    car_model_id = db.Column(Integer, ForeignKey('car_models.id', ondelete='CASCADE'))
    car_sub_model_id = db.Column(Integer, ForeignKey('car_sub_models.id', ondelete='SET NULL'), nullable=True)
    year = db.Column(Integer)
    price = db.Column(DECIMAL(10, 2))
    cost_price = db.Column(DECIMAL(10, 2), nullable=True)
    quantity = db.Column(Integer)
    from_year = db.Column(Integer)
    to_year = db.Column(Integer)
    is_active = db.Column(Boolean, default=True, nullable=False)
    # "new" | "oem" | "used" | "refurbished"
    condition  = db.Column(String(20), nullable=True, default="new")
    delivery_available = db.Column(Boolean, default=False)
    installation_available = db.Column(Boolean, default=False)
    # Optional service prices (None = "contact us for price")
    delivery_price     = db.Column(DECIMAL(10, 2), nullable=True)
    installation_price = db.Column(DECIMAL(10, 2), nullable=True)

    garage = db.relationship('Garage', back_populates='garage_parts')
    part = db.relationship('Part', back_populates='garage_parts')
    car_model = db.relationship('CarModel', back_populates='garage_parts')
    car_sub_model = db.relationship('CarSubModel', back_populates='garage_parts')
    order_items = db.relationship("OrderItem", back_populates='garage_parts')
    compatible_cars = db.relationship('GaragePartCompatibleCar',back_populates='garage_part',cascade="all, delete-orphan")

class SavedPart(db.Model):
    """Customer bookmarks a garage_part (wishlist / saved parts)."""
    __tablename__ = "saved_parts"
 
    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    garage_part_id = db.Column(Integer, ForeignKey('garage_parts.id', ondelete='CASCADE'), nullable=False)
    saved_at = db.Column(TIMESTAMP, server_default=func.now(), nullable=False)
 
    __table_args__ = (
        db.UniqueConstraint('user_id', 'garage_part_id', name='uq_saved_part_user_gp'),
    )
 
    user = db.relationship('User', backref=db.backref('saved_parts', lazy='dynamic'))
    garage_part = db.relationship('GaragePart', backref=db.backref('saved_by', lazy='dynamic'))