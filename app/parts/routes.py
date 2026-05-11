from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.car import CarMake, CarModel
from app.parts.services import (
    create_part,
    add_part_to_garage,
    update_part,
    get_garage_inventory,
    delete_garage_part,
    edit_garage_part,
    toggle_garage_part_active
)

"""
Parts Routes

Handles HTTP requests for managing parts.

Responsibilities:
- Add new part (manual or part number)
- Edit existing part
- Delete part
- View parts list for a garage

Connected to GarageParts (inventory system).
"""

parts_bp = Blueprint('parts', __name__, url_prefix='/parts')

# ---------------------------------------------------
# ✅ Add Part Page
# ---------------------------------------------------
# HTML page for garage users to create a new part
# and add it to their garage inventory.
@parts_bp.route("/add", methods=["GET", "POST"])
@login_required
def add_part_page():
    # Only garage users can access this page
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    # Garage profile must exist
    if not current_user.garage:
        flash("Garage profile not found.", "warning")
        return redirect(url_for("main.home"))

    # Load dropdown data
    car_makes = CarMake.query.order_by(CarMake.name.asc()).all()
    car_models = CarModel.query.order_by(CarModel.name.asc()).all()

    if request.method == "POST":
        try:
            # Step 1: create or reuse global part
            part = create_part(
                part_number=request.form.get("part_number"),
                name=request.form.get("name"),
                brand=request.form.get("brand"),
                category=request.form.get("category")
            )

            # Step 2: link that part to the logged-in garage inventory
            add_part_to_garage(
                garage_id=current_user.garage.id,
                part_id=part.id,
                car_model_id=int(request.form.get("car_model_id")),
                price=float(request.form.get("price")),
                cost_price=float(request.form.get("cost_price")) if request.form.get("cost_price") else None,
                quantity=int(request.form.get("quantity")),
                from_year=int(request.form.get("from_year")) if request.form.get("from_year") else None,
                to_year=int(request.form.get("to_year")) if request.form.get("to_year") else None,
                delivery_available=True if request.form.get("delivery_available") == "on" else False,
                installation_available=True if request.form.get("installation_available") == "on" else False,
                pickup_available=True if request.form.get("pickup_available") == "on" else False
            )

            flash("Part added successfully.", "success")
            return redirect(url_for("garage.inventory"))

        except ValueError as e:
            flash(str(e), "danger")
        except Exception:
            flash("Something went wrong while adding the part.", "danger")

    return render_template(
        "parts/add_part.html",
        car_makes=car_makes,
        car_models=car_models
    )

# ---------------------------------------------------
# ✅ Create Part
# ---------------------------------------------------
@parts_bp.route("/create", methods=["POST"])
def create_part_route():
    data = request.get_json()

    part = create_part(
        part_number=data.get("part_number"),
        name=data.get("name"),
        brand=data.get("brand"),
        category=data.get("category")
    )

    return jsonify({
        "id": part.id,
        "part_number": part.part_number,
        "name": part.name
    }), 201


# ---------------------------------------------------
# ✅ Add Part to Garage
# ---------------------------------------------------
@parts_bp.route("/add-to-garage", methods=["POST"])
def add_part_to_garage_route():
    data = request.get_json()

    try:
        garage_part = add_part_to_garage(
            garage_id=data.get("garage_id"),
            part_id=data.get("part_id"),
            car_model_id=data.get("car_model_id"),
            price=data.get("price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            delivery_available=data.get("delivery_available", False),
            installation_available=data.get("installation_available", False),
            pickup_available=data.get("pickup_available", False)
        )

        return jsonify({
            "id": garage_part.id,
            "message": "Part added to garage successfully"
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# ✅ Update Garage Part
# ---------------------------------------------------
@parts_bp.route("/update/<int:garage_part_id>", methods=["PUT"])
def update_part_route(garage_part_id):
    data = request.get_json()

    try:
        updated = update_part(
            garage_part_id=garage_part_id,
            price=data.get("price"),
            quantity=data.get("quantity"),
            from_year=data.get("from_year"),
            to_year=data.get("to_year"),
            delivery_available=data.get("delivery_available"),
            installation_available=data.get("installation_available"),
            pickup_available=data.get("pickup_available")
        )

        return jsonify({
            "id": updated.id,
            "message": "Part updated successfully"
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ---------------------------------------------------
# ✅ Get Garage Inventory
# ---------------------------------------------------
@parts_bp.route("/garage/<int:garage_id>", methods=["GET"])
def get_inventory_route(garage_id):
    inventory = get_garage_inventory(garage_id)

    data = [
        {
            "garage_part_id": item.id,
            "part_name": item.part.name,
            "part_number": item.part.part_number,
            "price": float(item.price),
            "quantity": item.quantity
        }
        for item in inventory
    ]

    return jsonify({
        "count": len(data),
        "inventory": data
    })

# ---------------------------------------------------
# ✅ Delete Part from Inventory
# ---------------------------------------------------
@parts_bp.route("/garage-part/<int:garage_part_id>/delete", methods=["POST"])
@login_required
def delete_garage_part_route(garage_part_id):
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    try:
        delete_garage_part(
            garage_part_id=garage_part_id,
            garage_id=current_user.garage.id
        )

        flash("Part removed from inventory.", "success")

    except ValueError as e:
        flash(str(e), "danger")

    return redirect(url_for("garage.inventory"))


@parts_bp.route("/garage-part/<int:garage_part_id>/toggle-active", methods=["POST"])
@login_required
def toggle_garage_part_active_route(garage_part_id):
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    try:
        toggle_garage_part_active(
            garage_part_id=garage_part_id,
            garage_id=current_user.garage.id
        )
        flash("Listing status updated.", "success")
    except ValueError as e:
        flash(str(e), "danger")

    return redirect(url_for("garage.inventory"))

# ---------------------------------------------------
# ✅ Edit Part in Inventory Page
# ---------------------------------------------------
@parts_bp.route("/garage-part/<int:garage_part_id>/edit", methods=["GET", "POST"])
@login_required
def edit_garage_part_route(garage_part_id):
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    garage_part = get_garage_inventory(current_user.garage.id)
    garage_part = next((gp for gp in garage_part if gp.id == garage_part_id), None)

    if not garage_part:
        flash("Part not found in your inventory.", "warning")
        return redirect(url_for("garage.inventory"))

    if request.method == "POST":
        try:
            edit_garage_part(
                garage_part_id=garage_part_id,
                garage_id=current_user.garage.id,
                price=float(request.form.get("price")),
                cost_price=float(request.form.get("cost_price")) if request.form.get("cost_price") else None,
                quantity=int(request.form.get("quantity")),
                from_year=int(request.form.get("from_year")) if request.form.get("from_year") else None,
                to_year=int(request.form.get("to_year")) if request.form.get("to_year") else None,
                delivery_available=True if request.form.get("delivery_available") == "on" else False,
                installation_available=True if request.form.get("installation_available") == "on" else False,
                pickup_available=True if request.form.get("pickup_available") == "on" else False
            )

            flash("Part updated successfully.", "success")
            return redirect(url_for("garage.inventory"))

        except ValueError as e:
            flash(str(e), "danger")
        except Exception:
            flash("Something went wrong while updating the part.", "danger")

    return render_template(
        "parts/edit_part.html",
        garage_part=garage_part
    )