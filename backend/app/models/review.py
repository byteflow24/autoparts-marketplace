from .. import db
from sqlalchemy import Integer, ForeignKey, Text, TIMESTAMP, func, CheckConstraint

"""
Review Models

Two separate review types:
  - PartReview   → customer reviews a part (product quality)
  - GarageReview → customer reviews a garage (seller service)

Rules enforced at DB level:
  - rating must be between 1 and 5
  - one review per user per part / per garage (unique constraint)
  - only soft validation that reviewer ordered the item (enforced in service layer)
"""


class PartReview(db.Model):
    __tablename__ = "part_reviews"

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id',  ondelete='CASCADE'), nullable=False)
    part_id = db.Column(Integer, ForeignKey('parts.id',  ondelete='CASCADE'), nullable=False)
    rating = db.Column(Integer, nullable=False)
    comment = db.Column(Text, nullable=True)
    created_at = db.Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # One review per user per part
    __table_args__ = (
        db.UniqueConstraint('user_id', 'part_id', name='uq_part_review_user_part'),
        CheckConstraint('rating >= 1 AND rating <= 5', name='ck_part_review_rating'),
    )

    user = db.relationship('User', backref=db.backref('part_reviews', lazy='dynamic'))
    part = db.relationship('Part', backref=db.backref('reviews',      lazy='dynamic'))


class GarageReview(db.Model):
    __tablename__ = "garage_reviews"

    id = db.Column(Integer, primary_key=True)
    user_id = db.Column(Integer, ForeignKey('users.id',   ondelete='CASCADE'), nullable=False)
    garage_id = db.Column(Integer, ForeignKey('garages.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(Integer, nullable=False)
    comment = db.Column(Text, nullable=True)
    created_at = db.Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # One review per user per garage
    __table_args__ = (
        db.UniqueConstraint('user_id', 'garage_id', name='uq_garage_review_user_garage'),
        CheckConstraint('rating >= 1 AND rating <= 5', name='ck_garage_review_rating'),
    )

    user = db.relationship('User',   backref=db.backref('garage_reviews', lazy='dynamic'))
    garage = db.relationship('Garage', backref=db.backref('reviews',        lazy='dynamic'))