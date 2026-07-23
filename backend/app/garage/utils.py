from flask import jsonify

def _require_garage(claims):
    """Returns (garage_id, error) — error is None if valid."""
    if claims.get("role") != "garage":
        return None, (jsonify({"error": "Access denied. Garage accounts only."}), 403)
    garage_id = claims.get("garage_id")
    if not garage_id:
        return None, (jsonify({"error": "Garage profile not found."}), 404)
    return garage_id, None