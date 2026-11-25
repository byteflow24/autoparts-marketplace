/**
 * CompatibilityBadges.jsx
 * Place at: frontend/src/components/parts/CompatibilityBadges.jsx
 *
 * Reusable — used in PartCard (search), PartDetailPage, and GarageProfilePage.
 * Renders car make/model, year range, condition, and country of origin
 * as small readable badges.
 *
 * Usage:
 *   <CompatibilityBadges
 *     carMake="Toyota"
 *     carModel="Camry"
 *     fromYear={2015}
 *     toYear={2024}
 *     condition="oem"
 *     countryOfOrigin="Japan"
 *   />
 */

const CONDITION_LABELS = {
    new:          { label: 'New',          color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
    oem:          { label: 'OEM',          color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
    used:         { label: 'Used',         color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
    refurbished:  { label: 'Refurbished',  color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff' },
  }
  
  const COUNTRY_FLAGS = {
    'Japan':        '🇯🇵',
    'Germany':      '🇩🇪',
    'South Korea':  '🇰🇷',
    'Korea':        '🇰🇷',
    'USA':          '🇺🇸',
    'United States':'🇺🇸',
    'China':        '🇨🇳',
    'Italy':        '🇮🇹',
    'France':       '🇫🇷',
    'UK':           '🇬🇧',
    'United Kingdom':'🇬🇧',
    'Taiwan':       '🇹🇼',
    'India':        '🇮🇳',
    'Sweden':       '🇸🇪',
  }
  
  function flag(country) {
    if (!country) return '🏭'
    return COUNTRY_FLAGS[country] || '🏭'
  }
  
  export function CompatibilityBadges({
    carMake, carModel, fromYear, toYear,
    condition, countryOfOrigin,
    size = 'md'   // 'sm' | 'md'
  }) {
    const fontSize = size === 'sm' ? '0.72rem' : '0.8rem'
    const padding  = size === 'sm' ? '2px 8px' : '4px 12px'
  
    const badgeStyle = (color, bg, border) => ({
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '4px',
      fontSize,
      fontWeight:   600,
      padding,
      borderRadius: '20px',
      border:       `1px solid ${border || '#e2e6ef'}`,
      background:   bg || '#f7f8fc',
      color:        color || '#5a6680',
      whiteSpace:   'nowrap',
    })
  
    const cond = condition ? CONDITION_LABELS[condition] : null
  
    // Build car compatibility string
    const carLabel = [carMake, carModel].filter(Boolean).join(' ')
    const yearLabel = fromYear && toYear ? `${fromYear}–${toYear}`
                    : fromYear           ? `From ${fromYear}`
                    : toYear             ? `Up to ${toYear}`
                    : null
  
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
  
        {/* Condition */}
        {cond && (
          <span style={badgeStyle(cond.color, cond.bg, cond.border)}>
            {cond.label}
          </span>
        )}
  
        {/* Car make + model */}
        {carLabel && (
          <span style={badgeStyle('#1a2340', '#f0f2f7', '#e2e6ef')}>
            🚗 {carLabel}
            {yearLabel && <span style={{ opacity: 0.7, fontWeight: 400 }}> {yearLabel}</span>}
          </span>
        )}
  
        {/* Year only (when no car model set) */}
        {!carLabel && yearLabel && (
          <span style={badgeStyle('#1a2340', '#f0f2f7', '#e2e6ef')}>
            📅 {yearLabel}
          </span>
        )}
  
        {/* Country of origin */}
        {countryOfOrigin && (
          <span style={badgeStyle('#374151', '#f9fafb', '#e5e7eb')}>
            {flag(countryOfOrigin)} {countryOfOrigin}
          </span>
        )}
  
      </div>
    )
  }