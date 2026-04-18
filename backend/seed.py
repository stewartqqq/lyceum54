from datetime import date, datetime, time, timedelta, timezone

from app import create_app
from app.extensions import db
from app.models import Announcement, Event, EventApplication, EventReport, Favorite, Notification, User


def dt(days: int, hour: int = 16, minute: int = 0):
    return datetime.now(timezone.utc) + timedelta(days=days, hours=hour - datetime.now(timezone.utc).hour, minutes=minute)


def make_user(full_name, email, class_name, role="student", password="Password123"):
    user = User(full_name=full_name, email=email, class_name=class_name, role=role)
    user.set_password(password)
    return user


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        admin = make_user("Aigerim Saparova", "admin@school.test", "11A", "admin")
        students = [
            make_user("Mira Kenzhebek", "mira@school.test", "8A"),
            make_user("Arman Tulegen", "arman@school.test", "7C"),
            make_user("Diana Omar", "diana@school.test", "9A"),
            make_user("Timur Lee", "timur@school.test", "10B"),
        ]
        db.session.add_all([admin, *students])
        db.session.flush()

        announcements = [
            Announcement(
                title="Science Week opens Monday",
                content="Labs, debates, demos, and team challenges will run across the week. Check Events to join.",
                category="school-wide",
                priority="important",
                target_classes=[],
                target_roles=[],
                image_url="https://images.unsplash.com/photo-1532094349884-543bc11b234d",
            ),
            Announcement(
                title="8th grade museum trip briefing",
                content="Students from 8A and 8B should meet in the assembly hall after second period.",
                category="class-specific",
                priority="normal",
                target_classes=["8A", "8B"],
                target_roles=[],
            ),
            Announcement(
                title="Student council applications",
                content="Applications are open for students who want to help shape school events this semester.",
                category="opportunity",
                priority="important",
                target_classes=["9A", "10B", "11A"],
                target_roles=[],
            ),
        ]
        db.session.add_all(announcements)

        events = [
            Event(
                title="Science Fair Showcase",
                short_description="Present experiments, prototypes, and research boards to the school community.",
                full_description="Students can apply as presenters or attend as spectators. Spectator seats are reserved for selected classes because of hall capacity.",
                date=date.today() + timedelta(days=9),
                start_time=time(14, 0),
                end_time=time(17, 0),
                location="Main Hall",
                category="science",
                organizer="STEM Club",
                cover_image="https://images.unsplash.com/photo-1564982752979-3f7bc974d29a",
                registration_open=True,
                registration_deadline=dt(6, 18, 0),
                participant_capacity=24,
                spectator_capacity=80,
                allowed_spectator_classes=["8A", "8B", "9A"],
                tags=["STEM", "showcase", "teamwork"],
                status="upcoming",
                featured=True,
            ),
            Event(
                title="Autumn Basketball Cup",
                short_description="Class teams compete in a friendly tournament after school.",
                full_description="Bring your class spirit. Participants join a class team, spectators can cheer from the stands.",
                date=date.today() + timedelta(days=4),
                start_time=time(15, 30),
                end_time=time(18, 0),
                location="Sports Hall",
                category="sports",
                organizer="PE Department",
                cover_image="https://images.unsplash.com/photo-1546519638-68e109498ffc",
                registration_open=True,
                registration_deadline=dt(2, 17, 0),
                participant_capacity=60,
                spectator_capacity=200,
                allowed_spectator_classes=[],
                tags=["sports", "teams", "school-spirit"],
                status="upcoming",
                featured=True,
            ),
            Event(
                title="Debate Night: Cities of the Future",
                short_description="A structured debate evening with student judges and audience voting.",
                full_description="Prepare arguments, join as a speaker, or register as a spectator to vote for the strongest team.",
                date=date.today() + timedelta(days=13),
                start_time=time(16, 0),
                end_time=time(18, 0),
                location="Library Forum",
                category="culture",
                organizer="Debate Society",
                registration_open=True,
                registration_deadline=dt(10, 16, 0),
                participant_capacity=16,
                spectator_capacity=70,
                allowed_spectator_classes=["9A", "10B", "11A"],
                tags=["debate", "leadership"],
                status="upcoming",
            ),
            Event(
                title="Eco Day Courtyard Reset",
                short_description="Students redesigned the courtyard planters and installed recycling stations.",
                full_description="Eco Day brought classes together for hands-on improvements around campus.",
                date=date.today() - timedelta(days=12),
                start_time=time(13, 0),
                end_time=time(16, 0),
                location="School Courtyard",
                category="community",
                organizer="Eco Team",
                registration_open=False,
                registration_deadline=dt(-16, 18, 0),
                participant_capacity=40,
                spectator_capacity=0,
                allowed_spectator_classes=[],
                tags=["community", "eco", "service"],
                status="completed",
            ),
        ]
        db.session.add_all(events)
        db.session.flush()

        applications = [
            EventApplication(user_id=students[0].id, event_id=events[0].id, application_type="spectator", status="approved"),
            EventApplication(user_id=students[2].id, event_id=events[0].id, application_type="participant", status="pending"),
            EventApplication(user_id=students[3].id, event_id=events[2].id, application_type="spectator", status="pending"),
        ]
        db.session.add_all(applications)

        reports = [
            EventReport(
                event_id=events[3].id,
                title="Eco Day turned the courtyard into a greener meeting place",
                summary="Students planted 120 flowers, built class recycling points, and created a maintenance rota for the courtyard.",
                results=["120 flowers planted", "6 recycling stations installed", "14 volunteers recognized"],
                highlights=["7C led the design sketch", "10B handled logistics", "Eco Team published a care schedule"],
                gallery=[
                    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b",
                    "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735",
                ],
                quote="Small changes become school culture when everyone can see them.",
            )
        ]
        db.session.add_all(reports)
        db.session.flush()

        notifications = [
            Notification(user_id=students[0].id, title="Science Fair approved", message="Your spectator request was approved.", notification_type="application"),
            Notification(user_id=students[1].id, title="New event this week", message="Basketball Cup registration closes soon.", notification_type="event"),
            Notification(user_id=students[2].id, title="Report published", message="Read the Eco Day recap in Reports.", notification_type="report"),
        ]
        db.session.add_all(notifications)
        db.session.add(Favorite(user_id=students[0].id, item_type="event", item_id=events[0].id))
        db.session.add(Favorite(user_id=students[0].id, item_type="report", item_id=reports[0].id))

        db.session.commit()
        print("Seeded demo database.")
        print("Admin login: admin@school.test / Password123")
        print("Student login: mira@school.test / Password123")


if __name__ == "__main__":
    seed()
