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