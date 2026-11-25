/**
 * HubShared.jsx
 * Place at: frontend/src/pages/hub/components/HubShared.jsx
 *
 * Tiny shared UI primitives used by all three hub tabs.
 */

export function SectionTitle({ icon, title, subtitle }) {
    return (
      <div>
        <h2 style={{ margin: '0 0 2px', fontSize: '1.15rem', color: '#0d1f3c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{icon}</span>{title}
        </h2>
        {subtitle && <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>{subtitle}</p>}
      </div>
    )
  }
  
  export function SectionLoader() {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
        Loading…
      </div>
    )
  }
  
  export function EmptyState({ icon, message, action }) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{icon}</div>
        <p style={{ margin: '0 0 20px', fontSize: '0.95rem' }}>{message}</p>
        {action}
      </div>
    )
  }
  
  export function AlertBox({ type, text }) {
    const styles = {
      error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', prefix: '⚠ ' },
      info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', prefix: 'ℹ ' },
      success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', prefix: '✓ ' },
    }[type]
    return (
      <div style={{ marginTop: '8px', padding: '10px 14px', background: styles.bg, border: `1px solid ${styles.border}`, borderRadius: '8px', color: styles.color, fontSize: '0.85rem' }}>
        {styles.prefix}{text}
      </div>
    )
  }
  
  export function CarCard({ car, onSetPrimary, onDelete }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        border: `1.5px solid ${car.is_primary ? '#93c5fd' : '#e5e7eb'}`,
        background: car.is_primary ? '#eff6ff' : '#fff',
        borderRadius: '10px', gap: '12px',
        transition: 'border-color 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🚗</span>
          <div>
            <div style={{ fontWeight: 600, color: '#0d1f3c', fontSize: '0.95rem', marginBottom: '4px' }}>
              {car.year} {car.car_make.name} {car.car_model.name}
              {car.car_sub_model && (
                <span style={{ marginLeft: '6px', fontWeight: 500, color: '#4b5563', fontSize: '0.9rem' }}>
                  {car.car_sub_model.name}
                </span>
              )}
              {car.nickname && (
                <span style={{ marginLeft: '8px', fontWeight: 400, color: '#6b7280', fontSize: '0.85rem' }}>
                  "{car.nickname}"
                </span>
              )}
            </div>
            {car.is_primary && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: '20px', padding: '2px 10px' }}>
                ★ Primary Car
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
          {!car.is_primary && (
            <button
              className="btn btn-outline-navy"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              onClick={() => onSetPrimary(car.id)}
            >
              Set Primary
            </button>
          )}
          <button
            onClick={() => onDelete(car.id)}
            style={{ background: 'none', border: '1.5px solid #fca5a5', color: '#dc2626', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >
            Remove
          </button>
        </div>
      </div>
    )
  }