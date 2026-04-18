import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-32-bytes-minimum")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me-32-bytes-minimum")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///school_platform.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
    EXTERNAL_ASSISTANT_API_KEY = os.getenv("EXTERNAL_ASSISTANT_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
