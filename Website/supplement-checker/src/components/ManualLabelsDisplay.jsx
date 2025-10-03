import { useState, useEffect } from 'react'
import { voteOnLabel, getUserVotes, deleteManualLabel } from '../supabaseClient'
import './ManualLabelsDisplay.css'

function ManualLabelsDisplay({ labels, user, onVoteUpdate, onEditLabel }) {
  const [userVotes, setUserVotes] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserVotes()
    }
  }, [user])

  const loadUserVotes = async () => {
    if (!user) return
    const votes = await getUserVotes(user.id)
    setUserVotes(votes)
  }

  const handleVote = async (labelId, voteValue) => {
    if (!user) return

    setLoading(true)
    try {
      await voteOnLabel(labelId, user.id, voteValue)
      await loadUserVotes()
      if (onVoteUpdate) onVoteUpdate()
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (labelId) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this label?')) return

    setLoading(true)
    try {
      await deleteManualLabel(labelId)
      if (onVoteUpdate) onVoteUpdate()
    } catch (error) {
      console.error('Error deleting label:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!labels || labels.length === 0) {
    return null
  }

  return (
    <div className="manual-labels-section">
      <h4 className="manual-labels-title">
        Community Labels ({labels.length})
      </h4>

      {labels.map((label) => {
        const isAuthor = user && label.created_by === user.id

        return (
          <div key={label.id} className="manual-label-card">
            <div className="label-header">
              <span className={`label-status-badge ${
                label.status === 'safe' ? 'status-safe' :
                label.status === 'danger' ? 'status-danger' :
                'status-unknown'
              }`}>
                {label.status === 'safe' ? '🟢 Approved' :
                 label.status === 'danger' ? '🔴 Non-Approved' :
                 '⚪ Unknown'}
              </span>
              <div className="vote-controls">
                <button
                  className={`vote-btn ${userVotes[label.id] === 1 ? 'vote-active' : ''}`}
                  onClick={() => handleVote(label.id, 1)}
                  disabled={loading || !user}
                  title="Thumbs up"
                >
                  👍 {label.upvotes}
                </button>
                <button
                  className={`vote-btn ${userVotes[label.id] === -1 ? 'vote-active' : ''}`}
                  onClick={() => handleVote(label.id, -1)}
                  disabled={loading || !user}
                  title="Thumbs down"
                >
                  👎 {label.downvotes}
                </button>
              </div>
            </div>

            {label.notes && (
              <div className="label-notes">
                {label.notes}
              </div>
            )}

            <div className="label-footer">
              <div className="label-meta">
                Created by {label.creator?.email || 'Anonymous'} •
                {new Date(label.created_at).toLocaleDateString()}
                {label.updated_at !== label.created_at && ' (edited)'}
              </div>

              {isAuthor && (
                <div className="label-actions">
                  <button
                    className="btn-edit-label"
                    onClick={() => onEditLabel && onEditLabel(label)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-delete-label"
                    onClick={() => handleDelete(label.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ManualLabelsDisplay
