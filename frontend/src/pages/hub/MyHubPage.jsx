/**
 * MyHubPage.jsx
 * Place at: frontend/src/pages/hub/MyHubPage.jsx
 *
 * Customer-only dashboard shell — tab bar only.
 * Each tab lives in its own file under tabs/.
 */

import { useState } from 'react'
import { MyCarsTab }      from './tabs/MyCarsTab'
import { MyOrdersTab }    from './tabs/MyOrdersTab'
import { SavedPartsTab }  from './tabs/SavedPartsTab'

const TABS = [
  { id: 'cars',   label: '🚗 My Cars'     },
  { id: 'orders', label: '📦 My Orders'   },
  { id: 'saved',  label: '🔖 Saved Parts' },
]

export function MyHubPage() {
    const [tab, setTab] = useState('cars')
   
    return (
      <>
        <title>My Hub | AutoParts Marketplace</title>
   
        <section className="auth-section">
          <div className="container" style={{ maxWidth: '900px' }}>
   
            <div className="hub-header">
              <h1>My Hub</h1>
              <p>Your cars, orders, and saved parts — all in one place.</p>
            </div>
   
            <div className="hub-tabs">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`hub-tab-btn${tab === t.id ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
   
            {tab === 'cars'   && <MyCarsTab />}
            {tab === 'orders' && <MyOrdersTab />}
            {tab === 'saved'  && <SavedPartsTab />}
   
          </div>
        </section>
      </>
    )
  }