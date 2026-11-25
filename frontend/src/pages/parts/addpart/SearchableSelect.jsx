/**
 * SearchableSelect.jsx
 * Place at: frontend/src/pages/parts/addpart/SearchableSelect.jsx
 *
 * Reusable type-to-filter combo-box.
 * Replaces every plain <select> in the Add Part flow.
 *
 * Props:
 *   value       — current value (string or number; compared as strings)
 *   onChange    — fn(value: string)
 *   options     — [{ value, label }]
 *   placeholder — input placeholder text
 *   disabled    — boolean
 *   hasError    — boolean (adds .input-error class)
 */

import { useState, useRef, useEffect } from 'react'

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  hasError,
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef           = useRef(null)

  // Label of the currently selected option
  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || ''

  // Input shows the user's query while open, the selected label when closed
  const inputValue = open ? query : selectedLabel

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  // Close on outside click
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
    if (!e.target.value) onChange('') // clear when user erases
  }

  function handleFocus() {
    setQuery('')
    setOpen(true)
  }

  function handleSelect(opt) {
    onChange(opt.value)
    setQuery('')
    setOpen(false)
  }

  const inputClass = [
    'form-input',
    hasError  ? 'input-error'    : '',
    disabled  ? 'input-disabled' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="searchable-select" ref={wrapRef}>
      <input
        type="text"
        className={inputClass}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled}
        autoComplete="off"
        readOnly={disabled}
      />

      {open && !disabled && (
        <div className="searchable-select-dropdown">
          {filtered.length === 0 && query.trim() ? (
            <div className="searchable-select-empty">No matches for "{query}"</div>
          ) : (
            <>
              {filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`searchable-select-option${String(opt.value) === String(value) ? ' is-selected' : ''}`}
                  onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
                >
                  {opt.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}