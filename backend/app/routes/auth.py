import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required

from ..extensions import db
from ..models import User
from ..utils import current_user, error_response

auth_bp = Blueprint("auth", __name__)

CLASS_PATTERN = re.compile(r"^(?:[5-9]|1[0-1])[A-Z]$")


def _validate_registration(data):
    required = ["fullName", "email", "password", "className"]
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    if "@" not in data["email"]:
        raise ValueError("Email must be valid.")
    if len(data["password"]) < 8:
        raise ValueError("Password must be at least 8 characters.")
    class_name = data["className"].strip().upper()
    if not CLASS_PATTERN.match(class_name):
        raise ValueError("Class must look like 7A, 8B, 10A, or 11C.")
    return class_name


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    try:
        class_name = _validate_registration(data)
    except ValueError as error:
        return error_response(str(error), 400, "validation_error")

    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return error_response("A user with this email already exists.", 409, "email_taken")

    user = User(
        full_name=data["fullName"].strip(),
        email=email,
        class_name=class_name,
        role="student",
        avatar_url=data.get("avatarUrl"),
        phone_number=data.get("phoneNumber"),
        student_id=data.get("studentId"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"accessToken": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error_response("Invalid email or password.", 401, "invalid_credentials")

    token = create_access_token(identity=str(user.id))
    return jsonify({"accessToken": token, "user": user.to_dict()})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = current_user()
    return jsonify({"user": user.to_dict()})
