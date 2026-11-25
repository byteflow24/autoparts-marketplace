from app import db
from app.models.review import PartReview, GarageReview
from app.models.order import Order, OrderItem
from app.models.part import GaragePart
from sqlalchemy import func

"""
Review Services

Business logic for part and garage reviews.

Key rules:
  - Customer must have a completed order containing the part to review it
  - Customer must have a completed order from the garage to review it
  - One review per user per part / per garage (enforced at DB + service level)
"""

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _customer_ordered_part(user_id, part_id):
    """Returns True if user has a completed order containing this part."""
    result = (
        db.session.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(GaragePart, OrderItem.garage_part_id == GaragePart.id)
        .filter(
            Order.user_id == user_id,
            Order.status  == 'completed',
            GaragePart.part_id == part_id
        )
        .first()
    )
    return result is not None


def _customer_ordered_from_garage(user_id, garage_id):
    """Returns True if user has a completed order from this garage."""
    result = (
        db.session.query(Order)
        .filter(
            Order.user_id  == user_id,
            Order.garage_id == garage_id,
            Order.status   == 'completed'
        )
        .first()
    )
    return result is not None


def _format_review(r):
    return {
        "id":         r.id,
        "user_name":  r.user.name,
        "rating":     r.rating,
        "comment":    r.comment or "",
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _aggregate(reviews):
    """Returns { average_rating, total_reviews } from a list of review objects."""
    if not reviews:
        return {"average_rating": None, "total_reviews": 0}
    avg = round(sum(r.rating for r in reviews) / len(reviews), 1)
    return {"average_rating": avg, "total_reviews": len(reviews)}


# ─────────────────────────────────────────────────────────────────────────────
# Part Reviews
# ─────────────────────────────────────────────────────────────────────────────

def create_part_review(user_id, part_id, rating, comment=None):
    """
    Submit a part review.
    Raises ValueError if user hasn't ordered the part or already reviewed it.
    """
    if not _customer_ordered_part(user_id, part_id):
        raise ValueError("You can only review parts you have ordered and received.")

    existing = PartReview.query.filter_by(user_id=user_id, part_id=part_id).first()
    if existing:
        raise ValueError("You have already reviewed this part.")

    if not (1 <= int(rating) <= 5):
        raise ValueError("Rating must be between 1 and 5.")

    review = PartReview(
        user_id=user_id,
        part_id=part_id,
        rating=int(rating),
        comment=comment.strip() if comment else None
    )
    db.session.add(review)
    db.session.commit()
    return review


def get_part_reviews(part_id, limit=20):
    """Returns reviews + aggregate stats for a part."""
    reviews = (
        PartReview.query
        .filter_by(part_id=part_id)
        .order_by(PartReview.created_at.desc())
        .limit(limit)
        .all()
    )
    all_reviews = PartReview.query.filter_by(part_id=part_id).all()
    return {
        **_aggregate(all_reviews),
        "reviews": [_format_review(r) for r in reviews]
    }


def get_part_aggregate(part_id):
    """Lightweight — just average and count, used in search/detail headers."""
    row = (
        db.session.query(
            func.avg(PartReview.rating).label('avg'),
            func.count(PartReview.id).label('count')
        )
        .filter(PartReview.part_id == part_id)
        .one()
    )
    return {
        "average_rating": round(float(row.avg), 1) if row.avg else None,
        "total_reviews":  row.count
    }


def user_can_review_part(user_id, part_id):
    """Used by the frontend to decide whether to show the review form."""
    ordered  = _customer_ordered_part(user_id, part_id)
    reviewed = PartReview.query.filter_by(user_id=user_id, part_id=part_id).first() is not None
    return {"can_review": ordered and not reviewed, "already_reviewed": reviewed}


# ─────────────────────────────────────────────────────────────────────────────
# Garage Reviews
# ─────────────────────────────────────────────────────────────────────────────

def create_garage_review(user_id, garage_id, rating, comment=None):
    """
    Submit a garage review.
    Raises ValueError if user hasn't ordered from this garage or already reviewed.
    """
    if not _customer_ordered_from_garage(user_id, garage_id):
        raise ValueError("You can only review garages you have ordered from and received delivery.")

    existing = GarageReview.query.filter_by(user_id=user_id, garage_id=garage_id).first()
    if existing:
        raise ValueError("You have already reviewed this garage.")

    if not (1 <= int(rating) <= 5):
        raise ValueError("Rating must be between 1 and 5.")

    review = GarageReview(
        user_id=user_id,
        garage_id=garage_id,
        rating=int(rating),
        comment=comment.strip() if comment else None
    )
    db.session.add(review)
    db.session.commit()
    return review


def get_garage_reviews(garage_id, limit=20):
    """Returns reviews + aggregate stats for a garage."""
    reviews = (
        GarageReview.query
        .filter_by(garage_id=garage_id)
        .order_by(GarageReview.created_at.desc())
        .limit(limit)
        .all()
    )
    all_reviews = GarageReview.query.filter_by(garage_id=garage_id).all()
    return {
        **_aggregate(all_reviews),
        "reviews": [_format_review(r) for r in reviews]
    }


def get_garage_aggregate(garage_id):
    """Lightweight — average and count only."""
    row = (
        db.session.query(
            func.avg(GarageReview.rating).label('avg'),
            func.count(GarageReview.id).label('count')
        )
        .filter(GarageReview.garage_id == garage_id)
        .one()
    )
    return {
        "average_rating": round(float(row.avg), 1) if row.avg else None,
        "total_reviews":  row.count
    }


def user_can_review_garage(user_id, garage_id):
    """Used by the frontend to decide whether to show the review form."""
    ordered  = _customer_ordered_from_garage(user_id, garage_id)
    reviewed = GarageReview.query.filter_by(user_id=user_id, garage_id=garage_id).first() is not None
    return {"can_review": ordered and not reviewed, "already_reviewed": reviewed}


def get_my_reviews(user_id):
    """Returns all reviews the user has submitted (both types)."""
    part_reviews = (
        PartReview.query
        .filter_by(user_id=user_id)
        .order_by(PartReview.created_at.desc())
        .all()
    )
    garage_reviews = (
        GarageReview.query
        .filter_by(user_id=user_id)
        .order_by(GarageReview.created_at.desc())
        .all()
    )
    return {
        "part_reviews": [
            {**_format_review(r), "part_id": r.part_id, "part_name": r.part.name}
            for r in part_reviews
        ],
        "garage_reviews": [
            {**_format_review(r), "garage_id": r.garage_id, "garage_name": r.garage.garage_name}
            for r in garage_reviews
        ]
    }