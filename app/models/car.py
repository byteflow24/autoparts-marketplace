from .. import db
from sqlalchemy import Integer, String, ForeignKey, Boolean, DECIMAL, TIMESTAMP, func, Date, Text, text

"""
Car Models

Defines car structure:

- CarMake (Tels, BMW, Cadillac)
- CarModel (Y, X5, Escalade)

Used for:
- Filtering parts
- Linking parts to compatible cars
"""

class CarMake(db.Model):
    __tablename__ = "car_makes"

    id = db.Column(Integer, primary_key=True)
    name = db.Column(String(100), unique=True, nullable=False)

    models = db.relationship('CarModel', back_populates='make', cascade="all, delete-orphan")


class CarModel(db.Model):
    __tablename__ = "car_models"

    id = db.Column(Integer, primary_key=True)
    make_id = db.Column(Integer, ForeignKey('car_makes.id', ondelete='CASCADE'))
    name = db.Column(String(100), nullable=False)

    make = db.relationship('CarMake', back_populates='models')
    garage_parts = db.relationship('GaragePart', back_populates='car_model')
    user_cars = db.relationship('UserCar', back_populates='car_model', cascade="all, delete-orphan")

class UserCar(db.Model):
    __tablename__ = "user_cars"

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    car_model_id = db.Column(Integer, ForeignKey('car_models.id', ondelete='CASCADE'))
    year = db.Column(Integer, nullable=False)
    nickname = db.Column(String(100), nullable=True)  # optional (e.g. "My Car")

    user = db.relationship('User', back_populates='cars')
    car_model = db.relationship('CarModel', back_populates='user_cars')
