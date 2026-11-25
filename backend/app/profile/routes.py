from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.car import UserCar, CarMake, CarModel, CarSubModel
from app import db
from app.vehicles.services import decode_vin

"""
Profile Routes

Endpoints:
  GET    /profile/me                    → current user info + saved cars
  PATCH  /profile/me                    → update name / phone
  GET    /profile/cars                  → list user's saved cars
  POST   /profile/cars                  → add a car
  DELETE /profile/cars/<id>             → remove a car
  PATCH  /profile/cars/<id>/set-primary → mark car as primary
"""

profile_bp = Blueprint("profile", __name__, url_prefix="/profile")


def _car_dict(uc: UserCar) -> dict:
    """Serialize a UserCar with its make/model names."""
    return {
        "id":         uc.id,
        "year":       uc.year,
        "nickname":   uc.nickname,
        "is_primary": uc.is_primary,
        "car_model": {
            "id":   uc.car_model.id,
            "name": uc.car_model.name,
        },
        "car_make": {
            "id":   uc.car_model.make.id,
            "name": uc.car_model.make.name,
        },
    }


# ---------------------------------------------------
# GET /profile/me
# Returns user info + list of saved cars
# ---------------------------------------------------
@profile_bp.route("/me", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    cars = (
        UserCar.query
        .filter_by(user_id=user_id)
        .join(CarModel)
        .join(CarMake)
        .order_by(UserCar.is_primary.desc(), UserCar.id.asc())
        .all()
    )

    return jsonify({
        "id":           user.id,
        "name":         user.name,
        "email":        user.email,
        "country_code": user.country_code,
        "phone":        user.phone,
        "role":         user.role,
        "cars":         [_car_dict(c) for c in cars],
    }), 200


# ---------------------------------------------------
# PATCH /profile/me
# Update name and/or phone
# Body: { name?, phone?, country_code? }
# ---------------------------------------------------
@profile_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    name         = (data.get("name") or "").strip()
    phone        = (data.get("phone") or "").strip() or None
    country_code = (data.get("country_code") or "").strip() or None

    if name:
        if len(name) < 3:
            return jsonify({"error": "Name must be at least 3 characters."}), 422
        user.name = name

    if phone is not None:
        user.phone = phone
    if country_code is not None:
        user.country_code = country_code

    db.session.commit()

    return jsonify({
        "message": "Profile updated.",
        "user": {
            "id":           user.id,
            "name":         user.name,
            "email":        user.email,
            "country_code": user.country_code,
            "phone":        user.phone,
        }
    }), 200


# ---------------------------------------------------
# GET /profile/cars
# List all saved cars for current user
# ---------------------------------------------------
@profile_bp.route("/cars", methods=["GET"])
@jwt_required()
def list_cars():
    user_id = int(get_jwt_identity())

    cars = (
        UserCar.query
        .filter_by(user_id=user_id)
        .join(CarModel)
        .join(CarMake)
        .order_by(UserCar.is_primary.desc(), UserCar.id.asc())
        .all()
    )

    return jsonify([_car_dict(c) for c in cars]), 200


# ---------------------------------------------------
# POST /profile/cars
# Add a car to the user's garage
# Body: { car_model_id, year, nickname?, is_primary? }
# ---------------------------------------------------
@profile_bp.route("/cars", methods=["POST"])
@jwt_required()
def add_car():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    car_model_id = data.get("car_model_id")
    car_sub_model_id = data.get("car_sub_model_id")
    year         = data.get("year")
    nickname     = (data.get("nickname") or "").strip() or None
    is_primary   = bool(data.get("is_primary", False))

    errors = {}
    if not car_model_id:
        errors["car_model_id"] = "Car model is required."
    if not year:
        errors["year"] = "Year is required."
    elif not (1900 <= int(year) <= 2100):
        errors["year"] = "Enter a valid year."
    if errors:
        return jsonify({"errors": errors}), 422

    # Verify the car model exists
    car_model = CarModel.query.get(car_model_id)
    if not car_model:
        return jsonify({"error": "Car model not found."}), 404

    if car_sub_model_id:
        sub_model = CarSubModel.query.get(car_sub_model_id)
        if not sub_model or sub_model.model_id != int(car_model_id):
            return jsonify({"error": "Invalid sub-model for the selected car model."}), 422
    else:
        car_sub_model_id = None

    # Prevent duplicates (same model + year)
    existing = UserCar.query.filter_by(
        user_id=user_id,
        car_model_id=car_model_id,
        car_sub_model_id=car_sub_model_id,
        year=int(year)
    ).first()
    if existing:
        return jsonify({"error": "This car is already saved to your profile."}), 409

    # If setting as primary, clear existing primary first
    if is_primary:
        UserCar.query.filter_by(user_id=user_id, is_primary=True).update({"is_primary": False})

    # If this is the user's first car, auto-set as primary
    car_count = UserCar.query.filter_by(user_id=user_id).count()
    if car_count == 0:
        is_primary = True

    new_car = UserCar(
        user_id=user_id,
        car_model_id=int(car_model_id),
        car_sub_model_id=car_sub_model_id,
        year=int(year),
        nickname=nickname,
        is_primary=is_primary,
    )
    db.session.add(new_car)
    db.session.commit()

    return jsonify({
        "message": "Car added successfully.",
        "car": _car_dict(new_car),
    }), 201


# ---------------------------------------------------
# DELETE /profile/cars/<id>
# Remove a saved car
# ---------------------------------------------------
@profile_bp.route("/cars/<int:car_id>", methods=["DELETE"])
@jwt_required()
def delete_car(car_id):
    user_id = int(get_jwt_identity())

    uc = UserCar.query.filter_by(id=car_id, user_id=user_id).first()
    if not uc:
        return jsonify({"error": "Car not found."}), 404

    was_primary = uc.is_primary
    db.session.delete(uc)
    db.session.commit()

    # If deleted car was primary, auto-promote the next one
    if was_primary:
        next_car = UserCar.query.filter_by(user_id=user_id).order_by(UserCar.id.asc()).first()
        if next_car:
            next_car.is_primary = True
            db.session.commit()

    return jsonify({"message": "Car removed from your profile."}), 200


# ---------------------------------------------------
# PATCH /profile/cars/<id>/set-primary
# Mark a car as the user's primary/default car
# ---------------------------------------------------
@profile_bp.route("/cars/<int:car_id>/set-primary", methods=["PATCH"])
@jwt_required()
def set_primary_car(car_id):
    user_id = int(get_jwt_identity())

    uc = UserCar.query.filter_by(id=car_id, user_id=user_id).first()
    if not uc:
        return jsonify({"error": "Car not found."}), 404

    # Clear existing primary
    UserCar.query.filter_by(user_id=user_id, is_primary=True).update({"is_primary": False})

    uc.is_primary = True
    db.session.commit()

    return jsonify({
        "message": f"{uc.car_model.make.name} {uc.car_model.name} set as your primary car.",
        "car": _car_dict(uc),
    }), 200

# ---------------------------------------------------
# GET /profile/vin/<vin>
# Decode a VIN and return the results
# ---------------------------------------------------
@profile_bp.route("/vin/<vin>", methods=["GET"])
def decode_vin_route(vin):
    result = decode_vin(vin.strip())
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result), 200