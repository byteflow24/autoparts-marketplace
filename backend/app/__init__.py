from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os

"""
App Factory

This file initializes the Flask application using the factory pattern.

Responsibilities:
- Create and configure the Flask app
- Initialize extensions (DB, LoginManager, etc.)
- Register blueprints (auth, garage, parts, orders, search)
- Load configuration from config.py

This is the entry point for assembling the whole backend system.
"""

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # Ensure instance folder exists (needed for SQLite DB path).
    os.makedirs(app.instance_path, exist_ok=True)

    CORS(app, resources={r"/*": {"origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]}}, supports_credentials=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    with app.app_context():
        from app.models import user, garage, part, order, car
        from app.cli import register_cli
        register_cli(app)
        # Import Blueprints later
        from app.main.routes import main_bp
        from app.auth.routes import auth_bp
        from app.garage.routes import garage_bp
        from app.orders.routes import orders_bp
        from app.parts.routes import parts_bp
        from app.search.routes import search_bp

        app.register_blueprint(main_bp)
        app.register_blueprint(auth_bp)
        app.register_blueprint(garage_bp)
        app.register_blueprint(orders_bp)
        app.register_blueprint(parts_bp)
        app.register_blueprint(search_bp)

    return app
