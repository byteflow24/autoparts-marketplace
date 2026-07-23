import os
from datetime import timedelta

"""
Configuration File

Stores application configuration.

Includes:
- Database URI (PostgreSQL)
- Secret key
- Debug mode
- Other environment settings

Used by the app factory during initialization.
"""

class Config:
    # ── Security ───────────────────────────────────────────
    # Always override these via environment variables in production.
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret'
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "jwt-dev-secret-change-in-prod"
    
    # ── JWT settings ───────────────────────────────────────
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # ── Database ───────────────────────────────────────────
    # Docker Compose sets DATABASE_URL to the Postgres service.
    # Falls back to SQLite for local development without Docker.
    _BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    _DEFAULT_SQLITE_PATH = os.path.join(_BASE_DIR, "instance", "dev.db")
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f"sqlite:///{_DEFAULT_SQLITE_PATH}"  # PostgreSQL connection string
    SQLALCHEMY_TRACK_MODIFICATIONS = False