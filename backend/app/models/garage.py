from .. import db
from sqlalchemy import Integer, String, ForeignKey, Boolean, DECIMAL, TIMESTAMP, func, Date, Text, text

"""
Garage Model

Represents garage profiles.

Fields:
- garage name, CR number, location
- specialization (electric, mechanical, etc.)

Linked to a user (one-to-one relationship).
"""

# Garage table
class Garage(db.Model):
    __tablename__ = "garages"

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    garage_name = db.Column(String(255))
    CR_number = db.Column(Integer, unique=True)
    location = db.Column(String(255), nullable=True)
    national_address = db.Column(String(255))
    specialization = db.Column(String(255))

    user = db.relationship('User', back_populates='garage')
    garage_parts = db.relationship('GaragePart', back_populates='garage')
    orders = db.relationship('Order', back_populates='garage')
    delivery_zones = db.relationship(
        'GarageDeliveryZone',
        back_populates='garage',
        cascade='all, delete-orphan',
        lazy='select',
    )


class GarageDeliveryZone(db.Model):
    __tablename__ = "garage_delivery_zones"

    id        = db.Column(Integer, primary_key=True)
    garage_id = db.Column(Integer, ForeignKey('garages.id', ondelete='CASCADE'), nullable=False)
    city      = db.Column(String(100), nullable=False)
    price     = db.Column(DECIMAL(10, 2), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('garage_id', 'city', name='uq_garage_delivery_zone'),
    )

    garage = db.relationship('Garage', back_populates='delivery_zones')