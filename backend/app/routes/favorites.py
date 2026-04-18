from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Event, EventReport, Favorite
from ..utils import current_user, error_response

favorites_bp = Blueprint("favorites", __name__)


@favorites_bp.get("")
@jwt_required()
def list_favorites():
    user = current_user()
    favorites = Favorite.query.filter_by(user_id=user.id).order_by(Favorite.created_at.desc()).all()
    enriched = []
    for favorite in favorites:
        item = None
        if favorite.item_type == "event":
            item = Event.query.get(favorite.item_id)
            item = item.to_dict(user) if item else None
        if favorite.item_type == "report":
            item = EventReport.query.get(favorite.item_id)
            item = item.to_dict() if item else None
        enriched.append({**favorite.to_dict(), "item": item})
    return jsonify({"favorites": enriched})


@favorites_bp.post("")
@jwt_required()
def add_favorite():
    user = current_user()
    data = request.get_json(silent=True) or {}
    item_type = data.get("itemType")
    item_id = data.get("itemId")
    if item_type not in {"event", "report"} or not item_id:
        return error_response("itemType must be event or report and itemId is required.", 400, "validation_error")
    favorite = Favorite(user_id=user.id, item_type=item_type, item_id=int(item_id))
    db.session.add(favorite)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("This item is already in your favorites.", 409, "duplicate_favorite")
    return jsonify({"favorite": favorite.to_dict()}), 201


@favorites_bp.delete("/<int:favorite_id>")
@jwt_required()
def remove_favorite(favorite_id):
    user = current_user()
    favorite = Favorite.query.filter_by(id=favorite_id, user_id=user.id).first_or_404()
    db.session.delete(favorite)
    db.session.commit()
    return jsonify({"deleted": True})
