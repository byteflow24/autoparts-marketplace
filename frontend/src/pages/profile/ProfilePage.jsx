/**
 * ProfilePage.jsx
 * frontend/src/pages/profile/ProfilePage.jsx
 *
 * Unified profile page for both customer and garage roles.
 * Parent fetches shared user data; role-specific child sections render below.
 *
 * Component tree:
 *   ProfilePage          ← data fetching, shared state
 *     UserInfoSection    ← name, email, phone, edit form (both roles)
 *     CustomerSection    ← saved cars / orders link (role === 'customer')
 *     GarageSection      ← garage name, location, link to edit (role === 'garage')
 */

import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

function getToken() {
  return JSON.parse(localStorage.getItem('auth'))?.access_token || ''
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

// ── Main page (parent) ────────────────────────────────────────
export function ProfilePage() {
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [apiError, setApiError]     = useState('')

  // Edit state lives here so UserInfoSection can update profile
  const [editMode, setEditMode]     = useState(false)
  const [editForm, setEditForm]     = useState({ name: '', phone: '', country_code: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  // ── Load profile ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/profile/me`, { headers: authHeaders() })
        setProfile(res.data)
        setEditForm({
          name:         res.data.name         || '',
          phone:        res.data.phone        || '',
          country_code: res.data.country_code || '',
        })
      } catch {
        setApiError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save profile edits ───────────────────────────────────────
  async function handleProfileSave(e) {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      const res = await axios.patch(`${API}/profile/me`, editForm, { headers: authHeaders() })
      setProfile(prev => ({ ...prev, ...res.data.user }))
      setEditMode(false)
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Failed to save changes.')
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">
            <div className="auth-header"><p>Loading profile…</p></div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <title>My Profile | AutoParts Marketplace</title>

      <section className="auth-section">
        <div className="container" style={{ maxWidth: '680px' }}>

          {apiError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{apiError}</div>
          )}

          {/* ── Shared: user info card ────────────────────── */}
          <UserInfoSection
            profile={profile}
            editMode={editMode}
            editForm={editForm}
            editSaving={editSaving}
            editError={editError}
            onEditStart={() => setEditMode(true)}
            onEditCancel={() => setEditMode(false)}
            onEditChange={patch => setEditForm(prev => ({ ...prev, ...patch }))}
            onEditSave={handleProfileSave}
          />

          {/* ── Role-specific sections ────────────────────── */}
          {profile?.role === 'customer' && (
            <CustomerSection />
          )}

          {profile?.role === 'garage' && (
            <GarageSection garageId={profile?.garage_id} />
          )}

          {/* Back link */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <NavLink to="/" style={{ color: '#e67e22', textDecoration: 'none', fontSize: '0.9rem' }}>
              ← Back to Home
            </NavLink>
          </div>

        </div>
      </section>
    </>
  )
}


// ── UserInfoSection ───────────────────────────────────────────
// Shared by both roles: displays / edits name, email, phone.
function UserInfoSection({
  profile,
  editMode, editForm, editSaving, editError,
  onEditStart, onEditCancel, onEditChange, onEditSave,
}) {
  const roleLabel =
    profile?.role === 'customer' ? 'Customer' :
    profile?.role === 'garage'   ? 'Garage'   :
    profile?.role ?? '—'

  return (
    <div style={{
      background: '#fff', borderRadius: '16px',
      border: '1px solid #e5e7eb', padding: '32px',
      marginBottom: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', color: '#0d1f3c', fontWeight: 700 }}>
            My Profile
          </h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>{profile?.email}</p>
        </div>
        {!editMode && (
          <button className="btn btn-outline-navy" onClick={onEditStart}>
            Edit Profile
          </button>
        )}
      </div>

      {/* View mode */}
      {!editMode ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <InfoField label="Name"  value={profile?.name} />
          <InfoField label="Phone" value={
            profile?.phone
              ? `${profile.country_code || ''} ${profile.phone}`.trim()
              : null
          } />
          <InfoField label="Role" value={roleLabel} />
        </div>
      ) : (
        /* Edit mode */
        <form onSubmit={onEditSave}>
          {editError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{editError}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={editForm.name}
                onChange={e => onEditChange({ name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Country Code</label>
              <input
                className="form-input"
                placeholder="+974"
                value={editForm.country_code}
                onChange={e => onEditChange({ country_code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={editForm.phone}
                onChange={e => onEditChange({ phone: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="btn-text-cancel" onClick={onEditCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}


// ── CustomerSection ───────────────────────────────────────────
// Shown only when role === 'customer'.
// Add more customer-specific blocks here without touching UserInfoSection.
function CustomerSection() {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      border: '1px solid #e5e7eb', padding: '20px 24px',
      marginBottom: '20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.6rem' }}>🚗</span>
        <div>
          <div style={{ fontWeight: 600, color: '#0d1f3c', fontSize: '0.95rem' }}>My Cars & Orders</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' }}>
            Manage your saved cars, view orders, and saved parts
          </div>
        </div>
      </div>
      <NavLink to="/hub" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
        Go to My Hub →
      </NavLink>
    </div>
  )
}


// ── GarageSection ─────────────────────────────────────────────
// Shown only when role === 'garage'.
// Add more garage-specific blocks here without touching UserInfoSection.
function GarageSection() {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      border: '1px solid #e5e7eb', padding: '20px 24px',
      marginBottom: '20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.6rem' }}>🔧</span>
        <div>
          <div style={{ fontWeight: 600, color: '#0d1f3c', fontSize: '0.95rem' }}>Garage Profile</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' }}>
            Update your garage details, location, and delivery zones
          </div>
        </div>
      </div>
      <NavLink to="/garage/profile/edit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
        Edit Garage Profile →
      </NavLink>
    </div>
  )
}


// ── InfoField ─────────────────────────────────────────────────
function InfoField({ label, value }) {
  return (
    <div>
      <div style={{
        fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 500 }}>
        {value || <span style={{ color: '#d1d5db' }}>—</span>}
      </div>
    </div>
  )
}