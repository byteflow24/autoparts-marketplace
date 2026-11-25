/**
 * SearchFilters.jsx
 * Place at: frontend/src/components/search/SearchFilters.jsx
 *
 * Sidebar filter panel — compact, all filters in one card.
 * Receives all state from useSearch via props — no local state.
 *
 * Filter order: year → car make → car model → sub-model → category → subcategory → services
 */

import { SearchableSelectFilter } from './SearchableSelectFilter'

export function SearchFilters({
  filters,
  makes,
  models,
  subModels,
  years,
  categories,
  availableSubcategories,
  onFilterChange,
  onDirectFilterChange,
  onSearchInput,
  onReset,
  loading,
  total,
}) {
  // Build option arrays
  const yearOptions     = years.map(y => ({ value: String(y), label: String(y) }))
  const makeOptions     = makes.map(m => ({ value: String(m.id), label: m.name }))
  const modelOptions    = models.map(m => ({ value: String(m.id), label: m.name }))
  const subModelOptions = subModels.map(sm => ({ value: String(sm.id), label: sm.name }))
  const categoryOptions = categories.map(c => ({ value: c, label: c }))
  const subcatOptions   = availableSubcategories.map(s => ({ value: s, label: s }))

  return (
    <aside className="search-sidebar">

      {/* ── Search input ───────────────────────────── */}
      <div className="filter-section">
        <div className="filter-search-wrap">
          <input
            type="text"
            className="filter-search-input"
            placeholder="Part name, number, OEM…"
            value={filters.search}
            onChange={e => onSearchInput(e.target.value)}
          />
          <span className="filter-search-icon">🔍</span>
        </div>
      </div>

      {/* ── Filters card ───────────────────────────── */}
      <div className="filter-card">
        <div className="filter-card-header">
          <h3>Filters</h3>
          <button className="filter-reset-btn" onClick={onReset}>
            Reset All
          </button>
        </div>

        {/* 1. Year */}
        <div className="filter-group">
          <label className="filter-label">Year</label>
          <SearchableSelectFilter
            name="year"
            value={filters.year}
            onChange={onDirectFilterChange}
            options={yearOptions}
            placeholder="Any Year"
          />
        </div>

        {/* 2. Car Make */}
        <div className="filter-group">
          <label className="filter-label">Car Make</label>
          <SearchableSelectFilter
            name="car_make_id"
            value={filters.car_make_id}
            onChange={onDirectFilterChange}
            options={makeOptions}
            placeholder="Any Make"
          />
        </div>

        {/* 3. Car Model */}
        <div className="filter-group">
          <label className="filter-label">Car Model</label>
          <SearchableSelectFilter
            name="car_model_id"
            value={filters.car_model_id}
            onChange={onDirectFilterChange}
            options={modelOptions}
            placeholder={filters.car_make_id ? 'Any Model' : 'Pick a make first'}
            disabled={!filters.car_make_id}
          />
        </div>

        {/* 4. Trim / Sub-model */}
        <div className="filter-group">
          <label className="filter-label">Trim / Sub-model</label>
          <SearchableSelectFilter
            name="car_sub_model_id"
            value={filters.car_sub_model_id}
            onChange={onDirectFilterChange}
            options={subModelOptions}
            placeholder={
              !filters.car_model_id        ? 'Pick a model first' :
              subModelOptions.length === 0  ? 'No trims available' :
              'All Trims'
            }
            disabled={!filters.car_model_id || subModelOptions.length === 0}
          />
        </div>

        {/* 5. Category */}
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <SearchableSelectFilter
            name="category"
            value={filters.category}
            onChange={onDirectFilterChange}
            options={categoryOptions}
            placeholder="All Categories"
          />
        </div>

        {/* 6. Subcategory — only shown when a category is selected */}
        {filters.category && availableSubcategories.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Subcategory</label>
            <SearchableSelectFilter
              name="subcategory"
              value={filters.subcategory}
              onChange={onDirectFilterChange}
              options={subcatOptions}
              placeholder="All Subcategories"
            />
          </div>
        )}

        {/* 7. Services */}
        <div className="filter-group">
          <label className="filter-label">Services</label>
          <div className="filter-checkbox-group">
            <label className="filter-checkbox-item">
              <input
                type="checkbox"
                name="delivery"
                checked={!!filters.delivery}
                onChange={e => onDirectFilterChange('delivery', e.target.checked)}
              />
              <span>Delivery available</span>
            </label>
            <label className="filter-checkbox-item">
              <input
                type="checkbox"
                name="installation"
                checked={!!filters.installation}
                onChange={e => onDirectFilterChange('installation', e.target.checked)}
              />
              <span>Installation available</span>
            </label>
          </div>
        </div>

      </div>

      {/* Result count */}
      {total !== null && !loading && (
        <p className="filter-result-count">
          {total} {total === 1 ? 'result' : 'results'} found
        </p>
      )}

    </aside>
  )
}