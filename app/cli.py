import click
from flask import current_app
from flask_migrate import stamp
from sqlalchemy import inspect

from app import db


def register_cli(app):
    @app.cli.command("init-db")
    @click.option(
        "--force",
        is_flag=True,
        help="Initialize even if tables already exist (dangerous).",
    )
    def init_db(force: bool):
        """
        Initialize the database for this app.

        This project’s Alembic history starts with *alter* migrations (not full create-table migrations).
        So for a brand-new DB file we must:
        - create all tables from SQLAlchemy models
        - stamp alembic_version to head so `flask db migrate/upgrade` works going forward
        """
        engine = db.engine
        insp = inspect(engine)
        tables = [t for t in insp.get_table_names() if t != "alembic_version"]

        if tables and not force:
            raise click.ClickException(
                "Database already has tables. Refusing to run init-db without --force."
            )

        if tables and force:
            click.echo("Existing tables detected; continuing due to --force.")

        click.echo("Creating tables from models...")
        db.create_all()

        click.echo("Stamping Alembic revision to head...")
        stamp(directory="migrations", revision="head")

        click.echo("Database initialized successfully.")

