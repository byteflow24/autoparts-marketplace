from .. import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Integer, String, ForeignKey, Boolean, DECIMAL, TIMESTAMP, func, Date, Text, text
from flask_login import UserMixin


"""
User Model

Represents system users.

Fields:
- id, name, email, password
- role (garage / customer)

Used for authentication and role-based access.
"""

# User table
class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(50), unique=True)
    email = db.Column(String(100), unique=True)
    password = db.Column(String(255))
    country_code = db.Column(String(4), nullable=True)
    phone = db.Column(String(20), nullable=True)
    role = db.Column(String(10))

    garage = db.relationship('Garage', back_populates='user', cascade="all, delete-orphan", uselist=False)
    orders = db.relationship('Order', back_populates='user', cascade="all, delete-orphan")
    cars = db.relationship('UserCar', back_populates='user', cascade="all, delete-orphan")

    def set_password(self, raw_password):
        self.password = generate_password_hash(raw_password, method= "pbkdf2:sha256", salt_length=16)

    def check_password(self, raw_password):
        return check_password_hash(self.password, raw_password)