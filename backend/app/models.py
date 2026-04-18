from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    class_name = db.Column(db.String(16), nullable=False, index=True)
    role = db.Column(db.String(32), nullable=False, default="student", index=True)
    avatar_url = db.Column(db.String(500))
    phone_number = db.Column(db.String(32))
    student_id = db.Column(db.String(64))
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    applications = db.relationship("EventApplication", back_populates="user", cascade="all, delete-orphan")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "fullName": self.full_name,
            "email": self.email,
            "className": self.class_name,
            "role": self.role,
            "avatarUrl": self.avatar_url,
            "phoneNumber": self.phone_number,
            "studentId": self.student_id,
            "createdAt": self.created_at.isoformat(),
        }


class Announcement(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=False, default="general", index=True)
    priority = db.Column(db.String(32), nullable=False, default="normal", index=True)
    image_url = db.Column(db.String(500))
    attachment_url = db.Column(db.String(500))
    target_classes = db.Column(db.JSON, nullable=False, default=list)
    target_roles = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def is_visible_to(self, user: User | None) -> bool:
        if not user:
            return not self.target_classes and not self.target_roles
        class_ok = not self.target_classes or user.class_name in self.target_classes
        role_ok = not self.target_roles or user.role in self.target_roles
        return class_ok and role_ok

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "priority": self.priority,
            "imageUrl": self.image_url,
            "attachmentUrl": self.attachment_url,
            "targetClasses": self.target_classes or [],
            "targetRoles": self.target_roles or [],
            "createdAt": self.created_at.isoformat(),
        }


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    short_description = db.Column(db.String(260), nullable=False)
    full_description = db.Column(db.Text, nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    location = db.Column(db.String(160), nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    organizer = db.Column(db.String(120), nullable=False)
    cover_image = db.Column(db.String(500))
    registration_open = db.Column(db.Boolean, nullable=False, default=True)
    registration_deadline = db.Column(db.DateTime(timezone=True), nullable=False)
    participant_capacity = db.Column(db.Integer, nullable=False, default=30)
    spectator_capacity = db.Column(db.Integer, nullable=False, default=120)
    allowed_spectator_classes = db.Column(db.JSON, nullable=False, default=list)
    tags = db.Column(db.JSON, nullable=False, default=list)
    status = db.Column(db.String(32), nullable=False, default="upcoming", index=True)
    featured = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    applications = db.relationship("EventApplication", back_populates="event", cascade="all, delete-orphan")
    report = db.relationship("EventReport", back_populates="event", uselist=False)

    def approved_count(self, application_type: str) -> int:
        return EventApplication.query.filter_by(
            event_id=self.id,
            application_type=application_type,
            status="approved",
        ).count()

    def can_spectate(self, class_name: str) -> bool:
        allowed = self.allowed_spectator_classes or []
        return not allowed or class_name in allowed

    def to_dict(self, viewer: User | None = None):
        viewer_class_allowed = None
        if viewer:
            viewer_class_allowed = self.can_spectate(viewer.class_name)

        return {
            "id": self.id,
            "title": self.title,
            "shortDescription": self.short_description,
            "fullDescription": self.full_description,
            "date": self.date.isoformat(),
            "startTime": self.start_time.strftime("%H:%M"),
            "endTime": self.end_time.strftime("%H:%M"),
            "location": self.location,
            "category": self.category,
            "organizer": self.organizer,
            "coverImage": self.cover_image,
            "registrationOpen": self.registration_open,
            "registrationDeadline": self.registration_deadline.isoformat(),
            "participantCapacity": self.participant_capacity,
            "spectatorCapacity": self.spectator_capacity,
            "participantApprovedCount": self.approved_count("participant"),
            "spectatorApprovedCount": self.approved_count("spectator"),
            "allowedSpectatorClasses": self.allowed_spectator_classes or [],
            "viewerCanSpectate": viewer_class_allowed,
            "tags": self.tags or [],
            "status": self.status,
            "featured": self.featured,
            "createdAt": self.created_at.isoformat(),
        }


class EventApplication(db.Model):
    __tablename__ = "event_applications"
    __table_args__ = (
        db.UniqueConstraint("user_id", "event_id", "application_type", name="uq_application_once_per_role"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False, index=True)
    application_type = db.Column(db.String(32), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    user = db.relationship("User", back_populates="applications")
    event = db.relationship("Event", back_populates="applications")

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "eventId": self.event_id,
            "applicationType": self.application_type,
            "status": self.status,
            "note": self.note,
            "createdAt": self.created_at.isoformat(),
            "event": self.event.to_dict(self.user) if self.event else None,
            "student": self.user.to_dict() if self.user else None,
        }


class EventReport(db.Model):
    __tablename__ = "event_reports"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False, unique=True)
    title = db.Column(db.String(180), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    results = db.Column(db.JSON, nullable=False, default=list)
    highlights = db.Column(db.JSON, nullable=False, default=list)
    gallery = db.Column(db.JSON, nullable=False, default=list)
    quote = db.Column(db.String(260))
    published_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    event = db.relationship("Event", back_populates="report")

    def to_dict(self):
        return {
            "id": self.id,
            "eventId": self.event_id,
            "title": self.title,
            "summary": self.summary,
            "results": self.results or [],
            "highlights": self.highlights or [],
            "gallery": self.gallery or [],
            "quote": self.quote,
            "publishedAt": self.published_at.isoformat(),
            "event": self.event.to_dict() if self.event else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    notification_type = db.Column(db.String(60), nullable=False, default="info")
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "title": self.title,
            "message": self.message,
            "isRead": self.is_read,
            "type": self.notification_type,
            "createdAt": self.created_at.isoformat(),
        }


class Favorite(db.Model):
    __tablename__ = "favorites"
    __table_args__ = (
        db.UniqueConstraint("user_id", "item_type", "item_id", name="uq_favorite_once"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    item_type = db.Column(db.String(32), nullable=False, index=True)
    item_id = db.Column(db.Integer, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "itemType": self.item_type,
            "itemId": self.item_id,
            "createdAt": self.created_at.isoformat(),
        }
