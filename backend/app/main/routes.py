from flask import Blueprint, jsonify

"""
Main Routes  (JWT — pure JSON API)
 
React handles all UI. Flask just confirms the API is alive.
"""

main_bp = Blueprint("main", __name__)

@main_bp.route("/")
def home():
    return jsonify({"message": "AutoParts Marketplace API", "status": "running"}), 200