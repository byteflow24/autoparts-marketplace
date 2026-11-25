"""
seed.py
Place at: backend/scripts/seed.py

Run with:
  docker compose exec backend python scripts/seed.py

Creates:
  - 1 garage user + garage
  - 10 parts across all categories
  - 10 GaragePart listings (active, in stock)

Safe to run multiple times — checks before inserting.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models.user import User
from app.models.garage import Garage
from app.models.part import Part, GaragePart
from werkzeug.security import generate_password_hash

app = create_app()

PARTS_DATA = [
    {"name": "Brake Pad Set",       "part_number": "BP-001", "brand": "Bosch",    "category": "Brakes",       "description": "Front and rear brake pads"},
    {"name": "Air Filter",           "part_number": "AF-002", "brand": "Mann",     "category": "Engine",       "description": "High-flow air filter"},
    {"name": "Spark Plug Set",       "part_number": "SP-003", "brand": "NGK",      "category": "Engine",       "description": "Set of 4 iridium spark plugs"},
    {"name": "Shock Absorber Front", "part_number": "SA-004", "brand": "KYB",      "category": "Suspension",   "description": "Front shock absorber"},
    {"name": "Alternator",           "part_number": "AL-005", "brand": "Denso",    "category": "Electrical",   "description": "12V alternator 90A"},
    {"name": "Radiator",             "part_number": "RD-006", "brand": "Nissens",  "category": "Cooling",      "description": "Full aluminum radiator"},
    {"name": "Exhaust Manifold",     "part_number": "EM-007", "brand": "Bosal",    "category": "Exhaust",      "description": "Cast iron exhaust manifold"},
    {"name": "Transmission Filter",  "part_number": "TF-008", "brand": "Febi",     "category": "Transmission", "description": "Automatic transmission filter kit"},
    {"name": "Front Bumper",         "part_number": "FB-009", "brand": "OEM",      "category": "Body",         "description": "Front bumper cover"},
    {"name": "Wheel Bearing",        "part_number": "WB-010", "brand": "SKF",      "category": "Suspension",   "description": "Front wheel bearing hub assembly"},
]

with app.app_context():
    # ── Garage user ─────────────────────────────────────────
    user = User.query.filter_by(email="demo@garage.com").first()
    if not user:
        user = User(
            name="Demo Garage",
            email="demo@garage.com",
            password=generate_password_hash("demo1234", method="pbkdf2:sha256", salt_length=16),
            role="garage"
        )
        db.session.add(user)
        db.session.flush()
        print("✅ Created garage user: demo@garage.com / demo1234")
    else:
        print("ℹ️  Garage user already exists")

    # ── Garage profile ───────────────────────────────────────
    garage = Garage.query.filter_by(user_id=user.id).first()
    if not garage:
        garage = Garage(
            user_id=user.id,
            garage_name="Al Noor Auto Parts",
            CR_number=123456789,
            location="Doha, Qatar",
            national_address="Al Sadd, Doha",
            specialization="Engine, Brakes, Suspension"
        )
        db.session.add(garage)
        db.session.flush()
        print("✅ Created garage: Al Noor Auto Parts")
    else:
        print("ℹ️  Garage already exists")

    # ── Parts + GarageParts ──────────────────────────────────
    created = 0
    for p_data in PARTS_DATA:
        part = Part.query.filter_by(part_number=p_data["part_number"]).first()
        if not part:
            part = Part(
                name=p_data["name"],
                part_number=p_data["part_number"],
                brand=p_data["brand"],
                category=p_data["category"],
                description=p_data["description"],
                verified=True,
                source="seed"
            )
            db.session.add(part)
            db.session.flush()

        gp = GaragePart.query.filter_by(garage_id=garage.id, part_id=part.id).first()
        if not gp:
            gp = GaragePart(
                garage_id=garage.id,
                part_id=part.id,
                car_model_id=None,      # no car restriction — visible to all searches
                price=round(50 + PARTS_DATA.index(p_data) * 15.5, 2),
                cost_price=round(30 + PARTS_DATA.index(p_data) * 10, 2),
                quantity=20,
                from_year=2015,
                to_year=2024,
                is_active=True,
                delivery_available=True,
                installation_available=True,
            )
            db.session.add(gp)
            created += 1

    db.session.commit()
    print(f"✅ Seeded {created} new garage parts")
    print("\nDone! You can now log in as:")
    print("  Email:    demo@garage.com")
    print("  Password: demo1234")