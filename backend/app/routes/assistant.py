from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..services.assistant_service import assistant_service
from ..utils import current_user, error_response

assistant_bp = Blueprint("assistant", __name__)


@assistant_bp.post("/query")
@jwt_required(optional=True)
def query_assistant():
    user = current_user()
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    if not prompt:
        return error_response("prompt is required.", 400, "validation_error")
    result = assistant_service.answer(
        prompt,
        user=user,
        client_context=data.get("context") or {},
    )
    return jsonify({"response": result})
