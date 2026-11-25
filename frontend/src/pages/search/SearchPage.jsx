/**
 * SearchPage.jsx
 * Place at: frontend/src/pages/search/SearchPage.jsx
 *
 * Pure layout/orchestration — no business logic here.
 * All state lives in useSearch(). Components are SearchFilters + PartCard.
 */

import { useState }      from 'react'
import { NavLink }       from 'react-router-dom'
import { useAuth }       from '../../context/Authcontext'
import { useSearch }     from '../../hooks/useSearch.js'
import { SearchFilters } from '../../components/search/SearchFilters'
import { PartCard }      from '../../components/search/PartCard'

export function SearchPage() {
  const { isAuthenticated, user } = useAuth()
  const isCustomer = !isAuthenticated || user?.role === 'customer'
  const {
    makes, models, subModels, years, categories, availableSubcategories,
    filters, handleFilterChange, handleDirectFilterChange, handleSearchInput, handleReset,
    results, loading, error, total,
    itemConfig, handleItemConfig, addToCart, addedIds,
    // My Car
    savedCars, selectedCarId, carsLoading, applyCarToFilters, clearCarFilter,
  } = useSearch()

  const [viewMode, setViewMode] = useState('grid')   // 'list' | 'grid'

  const selectedCar = savedCars.find(c => c.id === selectedCarId) || null
  const selectedCarModelId = selectedCar?.car_model_id ?? null

  return (
    <>
      <title>Search Parts | AutoParts Marketplace</title>

      <div className="search-page-layout">

        {/* ── Sidebar ───────────────────────────────────── */}
        <SearchFilters
          filters={filters}
          makes={makes}
          models={models}
          subModels={subModels}
          years={years}
          categories={categories}
          onFilterChange={handleFilterChange}
          onDirectFilterChange={handleDirectFilterChange}
          onSearchInput={handleSearchInput}
          onReset={handleReset}
          loading={loading}
          total={total}
          availableSubcategories={availableSubcategories}
        />

        {/* ── Main content ──────────────────────────────── */}
        <main className="search-main">

          {/* ── My Car banner — customers and guests only ── */}
          {isCustomer && (
            <MyCar
              isAuthenticated={isAuthenticated}
              savedCars={savedCars}
              selectedCar={selectedCar}
              carsLoading={carsLoading}
              onSelect={applyCarToFilters}
              onClear={clearCarFilter}
            />
          )}

          {/* Top bar: title + count + view toggle */}
          <div className="search-topbar">
            <div>
              <h1 className="search-page-title">Auto Parts</h1>
              {total !== null && !loading && (
                <p className="search-topbar-count">
                  {total} {total === 1 ? 'part' : 'parts'} available
                  {filters.search && <span> for "<strong>{filters.search}</strong>"</span>}
                  {filters.category && <span> in <strong>{filters.category}</strong></span>}
                  {selectedCar && (
                    <span> matching your <strong>
                      {selectedCar.year} {selectedCar.car_make?.name} {selectedCar.car_model?.name}
                    </strong></span>
                  )}
                </p>
              )}
            </div>

            {/* View toggle */}
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'vt-active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                ⊞ Grid
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'vt-active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ☰ List
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="search-skeleton-list">
              {[1,2,3,4].map(n => (
                <div className="skeleton-card" key={n}>
                  <div className="skeleton-img" />
                  <div className="skeleton-body">
                    <div className="skeleton-line skeleton-line-lg" />
                    <div className="skeleton-line skeleton-line-md" />
                    <div className="skeleton-line skeleton-line-sm" />
                  </div>
                  <div className="skeleton-price" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className={viewMode === 'list' ? 'part-listing-list' : 'part-listing-grid'}>
              {results.map(item => (
                <PartCard
                key={item.garage_part_id}
                item={item}
                config={itemConfig[item.garage_part_id] || { quantity: 1, service_option: 'none' }}
                onConfigChange={handleItemConfig}
                onAddToCart={addToCart}
                isAdded={!!addedIds[item.garage_part_id]}
                isAuthenticated={isAuthenticated}
                selectedCarModelId={selectedCarModelId}
                viewMode={viewMode}
                filterDelivery={!!filters.delivery}
                filterInstallation={!!filters.installation}
              />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && total === 0 && (
            <div className="empty-state-card">
              <h2>No parts found</h2>
              <p>
                {selectedCar
                  ? `No parts listed for your ${selectedCar.year} ${selectedCar.car_make?.name} ${selectedCar.car_model?.name} yet.`
                  : 'Try adjusting the filters or clearing the search term.'}
              </p>
              <button className="btn btn-outline-navy" onClick={handleReset}>
                Clear Filters
              </button>
            </div>
          )}

          {/* First visit */}
          {total === null && !loading && !error && (
            <div className="search-welcome">
              <h2>Find the right part for your car</h2>
              <p>Use the filters on the left to browse inventory.</p>
            </div>
          )}

        </main>
      </div>
    </>
  )
}


// ── MyCar banner component ────────────────────────────────────
function MyCar({ isAuthenticated, savedCars, selectedCar, carsLoading, onSelect, onClear }) {

  // Guest — invite them to log in
  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#f8fafc', border: '1px solid #e5e7eb',
        borderRadius: '12px', padding: '14px 18px',
        marginBottom: '18px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.3rem' }}>🚗</span>
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          <NavLink to="/login" style={{ color: '#e67e22', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </NavLink>
          {' '}to filter parts by your saved cars instantly.
        </span>
      </div>
    )
  }

  // Loading
  if (carsLoading) {
    return (
      <div style={{
        background: '#f8fafc', border: '1px solid #e5e7eb',
        borderRadius: '12px', padding: '14px 18px',
        marginBottom: '18px', color: '#9ca3af', fontSize: '0.9rem',
      }}>
        Loading your cars…
      </div>
    )
  }

  // No cars saved
  if (savedCars.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#f8fafc', border: '1px solid #e5e7eb',
        borderRadius: '12px', padding: '14px 18px',
        marginBottom: '18px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.3rem' }}>🚗</span>
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          No cars saved yet.{' '}
          <NavLink to="/profile" style={{ color: '#e67e22', fontWeight: 600, textDecoration: 'none' }}>
            Add your car
          </NavLink>
          {' '}to get personalised results.
        </span>
      </div>
    )
  }

  // Has cars
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: selectedCar ? '#eff6ff' : '#f8fafc',
      border: `1.5px solid ${selectedCar ? '#93c5fd' : '#e5e7eb'}`,
      borderRadius: '12px', padding: '12px 18px',
      marginBottom: '18px', flexWrap: 'wrap',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      <span style={{ fontSize: '1.2rem' }}>🚗</span>
      <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem', flexShrink: 0 }}>
        My Car:
      </span>

      {/* Car chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
        {savedCars.map(car => {
          const isActive = selectedCar?.id === car.id
          return (
            <button
              key={car.id}
              onClick={() => isActive ? onClear() : onSelect(car)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                border: `1.5px solid ${isActive ? '#3b82f6' : '#d1d5db'}`,
                background: isActive ? '#3b82f6' : '#fff',
                color: isActive ? '#fff' : '#374151',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {car.is_primary && !isActive && (
                <span style={{ color: '#e67e22', fontSize: '0.75rem' }}>★</span>
              )}
              {car.year} {car.car_make?.name} {car.car_model?.name}
              {car.nickname && (
                <span style={{ opacity: 0.7, fontWeight: 400 }}>"{car.nickname}"</span>
              )}
              {isActive && <span style={{ marginLeft: '2px', opacity: 0.85 }}>✕</span>}
            </button>
          )
        })}
      </div>

      {selectedCar && (
        <button
          onClick={onClear}
          style={{
            background: 'none', border: 'none',
            color: '#6b7280', fontSize: '0.8rem',
            cursor: 'pointer', padding: '4px 8px',
            textDecoration: 'underline', flexShrink: 0,
          }}
        >
          Reset All
        </button>
      )}
    </div>
  )
}