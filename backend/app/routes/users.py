from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..utils import current_user

users_bp = Blueprint("users", __name__)


@users_bp.get("/me")
@jwt_required()
def get_profile():
    return jsonify({"user": current_user().to_dict()})


@users_bp.put("/me")
@jwt_required()
def update_profile():
    user = current_user()
    data = request.get_json(silent=True) or {}
    for api_key, attr in {
        "fullName": "full_name",
        "avatarUrl": "avatar_url",
        "phoneNumber": "phone_number",
        "studentId": "student_id",
    }.items():
        if api_key in data:
            setattr(user, attr, data[api_key])
    db.session.commit()
    return jsonify({"user": user.to_dict()})
