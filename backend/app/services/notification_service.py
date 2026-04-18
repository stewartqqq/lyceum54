from ..extensions import db
from ..models import Notification


def create_notification(user_id: int, title: str, message: str, notification_type: str = "info") -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.session.add(notification)
    return notification
