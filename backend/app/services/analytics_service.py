from sqlalchemy import func

from ..models import Event, EventApplication, User


def build_admin_analytics():
    users_by_class = dict(
        User.query.with_entities(User.class_name, func.count(User.id)).group_by(User.class_name).all()
    )
    applications_by_event = [
        {"eventId": event_id, "eventTitle": title, "count": count}
        for event_id, title, count in EventApplication.query.join(Event)
        .with_entities(Event.id, Event.title, func.count(EventApplication.id))
        .group_by(Event.id)
        .all()
    ]
    application_status_counts = dict(
        EventApplication.query.with_entities(EventApplication.status, func.count(EventApplication.id))
        .group_by(EventApplication.status)
        .all()
    )
    application_type_counts = dict(
        EventApplication.query.with_entities(EventApplication.application_type, func.count(EventApplication.id))
        .group_by(EventApplication.application_type)
        .all()
    )

    return {
        "totalUsers": User.query.count(),
        "usersByClass": users_by_class,
        "totalEvents": Event.query.count(),
        "applicationsByEvent": applications_by_event,
        "applicationStatusCounts": application_status_counts,
        "applicationTypeCounts": application_type_counts,
        "recentActivity": [
            application.to_dict()
            for application in EventApplication.query.order_by(EventApplication.created_at.desc()).limit(8).all()
        ],
    }
