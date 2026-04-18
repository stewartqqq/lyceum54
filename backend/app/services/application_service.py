from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Event, EventApplication, User
from ..utils import VALID_APPLICATION_STATUSES, VALID_APPLICATION_TYPES
from .notification_service import create_notification


def _now_for(deadline):
    now = datetime.now(timezone.utc)
    return now.replace(tzinfo=None) if deadline.tzinfo is None else now


def _approved_count(event_id: int, application_type: str) -> int:
    return EventApplication.query.filter_by(
        event_id=event_id,
        application_type=application_type,
        status="approved",
    ).count()


def _capacity_for(event: Event, application_type: str) -> int:
    return event.participant_capacity if application_type == "participant" else event.spectator_capacity


def submit_application(user: User, event: Event, application_type: str, note: str | None = None) -> EventApplication:
    if application_type not in VALID_APPLICATION_TYPES:
        raise ValueError("applicationType must be participant or spectator")
    if user.role != "student":
        raise PermissionError("Only students can submit event applications.")
    if event.status in {"completed", "canceled"}:
        raise ValueError("Applications are not available for completed or canceled events.")
    if not event.registration_open:
        raise ValueError("Registration is closed for this event.")
    if _now_for(event.registration_deadline) > event.registration_deadline:
        raise ValueError("The registration deadline has passed.")
    if application_type == "spectator" and not event.can_spectate(user.class_name):
        allowed = ", ".join(event.allowed_spectator_classes or [])
        raise PermissionError(f"Spectator registration is only available for: {allowed}.")

    status = "pending"
    if _approved_count(event.id, application_type) >= _capacity_for(event, application_type):
        status = "waitlisted"

    application = EventApplication(
        user_id=user.id,
        event_id=event.id,
        application_type=application_type,
        status=status,
        note=note,
    )
    db.session.add(application)

    try:
        db.session.flush()
    except IntegrityError as error:
        db.session.rollback()
        raise ValueError("You have already applied for this event with that role.") from error

    create_notification(
        user.id,
        "Application received",
        f"Your {application_type} request for {event.title} is now {status}.",
        "application",
    )
    db.session.commit()
    return application


def moderate_application(application: EventApplication, status: str) -> EventApplication:
    if status not in VALID_APPLICATION_STATUSES:
        raise ValueError("status must be pending, approved, rejected, or waitlisted")
    if status == "approved":
        event = application.event
        if _approved_count(event.id, application.application_type) >= _capacity_for(event, application.application_type):
            raise ValueError("This event is already at capacity for that application type.")

    application.status = status
    create_notification(
        application.user_id,
        "Application updated",
        f"Your {application.application_type} request for {application.event.title} was marked {status}.",
        "application",
    )
    db.session.commit()
    return application
