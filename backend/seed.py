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
                image_url="https://images.unsplash.com/photo-1519389950473-47ba0277781c",
            ),
            Announcement(
                title="Student council applications",
                content="Applications are open for students who want to help shape school events this semester.",
                category="opportunity",
                priority="important",
                target_classes=["9A", "10B", "11A"],
                target_roles=[],
                image_url="https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
            ),
            Announcement(
                title="Spring workshops are open",
                content="Photography, public speaking, robotics, and school media workshops are open for registration. Each track ends with a small public showcase.",
                category="opportunity",
                priority="important",
                target_classes=["8A", "8B", "9A", "10B", "11A"],
                target_roles=[],
                image_url="https://images.unsplash.com/photo-1497493292307-31c376b6e479",
            ),
            Announcement(
                title="Audience registration rules updated",
                content="If an event is limited by class, spectator applications are available only to students from the allowed class list. Participant applications may still be open separately.",
                category="school-wide",
                priority="important",
                target_classes=[],
                target_roles=[],
                image_url="https://images.unsplash.com/photo-1450101499163-c8848c66ca85",
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
                cover_image="https://images.unsplash.com/photo-1523580494863-6f3031224c94",
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
                cover_image="https://images.unsplash.com/photo-1416879595882-3373a0480b5b",
                registration_open=False,
                registration_deadline=dt(-16, 18, 0),
                participant_capacity=40,
                spectator_capacity=0,
                allowed_spectator_classes=[],
                tags=["community", "eco", "service"],
                status="completed",
            ),
            Event(
                title="Career Forum: Medicine, IT, and Engineering",
                short_description="Older students meet graduates and build a practical roadmap for university and portfolio choices.",
                full_description="The forum has three tracks: medicine and biotechnology, IT and digital products, engineering and urban design. Students prepare questions in advance, and spectators can attend panel sessions when their class is included in the access list.",
                date=date.today() + timedelta(days=22),
                start_time=time(14, 30),
                end_time=time(17, 30),
                location="Conference Hall",
                category="science",
                organizer="Career Office",
                cover_image="https://images.unsplash.com/photo-1552664730-d307ca884978",
                registration_open=True,
                registration_deadline=dt(19, 18, 0),
                participant_capacity=45,
                spectator_capacity=100,
                allowed_spectator_classes=["9A", "10B", "11A"],
                tags=["career", "university", "portfolio"],
                status="upcoming",
                featured=True,
            ),
            Event(
                title="Theater Lab: One Day Rehearsal",
                short_description="Teams stage short scenes from school stories and learn voice, movement, light, and sound basics.",
                full_description="This lab is for students who want to try acting, stage design, lighting, sound, or directing. The final showing happens at the end of the day, with spectator seats open to grades 8-11.",
                date=date.today() + timedelta(days=26),
                start_time=time(13, 0),
                end_time=time(18, 0),
                location="Small Stage",
                category="culture",
                organizer="Drama Studio",
                cover_image="https://images.unsplash.com/photo-1503095396549-807759245b35",
                registration_open=True,
                registration_deadline=dt(23, 18, 0),
                participant_capacity=28,
                spectator_capacity=75,
                allowed_spectator_classes=["8A", "8B", "9A", "10B", "11A"],
                tags=["theater", "stage", "culture"],
                status="upcoming",
            ),
            Event(
                title="Robotics Lab: Autonomous Route",
                short_description="Teams program robots to complete a route without manual control.",
                full_description="Participants work with sensors, movement logic, and rapid testing. Older spectators can watch final runs and vote for the most reliable algorithm.",
                date=date.today() + timedelta(days=40),
                start_time=time(14, 0),
                end_time=time(17, 0),
                location="STEM Lab",
                category="science",
                organizer="Robotics Team",
                cover_image="https://images.unsplash.com/photo-1485827404703-89b55fcc595e",
                registration_open=True,
                registration_deadline=dt(37, 18, 0),
                participant_capacity=20,
                spectator_capacity=45,
                allowed_spectator_classes=["8A", "9A", "10B", "11A"],
                tags=["robotics", "STEM", "programming"],
                status="upcoming",
                featured=True,
            ),
            Event(
                title="Volleyball Parallel League",
                short_description="Grade parallels play short volleyball matches with a separate audience spirit ranking.",
                full_description="Teams play short matches to 15 points. Spectators support their parallel, while organizers recognize both victories and fair play.",
                date=date.today() + timedelta(days=33),
                start_time=time(15, 30),
                end_time=time(18, 30),
                location="Sports Hall",
                category="sports",
                organizer="PE Department",
                cover_image="https://images.unsplash.com/photo-1592656094267-764a45160876",
                registration_open=True,
                registration_deadline=dt(30, 18, 0),
                participant_capacity=72,
                spectator_capacity=180,
                allowed_spectator_classes=[],
                tags=["sports", "league", "teams"],
                status="upcoming",
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
            ),
            EventReport(
                event_id=events[1].id,
                title="Basketball Cup filled the sports hall",
                summary="Class support teams brought banners, chants, and a final match that was decided only in the last minute.",
                results=["8 class teams played", "124 spectators joined the final", "11A won the parallel cup"],
                highlights=["Best captain: 8A", "Loudest support: 9A", "Fair Play recognition: 10B"],
                gallery=[
                    "https://images.unsplash.com/photo-1546519638-68e109498ffc",
                    "https://images.unsplash.com/photo-1519861531473-9200262188bf",
                ],
                quote="The day was less about the score and more about the feeling of being one school.",
            ),
            EventReport(
                event_id=events[2].id,
                title="Debate Night turned courtyard ideas into real proposals",
                summary="Teams discussed safety, quiet zones, navigation, and how the school yard can become more useful between lessons.",
                results=["42 spectators voted", "3 proposals sent to administration", "9A won the audience vote"],
                highlights=["Best argument: 10B", "Strongest speech: 9A", "Most practical idea: 11A"],
                gallery=[
                    "https://images.unsplash.com/photo-1523580494863-6f3031224c94",
                    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
                ],
                quote="A good idea becomes stronger when classmates test it with questions.",
            ),
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
