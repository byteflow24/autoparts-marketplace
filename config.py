import os

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
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret' 
    # Store dev DB under /instance by default (Flask convention).
    # Use an absolute path so CLI commands run from any CWD.
    _BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    _DEFAULT_SQLITE_PATH = os.path.join(_BASE_DIR, "instance", "dev.db")
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f"sqlite:///{_DEFAULT_SQLITE_PATH}"  # PostgreSQL connection string
    SQLALCHEMY_TRACK_MODIFICATIONS = False