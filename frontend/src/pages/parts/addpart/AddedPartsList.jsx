/**
 * AddedPartsList.jsx
 * Place at: frontend/src/pages/parts/addpart/AddedPartsList.jsx
 *
 * Step 2 — Table of parts added during the current session,
 * with a "Done" shortcut and per-row remove.
 */

export function AddedPartsList({ addedParts, onRemove, onDone }) {
    if (addedParts.length === 0) return null
  
    return (
      <div className="addpart-added-list">
        <div className="addpart-added-header">
          <span className="addpart-step-badge">Added</span>
          <strong>
            {addedParts.length} part{addedParts.length !== 1 ? 's' : ''} added this session
          </strong>
          <button type="button" className="btn btn-primary addpart-done-btn" onClick={onDone}>
            ✓ Done — Go to Inventory
          </button>
        </div>
  
        <table className="addpart-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Category</th>
              <th>Condition</th>
              <th>Price</th>
              <th>Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {addedParts.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  {p.part_number && (
                    <span className="addpart-table-sub">#{p.part_number}</span>
                  )}
                </td>
                <td>
                  {p.category || '—'}
                  {p.subcategory && (
                    <span className="addpart-table-sub">{p.subcategory}</span>
                  )}
                </td>
                <td>{p.condition}</td>
                <td>{p.price} QAR</td>
                <td>{p.quantity}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    title="Remove from list"
                    className="addpart-remove-btn"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }