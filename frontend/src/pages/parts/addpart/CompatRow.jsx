/**
 * CompatRow.jsx
 * Place at: frontend/src/pages/parts/addpart/CompatRow.jsx
 *
 * A single "Also Fits" row:
 *   make → model → sub-model (optional) → from year → to year → remove
 *
 * Uses SearchableSelect so the user can type instead of scrolling.
 * Sub-models are fetched by AddPartPage when car_model_id changes and
 * passed back as row.subModels.
 */

import { SearchableSelect } from './SearchableSelect'

export function CompatRow({ idx, row, makes, allModels, onChange, onRemove }) {
  const rowModels    = row.car_make_id
    ? allModels.filter(m => String(m.make_id) === String(row.car_make_id))
    : []

  const makeOptions     = makes.map(m => ({ value: String(m.id), label: m.name }))
  const modelOptions    = rowModels.map(m => ({ value: String(m.id), label: m.name }))
  const subModelOptions = (row.subModels || []).map(s => ({ value: String(s.id), label: s.name }))

  return (
    <div className="addpart-compat-row">

      {/* Make */}
      <div className="form-group">
        {idx === 0 && <label className="form-label addpart-compat-row-label">Make</label>}
        <SearchableSelect
          value={row.car_make_id}
          onChange={v => onChange(idx, 'car_make_id', v)}
          options={makeOptions}
          placeholder="Type or pick a make…"
        />
      </div>

      {/* Model */}
      <div className="form-group">
        {idx === 0 && <label className="form-label addpart-compat-row-label">Model</label>}
        <SearchableSelect
          value={row.car_model_id}
          onChange={v => onChange(idx, 'car_model_id', v)}
          options={modelOptions}
          placeholder={row.car_make_id ? 'Type or pick a model…' : 'Pick a make first'}
          disabled={!row.car_make_id}
        />
      </div>

      {/* Sub-model / Trim (optional) */}
      <div className="form-group">
        {idx === 0 && <label className="form-label addpart-compat-row-label">Trim <span className="label-optional">(opt.)</span></label>}
        <SearchableSelect
          value={row.car_sub_model_id}
          onChange={v => onChange(idx, 'car_sub_model_id', v)}
          options={subModelOptions}
          placeholder={
            !row.car_model_id            ? 'Pick a model first' :
            subModelOptions.length === 0 ? 'No trims'           :
            'Type or pick a trim…'
          }
          disabled={!row.car_model_id || subModelOptions.length === 0}
        />
      </div>

      {/* Year — single field, same as the car's year in Step 1 */}
      <div className="form-group">
        {idx === 0 && <label className="form-label addpart-compat-row-label">Year</label>}
        <input
          type="number"
          className="form-input"
          placeholder="e.g. 2021"
          value={row.from_year}
          onChange={e => {
            onChange(idx, 'from_year', e.target.value)
            onChange(idx, 'to_year',   e.target.value)
          }}
        />
      </div>

      <button
        type="button"
        className={`addpart-compat-remove-btn ${idx === 0 ? 'has-label' : 'no-label'}`}
        onClick={() => onRemove(idx)}
      >✕</button>
    </div>
  )
}