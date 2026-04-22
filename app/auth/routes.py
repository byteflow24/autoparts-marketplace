from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user

from app.auth.forms import ChooseRoleForm, CustomerRegisterForm, GarageRegisterForm, LoginForm
from app.auth.services import  create_customer_user, create_garage_user, authenticate_user

from sqlalchemy.exc import OperationalError

"""
Authentication Routes

This file handles all auth-related endpoints:
- choose registration type
- customer registration
- garage registration
- login
- logout

Routes should stay lightweight:
- validate request/form
- call service functions
- return redirect / render / flash message

Business logic should stay inside services.py
"""

# Auth blueprint groups all authentication routes
# under the /auth URL prefix.
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# temporary route just to test
@auth_bp.route("/test-auth")
def test_auth():
    return "Auth working"

# ---------------------------------------------------
# ✅ Choose registration type
# ---------------------------------------------------
@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    """
    This route is the first step of signup.
    The user chooses whether they want to register
    as a customer or as a garage.

    After selection:
    - customer -> redirect to customer registration
    - garage   -> redirect to garage registration
    """
    
    # If the user is already logged in,
    # they should not access registration again.
    if current_user.is_authenticated:
        return redirect(url_for("search.search_page"))
    
    form = ChooseRoleForm()
    if form.validate_on_submit():
        if form.role.data == "customer":
            return redirect(url_for("auth.register_customer"))
        elif form.role.data == "garage":
            return redirect(url_for("auth.register_garage"))
    
    return render_template("auth/register_choice.html", form=form)

# ---------------------------------------------------
# ✅ Customer registration route
# ---------------------------------------------------
@auth_bp.route("/register/customer", methods=["GET", "POST"])
def register_customer():
    """
    This route handles customer account creation.
    It only creates a User record with role = "customer".

    No garage profile is created here.
    """
    
    if current_user.is_authenticated:
        return redirect(url_for("search.search_page"))  # change this if needed

    form = CustomerRegisterForm()

    # If the submitted form is valid,
    # create the customer account through auth services.
    if form.validate_on_submit():
        create_customer_user(
            name=form.name.data,
            email=form.email.data,
            password=form.password.data,
            country_code=form.country_code.data,
            phone=form.phone.data
        )

        flash("Customer account created successfully. Please log in.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/register_customer.html", form=form)

# ---------------------------------------------------
# ✅ Garage registration route
# ---------------------------------------------------
@auth_bp.route("/register/garage", methods=["GET", "POST"])
def register_garage():
    """
    This route handles garage signup.
    It creates:
    - a User account with role = "garage"
    - a Garage profile linked to that user

    The actual creation logic is handled in services.py
    to keep the route clean.
    """
    
    if current_user.is_authenticated:
        return redirect(url_for("garage.dashboard"))  # change this if needed

    form = GarageRegisterForm()

    # If the submitted form is valid,
    # create both the user and the garage profile.
    if form.validate_on_submit():
        create_garage_user(
            name=form.name.data,
            email=form.email.data,
            password=form.password.data,
            country_code=form.country_code.data,
            phone=form.phone.data,
            garage_name=form.garage_name.data,
            cr_number=form.cr_number.data,
            national_address=form.national_address.data,
            specialization=form.specialization.data,
            location=form.location.data
        )

        flash("Garage account created successfully. Please log in.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/register_garage.html", form=form)

# ---------------------------------------------------
# ✅ Login Route
# ---------------------------------------------------
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))  # change this if needed

    form = LoginForm()
    """
    This route authenticates an existing user.

    If the email/password are correct:
    - log the user in using Flask-Login
    - redirect based on user role

    Example:
    - garage user -> garage dashboard
    - customer    -> search/home page
    """
    
    # Authenticate the user using the service layer
    # instead of placing login logic directly in the route.
    if form.validate_on_submit():
        try:
            user = authenticate_user(
                email=form.email.data,
                password=form.password.data
            )
        except OperationalError:
            flash("Database is not ready yet. Please initialize the database.", "danger")
            return render_template("auth/login.html", form=form)

        if not user:
            flash("Invalid email or password.", "danger")
            return render_template("auth/login.html", form=form)

        login_user(user)
        flash("Logged in successfully.", "success")

        if user.role == "garage":
            return redirect(url_for("garage.dashboard"))

        return redirect(url_for("main.home"))

    return render_template("auth/login.html", form=form)

# ---------------------------------------------------
# ✅ Logout Route
# ---------------------------------------------------
@auth_bp.route("/logout")
@login_required
def logout():
    """
    Ends the user session and redirects them
    back to the login page.
    """

    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login"))