"""
app/saved_parts/routes.py
Blueprint: saved_parts  →  prefix /saved-parts
Customer only (jwt_required + role check).

v2: installation_price added to list_saved_parts response.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from ..models.part import SavedPart, GaragePart
from ..models.part import Part
from ..models.car  import CarModel
from .. import db

saved_parts_bp = Blueprint('saved_parts', __name__, url_prefix='/saved-parts')


def _require_customer():
    claims = get_jwt()
    if claims.get('role') != 'customer':
        return jsonify({'error': 'Customers only.'}), 403
    return None


# ── POST /saved-parts/<garage_part_id>  → save a part ───────────
@saved_parts_bp.route('/<int:garage_part_id>', methods=['POST'])
@jwt_required()
def save_part(garage_part_id):
    err = _require_customer()
    if err: return err

    user_id = int(get_jwt_identity())

    # check part exists
    gp = GaragePart.query.get_or_404(garage_part_id)

    # idempotent — already saved is fine
    existing = SavedPart.query.filter_by(
        user_id=user_id, garage_part_id=garage_part_id
    ).first()
    if existing:
        return jsonify({'message': 'Already saved.', 'saved': True}), 200

    sp = SavedPart(user_id=user_id, garage_part_id=garage_part_id)
    db.session.add(sp)
    db.session.commit()
    return jsonify({'message': 'Part saved.', 'saved': True}), 201


# ── DELETE /saved-parts/<garage_part_id>  → unsave ──────────────
@saved_parts_bp.route('/<int:garage_part_id>', methods=['DELETE'])
@jwt_required()
def unsave_part(garage_part_id):
    err = _require_customer()
    if err: return err

    user_id = int(get_jwt_identity())
    sp = SavedPart.query.filter_by(
        user_id=user_id, garage_part_id=garage_part_id
    ).first()
    if not sp:
        return jsonify({'message': 'Not saved.', 'saved': False}), 200

    db.session.delete(sp)
    db.session.commit()
    return jsonify({'message': 'Part removed from saved.', 'saved': False}), 200


# ── GET /saved-parts  → list all saved parts ────────────────────
@saved_parts_bp.route('', methods=['GET'])
@jwt_required()
def list_saved_parts():
    err = _require_customer()
    if err: return err

    user_id = int(get_jwt_identity())
    rows = (
        SavedPart.query
        .filter_by(user_id=user_id)
        .order_by(SavedPart.saved_at.desc())
        .all()
    )

    result = []
    for sp in rows:
        gp   = sp.garage_part
        part = gp.part
        result.append({
            'saved_part_id':    sp.id,
            'saved_at':         sp.saved_at.isoformat(),
            'garage_part_id':   gp.id,
            'part_id':          part.id,
            'part_name':        part.name,
            'part_number':      part.part_number,
            'brand':            part.brand,
            'category':         part.category,
            'image_url':        part.image_url,
            'price':            float(gp.price),
            'condition':        gp.condition,
            'quantity':         gp.quantity,
            'garage_id':        gp.garage_id,
            'garage_name':      gp.garage.garage_name if gp.garage else None,
            'car_make':         gp.car_model.make.name if gp.car_model and gp.car_model.make else None,
            'car_model':        gp.car_model.name if gp.car_model else None,
            'from_year':        gp.from_year,
            'to_year':          gp.to_year,
            'delivery':         gp.delivery_available,
            'installation':     gp.installation_available,
            # ── NEW: service prices ──────────────────────────
            'installation_price': float(gp.installation_price) if gp.installation_price is not None else None,
        })

    return jsonify(result), 200


# ── GET /saved-parts/ids  → just the list of saved garage_part_ids ─
@saved_parts_bp.route('/ids', methods=['GET'])
@jwt_required()
def saved_part_ids():
    err = _require_customer()
    if err: return err

    user_id = int(get_jwt_identity())
    rows = SavedPart.query.filter_by(user_id=user_id).with_entities(SavedPart.garage_part_id).all()
    return jsonify([r.garage_part_id for r in rows]), 200