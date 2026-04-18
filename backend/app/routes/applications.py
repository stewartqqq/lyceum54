from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..models import Event, EventApplication
from ..services.application_service import moderate_application, submit_application
from ..utils import admin_required, current_user, error_response

applications_bp = Blueprint("applications", __name__)


@applications_bp.post("/events/<int:event_id>/apply")
@jwt_required()
def apply_to_event(event_id):
    user = current_user()
    event = Event.query.get_or_404(event_id)
    data = request.get_json(silent=True) or {}
    try:
        application = submit_application(
            user=user,
            event=event,
            application_type=data.get("applicationType"),
            note=data.get("note"),
        )
    except PermissionError as error:
        return error_response(str(error), 403, "forbidden")
    except ValueError as error:
        return error_response(str(error), 400, "application_rejected")
    return jsonify({"application": application.to_dict()}), 201


@applications_bp.get("/applications/my")
@jwt_required()
def my_applications():
    user = current_user()
    applications = (
        EventApplication.query.filter_by(user_id=user.id)
        .order_by(EventApplication.created_at.desc())
        .all()
    )
    return jsonify({"applications": [item.to_dict() for item in applications]})


@applications_bp.get("/admin/applications")
@admin_required
def list_all_applications():
    status = request.args.get("status")
    query = EventApplication.query
    if status:
        query = query.filter_by(status=status)
    applications = query.order_by(EventApplication.created_at.desc()).all()
    return jsonify({"applications": [item.to_dict() for item in applications]})


@applications_bp.put("/admin/applications/<int:application_id>/status")
@admin_required
def update_application_status(application_id):
    application = EventApplication.query.get_or_404(application_id)
    data = request.get_json(silent=True) or {}
    try:
        application = moderate_application(application, data.get("status"))
    except ValueError as error:
        return error_response(str(error), 400, "validation_error")
    return jsonify({"application": application.to_dict()})
