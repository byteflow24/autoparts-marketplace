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
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///dev.db' # PostgreSQL connection string
    SQLALCHEMY_TRACK_MODIFICATIONS = False