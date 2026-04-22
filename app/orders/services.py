from app import db
from app.models.order import Order, OrderItem
from app.models.user import User
from app.models.garage import Garage
from app.models.part import GaragePart

"""
Orders Services (Business Logic)

Contains logic for order processing.

Responsibilities:
- Create new orders
- Calculate total price
- Handle order items
- Update order status
- Trigger notifications

Core of the marketplace transaction system.
"""

# ---------------------------------------------------
# ✅ Create order
# ---------------------------------------------------
def create_order(user_id, garage_id):
    """
    Create a new order.

    Rules:
    - User must exist
    -Garage must exist
    """

    user = User.query.get(user_id)
    if not user:
        raise ValueError("User not found")
    
    garage = Garage.query.get(garage_id)
    if not garage:
        raise ValueError("Garage not found")
    
    order = Order(
        user_id=user_id,
        garage_id=garage_id,
        status="pending",
        total_price=0
    )

    db.session.add(order)
    db.session.commit()

    return order

# ---------------------------------------------------
# ✅ add item to order
# ---------------------------------------------------
def add_item_to_order(order_id, garage_part_id, quantity, service_option):
    """
    Add item to an order.

    Rules:
    - Order must exist
    - Part must exist
    - Quantity must be available
    """

    order = Order.query.get(order_id)
    if not order:
        raise ValueError("Order not found")

    garage_part = GaragePart.query.get(garage_part_id)
    if not garage_part:
        raise ValueError("Garage part not found")

    if garage_part.quantity < quantity:
        raise ValueError("Not enough stock")

    # ✅ Create order item
    item = OrderItem(
        order_id=order_id,
        garage_part_id=garage_part_id,
        quantity=quantity,
        price=garage_part.price,
        service_option=service_option
    )

    # 🔻 Reduce stock
    garage_part.quantity -= quantity

    db.session.add(item)
    db.session.commit()

    return item

# ---------------------------------------------------
# ✅ Calculate Total Price
# ---------------------------------------------------
def calculate_order_total(order_id):
    """
    Calculate total price of an order
    """

    order = Order.query.get(order_id)
    if not order:
        raise ValueError("Order not found")
    
    total = 0

    for item in order.order_items:
        total += float(item.price) * item.quantity
    
    order.total_price = total
    db.session.commit()

    return total

# ---------------------------------------------------
# ✅ Update Order Status
# ---------------------------------------------------
def update_order_status(order_id, status):
    """
    Update order status.

    Example statuses:
    - pending
    - confirmed
    - shipped
    - completed
    - cancelled
    """

    order = Order.query.get(order_id)
    if not order:
        raise ValueError("Order not found")
    
    order.status = status
    db.session.commit()

    return order

# ---------------------------------------------------
# ✅ Get User Orders
# ---------------------------------------------------
def get_user_orders(user_id):
    """
    Get all orders for a customer.
    """

    return Order.query.filter_by(user_id=user_id).all()

# ---------------------------------------------------
# ✅ Get Garage Orders
# ---------------------------------------------------
def get_garage_orders(garage_id):
    """
    Get all orders for a garage.
    """

    return Order.query.filter_by(garage_id=garage_id).all()

# ---------------------------------------------------
# ✅ Get Order Details
# ---------------------------------------------------
def get_order_details(order_id):
    """
    Get full order with items.
    """

    order = Order.query.get(order_id)
    if not order:
        raise ValueError("Order not found")

    return order
