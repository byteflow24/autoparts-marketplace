"""
Fast parallel import of car sub-models (trims) from NHTSA.

Uses a thread pool to fire multiple NHTSA requests concurrently,
cutting runtime from hours to ~10-20 minutes for all makes × all years.

Strategy: one API call per (make, year).
  GET /GetModelsForMakeIdYear/makeId/{id}/modelYear/{year}/vehicleType/car
Each row in the response has a "Series" field — we store those as sub-models.

Usage:
    docker compose exec backend python scripts/import_nhtsa_submodels.py

Tune WORKERS and YEAR_START/YEAR_END below if needed.
"""

import sys
import os
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app, db
from app.models.car import CarMake, CarModel, CarSubModel

NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"
YEAR_START = 2000
YEAR_END   = 2025
WORKERS    = 20    # parallel threads — NHTSA is fine with this
BATCH_SIZE = 500   # insert rows in chunks


def fetch(nhtsa_make_id: int, year: int) -> tuple[int, int, list[dict]]:
    """Fetch one (make, year) page from NHTSA. Returns (make_id, year, rows)."""
    url = (
        f"{NHTSA_BASE}/GetModelsForMakeIdYear"
        f"/makeId/{nhtsa_make_id}/modelYear/{year}/vehicleType/car?format=json"
    )
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            return nhtsa_make_id, year, resp.json().get("Results") or []
        except Exception:
            if attempt == 2:
                return nhtsa_make_id, year, []
            time.sleep(1)


def normalise(s: str) -> str:
    return s.strip().lower()


def main():
    app = create_app()
    with app.app_context():
        makes  = CarMake.query.all()
        models = CarModel.query.all()
        years  = list(range(YEAR_START, YEAR_END + 1))

        # make_id → {normalised model name → CarModel}
        make_model_map: dict[int, dict[str, CarModel]] = defaultdict(dict)
        for m in models:
            make_model_map[m.make_id][normalise(m.name)] = m

        # model_id → set of already-known normalised trim names
        existing: dict[int, set] = defaultdict(set)
        for sm in CarSubModel.query.all():
            existing[sm.model_id].add(normalise(sm.name))

        # Build all (make, year) tasks — skip makes with no models in our DB
        tasks = [
            (make, year)
            for make in makes
            if make_model_map.get(make.id)
            for year in years
        ]

        total = len(tasks)
        done  = 0
        inserted_total = 0
        pending: list[CarSubModel] = []

        print(f"Firing {total:,} requests with {WORKERS} workers "
              f"({len(makes)} makes × {len(years)} years) …\n")

        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {
                pool.submit(fetch, make.nhtsa_make_id, year): make
                for make, year in tasks
            }

            for future in as_completed(futures):
                make       = futures[future]
                nhtsa_id, year, rows = future.result()
                model_lookup = make_model_map.get(make.id, {})
                done += 1

                for row in rows:
                    series = (row.get("Series") or "").strip()
                    if not series:
                        continue
                    model_name = normalise(row.get("Model_Name") or "")
                    car_model  = model_lookup.get(model_name)
                    if not car_model:
                        continue
                    if normalise(series) in existing[car_model.id]:
                        continue

                    existing[car_model.id].add(normalise(series))
                    pending.append(CarSubModel(model_id=car_model.id, name=series))
                    inserted_total += 1

                # Flush in batches to keep memory and transaction size small
                if len(pending) >= BATCH_SIZE:
                    db.session.add_all(pending)
                    db.session.commit()
                    pending = []

                if done % 500 == 0 or done == total:
                    print(f"  {done:,}/{total:,} requests done — {inserted_total:,} sub-models so far")

        if pending:
            db.session.add_all(pending)
            db.session.commit()

        print(f"\nDone — {inserted_total:,} sub-models inserted.")


if __name__ == "__main__":
    main()