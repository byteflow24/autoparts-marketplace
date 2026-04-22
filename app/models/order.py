from .. import db
from sqlalchemy import Integer, String, ForeignKey, Boolean, DECIMAL, TIMESTAMP, func, Date, Text, text

"""
Order Models

Represents customer orders.

Includes:
- Order (main order)
- OrderItem (individual items)

Handles relationships between:
- customer
- garage
- parts
"""

# Order table
class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    garage_id = db.Column(Integer, ForeignKey('garages.id', ondelete='CASCADE'))
    total_price = db.Column(DECIMAL(10, 2))
    status = db.Column(String(20))

    user = db.relationship('User', back_populates='orders')
    garage = db.relationship('Garage', back_populates='orders')
    order_items = db.relationship('OrderItem', back_populates='orders', cascade="all, delete-orphan")

# OrderItem table
class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(Integer, primary_key=True)
    order_id = db.Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'))
    garage_part_id = db.Column(Integer, ForeignKey('garage_parts.id', ondelete='CASCADE'))
    quantity = db.Column(Integer)
    price = db.Column(DECIMAL(10, 2))
    service_option = db.Column(String(20), default="none")

    orders = db.relationship('Order', back_populates='order_items')
    garage_parts = db.relationship("GaragePart", back_populates='order_items')