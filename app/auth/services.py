from app import db
from app.garage.services import create_garage
from app.models.user import User
from app.models.garage import Garage

"""

Authentication Services

This file contains the business logic for auth:
- creating customer users
- creating garage users
- authenticating users

Why this file exists:
Keep logic out of routes, so routes stay clean
and services remain reusable from other places later.
"""


def create_customer_user(name, email, password, country_code=None, phone=None):
    """
    Create customer account

    This service creates a normal customer user.
    
    It:
    creates a User record
    sets hashed password
    assigns role = "customer"
    
    It does NOT create a garage profile.
    """
    
    user = User(
        name=name,
        email=email,
        role="customer",
        country_code=country_code,
        phone=phone
    )

    # Store password as a hash, not plain text,
    # for security reasons.
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return user

def create_garage_user(
    name,
    email,
    password,
    garage_name,
    cr_number,
    national_address,
    specialization,
    location=None,
    country_code=None,
    phone=None
):
    """
    Create garage account

    This service creates:
    1. a User account with role = "garage"
    2. a Garage profile linked to that user

    This is used during garage registration.
    #
    Note:
    Garage creation logic can be delegated to garage services
    to avoid duplicating validation rules.
    """
    
    # 1. Create user
    user = User(
        name=name,
        email=email,
        role="garage",
        country_code=country_code,
        phone=phone
    )
    user.set_password(password)

    db.session.add(user)
    # Flush sends the User insert to the database session
    # without committing yet, so we can get user.id
    # and use it to create the linked Garage record.
    db.session.flush() # get user.id without commit

    # 2. Use garage service (REUSE logic ✅)
    # Reuse garage service to keep garage validation
    # and creation logic in one place only.
    garage = create_garage(
        user_id=user.id,
        garage_name=garage_name,
        CR_number=cr_number,
        location=location,
        national_address=national_address,
        specialization=specialization
    )

    db.session.add(garage)
    # db.session.commit()

    return user


def authenticate_user(email, password):
    """
    Authenticate existing user

    This service checks:
    - does the email exist?
    - does the password match?

    Returns:
    - user object if credentials are correct
    - None if login fails
    """
    
    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        return user

    return None