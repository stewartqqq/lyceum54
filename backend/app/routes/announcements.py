from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, verify_jwt_in_request

from ..extensions import db
from ..models import Announcement
from ..utils import admin_required, current_user, error_response

announcements_bp = Blueprint("announcements", __name__)


@announcements_bp.get("")
@jwt_required(optional=True)
def list_announcements():
    user = current_user()
    category = request.args.get("category")
    priority = request.args.get("priority")
    query = Announcement.query
    if category:
        query = query.filter_by(category=category)
    if priority:
        query = query.filter_by(priority=priority)
    announcements = [item for item in query.order_by(Announcement.created_at.desc()).all() if item.is_visible_to(user)]
    return jsonify({"announcements": [item.to_dict() for item in announcements]})


@announcements_bp.get("/<int:announcement_id>")
@jwt_required(optional=True)
def get_announcement(announcement_id):
    user = current_user()
    announcement = Announcement.query.get_or_404(announcement_id)
    if not announcement.is_visible_to(user):
        return error_response("This announcement is not available to your account.", 403, "forbidden")
    return jsonify({"announcement": announcement.to_dict()})


@announcements_bp.post("")
@admin_required
def create_announcement():
    data = request.get_json(silent=True) or {}
    if not data.get("title") or not data.get("content"):
        return error_response("title and content are required.", 400, "validation_error")
    announcement = Announcement(
        title=data["title"].strip(),
        content=data["content"].strip(),
        category=data.get("category", "general"),
        priority=data.get("priority", "normal"),
        image_url=data.get("imageUrl"),
        attachment_url=data.get("attachmentUrl"),
        target_classes=data.get("targetClasses") or [],
        target_roles=data.get("targetRoles") or [],
    )
    db.session.add(announcement)
    db.session.commit()
    return jsonify({"announcement": announcement.to_dict()}), 201


@announcements_bp.put("/<int:announcement_id>")
@admin_required
def update_announcement(announcement_id):
    announcement = Announcement.query.get_or_404(announcement_id)
    data = request.get_json(silent=True) or {}
    for api_key, attr in {
        "title": "title",
        "content": "content",
        "category": "category",
        "priority": "priority",
        "imageUrl": "image_url",
        "attachmentUrl": "attachment_url",
        "targetClasses": "target_classes",
        "targetRoles": "target_roles",
    }.items():
        if api_key in data:
            setattr(announcement, attr, data[api_key])
    db.session.commit()
    return jsonify({"announcement": announcement.to_dict()})


@announcements_bp.delete("/<int:announcement_id>")
@admin_required
def delete_announcement(announcement_id):
    announcement = Announcement.query.get_or_404(announcement_id)
    db.session.delete(announcement)
    db.session.commit()
    return jsonify({"deleted": True})
