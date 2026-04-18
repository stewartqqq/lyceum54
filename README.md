# Lyceum Life - School Student Platform

Lyceum Life is a web school platform for students, built with a React + Vite frontend and a Python Flask REST API. It is designed for one school community: students see relevant announcements, discover events, apply as participants or spectators, track applications, browse reports from completed events, save favorites, and use a future-ready School Helper assistant.

## 1. System Architecture Overview

The project is split into two apps:

- `backend/`: Flask API with SQLAlchemy models, JWT authentication, role checks, event application rules, seed data, analytics, and an assistant integration service placeholder.
- `frontend/`: React + Vite TypeScript web app with dashboard navigation, typed API services, persisted auth state, polished desktop-friendly screens, and demo fallback data.

Core data flow:

1. Student registers with `fullName`, `email`, `password`, and `className`.
2. Backend hashes the password and issues a JWT.
3. Web app stores the session in localStorage.
4. Student browses personalized content and events.
5. Event applications are submitted to Flask.
6. Backend validates deadline, duplicate application, capacity, and spectator class rules.
7. Admins can moderate applications and view analytics.

The most important product rule is enforced in `backend/app/services/application_service.py`: a spectator application is rejected when the event has `allowed_spectator_classes` and the student's `class_name` is not included.

## 2. Folder Structure

```text
.
+-- backend/
|   +-- app/
|   |   +-- routes/
|   |   +-- services/
|   |   +-- __init__.py
|   |   +-- config.py
|   |   +-- extensions.py
|   |   +-- models.py
|   |   +-- utils.py
|   +-- .env.example
|   +-- README.md
|   +-- requirements.txt
|   +-- run.py
|   +-- seed.py
+-- frontend/
    +-- src/
    |   +-- components/
    |   +-- constants/
    |   +-- navigation/
    |   +-- screens/
    |   +-- services/
    |   +-- store/
    |   +-- types/
    |   +-- utils/
    +-- .env.example
    +-- index.html
    +-- README.md
    +-- package.json
    +-- tsconfig.json
    +-- vite.config.ts
```

## 3. Backend Implementation

Implemented:

- App factory and modular blueprints.
- SQLAlchemy entities: `User`, `Announcement`, `Event`, `EventApplication`, `EventReport`, `Notification`, `Favorite`.
- JWT auth: register, login, current user.
- Secure password hashing with Werkzeug.
- Role guards for admin/staff endpoints.
- Announcement targeting by class and role.
- Event CRUD with allowed spectator classes, deadlines, capacities, tags, status, and featured content.
- Event application service with duplicate prevention, deadline checks, capacity handling, waitlist state, and backend spectator class enforcement.
- Reports CRUD for completed event recaps.
- Notifications center.
- Favorites for events and reports.
- Admin analytics.
- Assistant placeholder using `EXTERNAL_ASSISTANT_API_KEY` on the backend only.
- Demo seed data with students, admin, events, announcements, applications, reports, notifications, and favorites.

## 4. Frontend Implementation

Implemented:

- React + Vite web app in TypeScript.
- Sidebar navigation for Home, Announcements, Events, Calendar, Reports, Profile, and School Helper.
- API service layer with typed models, localStorage auth persistence, and local demo fallback.
- Responsive web layout with dashboard cards, filters, detail pages, event application flow, and assistant placeholder.
- Screens: login, home, announcements, announcement details, events, event details, calendar, reports, report details, profile, applications, notifications, assistant.
- UX features: search, filters, class-specific messaging, application status, this week widget, recommendations, achievements, and empty states.

## 5. Setup Instructions

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python seed.py
python dev_server.py
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Then open `http://127.0.0.1:5173`.

Demo accounts:

- Admin: `admin@school.test` / `Password123`
- Student: `mira@school.test` / `Password123`

Frontend API URL:

```env
VITE_API_URL=http://127.0.0.1:5000/api
```

## 6. Product Vision And UX Strategy

Product vision: make the school feel alive and easy to navigate from a student's computer. The app should answer: what matters today, what can I join, what is open to my class, what did our school achieve, and what should I do next?

Target student needs:

- Fast updates without searching group chats.
- Clear event eligibility and deadlines.
- Simple application tracking.
- Motivation through reports, achievements, badges, and school highlights.
- A sense of class identity and school community.

Modern IA:

- Home: personalized command center.
- Announcements: official updates with filtering.
- Events: opportunities and applications.
- Calendar: visual planning.
- Reports: community memory and achievement feed.
- Profile: applications, favorites, badges, notifications, settings, assistant.

Gamification that stays useful:

- Participation badges by category.
- Class participation streaks.
- Attendance history.
- Recognition in event reports.
- Lightweight polls after events.
- Feedback forms that help organizers improve.

Notification strategy:

- Application status changes.
- New class-specific announcements.
- Event deadline reminders.
- Reports for events the student joined or favorited.
- Weekly digest notification.

## 7. Future Improvements

1. Add Flask-Migrate migration files and PostgreSQL deployment config.
2. Add admin screens for event creation, moderation, analytics, and reports.
3. Add attendance, feedback, badges, polls, and reminders as first-class models.
4. Add email or browser notification reminders for deadlines and application decisions.
5. Connect the School Helper to a real external API in `backend/app/services/assistant_service.py`.
6. Add automated backend tests for application rules and role checks.
7. Add deployment config for Vercel/Netlify plus a production WSGI backend.
