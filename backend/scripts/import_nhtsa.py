"""
Import vehicle makes and models from the NHTSA API.

Run:

    python scripts/import_nhtsa.py
"""

import os
import sys

# -------------------------------------------------------
# Make the backend package importable
# -------------------------------------------------------

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from app import create_app, db
from app.models.car import CarMake, CarModel
from app.vehicles.services import (
    get_all_makes,
    get_models_for_make,
)

app = create_app()


def import_makes_and_models():
    """
    Import all makes and models from NHTSA.
    """

    print("=" * 60)
    print("Starting NHTSA Import")
    print("=" * 60)

    makes_added = 0
    models_added = 0

    makes = get_all_makes()

    print(f"Found {len(makes)} makes.\n")

    with app.app_context():

        for index, make_data in enumerate(makes, start=1):

            print(f"[{index}/{len(makes)}] {make_data['name']}")

            # ----------------------------------------------------
            # Check if make already exists
            # ----------------------------------------------------

            make = CarMake.query.filter_by(
                nhtsa_make_id=make_data["nhtsa_id"]
            ).first()

            if not make:
                make = CarMake(
                    nhtsa_make_id=make_data["nhtsa_id"],
                    name=make_data["name"],
                )

                db.session.add(make)
                db.session.flush()

                makes_added += 1

            # ----------------------------------------------------
            # Import models
            # ----------------------------------------------------

            try:
                models = get_models_for_make(make_data["nhtsa_id"])

            except Exception as ex:
                print(f"    Failed to load models ({ex})")
                continue

            added_this_make = 0

            for model_data in models:

                exists = CarModel.query.filter_by(
                    nhtsa_model_id=model_data["nhtsa_model_id"]
                ).first()

                if exists:
                    continue

                db.session.add(
                    CarModel(
                        nhtsa_model_id=model_data["nhtsa_model_id"],
                        make_id=make.id,
                        name=model_data["name"],
                    )
                )

                models_added += 1
                added_this_make += 1

            db.session.commit()

            print(f"    + {added_this_make} models imported")

    print("\n" + "=" * 60)
    print("Import Finished")
    print("=" * 60)
    print(f"Makes added : {makes_added}")
    print(f"Models added: {models_added}")
    print("=" * 60)


if __name__ == "__main__":
    import_makes_and_models()