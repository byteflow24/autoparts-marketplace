/**
 * SearchableSelectFilter.jsx
 * Place at: frontend/src/components/search/SearchableSelectFilter.jsx
 *
 * Variant of SearchableSelect for the search sidebar.
 * No item cap — the full list is always shown.
 * Uses .filter-select-wrap / .filter-select-dropdown CSS classes
 * so it inherits the sidebar's design tokens.
 *
 * Props:
 *   name        — filter key (used by handleDirectFilterChange)
 *   value       — current value string
 *   onChange    — fn(name, value)
 *   options     — [{ value, label }]
 *   placeholder — input placeholder
 *   disabled    — boolean
 */

import { useState, useRef, useEffect } from 'react'

export function SearchableSelectFilter({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef           = useRef(null)

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || ''
  const inputValue    = open ? query : selectedLabel

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  useEffect(() => {
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function handleChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange(name, '')
  }

  function handleFocus() {
    setQuery('')
    setOpen(true)
  }

  function handleSelect(opt) {
    onChange(name, opt.value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="filter-searchable-wrap" ref={wrapRef}>
      <input
        type="text"
        className={`filter-select${disabled ? ' filter-select-disabled' : ''}`}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled}
        autoComplete="off"
        readOnly={disabled}
      />
      {open && !disabled && (
        <div className="filter-searchable-dropdown">
          {filtered.length === 0 && query.trim() ? (
            <div className="filter-searchable-empty">No matches for "{query}"</div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`filter-searchable-option${String(opt.value) === String(value) ? ' is-selected' : ''}`}
                onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}