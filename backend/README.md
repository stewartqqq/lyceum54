# School Platform Backend

Flask REST API for the school student web app.

## Architecture

- `app/__init__.py` creates the Flask app and registers blueprints.
- `app/models.py` contains SQLAlchemy models for users, announcements, events, applications, reports, notifications, and favorites.
- `app/routes/` contains modular REST endpoints.
- `app/services/` contains business logic such as event application rules, notifications, analytics, and future assistant integration.
- `.env` keeps secrets and deployment-specific configuration out of code.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python seed.py
python dev_server.py
```

The API runs at `http://127.0.0.1:5000`.

## Demo Accounts

- Admin: `admin@school.test` / `Password123`
- Student: `mira@school.test` / `Password123`

## Important API Rules

- JWT is required for protected endpoints.
- Admin endpoints require `role=admin`.
- Students can apply as `participant` or `spectator`.
- Duplicate applications for the same event and role are blocked by a database constraint and service validation.
- Spectator applications are rejected unless the student's `className` is included in `allowedSpectatorClasses`. Empty `allowedSpectatorClasses` means all classes are allowed.
- If approved capacity is already full, new applications are waitlisted.
- Approving an application is blocked when the event is already at capacity for that role.

## Main Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/announcements`
- `POST /api/announcements`
- `GET /api/events`
- `POST /api/events/:id/apply`
- `GET /api/applications/my`
- `GET /api/admin/applications`
- `PUT /api/admin/applications/:id/status`
- `GET /api/reports`
- `GET /api/notifications`
- `POST /api/favorites`
- `GET /api/admin/analytics`
- `POST /api/assistant/query`

## Error Shape

```json
{
  "error": {
    "code": "validation_error",
    "message": "Class must look like 7A, 8B, 10A, or 11C."
  }
}
```

## Gemini Assistant

Set your Gemini key in `backend/.env`:

```env
EXTERNAL_ASSISTANT_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Restart Flask after changing `.env`. The frontend never receives this secret. `POST /api/assistant/query` sends the student's question plus visible site context, then `app/services/assistant_service.py` enriches it with database announcements, events, reports, applications, and notifications before calling Gemini.
