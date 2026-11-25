/**
 * AddPartPage.jsx  —  Garage only
 * Place at: frontend/src/pages/parts/AddPartPage.jsx
 *
 * Flow:
 *   1. Set the car (year → make → model → sub-model) — locked until "Change Car"
 *   2. Keep adding parts for that car; each submit saves immediately
 *   3. Session state (car + added parts) persisted in localStorage
 *
 * Auto-fill changes:
 *  - handleAILookup sends: part_name + car make/model/sub-model/year (not part_number)
 *  - handleApplyLookup also fills: part_number, from_year, to_year
 *  - PartForm receives: carMakeName, carModelName, carSubModelName (derived from IDs)
 *  - onDismissLookup resets lookupResult, lookupApplied, lookupError and clears
 *    the auto-filled fields so the user can edit manually
 *
 * Child components live in ./addpart/
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import { BLANK_PART, loadSession, saveSession, clearSession } from './addpart/partConstants'
import { CarSelector }    from './addpart/CarSelector'
import { AddedPartsList } from './addpart/AddedPartsList'
import { PartForm }       from './addpart/PartForm'

// Re-export so external consumers (e.g. search) can still import from here
export { SUBCATEGORY_MAP, CATEGORIES } from './addpart/partConstants'

const API = '/api'

export function AddPartPage() {
  const navigate = useNavigate()

  // ── Car state ──────────────────────────────────────────────────────────────
  const [carLocked,     setCarLocked]     = useState(false)
  const [year,          setYear]          = useState('')
  const [makes,         setMakes]         = useState([])
  const [allModels,     setAllModels]     = useState([])
  const [models,        setModels]        = useState([])
  const [subModels,     setSubModels]     = useState([])
  const [carMakeId,     setCarMakeId]     = useState('')
  const [carModelId,    setCarModelId]    = useState('')
  const [carSubModelId, setCarSubModelId] = useState('')
  const [carErrors,     setCarErrors]     = useState({})

  // ── Part form state ────────────────────────────────────────────────────────
  const [part,           setPart]           = useState({ ...BLANK_PART })
  const [partErrors,     setPartErrors]     = useState({})
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [lookupLoading,  setLookupLoading]  = useState(false)
  const [lookupResult,   setLookupResult]   = useState(null)
  const [lookupError,    setLookupError]    = useState('')
  const [lookupApplied,  setLookupApplied]  = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [saveError,      setSaveError]      = useState('')

  // ── Added parts list (this session) ───────────────────────────────────────
  const [addedParts, setAddedParts] = useState([])

  // ── Dropdown load ──────────────────────────────────────────────────────────
  const [dropdownsLoading, setDropdownsLoading] = useState(true)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i)

  // ── Load makes + models ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [makesRes, modelsRes] = await Promise.all([
          axios.get(`${API}/parts/car-makes`),
          axios.get(`${API}/parts/car-models`),
        ])
        setMakes(makesRes.data || [])
        setAllModels(modelsRes.data || [])
        setModels(modelsRes.data || [])
      } catch {}
      finally { setDropdownsLoading(false) }
    }
    load()
  }, [])

  // ── Restore session ────────────────────────────────────────────────────────
  useEffect(() => {
    const sess = loadSession()
    if (!sess) return
    if (sess.carLocked) {
      setCarLocked(true)
      setYear(sess.year || '')
      setCarMakeId(sess.carMakeId || '')
      setCarModelId(sess.carModelId || '')
      setCarSubModelId(sess.carSubModelId || '')
    }
    setAddedParts(sess.addedParts || [])
  }, [])

  // ── Fetch sub-models when model changes ────────────────────────────────────
  useEffect(() => {
    if (!carModelId) { setSubModels([]); return }
    axios.get(`${API}/parts/car-sub-models`, { params: { model_id: carModelId } })
      .then(res => setSubModels(res.data || []))
      .catch(() => setSubModels([]))
  }, [carModelId])

  // ── Filter models when make changes ───────────────────────────────────────
  useEffect(() => {
    if (!carMakeId) { setModels(allModels); return }
    setModels(allModels.filter(m => String(m.make_id) === String(carMakeId)))
  }, [carMakeId, allModels])

  // ── Catalog search debounce ────────────────────────────────────────────────
  useEffect(() => {
    const q = part.catalogQuery.trim()
    if (q.length < 2) { setCatalogResults([]); return }
    const t = setTimeout(() => searchCatalog(q), 400)
    return () => clearTimeout(t)
  }, [part.catalogQuery])

  // ── Persist session ────────────────────────────────────────────────────────
  useEffect(() => {
    saveSession({ carLocked, year, carMakeId, carModelId, carSubModelId, addedParts })
  }, [carLocked, year, carMakeId, carModelId, carSubModelId, addedParts])

  // ── Car name helpers (for AI lookup context) ───────────────────────────────
  const carMakeName     = makes.find(m => String(m.id) === String(carMakeId))?.name || ''
  const carModelName    = allModels.find(m => String(m.id) === String(carModelId))?.name || ''
  const carSubModelName = subModels.find(s => String(s.id) === String(carSubModelId))?.name || ''

  function carLabel() {
    return [year, carMakeName, carModelName, carSubModelName].filter(Boolean).join(' · ')
  }

  async function searchCatalog(q) {
    setCatalogLoading(true)
    try {
      const params = { q, limit: 10 }
      if (carModelId) params.car_model_id = carModelId
      if (year)       params.year         = year
      const res = await axios.get(`${API}/parts/catalog/search`, { params })
      setCatalogResults(res.data || [])
    } catch { setCatalogResults([]) }
    finally { setCatalogLoading(false) }
  }

  // ── Car handlers ──────────────────────────────────────────────────────────
  function handleLockCar() {
    const errs = {}
    if (!year)       errs.year       = 'Select a year.'
    if (!carMakeId)  errs.carMakeId  = 'Select a make.'
    if (!carModelId) errs.carModelId = 'Select a model.'
    if (Object.keys(errs).length) { setCarErrors(errs); return }
    setCarErrors({})
    setCarLocked(true)
  }

  function handleUnlockCar() {
    setCarLocked(false)
    setCarSubModelId('')
  }

  // ── Part form helpers ─────────────────────────────────────────────────────
  function setPF(key, value) {
    setPart(prev => ({ ...prev, [key]: value }))
    setPartErrors(prev => ({ ...prev, [key]: '' }))
    setSaveError('')
  }

  function handleCatalogSelect(p) {
    setPart(prev => ({
      ...prev,
      selectedPart: p,
      creatingNew: false,
      catalogQuery: p.name,
      name: p.name || '',
      part_number: p.part_number || '',
      brand: p.brand || '',
      category: p.category || '',
      subcategory: '',
    }))
    setCatalogResults([])
  }

  function handleCreateNew() {
    const name = part.catalogQuery.trim()
    setPart(prev => ({
      ...prev,
      selectedPart: null,
      creatingNew: true,
      name,
      part_number: '', brand: '', category: '', subcategory: '',
      country_of_origin: '', description: '',
    }))
    setCatalogResults([])
    setLookupResult(null); setLookupApplied(false); setLookupError('')
  }

  function handleCategoryChange(cat) {
    setPart(prev => ({ ...prev, category: cat, subcategory: '' }))
  }

  // ── AI Lookup — searches by part name (or part number if name is empty) ─────
  async function handleAILookup() {
    // Use part name if available; fall back to part number as the search term
    const partName   = part.name.trim()
    const partNumber = part.part_number.trim()
    const searchTerm = partName || partNumber

    if (!searchTerm) { setLookupError('Enter a part name or part number first.'); return }

    setLookupLoading(true); setLookupError(''); setLookupResult(null); setLookupApplied(false)
    try {
      const res = await axios.post(`${API}/parts/lookup`, {
        part_name:     searchTerm,           // backend accepts name or number as search term
        car_make:      carMakeName      || undefined,
        car_model:     carModelName     || undefined,
        car_sub_model: carSubModelName  || undefined,
        year:          year             || undefined,
      })
      setLookupResult(res.data)
    } catch (err) {
      setLookupError(err?.response?.data?.error || 'Lookup failed.')
    } finally { setLookupLoading(false) }
  }

  // ── Apply Lookup — fills part_number, from_year, to_year + catalog fields ──
  function handleApplyLookup() {
    if (!lookupResult) return
    setPart(prev => ({
      ...prev,
      // Catalog-level fields
      name:              lookupResult.name              || prev.name,
      category:          lookupResult.category          || prev.category,
      subcategory:       lookupResult.subcategory       || prev.subcategory,
      description:       lookupResult.description       || prev.description,
      // Inventory-level fields now filled from lookup
      part_number:       lookupResult.part_number       || prev.part_number,
      from_year:         lookupResult.from_year != null
                           ? String(lookupResult.from_year)
                           : prev.from_year,
      to_year:           lookupResult.to_year != null
                           ? String(lookupResult.to_year)
                           : prev.to_year,
    }))
    setLookupApplied(true)
  }

  // ── Dismiss Lookup — resets auto-fill and clears filled fields ─────────────
  function handleDismissLookup() {
    setLookupResult(null)
    setLookupApplied(false)
    setLookupError('')
    // Clear the auto-filled fields so user can edit them freely
    setPart(prev => ({
      ...prev,
      part_number: '',
      from_year: '',
      to_year: '',
      category: '',
      subcategory: '',
    }))
  }

  // ── Compat rows ───────────────────────────────────────────────────────────
  function handleAddCompatRow() {
    setPart(prev => ({
      ...prev,
      compatRows: [
        ...prev.compatRows,
        { car_make_id: '', car_model_id: '', car_sub_model_id: '', from_year: '', to_year: '', models: [], subModels: [] },
      ],
    }))
  }

  function handleRemoveCompatRow(i) {
    setPart(prev => ({ ...prev, compatRows: prev.compatRows.filter((_, idx) => idx !== i) }))
  }

  async function handleCompatChange(i, field, value) {
    setPart(prev => {
      const rows = [...prev.compatRows]
      rows[i] = { ...rows[i], [field]: value }
      if (field === 'car_make_id') {
        rows[i].models        = value ? allModels.filter(m => String(m.make_id) === String(value)) : []
        rows[i].car_model_id  = ''
        rows[i].car_sub_model_id = ''
        rows[i].subModels     = []
      }
      if (field === 'car_model_id') {
        rows[i].car_sub_model_id = ''
        rows[i].subModels        = []
      }
      return { ...prev, compatRows: rows }
    })

    // Fetch sub-models when model is chosen
    if (field === 'car_model_id' && value) {
      try {
        const res = await axios.get(`${API}/parts/car-sub-models`, { params: { model_id: value } })
        setPart(prev => {
          const rows = [...prev.compatRows]
          rows[i] = { ...rows[i], subModels: res.data || [] }
          return { ...prev, compatRows: rows }
        })
      } catch { /* sub-models optional */ }
    }
  }

  // ── Validate & Submit ─────────────────────────────────────────────────────
  function validatePart() {
    const errs = {}
    if (!part.name.trim() && !part.selectedPart) errs.name = 'Part name is required.'
    if (!part.price || Number(part.price) <= 0)   errs.price = 'Price must be > 0.'
    if (part.quantity === '' || Number(part.quantity) < 0) errs.quantity = 'Quantity required.'
    if (part.from_year && part.to_year && Number(part.from_year) > Number(part.to_year))
      errs.to_year = 'To year must be ≥ from year.'
    return errs
  }

  async function handleAddPart(e) {
    e.preventDefault()
    const errs = validatePart()
    if (Object.keys(errs).length) { setPartErrors(errs); return }
    setSaving(true); setSaveError('')

    try {
      const token = JSON.parse(localStorage.getItem('auth'))?.access_token
      const headers = { Authorization: `Bearer ${token}` }

      let part_id
      if (part.selectedPart) {
        part_id = part.selectedPart.id
      } else {
        const res = await axios.post(`${API}/parts/create`, {
          name:              part.name.trim(),
          part_number:       part.part_number.trim() || null,
          brand:             part.brand?.trim()      || null,
          category:          part.category           || null,
          subcategory:       part.subcategory        || null,
          country_of_origin: part.country_of_origin?.trim() || null,
          description:       part.description?.trim() || null,
        }, { headers })
        part_id = res.data.id
      }

      const compatible_cars = part.compatRows
        .filter(r => r.car_model_id)
        .map(r => ({
          car_model_id:     Number(r.car_model_id),
          car_sub_model_id: r.car_sub_model_id ? Number(r.car_sub_model_id) : null,
          from_year:        r.from_year !== '' ? Number(r.from_year) : null,
          to_year:          r.to_year   !== '' ? Number(r.to_year)   : null,
        }))

      await axios.post(`${API}/parts/add-to-garage`, {
        part_id,
        car_model_id:           Number(carModelId),
        car_sub_model_id:       carSubModelId ? Number(carSubModelId) : null,
        year:                   year !== '' ? Number(year) : null,
        price:                  Number(part.price),
        quantity:               Number(part.quantity),
        condition:              part.condition,
        from_year:              part.from_year !== '' ? Number(part.from_year) : null,
        to_year:                part.to_year   !== '' ? Number(part.to_year)   : null,
        delivery_available:     part.delivery_available,
        installation_available: part.installation_available,
        installation_price:     part.installation_price !== '' ? Number(part.installation_price) : null,
        compatible_cars,
      }, { headers })

      setAddedParts(prev => [
        {
          id:          Date.now(),
          name:        part.selectedPart?.name || part.name,
          part_number: part.part_number || part.selectedPart?.part_number || null,
          category:    part.category,
          subcategory: part.subcategory,
          price:       Number(part.price),
          quantity:    Number(part.quantity),
          condition:   part.condition,
        },
        ...prev,
      ])

      // Reset part form, keep car locked
      setPart({ ...BLANK_PART })
      setLookupResult(null); setLookupApplied(false); setLookupError('')
      setCatalogResults([])
      setPartErrors({})
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Failed to add part.')
    } finally {
      setSaving(false)
    }
  }

  function handleDone() {
    clearSession()
    navigate('/garage/inventory')
  }

  function handleBack() {
    navigate(-1)
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (dropdownsLoading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">
            <div className="auth-header"><p>Loading…</p></div>
          </div>
        </div>
      </section>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <title>Add Parts | AutoParts Marketplace</title>

      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">

            <div className="auth-header">
              <h1>Add Parts to Inventory</h1>
              <p>Set the car once, then add all parts for it.</p>
            </div>

            {/* Step 1 — Car */}
            <CarSelector
              carLocked={carLocked}
              year={year} setYear={setYear}
              makes={makes} models={models} subModels={subModels}
              carMakeId={carMakeId} setCarMakeId={setCarMakeId}
              carModelId={carModelId} setCarModelId={setCarModelId}
              carSubModelId={carSubModelId} setCarSubModelId={setCarSubModelId}
              carErrors={carErrors} setCarErrors={setCarErrors}
              years={years}
              onLock={handleLockCar}
              onUnlock={handleUnlockCar}
              carLabel={carLabel()}
            />

            {/* Step 2 — Parts added this session */}
            <AddedPartsList
              addedParts={addedParts}
              onRemove={id => setAddedParts(prev => prev.filter(p => p.id !== id))}
              onDone={handleDone}
            />

            {/* Step 3 — Add a part form */}
            {carLocked && (
              <PartForm
                part={part} setPF={setPF}
                partErrors={partErrors} saveError={saveError}
                saving={saving}
                catalogResults={catalogResults} catalogLoading={catalogLoading}
                onCatalogSelect={handleCatalogSelect}
                onCreateNew={handleCreateNew}
                onDismissCatalog={() => setCatalogResults([])}
                carModelId={carModelId}
                lookupLoading={lookupLoading}
                lookupResult={lookupResult}
                lookupError={lookupError}
                lookupApplied={lookupApplied}
                onAILookup={handleAILookup}
                onApplyLookup={handleApplyLookup}
                onDismissLookup={handleDismissLookup}
                onCategoryChange={handleCategoryChange}
                makes={makes} allModels={allModels}
                onAddCompatRow={handleAddCompatRow}
                onRemoveCompatRow={handleRemoveCompatRow}
                onCompatChange={handleCompatChange}
                onSubmit={handleAddPart}
                onClear={() => { setPart({ ...BLANK_PART }); setPartErrors({}); setCatalogResults([]) }}
                year={year}
                carMakeName={carMakeName}
                carModelName={carModelName}
                carSubModelName={carSubModelName}
              />
            )}

            {/* Footer */}
            <div className="addpart-footer auth-footer-text">
              {addedParts.length > 0 ? (
                <button type="button" className="btn btn-primary" onClick={handleDone}>
                  ✓ Done — View Inventory ({addedParts.length} added)
                </button>
              ) : (
                <button type="button" className="btn btn-link" onClick={handleBack}>← Back</button>
              )}
            </div>

          </div>
        </div>
      </section>
    </>
  )
}