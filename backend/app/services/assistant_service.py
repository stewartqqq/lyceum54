import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

from flask import current_app

from ..models import Announcement, Event, EventApplication, EventReport, Notification, User


class AssistantService:
    """Gemini-backed school assistant.

    Secrets stay on the backend. The frontend sends only a question and optional
    visible page context; this service enriches it with database context.
    """

    def answer(self, prompt: str, user: User | None = None, client_context: dict | None = None) -> dict:
        site_context = self._build_site_context(user, client_context or {})
        api_key = current_app.config.get("EXTERNAL_ASSISTANT_API_KEY")

        if not api_key:
            return self._mock_answer(prompt, site_context, "mock")

        try:
            answer = self._ask_gemini(prompt, site_context, api_key)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, KeyError) as exc:
            current_app.logger.warning("Gemini assistant failed: %s", exc)
            fallback = self._mock_answer(prompt, site_context, "fallback")
            fallback["answer"] = (
                "Gemini сейчас не ответил, поэтому я использую данные платформы. "
                + fallback["answer"]
            )
            return fallback

        return {
            "mode": "gemini",
            "answer": answer,
            "suggestions": self._suggestions(site_context),
            "context": self._public_context_summary(site_context),
        }

    def _ask_gemini(self, prompt: str, site_context: dict, api_key: str) -> str:
        model = current_app.config.get("GEMINI_MODEL", "gemini-2.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                "Ты AI-помощник школьной платформы Lyceum Life. "
                                "Отвечай на русском, если пользователь не просит казахский. "
                                "Будь кратким, полезным и конкретным. "
                                "Используй общие знания Gemini, но школьные факты бери из контекста платформы. "
                                "Если информации в контексте нет, честно скажи, что точных данных на сайте нет.\n\n"
                                f"Контекст платформы JSON:\n{json.dumps(site_context, ensure_ascii=False)}\n\n"
                                f"Вопрос ученика: {prompt}"
                            )
                        }
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.45,
                "topP": 0.9,
                "maxOutputTokens": 900,
            },
        }
        data = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=25) as response:
            payload = json.loads(response.read().decode("utf-8"))

        parts = payload["candidates"][0]["content"]["parts"]
        text = "\n".join(part.get("text", "") for part in parts).strip()
        if not text:
            raise ValueError("Gemini returned an empty answer")
        return text

    def _build_site_context(self, user: User | None, client_context: dict) -> dict:
        db_context = {
            "user": user.to_dict() if user else client_context.get("user"),
            "announcements": [
                item.to_dict()
                for item in Announcement.query.order_by(Announcement.created_at.desc()).limit(12).all()
            ],
            "events": [
                item.to_dict(user)
                for item in Event.query.order_by(Event.date.asc(), Event.start_time.asc()).limit(18).all()
            ],
            "reports": [
                item.to_dict()
                for item in EventReport.query.order_by(EventReport.published_at.desc()).limit(10).all()
            ],
            "applications": [],
            "notifications": [],
        }

        if user:
            db_context["applications"] = [
                item.to_dict()
                for item in EventApplication.query.filter_by(user_id=user.id)
                .order_by(EventApplication.created_at.desc())
                .limit(12)
                .all()
            ]
            db_context["notifications"] = [
                item.to_dict()
                for item in Notification.query.filter_by(user_id=user.id)
                .order_by(Notification.created_at.desc())
                .limit(10)
                .all()
            ]

        visible_context = {
            "user": client_context.get("user"),
            "announcements": client_context.get("announcements", [])[:12],
            "events": client_context.get("events", [])[:18],
            "reports": client_context.get("reports", [])[:10],
            "applications": client_context.get("applications", [])[:12],
            "notifications": client_context.get("notifications", [])[:10],
            "language": client_context.get("language"),
        }

        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "database": db_context,
            "visiblePageData": visible_context,
        }

    def _mock_answer(self, prompt: str, site_context: dict, mode: str) -> dict:
        events = site_context.get("visiblePageData", {}).get("events") or site_context.get("database", {}).get("events") or []
        announcements = site_context.get("visiblePageData", {}).get("announcements") or site_context.get("database", {}).get("announcements") or []
        reports = site_context.get("visiblePageData", {}).get("reports") or site_context.get("database", {}).get("reports") or []
        event_titles = ", ".join(item.get("title", "мероприятие") for item in events[:4])
        announcement_titles = ", ".join(item.get("title", "объявление") for item in announcements[:3])

        return {
            "mode": mode,
            "answer": (
                f"Я вижу данные платформы и могу помочь по запросу: \"{prompt}\". "
                f"Сейчас на сайте есть мероприятия: {event_titles or 'пока не найдены'}. "
                f"Важные объявления: {announcement_titles or 'пока не найдены'}. "
                f"Отчетов в контексте: {len(reports)}. "
                "Чтобы включить настоящий Gemini-ответ, добавь ключ в backend/.env."
            ),
            "suggestions": self._suggestions(site_context),
            "context": self._public_context_summary(site_context),
        }

    def _suggestions(self, site_context: dict) -> list[str]:
        user = site_context.get("visiblePageData", {}).get("user") or site_context.get("database", {}).get("user") or {}
        class_name = user.get("className") or "моего класса"
        return [
            f"Какие мероприятия доступны для {class_name}?",
            "Какие дедлайны ближайшие?",
            "Кратко перескажи важные объявления",
        ]

    def _public_context_summary(self, site_context: dict) -> dict:
        visible = site_context.get("visiblePageData", {})
        database = site_context.get("database", {})
        return {
            "eventsCount": len(visible.get("events") or database.get("events") or []),
            "announcementsCount": len(visible.get("announcements") or database.get("announcements") or []),
            "reportsCount": len(visible.get("reports") or database.get("reports") or []),
            "applicationsCount": len(visible.get("applications") or database.get("applications") or []),
        }


assistant_service = AssistantService()
