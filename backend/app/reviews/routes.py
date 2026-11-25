from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from app.reviews.services import (
    create_part_review,
    get_part_reviews,
    get_part_aggregate,
    user_can_review_part,
    create_garage_review,
    get_garage_reviews,
    get_garage_aggregate,
    user_can_review_garage,
    get_my_reviews,
)

"""
Review Routes  (JWT — pure JSON API)

Part review endpoints:
  POST /reviews/part/<part_id>           → submit part review (customer only)
  GET  /reviews/part/<part_id>           → get all reviews for a part (public)
  GET  /reviews/part/<part_id>/aggregate → average + count only (public)
  GET  /reviews/part/<part_id>/can-review → can current user review? (protected)

Garage review endpoints:
  POST /reviews/garage/<garage_id>           → submit garage review (customer only)
  GET  /reviews/garage/<garage_id>           → get all reviews for a garage (public)
  GET  /reviews/garage/<garage_id>/aggregate → average + count only (public)
  GET  /reviews/garage/<garage_id>/can-review → can current user review? (protected)

User:
  GET  /reviews/my-reviews → all reviews the logged-in customer has submitted
"""

reviews_bp = Blueprint('reviews', __name__, url_prefix='/reviews')


# ─────────────────────────────────────────────────────────────────────────────
# Part Reviews
# ─────────────────────────────────────────────────────────────────────────────

@reviews_bp.route("/part/<int:part_id>", methods=["POST"])
@jwt_required()
def submit_part_review(part_id):
    claims = get_jwt()
    if claims.get("role") != "customer":
        return jsonify({"error": "Only customers can submit reviews."}), 403

    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}
    rating  = data.get("rating")
    comment = data.get("comment", "")

    if not rating:
        return jsonify({"error": "Rating is required."}), 400

    try:
        review = create_part_review(
            user_id=user_id,
            part_id=part_id,
            rating=rating,
            comment=comment
        )
        return jsonify({
            "message": "Review submitted successfully.",
            "review": {
                "id":      review.id,
                "rating":  review.rating,
                "comment": review.comment,
            }
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@reviews_bp.route("/part/<int:part_id>", methods=["GET"])
def get_part_reviews_route(part_id):
    limit = request.args.get("limit", 20, type=int)
    data  = get_part_reviews(part_id, limit=limit)
    return jsonify(data), 200


@reviews_bp.route("/part/<int:part_id>/aggregate", methods=["GET"])
def part_aggregate(part_id):
    return jsonify(get_part_aggregate(part_id)), 200


@reviews_bp.route("/part/<int:part_id>/can-review", methods=["GET"])
@jwt_required()
def can_review_part(part_id):
    user_id = int(get_jwt_identity())
    return jsonify(user_can_review_part(user_id, part_id)), 200


# ─────────────────────────────────────────────────────────────────────────────
# Garage Reviews
# ─────────────────────────────────────────────────────────────────────────────

@reviews_bp.route("/garage/<int:garage_id>", methods=["POST"])
@jwt_required()
def submit_garage_review(garage_id):
    claims = get_jwt()
    if claims.get("role") != "customer":
        return jsonify({"error": "Only customers can submit reviews."}), 403

    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}
    rating  = data.get("rating")
    comment = data.get("comment", "")

    if not rating:
        return jsonify({"error": "Rating is required."}), 400

    try:
        review = create_garage_review(
            user_id=user_id,
            garage_id=garage_id,
            rating=rating,
            comment=comment
        )
        return jsonify({
            "message": "Review submitted successfully.",
            "review": {
                "id":      review.id,
                "rating":  review.rating,
                "comment": review.comment,
            }
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@reviews_bp.route("/garage/<int:garage_id>", methods=["GET"])
def get_garage_reviews_route(garage_id):
    limit = request.args.get("limit", 20, type=int)
    data  = get_garage_reviews(garage_id, limit=limit)
    return jsonify(data), 200


@reviews_bp.route("/garage/<int:garage_id>/aggregate", methods=["GET"])
def garage_aggregate(garage_id):
    return jsonify(get_garage_aggregate(garage_id)), 200


@reviews_bp.route("/garage/<int:garage_id>/can-review", methods=["GET"])
@jwt_required()
def can_review_garage(garage_id):
    user_id = int(get_jwt_identity())
    return jsonify(user_can_review_garage(user_id, garage_id)), 200


# ─────────────────────────────────────────────────────────────────────────────
# Customer's own reviews
# ─────────────────────────────────────────────────────────────────────────────

@reviews_bp.route("/my-reviews", methods=["GET"])
@jwt_required()
def my_reviews():
    user_id = int(get_jwt_identity())
    return jsonify(get_my_reviews(user_id)), 200