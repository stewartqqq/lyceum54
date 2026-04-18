from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Event, EventReport
from ..utils import admin_required, error_response

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("")
@jwt_required(optional=True)
def list_reports():
    reports = EventReport.query.order_by(EventReport.published_at.desc()).all()
    return jsonify({"reports": [report.to_dict() for report in reports]})


@reports_bp.get("/<int:report_id>")
@jwt_required(optional=True)
def get_report(report_id):
    report = EventReport.query.get_or_404(report_id)
    return jsonify({"report": report.to_dict()})


@reports_bp.post("")
@admin_required
def create_report():
    data = request.get_json(silent=True) or {}
    if not data.get("eventId") or not data.get("title") or not data.get("summary"):
        return error_response("eventId, title, and summary are required.", 400, "validation_error")
    event = Event.query.get_or_404(data["eventId"])
    report = EventReport(
        event_id=event.id,
        title=data["title"].strip(),
        summary=data["summary"].strip(),
        results=data.get("results") or [],
        highlights=data.get("highlights") or [],
        gallery=data.get("gallery") or [],
        quote=data.get("quote"),
    )
    db.session.add(report)
    db.session.commit()
    return jsonify({"report": report.to_dict()}), 201


@reports_bp.put("/<int:report_id>")
@admin_required
def update_report(report_id):
    report = EventReport.query.get_or_404(report_id)
    data = request.get_json(silent=True) or {}
    for api_key, attr in {
        "title": "title",
        "summary": "summary",
        "results": "results",
        "highlights": "highlights",
        "gallery": "gallery",
        "quote": "quote",
    }.items():
        if api_key in data:
            setattr(report, attr, data[api_key])
    db.session.commit()
    return jsonify({"report": report.to_dict()})


@reports_bp.delete("/<int:report_id>")
@admin_required
def delete_report(report_id):
    report = EventReport.query.get_or_404(report_id)
    db.session.delete(report)
    db.session.commit()
    return jsonify({"deleted": True})
