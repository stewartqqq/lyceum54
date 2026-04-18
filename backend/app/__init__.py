from flask import Flask, jsonify

from .config import Config
from .extensions import cors, db, jwt, migrate
from .routes.admin import admin_bp
from .routes.announcements import announcements_bp
from .routes.applications import applications_bp
from .routes.assistant import assistant_bp
from .routes.auth import auth_bp
from .routes.events import events_bp
from .routes.favorites import favorites_bp
from .routes.notifications import notifications_bp
from .routes.reports import reports_bp
from .routes.users import users_bp
from .utils import error_response


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    register_blueprints(app)
    register_error_handlers(app)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


def register_blueprints(app: Flask):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(announcements_bp, url_prefix="/api/announcements")
    app.register_blueprint(events_bp, url_prefix="/api/events")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(favorites_bp, url_prefix="/api/favorites")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(assistant_bp, url_prefix="/api/assistant")


def register_error_handlers(app: Flask):
    @app.errorhandler(404)
    def not_found(_):
        return error_response("The requested resource was not found.", 404, "not_found")

    @app.errorhandler(405)
    def method_not_allowed(_):
        return error_response("This method is not allowed for the requested resource.", 405, "method_not_allowed")

    @app.errorhandler(ValueError)
    def validation_error(error):
        return error_response(str(error), 400, "validation_error")

    @jwt.unauthorized_loader
    def missing_token(message):
        return error_response(message, 401, "missing_token")

    @jwt.invalid_token_loader
    def invalid_token(message):
        return error_response(message, 422, "invalid_token")

    @jwt.expired_token_loader
    def expired_token(_, __):
        return error_response("Your session has expired. Please log in again.", 401, "token_expired")
