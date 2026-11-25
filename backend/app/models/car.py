from .. import db
from sqlalchemy import Integer, String, ForeignKey, Boolean, UniqueConstraint

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
    nhtsa_make_id = db.Column(db.Integer, unique=True, nullable=False)
    name = db.Column(String(100), unique=True, nullable=False)

    models = db.relationship('CarModel', back_populates='make', cascade="all, delete-orphan")


class CarModel(db.Model):
    __tablename__ = "car_models"

    id = db.Column(Integer, primary_key=True)
    nhtsa_model_id = db.Column(db.Integer, unique=True, nullable=False)
    make_id = db.Column(Integer, ForeignKey('car_makes.id', ondelete='CASCADE'))
    name = db.Column(String(100), nullable=False)

    make = db.relationship('CarMake', back_populates='models')
    sub_models = db.relationship('CarSubModel', back_populates='car_model', cascade="all, delete-orphan")
    garage_parts = db.relationship('GaragePart', back_populates='car_model')
    user_cars = db.relationship('UserCar', back_populates='car_model', cascade="all, delete-orphan")
    compatible_parts = db.relationship('GaragePartCompatibleCar', back_populates='car_model', cascade="all, delete-orphan")

class CarSubModel(db.Model):
    __tablename__ = "car_sub_models"

    id = db.Column(Integer, primary_key=True)
    model_id = db.Column(Integer, ForeignKey('car_models.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(String(150), nullable=False)

    __table_args__ = (
        UniqueConstraint('model_id', 'name', name='uq_car_sub_models_model_name'),
    )

    car_model = db.relationship('CarModel', back_populates='sub_models')
    user_cars = db.relationship('UserCar', back_populates='car_sub_model')
    garage_parts = db.relationship('GaragePart', back_populates='car_sub_model')

class UserCar(db.Model):
    __tablename__ = "user_cars"

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    car_model_id = db.Column(Integer, ForeignKey('car_models.id', ondelete='CASCADE'))
    car_sub_model_id = db.Column(Integer, ForeignKey('car_sub_models.id', ondelete='SET NULL'), nullable=True)
    year = db.Column(Integer, nullable=False)
    nickname = db.Column(String(100), nullable=True)  # optional (e.g. "My Car")
    is_primary = db.Column(Boolean, default=False)
    
    user = db.relationship('User', back_populates='cars')
    car_model = db.relationship('CarModel', back_populates='user_cars')
    car_sub_model = db.relationship('CarSubModel', back_populates='user_cars')


class GaragePartCompatibleCar(db.Model):
    """
    Explicit compatibility entries added by the garage owner.
    A part can fit multiple car models, each with an optional year range.
    Customers with a matching saved car see a '✅ Fits your car' badge.
    """
    __tablename__ = "garage_part_compatible_cars"
 
    id             = db.Column(Integer, primary_key=True)
    garage_part_id = db.Column(Integer, ForeignKey('garage_parts.id', ondelete='CASCADE'), nullable=False)
    car_model_id   = db.Column(Integer, ForeignKey('car_models.id',   ondelete='CASCADE'), nullable=False)
    from_year      = db.Column(Integer, nullable=True)
    to_year        = db.Column(Integer, nullable=True)
 
    __table_args__ = (
        UniqueConstraint('garage_part_id', 'car_model_id', name='uq_gpcc_part_model'),
    )
 
    garage_part = db.relationship('GaragePart', back_populates='compatible_cars')
    car_model   = db.relationship('CarModel',   back_populates='compatible_parts')