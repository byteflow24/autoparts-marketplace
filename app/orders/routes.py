from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash, session
from flask_login import login_required, current_user
from collections import defaultdict
from app.orders.services import  (
    create_order,
    add_item_to_order,
    calculate_order_total,
    update_order_status,
    get_user_orders,
    get_garage_orders,
    get_order_details
)
from app.models.part import GaragePart
from app import db

"""
Orders Routes

Handles order-related endpoints.

Responsibilities:
- Create order (checkout)
- View orders (customer & garage)
- Update order status (pending, delivered, etc.)

Acts as the bridge between customers and garages.
"""

orders_bp = Blueprint('orders', __name__, url_prefix='/orders')

# ---------------------------------------------------
# ✅ Add item to cart (session cart)
# ---------------------------------------------------
@orders_bp.route("/cart/add", methods=["POST"])
@login_required
def add_to_cart_page():
    garage_part_id = request.form.get("garage_part_id", type=int)
    garage_id = request.form.get("garage_id", type=int)
    part_name = request.form.get("part_name")
    part_number = request.form.get("part_number")
    garage_name = request.form.get("garage_name")
    price = request.form.get("price", type=float)
    quantity = request.form.get("quantity", type=int)
    service_option = request.form.get("service_option", "none")

    garage_part = GaragePart.query.get(garage_part_id)
    if not garage_part:
        flash("Part not found.", "danger")
        return redirect(url_for("search.search_page"))

    if quantity is None or quantity < 1:
        flash("Invalid quantity.", "danger")
        return redirect(url_for("search.search_page"))

    if quantity > garage_part.quantity:
        flash("Requested quantity exceeds available stock.", "danger")
        return redirect(url_for("search.search_page"))

    if service_option == "delivery" and not garage_part.delivery_available:
        flash("Delivery is not available for this item.", "danger")
        return redirect(url_for("search.search_page"))

    if service_option == "installation" and not garage_part.installation_available:
        flash("Installation is not available for this item.", "danger")
        return redirect(url_for("search.search_page"))
    
    if service_option == "pickup" and not garage_part.pickup_available:
        flash("Pickup is not available for this item.", "danger")
        return redirect(url_for("search.search_page"))

    cart = session.get("cart", [])

    existing_item = None
    for item in cart:
        if (
            item["garage_part_id"] == garage_part_id and
            item["service_option"] == service_option
        ):
            existing_item = item
            break

    if existing_item:
        new_quantity = existing_item["quantity"] + quantity
        if new_quantity > garage_part.quantity:
            flash("Total quantity in cart exceeds available stock.", "danger")
            return redirect(url_for("search.search_page"))
        existing_item["quantity"] = new_quantity
    else:
        cart.append({
            "garage_part_id": garage_part_id,
            "garage_id": garage_id,
            "part_name": part_name,
            "part_number": part_number,
            "garage_name": garage_name,
            "price": price,
            "quantity": quantity,
            "service_option": service_option
        })

    session["cart"] = cart
    flash("Item added to cart.", "success")
    return redirect(url_for("orders.view_cart"))

# ---------------------------------------------------
# ✅ View cart page
# ---------------------------------------------------
@orders_bp.route("/cart", methods=["GET"])
@login_required
def view_cart():
    cart = session.get("cart", [])
    total = round(sum(item["price"] * item["quantity"] for item in cart), 2)

    return render_template("orders/cart.html", cart=cart, total=total)

# ---------------------------------------------------
# ✅ Checkout review page (no DB writes)
# ---------------------------------------------------
@orders_bp.route("/checkout", methods=["GET"])
@login_required
def checkout_review_page():
    cart = session.get("cart", [])
    if not cart:
        flash("Your cart is empty.", "warning")
        return redirect(url_for("orders.view_cart"))

    # Validate cart against current DB state (stock + service availability)
    for cart_item in cart:
        garage_part = GaragePart.query.get(cart_item["garage_part_id"])
        if not garage_part:
            flash(f"Part no longer exists: {cart_item.get('part_name', 'Unknown')}", "danger")
            return redirect(url_for("orders.view_cart"))

        if cart_item["quantity"] > garage_part.quantity:
            flash(
                f"Not enough stock for {cart_item.get('part_name', 'this item')}. Available: {garage_part.quantity}",
                "danger",
            )
            return redirect(url_for("orders.view_cart"))

        if cart_item["service_option"] == "pickup" and not garage_part.pickup_available:
            flash(f"Pickup is not available for {cart_item.get('part_name', 'this item')}", "danger")
            return redirect(url_for("orders.view_cart"))

        if cart_item["service_option"] == "delivery" and not garage_part.delivery_available:
            flash(f"Delivery is not available for {cart_item.get('part_name', 'this item')}", "danger")
            return redirect(url_for("orders.view_cart"))

        if cart_item["service_option"] == "installation" and not garage_part.installation_available:
            flash(f"Installation is not available for {cart_item.get('part_name', 'this item')}", "danger")
            return redirect(url_for("orders.view_cart"))

    # Compute totals and group for display
    grouped_items = defaultdict(list)
    for item in cart:
        grouped_items[item["garage_id"]].append(item)

    grand_total = round(sum(item["price"] * item["quantity"] for item in cart), 2)
    return render_template(
        "orders/checkout_review.html",
        cart=cart,
        grouped_items=grouped_items,
        total=grand_total,
    )

# ---------------------------------------------------
# ✅ Payment method page (no DB writes)
# ---------------------------------------------------
@orders_bp.route("/payment", methods=["GET", "POST"])
@login_required
def payment_page():
    cart = session.get("cart", [])
    if not cart:
        flash("Your cart is empty.", "warning")
        return redirect(url_for("orders.view_cart"))

    if request.method == "POST":
        payment_method = request.form.get("payment_method")
        if payment_method not in {"cod"}:
            flash("Please select a valid payment method.", "danger")
            return redirect(url_for("orders.payment_page"))

        session["checkout_payment_method"] = payment_method
        return redirect(url_for("orders.confirm_order_page"))

    total = round(sum(item["price"] * item["quantity"] for item in cart), 2)
    selected_method = session.get("checkout_payment_method", "cod")
    return render_template("orders/payment.html", total=total, selected_method=selected_method)

# ---------------------------------------------------
# ✅ Confirm + place order (DB writes happen here)
# ---------------------------------------------------
@orders_bp.route("/confirm", methods=["GET", "POST"])
@login_required
def confirm_order_page():
    cart = session.get("cart", [])
    if not cart:
        flash("Your cart is empty.", "warning")
        return redirect(url_for("orders.view_cart"))

    payment_method = session.get("checkout_payment_method")
    if payment_method not in {"cod"}:
        flash("Please select a payment method before placing the order.", "warning")
        return redirect(url_for("orders.payment_page"))

    if request.method == "GET":
        total = round(sum(item["price"] * item["quantity"] for item in cart), 2)
        return render_template("orders/confirm.html", cart=cart, total=total, payment_method=payment_method)

    # POST: place orders (one per garage)
    grouped_items = defaultdict(list)
    for item in cart:
        grouped_items[item["garage_id"]].append(item)

    created_orders = []

    try:
        for garage_id, items in grouped_items.items():
            order = create_order(
                user_id=current_user.id,
                garage_id=garage_id
            )

            for cart_item in items:
                garage_part = GaragePart.query.get(cart_item["garage_part_id"])
                if not garage_part:
                    raise ValueError(f"Part no longer exists: {cart_item['part_name']}")

                if cart_item["quantity"] > garage_part.quantity:
                    raise ValueError(
                        f"Not enough stock for {cart_item['part_name']}. Available: {garage_part.quantity}"
                    )

                if cart_item["service_option"] == "pickup" and not garage_part.pickup_available:
                    raise ValueError(f"Pickup is not available for {cart_item['part_name']}")

                if cart_item["service_option"] == "delivery" and not garage_part.delivery_available:
                    raise ValueError(f"Delivery is not available for {cart_item['part_name']}")

                if cart_item["service_option"] == "installation" and not garage_part.installation_available:
                    raise ValueError(f"Installation is not available for {cart_item['part_name']}")

                add_item_to_order(
                    order_id=order.id,
                    garage_part_id=cart_item["garage_part_id"],
                    quantity=cart_item["quantity"],
                    service_option=cart_item["service_option"],
                )

            calculate_order_total(order.id)
            created_orders.append(order.id)

        session["cart"] = []
        session.pop("checkout_payment_method", None)

        flash(
            f"Order placed successfully ({'Cash on Delivery' if payment_method == 'cod' else payment_method}). "
            f"Order IDs: {', '.join(map(str, created_orders))}",
            "success",
        )
        return redirect(url_for("orders.user_orders_page"))

    except ValueError as e:
        flash(str(e), "danger")
        return redirect(url_for("orders.view_cart"))

    except Exception as e:
        flash(f"Something went wrong while placing the order. {e}", "danger")
        return redirect(url_for("orders.view_cart"))

# ---------------------------------------------------
# ✅ Remove cart item
# ---------------------------------------------------
@orders_bp.route("/cart/remove/<int:index>", methods=["POST"])
@login_required
def remove_cart_item(index):
    cart = session.get("cart", [])

    if 0 <= index < len(cart):
        cart.pop(index)
        session["cart"] = cart
        flash("Item removed from cart.", "info")
    else:
        flash("Cart item not found.", "danger")

    return redirect(url_for("orders.view_cart"))

# ---------------------------------------------------
# ✅ Clear cart
# ---------------------------------------------------
@orders_bp.route("/cart/clear", methods=["POST"])
@login_required
def clear_cart():
    session["cart"] = []
    flash("Cart cleared.", "info")
    return redirect(url_for("orders.view_cart"))

# ---------------------------------------------------
# ✅ Checkout cart
# ---------------------------------------------------
# Converts session cart into real orders and order items.
# Creates one order per garage.
@orders_bp.route("/checkout", methods=["POST"])
@login_required
def checkout():
    # Backwards compatible: if something still POSTs to /checkout, just send user to review
    return redirect(url_for("orders.checkout_review_page"))

# ---------------------------------------------------
# ✅ Customer Orders Page
# ---------------------------------------------------
@orders_bp.route("/my-orders", methods=["GET"])
@login_required
def user_orders_page():
    orders = get_user_orders(current_user.id)
    return render_template("orders/my_orders.html", orders=orders)

# ---------------------------------------------------
# ✅ Order Details Page
# ---------------------------------------------------
@orders_bp.route("/page/<int:order_id>", methods=["GET"])
@login_required
def order_details_page(order_id):
    try:
        order = get_order_details(order_id)

        # Only allow owner to view their own order for now
        if order.user_id != current_user.id:
            flash("Access denied.", "danger")
            return redirect(url_for("main.home"))
        

        return render_template("orders/order_details.html", order=order)

    except ValueError as e:
        flash(str(e), "danger")
        return redirect(url_for("orders.user_orders_page"))

# ---------------------------------------------------
# ✅ Create Order
# ---------------------------------------------------
@orders_bp.route("/create", methods=["POST"])
def create_order_route():
    data = request.get_json()

    try:
        order = create_order(
            user_id=data.get("user_id"),
            garage_id=data.get("garage_id")
        )

        return jsonify({
            "order_id": order.id,
            "status": order.status
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# ✅ Add Item to Order
# ---------------------------------------------------
@orders_bp.route("/add-item", methods=["POST"])
def add_item_route():
    data = request.get_json()

    try:
        item = add_item_to_order(
            order_id=data.get("order_id"),
            garage_part_id=data.get("garage_part_id"),
            quantity=data.get("quantity")
        )

        return jsonify({
            "item_id": item.id,
            "message": "Item added successfully"
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# ✅ Calculate Order Total
# ---------------------------------------------------
@orders_bp.route("/<int:order_id>/total", methods=["GET"])
def calculate_total_route(order_id):
    try:
        total = calculate_order_total(order_id)

        return jsonify({
            "order_id": order_id,
            "total_price": total
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# ---------------------------------------------------
# ✅ Update Order Status
# ---------------------------------------------------
@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
def update_status_route(order_id):
    data = request.get_json()

    try:
        order = update_order_status(
            order_id=order_id,
            status=data.get("status")
        )

        return jsonify({
            "order_id": order.id,
            "new_status": order.status
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# ✅ Get Orders for User
# ---------------------------------------------------
@orders_bp.route("/user/<int:user_id>", methods=["GET"])
def user_orders_route(user_id):
    orders = get_user_orders(user_id)

    data = [
        {
            "order_id": o.id,
            "garage_id": o.garage_id,
            "total_price": float(o.total_price) if o.total_price else 0,
            "status": o.status
        }
        for o in orders
    ]

    return jsonify({
        "count": len(data),
        "orders": data
    })


# ---------------------------------------------------
# ✅ Get Orders for Garage
# ---------------------------------------------------
@orders_bp.route("/garage/<int:garage_id>", methods=["GET"])
def garage_orders_route(garage_id):
    orders = get_garage_orders(garage_id)

    data = [
        {
            "order_id": o.id,
            "user_id": o.user_id,
            "total_price": float(o.total_price) if o.total_price else 0,
            "status": o.status
        }
        for o in orders
    ]

    return jsonify({
        "count": len(data),
        "orders": data
    })


# ---------------------------------------------------
# ✅ Get Order Details
# ---------------------------------------------------
@orders_bp.route("/<int:order_id>", methods=["GET"])
def order_details_route(order_id):
    try:
        order = get_order_details(order_id)

        items = [
            {
                "item_id": item.id,
                "part_name": item.garage_part.part.name,
                "part_number": item.garage_part.part.part_number,
                "price": float(item.price),
                "quantity": item.quantity
            }
            for item in order.items
        ]

        return jsonify({
            "order_id": order.id,
            "user_id": order.user_id,
            "garage_id": order.garage_id,
            "status": order.status,
            "total_price": float(order.total_price) if order.total_price else 0,
            "items": items
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 404