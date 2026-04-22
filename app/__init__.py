from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

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
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    from app.models.user import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(user_id)

    with app.app_context():
        from app.models import user, garage, part, order, car
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
