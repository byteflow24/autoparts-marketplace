from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
    )

from app.auth.services import (
    create_customer_user,
    create_garage_user,
    authenticate_user
    )

from sqlalchemy.exc import OperationalError

"""
Authentication Routes
 
Endpoints:
  POST /auth/register/customer  → create customer account
  POST /auth/register/garage    → create garage account
  POST /auth/login              → returns access + refresh tokens
  POST /auth/refresh            → rotate access token using refresh token
  GET  /auth/me                 → return current user info (protected)
  POST /auth/logout             → client-side logout hint
 
Identity is carried in the JWT; every protected route uses @jwt_required().
"""

# Auth blueprint groups all authentication routes
# under the /auth URL prefix.
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# ---------------------------------------------------
# ✅ Register Customer
# POST /auth/register/customer
# Body: { name, email, password, confirm_password, country_code?, phone? }
# ---------------------------------------------------
@auth_bp.route("/register/customer", methods=["POST"])
def register_customer():
    """
    This route handles customer account creation.
    """

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request body must be JSON"
        }), 400

    errors = {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or ""
    country_code = (data.get("country_code") or "").strip() or None
    phone = (data.get("phone") or "").strip() or None

    if not name or len(name) < 3:
        errors["name"] = "Name must be at least 3 characters."
    if not email:
        errors["email"] = "Email is required."
    if not password or len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    if password != confirm:
        errors["confirm_password"] = "Passwords do not match."
 
    if errors:
        return jsonify({"errors": errors}), 422

    try:
        user = create_customer_user(
            name=name,
            email=email,
            password=password,
            country_code=country_code,
            phone=phone
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 409   # 409 Conflict (duplicate email/name)
    
    return jsonify({
        "message": "Customer account created successfully.",
        "user": {
            "id":   user.id,
            "name": user.name,
            "role": user.role
        }
    }), 201

# ---------------------------------------------------
# ✅ Register Garage
# POST /auth/register/garage
# Body: { name, email, password, confirm_password,
#         garage_name, cr_number, national_address,
#         specialization, location?, country_code?, phone? }
# ---------------------------------------------------
@auth_bp.route("/register/garage", methods=["POST"])
def register_garage():
    """
    This route handles garage signup.
    It creates:
    - a User account with role = "garage"
    - a Garage profile linked to that user

    The actual creation logic is handled in services.py
    to keep the route clean.
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request body must be JSON"
        }), 400

    errors = {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or ""
    country_code = (data.get("country_code") or "").strip() or None
    phone = (data.get("phone") or "").strip() or None
    garage_name = (data.get("garage_name") or "").strip()
    cr_number = data.get("cr_number")
    national_address = (data.get("national_address") or "").strip()
    specialization = (data.get("specialization") or "").strip()
    location = (data.get("location") or "").strip() or None

    if not name or len(name) < 3:
        errors["name"] = "Name must be at least 3 characters."
    if not email:
        errors["email"] = "Email is required."
    if not password or len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    if password != confirm:
        errors["confirm_password"] = "Passwords do not match."
    if not garage_name or len(garage_name) < 2:
        errors["garage_name"] = "Garage name is required."
    if not cr_number:
        errors["cr_number"] = "CR number is required."
    if not national_address:
        errors["national_address"] = "National address is required."
    if not specialization:
        errors["specialization"] = "Specialization is required."
 
    if errors:
        return jsonify({"error": errors}), 422

    try:
        user = create_garage_user(
            name=name,
            email=email,
            password=password,
            country_code=country_code,
            phone=phone,
            garage_name=garage_name,
            cr_number=cr_number,
            national_address=national_address,
            specialization=specialization,
            location=location
        )

    except ValueError as e:
        return jsonify({
            "error": str(e)
        }), 409
    

    return jsonify({
        "message": "Garage account created successfully.",
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role
        }
    }), 201

# ---------------------------------------------------
# ✅ Login
# POST /auth/login
# Body: { email, password }
# Returns: access_token, refresh_token, user info
# ---------------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    """
    This route authenticates an existing user.

    If the email/password are correct:
    - log the user in using Flask-Login
    - redirect based on user role

    Example:
    - garage user -> garage dashboard
    - customer    -> search/home page
    """

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request body must be JSON"
        }), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400
    
    # Authenticate the user using the service layer
    # instead of placing login logic directly in the route.
    try:
        user = authenticate_user(email=email, password=password)
    except OperationalError:
        return jsonify({
            "error": "Database is not ready. Please initialze the DB"
        }), 503

    if not user:
        return jsonify({"error": "Invallid email or password."}), 401

    # Identity stored in JWT payload — use user id as string
    identity = str(user.id)

    # Additional claims let the frontend know the role without extra API calls
    additional_claims = {
        "role":       user.role,
        "name":       user.name,
        "garage_id":  user.garage.id if user.garage else None
    }

    access_token = create_access_token(identity=identity, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=identity)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "name":      user.name,
            "email":     user.email,
            "role":      user.role,
            "garage_id": user.garage.id if user.garage else None
        }
    }), 200

# ---------------------------------------------------
# ✅ Refresh Access Token
# POST /auth/refresh
# Header: Authorization: Bearer <refresh_token>
# ---------------------------------------------------
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims   = get_jwt()
 
    new_access_token = create_access_token(
        identity=identity,
        additional_claims={
            "role":      claims.get("role"),
            "name":      claims.get("name"),
            "garage_id": claims.get("garage_id")
        }
    )
    return jsonify({"access_token": new_access_token}), 200


# ---------------------------------------------------
# ✅ Get Current User
# GET /auth/me
# Header: Authorization: Bearer <access_token>
# ---------------------------------------------------
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    return jsonify({
        "id":        get_jwt_identity(),
        "name":      claims.get("name"),
        "role":      claims.get("role"),
        "garage_id": claims.get("garage_id")
    }), 200

# ---------------------------------------------------
# ✅ Logout (client-side)
# POST /auth/logout
# JWT is stateless — actual invalidation requires a
# token blocklist. For now we tell the client to
# discard tokens. Add blocklist in production.
# ---------------------------------------------------
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # TODO: add JWT blocklist (flask_jwt_extended supports it natively)
    # jti = get_jwt()["jti"]
    # blocklist.add(jti)
    return jsonify({
        "message": "Logged out successfully. Please discard your tokens."
        }), 200