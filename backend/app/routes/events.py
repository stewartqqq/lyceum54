from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Event
from ..utils import admin_required, current_user, error_response, parse_hhmm_time, parse_iso_date, parse_iso_datetime

events_bp = Blueprint("events", __name__)


def _event_payload(data):
    required = [
        "title",
        "shortDescription",
        "fullDescription",
        "date",
        "startTime",
        "endTime",
        "location",
        "category",
        "organizer",
        "registrationDeadline",
    ]
    missing = [field for field in required if not data.get(field)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    return {
        "title": data["title"].strip(),
        "short_description": data["shortDescription"].strip(),
        "full_description": data["fullDescription"].strip(),
        "date": parse_iso_date(data["date"], "date"),
        "start_time": parse_hhmm_time(data["startTime"], "startTime"),
        "end_time": parse_hhmm_time(data["endTime"], "endTime"),
        "location": data["location"].strip(),
        "category": data["category"].strip(),
        "organizer": data["organizer"].strip(),
        "cover_image": data.get("coverImage"),
        "registration_open": data.get("registrationOpen", True),
        "registration_deadline": parse_iso_datetime(data["registrationDeadline"], "registrationDeadline"),
        "participant_capacity": int(data.get("participantCapacity", 30)),
        "spectator_capacity": int(data.get("spectatorCapacity", 120)),
        "allowed_spectator_classes": data.get("allowedSpectatorClasses") or [],
        "tags": data.get("tags") or [],
        "status": data.get("status", "upcoming"),
        "featured": data.get("featured", False),
    }


@events_bp.get("")
@jwt_required(optional=True)
def list_events():
    user = current_user()
    query = Event.query
    search = request.args.get("search")
    category = request.args.get("category")
    status = request.args.get("status")
    available_for_my_class = request.args.get("availableForMyClass") == "true"

    if search:
        like = f"%{search}%"
        query = query.filter(Event.title.ilike(like) | Event.short_description.ilike(like))
    if category:
        query = query.filter_by(category=category)
    if status:
        query = query.filter_by(status=status)

    events = query.order_by(Event.date.asc(), Event.start_time.asc()).all()
    if available_for_my_class and user:
        events = [event for event in events if event.registration_open and event.can_spectate(user.class_name)]
    return jsonify({"events": [event.to_dict(user) for event in events]})


@events_bp.get("/<int:event_id>")
@jwt_required(optional=True)
def get_event(event_id):
    user = current_user()
    event = Event.query.get_or_404(event_id)
    return jsonify({"event": event.to_dict(user)})


@events_bp.post("")
@admin_required
def create_event():
    data = request.get_json(silent=True) or {}
    event = Event(**_event_payload(data))
    db.session.add(event)
    db.session.commit()
    return jsonify({"event": event.to_dict()}), 201


@events_bp.put("/<int:event_id>")
@admin_required
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.get_json(silent=True) or {}

    mapping = {
        "title": "title",
        "shortDescription": "short_description",
        "fullDescription": "full_description",
        "location": "location",
        "category": "category",
        "organizer": "organizer",
        "coverImage": "cover_image",
        "registrationOpen": "registration_open",
        "participantCapacity": "participant_capacity",
        "spectatorCapacity": "spectator_capacity",
        "allowedSpectatorClasses": "allowed_spectator_classes",
        "tags": "tags",
        "status": "status",
        "featured": "featured",
    }
    for api_key, attr in mapping.items():
        if api_key in data:
            setattr(event, attr, data[api_key])
    if "date" in data:
        event.date = parse_iso_date(data["date"], "date")
    if "startTime" in data:
        event.start_time = parse_hhmm_time(data["startTime"], "startTime")
    if "endTime" in data:
        event.end_time = parse_hhmm_time(data["endTime"], "endTime")
    if "registrationDeadline" in data:
        event.registration_deadline = parse_iso_datetime(data["registrationDeadline"], "registrationDeadline")
    db.session.commit()
    return jsonify({"event": event.to_dict()})


@events_bp.delete("/<int:event_id>")
@admin_required
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return jsonify({"deleted": True})
