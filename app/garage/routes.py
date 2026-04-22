from flask import Blueprint, flash, redirect, render_template, request, jsonify, url_for
from flask_login import current_user, login_required
from app.garage.services import (
    create_garage as create_garage_service,
    update_garage as update_garage_service,
    get_garage_by_id,
    get_garage_dashboard,
    get_garage_parts
    )

"""
Garage Routes

Handles all garage-facing pages.

Responsibilities:
- Garage profile creation & editing
- Dashboard view (inventory, stats, alerts)
- Viewing garage-specific data (parts, orders)

Accessible only by users with 'garage' role.
"""

garage_bp = Blueprint('garage', __name__, url_prefix='/garage')

# ---------------------------------------------------
# ✅ Create Garage
# ---------------------------------------------------
@garage_bp.route("/create", methods=["POST"])
def create_garage():
    data = request.get_json()

    try:
        garage = create_garage_service(
            user_id=data.get("user_id"),
            garage_name=data.get("garage_name"),
            CR_number=data.get("CR_number"),
            location=data.get("location"),
            national_address=data.get("national_address"),
            specialization=data.get("specialization")
        )

        return jsonify({
            "id": garage.id,
            "garage_name": garage.garage_name,
            "message": "Garage created successfully"
        }), 201
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
# ---------------------------------------------------
# ✅ Update Garage
# ---------------------------------------------------
@garage_bp.route("/update/<int:garage_id>", methods=["PUT"])
def update_garage(garage_id):
    data = request.get_json()

    try:
        garage = update_garage_service(
            garage_id,
            garage_name=data.get("garage_name"),
            location=data.get("location"),
            national_address=data.get("national_address"),
            specialization=data.get("specialization")
        )

        return jsonify({
            "id": garage.id,
            "message": "Garage updated successfully"
        })
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    
# ---------------------------------------------------
# ✅ Get Garage Profile
# ---------------------------------------------------
@garage_bp.route("/<int:garage_id>", methods=["GET"])
def get_garage(garage_id):
    try:
        garage = get_garage_by_id(garage_id)

        return jsonify({
            "id": garage.id,
            "garage_name": garage.garage_name,
            "CR_number": garage.CR_number,
            "location": garage.location,
            "national_address": garage.national_address,
            "specialization": garage.specialization
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    
# ---------------------------------------------------
# ✅ Garage Dashboard
# ---------------------------------------------------
# This is the main page shown after a garage user logs in.
# It displays basic garage info and inventory summary.
@garage_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    # Prevent non-garage users from accessing garage area
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    # Make sure the logged-in garage user has a garage profile
    if not current_user.garage:
        flash("Garage profile not found.", "warning")
        return redirect(url_for("main.home"))

    data = get_garage_dashboard(current_user.garage.id)

    return render_template("garage/dashboard.html", data=data)
    
# ---------------------------------------------------
# ✅ Get Garage Inventory (Shortcut)
# ---------------------------------------------------
# Shows all parts that belong to the logged-in garage.
@garage_bp.route("/inventory", methods=["GET"])
@login_required
def inventory():
    # Only garage users can access this page
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    # Make sure garage profile exists
    if not current_user.garage:
        flash("Garage profile not found.", "warning")
        return redirect(url_for("main.home"))

    parts = get_garage_parts(current_user.garage.id)

    return render_template("garage/inventory.html", parts=parts)

# ---------------------------------------------------
# ✅ Edit Garage Profile Page
# ---------------------------------------------------
# Allows the logged-in garage user to update
# their garage profile information.
@garage_bp.route("/profile/edit", methods=["GET", "POST"])
@login_required
def edit_profile():
    # Only garage users can access this page
    if current_user.role != "garage":
        flash("Access denied.", "danger")
        return redirect(url_for("main.home"))

    # Garage profile must exist
    if not current_user.garage:
        flash("Garage profile not found.", "warning")
        return redirect(url_for("main.home"))

    garage = current_user.garage

    if request.method == "POST":
        try:
            update_garage_service(
                garage.id,
                garage_name=request.form.get("garage_name"),
                location=request.form.get("location"),
                national_address=request.form.get("national_address"),
                specialization=request.form.get("specialization")
            )

            flash("Garage profile updated successfully.", "success")
            return redirect(url_for("garage.dashboard"))

        except ValueError as e:
            flash(str(e), "danger")
        except Exception:
            flash("Something went wrong while updating the profile.", "danger")

    return render_template("garage/edit_profile.html", garage=garage)