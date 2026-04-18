from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Notification
from ..utils import current_user

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.get("")
@jwt_required()
def list_notifications():
    user = current_user()
    notifications = (
        Notification.query.filter_by(user_id=user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return jsonify({"notifications": [item.to_dict() for item in notifications]})


@notifications_bp.put("/<int:notification_id>/read")
@jwt_required()
def mark_notification_read(notification_id):
    user = current_user()
    notification = Notification.query.filter_by(id=notification_id, user_id=user.id).first_or_404()
    notification.is_read = True
    db.session.commit()
    return jsonify({"notification": notification.to_dict()})
