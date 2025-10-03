import { useState } from 'react'
import { createManualLabel, updateManualLabel } from '../supabaseClient'
import './ManualLabelModal.css'

function ManualLabelModal({ ingredient, user, onClose, onSuccess, existingLabel }) {
  const [status, setStatus] = useState(existingLabel?.status || 'safe')
  const [notes, setNotes] = useState(existingLabel?.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const isEditing = !!existingLabel

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let data, error

      if (isEditing) {
        ({ data, error } = await updateManualLabel(
          existingLabel.id,
          status,
          notes
        ))
      } else {
        ({ data, error } = await createManualLabel(
          ingredient.name,
          status,
          notes,
          user.id
        ))
      }

      if (error) throw error

      onSuccess(data[0])
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="label-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Label' : 'Add Manual Label'}</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <div className="ingredient-info">
            <strong>Ingredient:</strong> {ingredient.name}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Status</label>
              <div className="status-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="status"
                    value="safe"
                    checked={status === 'safe'}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="radio-badge radio-safe">🟢 Approved</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="status"
                    value="danger"
                    checked={status === 'danger'}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="radio-badge radio-danger">🔴 Non-Approved</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="status"
                    value="unknown"
                    checked={status === 'unknown'}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="radio-badge radio-unknown">⚪ Unknown</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant information about this ingredient..."
                className="form-textarea"
                rows="4"
              />
            </div>

            {error && (
              <div className="auth-message auth-error">
                {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Label' : 'Save Label'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ManualLabelModal
