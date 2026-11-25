/**
 * PartForm.jsx
 * Place at: frontend/src/pages/parts/addpart/PartForm.jsx
 *
 * Step 2 — The full "Add a Part" form:
 *   catalog search → select or create new → inventory details → compat rows → submit
 *
 * Auto-fill changes:
 *  - Trigger is part name (+ car context), not part number
 *  - AI lookup sends: part_name, car_make, car_model, car_sub_model, year
 *  - AI Found box shows: part_number, from_year, to_year, category, subcategory, description (no brand)
 *  - After Apply: category, subcategory, from_year, to_year fields are hidden (auto-filled)
 *
 * v4 changes:
 *  - Delivery / Installation checkboxes now reveal an optional price input when checked
 */

import { CATEGORIES, SUBCATEGORY_MAP } from './partConstants'
import { CompatRow } from './CompatRow'
import { SearchableSelect } from './SearchableSelect'

export function PartForm({
  // part state
  part, setPF,
  partErrors, saveError,
  saving,
  // catalog
  catalogResults, catalogLoading,
  onCatalogSelect, onCreateNew,
  onDismissCatalog,
  // AI lookup
  lookupLoading, lookupResult, lookupError, lookupApplied,
  onAILookup, onApplyLookup, onDismissLookup,
  // category
  onCategoryChange,
  // compat rows
  makes, allModels,
  onAddCompatRow, onRemoveCompatRow, onCompatChange,
  // submit / clear
  onSubmit, onClear,
  // car context (for auto-fill)
  year,
  carMakeName,
  carModelName,
  carSubModelName,
}) {
  const availableSubcats = SUBCATEGORY_MAP[part.category] || []

  // Auto-fill already applied — hide the fields it filled
  const autoFilled = lookupApplied && !!lookupResult

  return (
    <div className="addpart-form-card">
      <div className="addpart-car-header">
        <span className="addpart-step-badge">Step 2</span>
        <strong>Add a Part for this Car</strong>
      </div>

      {saveError && <div className="alert alert-danger">{saveError}</div>}

      <form onSubmit={onSubmit} noValidate>

        {/* ── Catalog search ── */}
        <div className="form-group">
          <label className="form-label">Search Parts Catalog</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, part number, OEM…"
            value={part.catalogQuery}
            onChange={e => {
              setPF('catalogQuery', e.target.value)
              setPF('selectedPart', null)
              setPF('creatingNew', false)
            }}
            autoComplete="off"
          />
          {catalogLoading && <small className="form-help">Searching…</small>}

          {/* No results prompt */}
          {!catalogLoading && part.catalogQuery.trim().length >= 2 &&
            catalogResults.length === 0 && !part.selectedPart && !part.creatingNew && (
            <div className="catalog-no-results">
              <small className="form-help">No matches found.</small>
              <button type="button" className="btn btn-primary" onClick={onCreateNew}>
                + Create New Part
              </button>
            </div>
          )}

          {/* Results dropdown */}
          {catalogResults.length > 0 && (
            <div className="catalog-results">
              <div className="catalog-results-toolbar">
                <span className="catalog-results-count">
                  {catalogResults.length} result{catalogResults.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  className="catalog-results-dismiss"
                  onClick={onDismissCatalog}
                  title="Dismiss results"
                >
                  ✕ Cancel
                </button>
              </div>
              {catalogResults.map(p => (
                <button key={p.id} type="button" className="catalog-result" onClick={() => onCatalogSelect(p)}>
                  <div className="catalog-result-header">
                    <strong className="catalog-result-name">{p.name}</strong>
                    <span className="catalog-result-select">Select →</span>
                  </div>
                  <div className="catalog-result-details">
                    {p.part_number && <div className="catalog-result-field"><span className="catalog-result-label">Part #</span><span>{p.part_number}</span></div>}
                    {p.category    && <div className="catalog-result-field"><span className="catalog-result-label">Category</span><span>{p.category}</span></div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected from catalog */}
        {part.selectedPart && (
          <div className="catalog-selected">
            <div className="catalog-selected-row">
              <div>
                <strong>{part.selectedPart.name}</strong>
                {part.selectedPart.part_number && <div>Part #: {part.selectedPart.part_number}</div>}
                {part.selectedPart.category    && <div>Category: {part.selectedPart.category}</div>}
              </div>
              <button
                type="button"
                className="catalog-selected-dismiss"
                onClick={() => { setPF('selectedPart', null); setPF('catalogQuery', '') }}
              >✕</button>
            </div>
          </div>
        )}

        {/* ── New part fields ── */}
        {part.creatingNew && (
          <div className="addpart-new-part-fields">
            <div className="form-grid">

              {/* Part Name */}
              <div className="form-group">
                <label className="form-label">Part Name *</label>
                <input
                  type="text"
                  className={`form-input ${partErrors.name ? 'input-error' : ''}`}
                  placeholder="e.g. Front Brake Pad Set"
                  value={part.name}
                  onChange={e => setPF('name', e.target.value)}
                />
                {partErrors.name && <small className="form-error">{partErrors.name}</small>}
              </div>

              {/* Part Number — shown always; auto-filled if lookup applied */}
              <div className="form-group">
                <label className="form-label">
                  Part Number / OEM
                  <span className="label-optional"> (optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 04465-02190"
                  value={part.part_number}
                  onChange={e => setPF('part_number', e.target.value)}
                  readOnly={autoFilled}
                  style={autoFilled ? { background: 'var(--gray-50)', color: 'var(--gray-500)' } : {}}
                />
              </div>

            </div>

            {/* Auto-fill button — uses part name + car context */}
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                className="btn btn-outline-navy addpart-pn-btn"
                onClick={onAILookup}
                disabled={lookupLoading || (!part.name.trim() && !part.part_number.trim())}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {lookupLoading ? '…' : '🔍 Auto-Fill'}
              </button>
              {!part.name.trim() && !part.part_number.trim() && (
                <small className="form-help" style={{ marginTop: '4px', display: 'block' }}>
                  Enter a part name or part number above to enable auto-fill.
                </small>
              )}
              {lookupError && <small className="form-error" style={{ marginTop: '4px', display: 'block' }}>{lookupError}</small>}
            </div>

            {/* AI Lookup Result */}
            {lookupResult && !lookupApplied && (
              <div className="lookup-result-card">
                <div className="lookup-result-header">
                  <span className="lookup-result-title">🤖 AI Found a Match</span>
                  <button type="button" className="lookup-result-dismiss" onClick={onDismissLookup}>✕</button>
                </div>
                <div className="lookup-result-fields">
                  {lookupResult.part_number && (
                    <div>
                      <span className="lookup-result-field-label">Part # / OEM</span>
                      <div>{lookupResult.part_number}</div>
                    </div>
                  )}
                  {lookupResult.name && (
                    <div>
                      <span className="lookup-result-field-label">Part Name</span>
                      <div>{lookupResult.name}</div>
                    </div>
                  )}
                  {(lookupResult.from_year || lookupResult.to_year) && (
                    <div>
                      <span className="lookup-result-field-label">Year Range</span>
                      <div>
                        {lookupResult.from_year && lookupResult.to_year
                          ? `${lookupResult.from_year} – ${lookupResult.to_year}`
                          : lookupResult.from_year
                            ? `${lookupResult.from_year}+`
                            : `up to ${lookupResult.to_year}`}
                      </div>
                    </div>
                  )}
                  {lookupResult.category && (
                    <div>
                      <span className="lookup-result-field-label">Category</span>
                      <div>{lookupResult.category}</div>
                    </div>
                  )}
                  {lookupResult.subcategory && (
                    <div>
                      <span className="lookup-result-field-label">Subcategory</span>
                      <div>{lookupResult.subcategory}</div>
                    </div>
                  )}
                  {lookupResult.description && (
                    <div>
                      <span className="lookup-result-field-label">Description</span>
                      <div style={{ fontSize: '0.88rem' }}>{lookupResult.description}</div>
                    </div>
                  )}
                </div>
                <div className="lookup-result-actions">
                  <button type="button" className="btn btn-primary" onClick={onApplyLookup}>✓ Apply</button>
                  <button type="button" className="btn btn-outline-navy" onClick={onDismissLookup}>Ignore</button>
                </div>
              </div>
            )}

            {lookupApplied && (
              <div className="lookup-applied-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✓ Auto-fill applied — review inventory details below.</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-navy"
                  onClick={onDismissLookup}
                  style={{ fontSize: '0.78rem' }}
                >
                  ✎ Edit manually
                </button>
              </div>
            )}

            {/* Category + Subcategory — hidden after auto-fill */}
            {!autoFilled && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <SearchableSelect
                    value={part.category}
                    onChange={v => onCategoryChange(v)}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                    placeholder="Type or pick a category…"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Subcategory
                    {!part.category && <span className="label-optional"> (choose category first)</span>}
                  </label>
                  <SearchableSelect
                    value={part.subcategory}
                    onChange={v => setPF('subcategory', v)}
                    options={availableSubcats.map(s => ({ value: s, label: s }))}
                    placeholder={part.category ? 'Type or pick a subcategory…' : 'Pick a category first'}
                    disabled={!part.category || availableSubcats.length === 0}
                  />
                </div>
              </div>
            )}

            {/* When auto-filled: show category chain as a read-only pill row */}
            {autoFilled && (part.category || part.subcategory) && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {part.category && (
                  <span style={{
                    background: 'var(--navy-50, #eef2ff)', color: 'var(--navy-700, #3730a3)',
                    borderRadius: '999px', padding: '2px 12px', fontSize: '0.82rem', fontWeight: 600
                  }}>
                    {part.category}
                  </span>
                )}
                {part.subcategory && (
                  <>
                    <span style={{ color: 'var(--gray-400)' }}>›</span>
                    <span style={{
                      background: 'var(--navy-50, #eef2ff)', color: 'var(--navy-700, #3730a3)',
                      borderRadius: '999px', padding: '2px 12px', fontSize: '0.82rem'
                    }}>
                      {part.subcategory}
                    </span>
                  </>
                )}
              </div>
            )}

          </div>
        )}

        {/* ── Inventory Details ── */}
        {(part.selectedPart || part.creatingNew) && (
          <>
            <h3 className="form-section-title">Inventory Details</h3>
            <div className="form-grid">

              <div className="form-group">
                <label className="form-label">Price (QAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-input ${partErrors.price ? 'input-error' : ''}`}
                  placeholder="e.g. 150.00"
                  value={part.price}
                  onChange={e => setPF('price', e.target.value)}
                />
                {partErrors.price && <small className="form-error">{partErrors.price}</small>}
              </div>

              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  className={`form-input ${partErrors.quantity ? 'input-error' : ''}`}
                  placeholder="e.g. 5"
                  value={part.quantity}
                  onChange={e => setPF('quantity', e.target.value)}
                />
                {partErrors.quantity && <small className="form-error">{partErrors.quantity}</small>}
              </div>

              <div className="form-group">
                <label className="form-label">Condition</label>
                <SearchableSelect
                  value={part.condition}
                  onChange={v => setPF('condition', v)}
                  options={[
                    { value: 'new',  label: 'New'  },
                    { value: 'used', label: 'Used' },
                  ]}
                  placeholder="Pick a condition…"
                />
              </div>

              {/* From Year / To Year — hidden after auto-fill */}
              {!autoFilled && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      From Year
                      <span className="label-optional"> (if different from {year})</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder={year || 'e.g. 2018'}
                      value={part.from_year}
                      onChange={e => setPF('from_year', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">To Year</label>
                    <input
                      type="number"
                      className={`form-input ${partErrors.to_year ? 'input-error' : ''}`}
                      placeholder={year || 'e.g. 2024'}
                      value={part.to_year}
                      onChange={e => setPF('to_year', e.target.value)}
                    />
                    {partErrors.to_year && <small className="form-error">{partErrors.to_year}</small>}
                  </div>
                </>
              )}

              {/* When auto-filled: show year range as a read-only pill */}
              {autoFilled && (part.from_year || part.to_year) && (
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Year Range</label>
                  <div style={{
                    padding: '8px 12px',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    color: 'var(--gray-600)',
                    fontSize: '0.9rem'
                  }}>
                    {part.from_year && part.to_year
                      ? `${part.from_year} – ${part.to_year}`
                      : part.from_year
                        ? `${part.from_year}+`
                        : `up to ${part.to_year}`}
                  </div>
                </div>
              )}

            </div>

            {/* ── Service availability + optional prices ── */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label className="form-label">Services Offered</label>

              {/* Delivery */}
              <div className="service-row">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={part.delivery_available}
                    onChange={e => {
                      setPF('delivery_available', e.target.checked)
                    }}
                  />
                  <span>Delivery</span>
                </label>
              </div>

              {/* Installation */}
              <div className="service-row">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={part.installation_available}
                    onChange={e => {
                      setPF('installation_available', e.target.checked)
                      if (!e.target.checked) setPF('installation_price', '')
                    }}
                  />
                  <span>Installation</span>
                </label>
                {part.installation_available && (
                  <div className="service-price-row">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input service-price-input"
                      placeholder="Price (optional)"
                      value={part.installation_price}
                      onChange={e => setPF('installation_price', e.target.value)}
                    />
                    <span className="service-price-currency">QAR</span>
                    <small className="form-help service-price-hint">
                      Leave empty = "Contact for price"
                    </small>
                  </div>
                )}
              </div>
            </div>

            {/* Also Fits Other Cars */}
            <div className="addpart-also-fits">
              <div className="addpart-also-fits-header">
                <div>
                  <span className="addpart-also-fits-title">
                    Also Fits Other Cars
                    <span className="label-optional"> (optional)</span>
                  </span>
                  <p className="addpart-also-fits-hint">
                    Customers with those cars see a ✅ Fits badge.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-navy addpart-add-car-btn"
                  onClick={onAddCompatRow}
                >
                  + Add Car
                </button>
              </div>

              {part.compatRows.map((row, idx) => (
                <CompatRow
                  key={idx}
                  idx={idx}
                  row={row}
                  makes={makes}
                  allModels={allModels}
                  onChange={onCompatChange}
                  onRemove={onRemoveCompatRow}
                />
              ))}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                Description
                <span className="label-optional"> (optional)</span>
              </label>
              <textarea
                className="form-input form-textarea"
                rows={3}
                placeholder="Fitment notes, specs, or any details buyers should know…"
                value={part.description || ''}
                onChange={e => setPF('description', e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary form-btn" disabled={saving}>
                {saving ? 'Saving…' : '+ Add This Part'}
              </button>
              <button
                type="button"
                className="btn btn-outline-navy addpart-clear-btn"
                onClick={onClear}
              >
                Clear Form
              </button>
            </div>
          </>
        )}

        {/* Hint when nothing selected yet */}
        {!part.selectedPart && !part.creatingNew && part.catalogQuery.trim().length < 2 && (
          <p className="addpart-hint">
            Search the catalog above, or start typing a part name and click <strong>+ Create New Part</strong>.
          </p>
        )}

      </form>
    </div>
  )
}