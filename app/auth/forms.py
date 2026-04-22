from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, IntegerField
from wtforms.validators import DataRequired, Email, Length, EqualTo, NumberRange, Optional, ValidationError

from app.models.user import User
from app.models.garage import Garage

"""
Authentication Forms

This file contains all Flask-WTF forms related to auth:
- choosing account type
- customer registration
- garage registration
- login

Why this file exists:
Keep validation rules and input fields separated from routes,
so routes stay clean and only handle requests/responses.
"""

# ---------------------------------------------------
# ✅ Choose account type before registration
# ---------------------------------------------------
class ChooseRoleForm(FlaskForm):
    """
    This form is used on the first registration step.
    The user selects whether they want to register as:
    - customer
    - garage

    Based on this selection, we redirect them
    to the correct registration page.
    """

    role = SelectField(
        "Register As",
        choices=[
            ("customer", "Customer"),
            ("garage", "Garage")
        ],
        validators=[DataRequired()])
    submit = SubmitField("Continue")

# ---------------------------------------------------
# ✅ Customer registration form
# ---------------------------------------------------
class CustomerRegisterForm(FlaskForm):
    """
    This form collects the basic user information needed
    to create a customer account.
    
    It does NOT create a garage profile.
    It only creates a User with role = "customer".
    """

    name = StringField("Name", validators=[DataRequired(), Length(min=3, max=50)])
    email = StringField("Email", validators=[DataRequired(), Email(), Length(max=100)])
    password = PasswordField("Password", validators=[DataRequired(), Length(min=6, max=255)])
    confirm_password = PasswordField(
        "Confirm Password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match")]
    )
    country_code = StringField("Country Code", validators=[Optional(), Length(max=4)])
    phone = StringField("Phone", validators=[Optional(), Length(max=20)])
    submit = SubmitField("Register as Customer")

    # Check that the username is not already used
    # before creating a new account.
    def validate_name(self, field):
        existing_user = User.query.filter_by(name=field.data).first()
        if existing_user:
            raise ValidationError("This username is already taken.")
        
    # Check that the email is unique
    # so two users cannot register with the same email.
    def validate_email(self, field):
        existing_user = User.query.filter_by(email=field.data).first()
        if existing_user:
            raise ValidationError("This email is already registered.")

# ---------------------------------------------------
# ✅ Garage registration form
# ---------------------------------------------------
class GarageRegisterForm(FlaskForm):
    """
    This form is used when the user chooses to register
    as a garage owner.

    It collects:
    - user account information
    - garage business information

    This allows us to create:
    1. User with role = "garage"
    2. Garage profile linked to that user
    """

    name = StringField("Owner Name", validators=[DataRequired(), Length(min=3, max=50)])
    email = StringField("Email", validators=[DataRequired(), Email(), Length(max=100)])
    password = PasswordField("Password", validators=[DataRequired(), Length(min=6, max=255)])
    confirm_password = PasswordField(
        "Confirm Password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match")]
    )
    country_code = StringField("Country Code", validators=[Optional(), Length(max=4)])
    phone = StringField("Phone", validators=[Optional(), Length(max=20)])

    garage_name = StringField("Garage Name", validators=[DataRequired(), Length(min=2, max=255)])
    cr_number = IntegerField("CR Number", validators=[DataRequired(), NumberRange(min=1)])
    national_address = StringField("National Address", validators=[DataRequired(), Length(max=255)])
    specialization = StringField("Specialization", validators=[DataRequired(), Length(max=255)])
    location = StringField("Location", validators=[Optional(), Length(max=255)])

    submit = SubmitField("Register as Garage")

    def validate_name(self, field):
        existing_user = User.query.filter_by(name=field.data).first()
        if existing_user:
            raise ValidationError("This username is already taken.")

    def validate_email(self, field):
        existing_user = User.query.filter_by(email=field.data).first()
        if existing_user:
            raise ValidationError("This email is already registered.")

    # CR number must be unique because each garage
    # should have a distinct business registration number.
    def validate_cr_number(self, field):
        existing_garage = Garage.query.filter_by(CR_number=field.data).first()
        if existing_garage:
            raise ValidationError("This CR number is already registered.")

# ---------------------------------------------------
# ✅ Login form
# ---------------------------------------------------
class LoginForm(FlaskForm):
    """
    This form is used to authenticate existing users
    using email + password.
    """
    
    email = StringField("Email", validators=[DataRequired(), Email(), Length(max=100)])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Login")