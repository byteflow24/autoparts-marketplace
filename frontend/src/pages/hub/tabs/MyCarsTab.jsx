/**
 * MyCarsTab.jsx
 * Place at: frontend/src/pages/hub/tabs/MyCarsTab.jsx
 *
 * My Cars tab — add / delete / set-primary with VIN lookup.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import { SectionTitle, SectionLoader, EmptyState, AlertBox, CarCard } from '../../../components/HubShared'

const API = '/api'

function getToken() {
  return JSON.parse(localStorage.getItem('auth'))?.access_token || ''
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

export function MyCarsTab() {
    const [cars, setCars]           = useState([])
    const [makes, setMakes]         = useState([])
    const [allModels, setAllModels] = useState([])
    const [models, setModels]       = useState([])
    const [subModels, setSubModels] = useState([])
    const [loading, setLoading]     = useState(true)
    const [apiError, setApiError]   = useState('')
   
    const [showAddCar, setShowAddCar]   = useState(false)
    const [carForm, setCarForm]         = useState({
      car_make_id: '', car_model_id: '', car_sub_model_id: '', year: '', nickname: '', is_primary: false,
    })
    const [carErrors, setCarErrors]     = useState({})
    const [carSaving, setCarSaving]     = useState(false)
    const [carApiError, setCarApiError] = useState('')
   
    const [vin, setVin]               = useState('')
    const [vinLoading, setVinLoading] = useState(false)
    const [vinError, setVinError]     = useState('')
    const [vinInfo, setVinInfo]       = useState('')
    const [vinResult, setVinResult]   = useState(null)
   
    useEffect(() => {
      async function load() {
        try {
          const [profileRes, makesRes, modelsRes] = await Promise.all([
            axios.get(`${API}/profile/me`, { headers: authHeaders() }),
            axios.get(`${API}/parts/car-makes`),
            axios.get(`${API}/parts/car-models`),
          ])
          setCars(profileRes.data.cars || [])
          setMakes(makesRes.data || [])
          setAllModels(modelsRes.data || [])
          setModels(modelsRes.data || [])
        } catch {
          setApiError('Failed to load cars.')
        } finally {
          setLoading(false)
        }
      }
      load()
    }, [])
   
    useEffect(() => {
      if (!carForm.car_model_id) { setSubModels([]); return }
      axios.get(`${API}/parts/car-sub-models`, { params: { model_id: carForm.car_model_id } })
        .then(res => setSubModels(res.data || []))
        .catch(() => setSubModels([]))
    }, [carForm.car_model_id])
   
    async function handleVinLookup() {
      const cleanVin = vin.trim().toUpperCase()
      if (!cleanVin) { setVinError('Enter a VIN first.'); return }
      if (cleanVin.length !== 17) { setVinError('A VIN must be exactly 17 characters.'); return }
   
      setVinLoading(true); setVinError(''); setVinInfo(''); setVinResult(null)
      try {
        const res = await axios.get(`${API}/profile/vin/${cleanVin}`)
        if (res.data.error) { setVinError(res.data.error); return }
   
        const makeName      = (res.data.make  || '').trim()
        const resolvedModel = (res.data.model || '').trim()
        const yearVal       = (res.data.year  || '').trim()
   
        if (yearVal) setCarForm(prev => ({ ...prev, year: yearVal }))
        if (!makeName && !yearVal) {
          setVinError('Could not decode this VIN — please fill in the fields manually.')
          return
        }
        if (!makeName) {
          setVinResult({ make: '', model: '', year: yearVal })
          setVinInfo(`Year auto-filled (${yearVal}) — select the make and model manually.`)
          return
        }
   
        const matchedMake = makes.find(m => m.name.toLowerCase() === makeName.toLowerCase())
        if (matchedMake) {
          const filteredModels = allModels.filter(m => String(m.make_id) === String(matchedMake.id))
          setModels(filteredModels)
          const normalize    = s => s.toLowerCase().replace(/[-\s]/g, '')
          const matchedModel = resolvedModel
            ? filteredModels.find(m => m.name.toLowerCase() === resolvedModel.toLowerCase() || normalize(m.name) === normalize(resolvedModel))
            : null
   
          setCarForm(prev => ({
            ...prev,
            car_make_id:      String(matchedMake.id),
            car_model_id:     matchedModel ? String(matchedModel.id) : '',
            car_sub_model_id: '',
            year:             yearVal,
          }))
          setVinResult({ make: makeName, model: matchedModel ? resolvedModel : '', year: yearVal })
   
          if (!matchedModel && resolvedModel)
            setVinInfo(`Make auto-filled (${makeName}) — model "${resolvedModel}" wasn't found in our DB, select it manually.`)
          else if (!matchedModel)
            setVinInfo(`Make auto-filled (${makeName}) — select the model manually.`)
        } else {
          setVinResult({ make: makeName, model: '', year: yearVal })
          setVinInfo(`Make "${makeName}" isn't in our database yet — select it manually.`)
        }
      } catch (err) {
        setVinError(err?.response?.data?.error || 'VIN lookup failed.')
      } finally {
        setVinLoading(false)
      }
    }
   
    function handleCarMakeChange(e) {
      const makeId = e.target.value
      setCarForm(prev => ({ ...prev, car_make_id: makeId, car_model_id: '', car_sub_model_id: '' }))
      setModels(makeId ? allModels.filter(m => String(m.make_id) === String(makeId)) : allModels)
      setSubModels([])
      setCarErrors(prev => ({ ...prev, car_model_id: '' }))
      setVinResult(null)
    }
   
    async function handleAddCar(e) {
      e.preventDefault()
      const errs = {}
      if (!carForm.car_model_id) errs.car_model_id = 'Select a car model.'
      if (!carForm.year) errs.year = 'Enter the year.'
      else if (Number(carForm.year) < 1900 || Number(carForm.year) > 2100) errs.year = 'Enter a valid year.'
      if (Object.keys(errs).length) { setCarErrors(errs); return }
   
      setCarSaving(true); setCarApiError('')
      try {
        const res = await axios.post(`${API}/profile/cars`, {
          car_model_id:     Number(carForm.car_model_id),
          car_sub_model_id: carForm.car_sub_model_id ? Number(carForm.car_sub_model_id) : null,
          year:             Number(carForm.year),
          nickname:         carForm.nickname.trim() || null,
          is_primary:       carForm.is_primary,
        }, { headers: authHeaders() })
   
        setCars(prev => {
          const updated = carForm.is_primary ? prev.map(c => ({ ...c, is_primary: false })) : [...prev]
          return [...updated, res.data.car]
        })
        resetAddCarForm()
      } catch (err) {
        setCarApiError(err?.response?.data?.error || 'Failed to add car.')
      } finally {
        setCarSaving(false)
      }
    }
   
    function resetAddCarForm() {
      setCarForm({ car_make_id: '', car_model_id: '', car_sub_model_id: '', year: '', nickname: '', is_primary: false })
      setCarErrors({}); setCarApiError('')
      setVin(''); setVinResult(null); setVinError(''); setVinInfo('')
      setModels(allModels); setSubModels([])
      setShowAddCar(false)
    }
   
    async function handleDeleteCar(carId) {
      if (!window.confirm('Remove this car from your profile?')) return
      try {
        await axios.delete(`${API}/profile/cars/${carId}`, { headers: authHeaders() })
        setCars(prev => {
          const remaining  = prev.filter(c => c.id !== carId)
          const hadPrimary = prev.find(c => c.id === carId)?.is_primary
          if (hadPrimary && remaining.length > 0) remaining[0] = { ...remaining[0], is_primary: true }
          return remaining
        })
      } catch { setApiError('Failed to remove car.') }
    }
   
    async function handleSetPrimary(carId) {
      try {
        await axios.patch(`${API}/profile/cars/${carId}/set-primary`, {}, { headers: authHeaders() })
        setCars(prev => prev.map(c => ({ ...c, is_primary: c.id === carId })))
      } catch { setApiError('Failed to update primary car.') }
    }
   
    if (loading) return <SectionLoader />
   
    return (
      <div>
        {apiError && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{apiError}</div>}
   
        <div className="cars-tab-header">
          <SectionTitle icon="🚗" title="My Cars" subtitle="Saved cars used for auto-filtering search results" />
          {!showAddCar && (
            <button className="btn btn-primary" onClick={() => setShowAddCar(true)}>+ Add Car</button>
          )}
        </div>
   
        {showAddCar && (
          <div className="add-car-form">
            <h3>Add a Car</h3>
            {carApiError && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{carApiError}</div>}
   
            {/* VIN row */}
            <div className="vin-row">
              <label className="form-label">
                VIN / Serial Number
                <span className="vin-label-badge">AI Auto-fill</span>
              </label>
              <div className="vin-input-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 17-character VIN (e.g. 1HGBH41JXMN109186)"
                  maxLength={17}
                  value={vin}
                  onChange={e => { setVin(e.target.value.toUpperCase()); setVinError(''); setVinInfo(''); setVinResult(null) }}
                />
                <button
                  type="button"
                  className="btn btn-outline-navy"
                  onClick={handleVinLookup}
                  disabled={vinLoading}
                  style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
                >
                  {vinLoading ? 'Decoding…' : '🔍 Decode VIN'}
                </button>
              </div>
              <div className="vin-char-count">
                {vin.length}/17 characters
                {vin.length === 17 && <span className="valid">✓ Valid length</span>}
              </div>
              {vinError  && <AlertBox type="error"   text={vinError} />}
              {vinInfo   && <AlertBox type="info"    text={vinInfo} />}
              {vinResult && <AlertBox type="success" text={`Found: ${[vinResult.year, vinResult.make, vinResult.model].filter(Boolean).join(' ')} — fields filled below`} />}
            </div>
   
            <div className="or-divider">or fill in manually</div>
   
            <div className="car-fields-grid">
              <div className="form-group">
                <label className="form-label">Car Make</label>
                <select className="form-input" value={carForm.car_make_id} onChange={handleCarMakeChange}>
                  <option value="">Select make</option>
                  {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Car Model</label>
                <select
                  className={`form-input${carErrors.car_model_id ? ' input-error' : ''}`}
                  value={carForm.car_model_id}
                  onChange={e => {
                    setCarForm(p => ({ ...p, car_model_id: e.target.value, car_sub_model_id: '' }))
                    setCarErrors(p => ({ ...p, car_model_id: '' }))
                  }}
                >
                  <option value="">Select model</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {carErrors.car_model_id && <small className="form-error">{carErrors.car_model_id}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Trim / Sub-model <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span>
                </label>
                <select
                  className="form-input"
                  value={carForm.car_sub_model_id}
                  onChange={e => setCarForm(p => ({ ...p, car_sub_model_id: e.target.value }))}
                  disabled={!carForm.car_model_id || subModels.length === 0}
                >
                  <option value="">Any trim</option>
                  {subModels.map(sm => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input
                  type="number"
                  className={`form-input${carErrors.year ? ' input-error' : ''}`}
                  placeholder="e.g. 2020"
                  value={carForm.year}
                  onChange={e => { setCarForm(p => ({ ...p, year: e.target.value })); setCarErrors(p => ({ ...p, year: '' })) }}
                />
                {carErrors.year && <small className="form-error">{carErrors.year}</small>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Nickname <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. My Daily, Wife's Car"
                  value={carForm.nickname}
                  onChange={e => setCarForm(p => ({ ...p, nickname: e.target.value }))}
                />
              </div>
            </div>
   
            <label className="primary-checkbox-label">
              <input
                type="checkbox"
                checked={carForm.is_primary}
                onChange={e => setCarForm(p => ({ ...p, is_primary: e.target.checked }))}
              />
              Set as my primary car <span className="muted">(used for auto-filtering search)</span>
            </label>
   
            <div className="add-car-actions">
              <button type="button" className="btn btn-primary" onClick={handleAddCar} disabled={carSaving}>
                {carSaving ? 'Adding…' : 'Add Car'}
              </button>
              <button type="button" className="btn-text-cancel" onClick={resetAddCarForm}>Cancel</button>
            </div>
          </div>
        )}
   
        {cars.length === 0 && !showAddCar ? (
          <EmptyState
            icon="🚗"
            message="No cars saved yet."
            action={<button className="btn btn-primary" onClick={() => setShowAddCar(true)}>Add Your First Car</button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cars.map(car => (
              <CarCard key={car.id} car={car} onSetPrimary={handleSetPrimary} onDelete={handleDeleteCar} />
            ))}
          </div>
        )}
      </div>
    )
  }