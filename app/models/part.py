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
    name = db.Column(String(100))
    part_number = db.Column(String(50), nullable=True)
    brand = db.Column(String(20), nullable=True)
    category = db.Column(String(20), nullable=True)

    garage_parts = db.relationship('GaragePart', back_populates='part')

# GaragePart table
class GaragePart(db.Model):
    __tablename__ = "garage_parts"

    id = db.Column(Integer, primary_key=True)
    garage_id = db.Column(Integer, ForeignKey('garages.id', ondelete='CASCADE'))
    part_id = db.Column(Integer, ForeignKey('parts.id', ondelete='CASCADE'))
    car_model_id = db.Column(Integer, ForeignKey('car_models.id', ondelete='CASCADE'))
    price = db.Column(DECIMAL(10, 2))
    quantity = db.Column(Integer)
    from_year = db.Column(Integer)
    to_year = db.Column(Integer)
    delivery_available = db.Column(Boolean, default=False)
    installation_available = db.Column(Boolean, default=False)
    pickup_available = db.Column(Boolean, default=False)

    garage = db.relationship('Garage', back_populates='garage_parts')
    part = db.relationship('Part', back_populates='garage_parts')
    car_model = db.relationship('CarModel', back_populates='garage_parts')
    order_items = db.relationship("OrderItem", back_populates='garage_parts')