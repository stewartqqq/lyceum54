from flask import Blueprint, jsonify

from ..models import User
from ..services.analytics_service import build_admin_analytics
from ..utils import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/analytics")
@admin_required
def analytics():
    return jsonify({"analytics": build_admin_analytics()})


@admin_bp.get("/students")
@admin_required
def students():
    users = User.query.order_by(User.class_name.asc(), User.full_name.asc()).all()
    return jsonify({"students": [user.to_dict() for user in users]})
