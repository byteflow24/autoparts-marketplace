/**
 * useSearch.js
 * Place at: frontend/src/hooks/useSearch.js
 *
 * Custom hook — all search state and logic lives here.
 * SearchPage, SearchFilters and PartCard are pure UI components
 * that read from this hook. None of them contain fetch logic.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

const INITIAL_FILTERS = {
  search:           '',
  year:             '',
  car_make_id:      '',
  car_model_id:     '',
  car_sub_model_id: '',
  category:         '',
  subcategory:      '',
  delivery:         false,
  installation:     false,
}

function getToken() {
  return JSON.parse(localStorage.getItem('auth') || 'null')?.access_token || ''
}

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Dropdown data ──────────────────────────────────────────
  const [makes,          setMakes]          = useState([])
  const [allModels,      setAllModels]      = useState([])
  const [models,         setModels]         = useState([])
  const [subModels,      setSubModels]      = useState([])
  const [years,          setYears]          = useState([])
  const [categories,     setCategories]     = useState([])
  const [subcategoryMap, setSubcategoryMap] = useState({})

  // ── Saved cars (logged-in users) ───────────────────────────
  const [savedCars,     setSavedCars]     = useState([])
  const [selectedCarId, setSelectedCarId] = useState(null)
  const [carsLoading,   setCarsLoading]   = useState(false)

  // ── Filters — init from URL params ────────────────────────
  const [filters, setFilters] = useState(() => ({
    search:           searchParams.get('search')           || '',
    year:             searchParams.get('year')             || '',
    car_make_id:      searchParams.get('car_make_id')      || '',
    car_model_id:     searchParams.get('car_model_id')     || '',
    car_sub_model_id: searchParams.get('car_sub_model_id') || '',
    category:         searchParams.get('category')         || '',
    subcategory:      searchParams.get('subcategory')      || '',
    delivery:         searchParams.get('delivery') === 'true',
    installation:     searchParams.get('installation') === 'true',
  }))

  // ── Results ────────────────────────────────────────────────
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [total,   setTotal]   = useState(null)

  // ── Cart ───────────────────────────────────────────────────
  const [addedIds,   setAddedIds]   = useState({})
  const [itemConfig, setItemConfig] = useState({})

  // ── Debounce timer ref ─────────────────────────────────────
  const debounceRef = useRef(null)

  // ── 1. Load dropdown data once ─────────────────────────────
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await axios.get(`${API}/search/filters`)
        setMakes(res.data.car_makes       || [])
        setAllModels(res.data.car_models  || [])
        setModels(res.data.car_models     || [])
        setYears(res.data.years           || [])
        setCategories(res.data.categories || [])
        setSubcategoryMap(res.data.subcategory_map || {})
      } catch { /* silent */ }
    }
    loadFilters()
  }, [])

  // ── 2. Load saved cars if user is logged in ────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) return
    setCarsLoading(true)
    axios.get(`${API}/profile/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const cars = res.data.cars || []
        setSavedCars(cars)
        // Auto-apply primary car if no filters are active from the URL
        const hasUrlFilters = ['car_make_id', 'car_model_id', 'year'].some(
          k => searchParams.get(k)
        )
        if (!hasUrlFilters) {
          const primary = cars.find(c => c.is_primary) || cars[0] || null
          if (primary) applyCarToFilters(primary, true)
        }
      })
      .catch(() => {})
      .finally(() => setCarsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 3. Fetch sub-models when model changes ─────────────────
  useEffect(() => {
    if (!filters.car_model_id) {
      setSubModels([])
      return
    }
    axios.get(`${API}/search/filters`, { params: { model_id: filters.car_model_id } })
      .then(res => setSubModels(res.data.car_sub_models || []))
      .catch(() => setSubModels([]))
  }, [filters.car_model_id])

  // ── 4. Search function ─────────────────────────────────────
  const runSearch = useCallback(async (activeFilters) => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      Object.entries(activeFilters).forEach(([k, v]) => {
        // Send boolean filters only when true; skip empty strings
        if (v === true) params[k] = true
        else if (v !== '' && v !== false) params[k] = v
      })
      const res  = await axios.get(`${API}/search/`, { params })
      const list = res.data.results || []
      setResults(list)
      setTotal(list.length)

      const config = {}
      list.forEach(item => {
        config[item.garage_part_id] = {
          quantity:       1,
          service_option: 'none',
        }
      })
      setItemConfig(config)
    } catch (err) {
      setError(err?.response?.data?.error || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 5. Debounced effect — fires on filter changes ──────────
  useEffect(() => {
    const delay = filters.search !== '' ? 400 : 0
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(filters)
    }, delay)
    return () => clearTimeout(debounceRef.current)
  }, [filters, runSearch])

  // ── 6. Apply a saved car to filters ───────────────────────
  function applyCarToFilters(car, silent = false) {
    const makeId  = String(car.car_make?.id  || car.car_make_id  || '')
    const modelId = String(car.car_model?.id || car.car_model_id || '')
    const year    = String(car.year || '')

    setSelectedCarId(car.id)

    if (makeId) {
      setModels(prev =>
        prev.length
          ? prev.filter(m => String(m.make_id) === makeId)
          : prev
      )
    }

    setFilters(prev => ({
      ...prev,
      year,
      car_make_id:      makeId,
      car_model_id:     modelId,
      car_sub_model_id: '',
    }))

    if (!silent) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (makeId)  next.set('car_make_id',  makeId)  ; else next.delete('car_make_id')
        if (modelId) next.set('car_model_id', modelId) ; else next.delete('car_model_id')
        if (year)    next.set('year',         year)    ; else next.delete('year')
        next.delete('car_sub_model_id')
        return next
      })
    }
  }

  // ── 7. Clear the "My Car" filter ──────────────────────────
  function clearCarFilter() {
    setSelectedCarId(null)
    setFilters(prev => ({
      ...prev,
      year:             '',
      car_make_id:      '',
      car_model_id:     '',
      car_sub_model_id: '',
    }))
    setModels(allModels)
    setSubModels([])
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('year')
      next.delete('car_make_id')
      next.delete('car_model_id')
      next.delete('car_sub_model_id')
      return next
    })
  }

  // ── 8a. Standard filter handler (event-based, for inputs) ──
  function handleFilterChange(e) {
    const { name, value } = e.target
    handleDirectFilterChange(name, value)
  }

  // ── 8b. Direct filter handler (name + value) ───────────────
  // Compatible with SearchableSelectFilter's onChange(name, value)
  // and checkbox onChange(name, checked).
  function handleDirectFilterChange(name, value) {
    // If user touches car filters manually, deselect the "My Car" chip
    if (['year', 'car_make_id', 'car_model_id', 'car_sub_model_id'].includes(name)) {
      setSelectedCarId(null)
    }

    setFilters(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'car_make_id') {
        next.car_model_id     = ''
        next.car_sub_model_id = ''
        setSubModels([])
      }
      if (name === 'car_model_id') {
        next.car_sub_model_id = ''
      }
      if (name === 'category') {
        next.subcategory = ''
      }
      return next
    })

    if (name === 'car_make_id') {
      setModels(value
        ? allModels.filter(m => String(m.make_id) === String(value))
        : allModels
      )
    }

    // Update URL params (only string/non-boolean filters)
    if (typeof value !== 'boolean') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        if (name === 'category') next.delete('subcategory')
        return next
      })
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, 'true')
        else next.delete(name)
        return next
      })
    }
  }

  function handleSearchInput(value) {
    setFilters(prev => ({ ...prev, search: value }))
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set('search', value)
      else next.delete('search')
      return next
    })
  }

  function handleReset() {
    setSelectedCarId(null)
    setFilters(INITIAL_FILTERS)
    setModels(allModels)
    setSubModels([])
    setSearchParams({})
  }

  // ── 9. Cart ────────────────────────────────────────────────
  function handleItemConfig(garage_part_id, field, value) {
    setItemConfig(prev => ({
      ...prev,
      [garage_part_id]: { ...prev[garage_part_id], [field]: value }
    }))
  }

  function addToCart(item) {
    const cfg = itemConfig[item.garage_part_id] || { quantity: 1, service_option: 'none' }
    const cartItem = {
      garage_part_id: item.garage_part_id,
      garage_id:      item.garage_id,
      garage_name:    item.garage_name,
      part_name:      item.part_name,
      part_number:    item.part_number,
      price:          item.price,
      quantity:       Number(cfg.quantity),
      service_option: cfg.service_option,
      delivery_zones:     item.delivery_zones     ?? [],
      installation_price: item.installation_price ?? null,
    }
    const existing = JSON.parse(localStorage.getItem('cart') || '[]')
    const idx = existing.findIndex(c => c.garage_part_id === cartItem.garage_part_id)
    if (idx >= 0) existing[idx].quantity += cartItem.quantity
    else existing.push(cartItem)
    localStorage.setItem('cart', JSON.stringify(existing))

    setAddedIds(prev => ({ ...prev, [item.garage_part_id]: true }))
    setTimeout(() => {
      setAddedIds(prev => { const n = { ...prev }; delete n[item.garage_part_id]; return n })
    }, 2000)
  }

  // ── Derived: available subcategories for current category ──
  const availableSubcategories = subcategoryMap[filters.category] || []

  return {
    makes, models, subModels, years, categories, subcategoryMap, availableSubcategories,
    filters, handleFilterChange, handleDirectFilterChange, handleSearchInput, handleReset,
    results, loading, error, total,
    itemConfig, handleItemConfig, addToCart, addedIds,
    // My Car
    savedCars, selectedCarId, carsLoading, applyCarToFilters, clearCarFilter,
  }
}