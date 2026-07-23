from app import create_app, db

"""
Application Entry Point

Runs the Flask application.

Responsibilities:
- Create app instance
- Start development server

Used for local development.
"""

app = create_app()

# with app.app_context():
#     db.create_all()

if __name__ == "__main__":
    app.run(debug=True)
