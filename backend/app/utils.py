from datetime import datetime
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .models import User


VALID_ROLES = {"student", "admin", "moderator"}
VALID_APPLICATION_TYPES = {"participant", "spectator"}
VALID_APPLICATION_STATUSES = {"pending", "approved", "rejected", "waitlisted"}


def error_response(message: str, status_code: int = 400, code: str = "bad_request"):
    response = jsonify({"error": {"code": code, "message": message}})
    response.status_code = status_code
    return response


def parse_iso_date(value: str, field_name: str):
    try:
        return datetime.fromisoformat(value).date()
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be an ISO date, for example 2026-05-18")


def parse_hhmm_time(value: str, field_name: str):
    try:
        return datetime.strptime(value, "%H:%M").time()
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must use HH:MM format")


def parse_iso_datetime(value: str, field_name: str):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        raise ValueError(f"{field_name} must be an ISO datetime")


def current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    return User.query.get(int(identity))


def roles_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        def decorated(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if not user or user.role not in roles:
                return error_response("You do not have permission to perform this action.", 403, "forbidden")
            return fn(*args, **kwargs)

        return decorated

    return wrapper


admin_required = roles_required("admin")
staff_required = roles_required("admin", "moderator")
