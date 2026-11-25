/**
 * CarSelector.jsx
 * Place at: frontend/src/pages/parts/addpart/CarSelector.jsx
 *
 * Step 1 — Select / lock the car (year → make → model → trim).
 * Each dropdown is a searchable combo-box so the user can type
 * instead of scrolling through long lists.
 */

import { SearchableSelect } from './SearchableSelect'

export function CarSelector({
  carLocked,
  year, setYear,
  makes, models, subModels,
  carMakeId, setCarMakeId,
  carModelId, setCarModelId,
  carSubModelId, setCarSubModelId,
  carErrors, setCarErrors,
  years,
  onLock,
  onUnlock,
  carLabel,
}) {
  const yearOptions     = years.map(y => ({ value: String(y), label: String(y) }))
  const makeOptions     = makes.map(m => ({ value: String(m.id), label: m.name }))
  const modelOptions    = models.map(m => ({ value: String(m.id), label: m.name }))
  const subModelOptions = subModels.map(s => ({ value: String(s.id), label: s.name }))

  return (
    <div className="addpart-car-card" data-locked={carLocked ? 'true' : 'false'}>
      <div className="addpart-car-header">
        <span className="addpart-step-badge">Step 1</span>
        <strong>Select the Car</strong>
        {carLocked && (
          <button
            type="button"
            className="btn btn-outline-navy addpart-change-car"
            onClick={onUnlock}
          >
            ✎ Change Car
          </button>
        )}
      </div>

      {carLocked ? (
        <div className="addpart-car-locked">
          🚗 <strong>{carLabel}</strong>
        </div>
      ) : (
        <>
          <div className="form-grid">
            {/* Year */}
            <div className="form-group">
              <label className="form-label">Year</label>
              <SearchableSelect
                value={year}
                onChange={v => { setYear(v); setCarErrors(p => ({ ...p, year: '' })) }}
                options={yearOptions}
                placeholder="Type or pick a year…"
                hasError={!!carErrors.year}
              />
              {carErrors.year && <small className="form-error">{carErrors.year}</small>}
            </div>

            {/* Make */}
            <div className="form-group">
              <label className="form-label">Car Make</label>
              <SearchableSelect
                value={carMakeId}
                onChange={v => {
                  setCarMakeId(v)
                  setCarModelId('')
                  setCarSubModelId('')
                  setCarErrors(p => ({ ...p, carMakeId: '' }))
                }}
                options={makeOptions}
                placeholder="Type or pick a make…"
                hasError={!!carErrors.carMakeId}
              />
              {carErrors.carMakeId && <small className="form-error">{carErrors.carMakeId}</small>}
            </div>

            {/* Model */}
            <div className="form-group">
              <label className="form-label">Car Model</label>
              <SearchableSelect
                value={carModelId}
                onChange={v => {
                  setCarModelId(v)
                  setCarSubModelId('')
                  setCarErrors(p => ({ ...p, carModelId: '' }))
                }}
                options={modelOptions}
                placeholder={carMakeId ? 'Type or pick a model…' : 'Pick a make first'}
                disabled={!carMakeId}
                hasError={!!carErrors.carModelId}
              />
              {carErrors.carModelId && <small className="form-error">{carErrors.carModelId}</small>}
            </div>

            {/* Sub-model / Trim */}
            <div className="form-group">
              <label className="form-label">
                Trim / Sub-model <span className="label-optional">(optional)</span>
              </label>
              <SearchableSelect
                value={carSubModelId}
                onChange={setCarSubModelId}
                options={subModelOptions}
                placeholder={
                  !carModelId            ? 'Pick a model first'  :
                  subModels.length === 0 ? 'No trims available'  :
                  'Type or pick a trim…'
                }
                disabled={!carModelId || subModels.length === 0}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={onLock}>
              Confirm Car →
            </button>
          </div>
        </>
      )}
    </div>
  )
}