import React, { useState } from 'react'
import { useSocket } from '../contexts/SocketContext'

const Admin = () => {
  const { queueData, isConnected } = useSocket()
  const [isLoading, setIsLoading] = useState(false)

  const handleCallNext = async (counterId) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ counterId }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.message || 'Failed to call next person')
      }
    } catch (error) {
      console.error('Error calling next person:', error)
      alert('Failed to call next person. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteService = async (counterId) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/queue/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ counterId }),
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.message || 'Failed to complete service')
      }
    } catch (error) {
      console.error('Error completing service:', error)
      alert('Failed to complete service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCounter = async (counterId) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/counters/${counterId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.message || 'Failed to toggle counter')
      }
    } catch (error) {
      console.error('Error toggling counter:', error)
      alert('Failed to toggle counter. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetQueue = async () => {
    if (!window.confirm('Are you sure you want to reset the entire queue? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/queue/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.message || 'Failed to reset queue')
      }
    } catch (error) {
      console.error('Error resetting queue:', error)
      alert('Failed to reset queue. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>⚙️ Admin Dashboard</h2>
          <button 
            onClick={handleResetQueue}
            className="btn btn-danger"
            disabled={isLoading || !isConnected}
          >
            🗑️ Reset Queue
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{queueData.stats.totalInQueue}</span>
            <span className="stat-label">People in Queue</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{queueData.stats.totalServed}</span>
            <span className="stat-label">Served Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{queueData.counters.filter(c => c.is_active).length}</span>
            <span className="stat-label">Active Counters</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{queueData.stats.currentNumber - 1}</span>
            <span className="stat-label">Total Tokens Issued</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>🏢 Counter Management</h2>
        <div className="counter-grid">
          {queueData.counters.map(counter => (
            <div key={counter.id} className={`counter-card ${counter.is_active ? 'active' : 'inactive'}`}>
              <div className="counter-header">
                <h3>{counter.name}</h3>
                <span className={`counter-status ${counter.is_active ? 'active' : 'inactive'}`}>
                  {counter.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {counter.current_token_id && counter.token_number ? (
                <div className="current-serving">
                  <p><strong>Currently Serving:</strong></p>
                  <p><strong>Token #{counter.token_number}</strong></p>
                  <p>{counter.customer_name}</p>
                  <p><em>{counter.service_type}</em></p>
                </div>
              ) : counter.is_active ? (
                <div className="current-serving">
                  <p><em>Ready for next customer</em></p>
                </div>
              ) : (
                <div className="current-serving">
                  <p><em>Counter is inactive</em></p>
                </div>
              )}
              
              <div className="counter-actions">
                {counter.is_active && !counter.current_token_id && (
                  <button
                    onClick={() => handleCallNext(counter.id)}
                    className="btn btn-primary"
                    disabled={isLoading || queueData.queue.length === 0}
                  >
                    📢 Call Next
                  </button>
                )}
                
                {counter.current_token_id && (
                  <button
                    onClick={() => handleCompleteService(counter.id)}
                    className="btn btn-success"
                    disabled={isLoading}
                  >
                    ✅ Complete Service
                  </button>
                )}
                
                <button
                  onClick={() => handleToggleCounter(counter.id)}
                  className={`btn ${counter.is_active ? 'btn-warning' : 'btn-secondary'}`}
                  disabled={isLoading}
                >
                  {counter.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>📋 Current Queue ({queueData.queue.length} people)</h2>
        {queueData.queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>🎉 No one in queue!</p>
          </div>
        ) : (
          <ul className="queue-list">
            {queueData.queue.map((token, index) => (
              <li key={token.id} className="queue-item">
                <div className="queue-item-info">
                  <h4>{token.customer_name}</h4>
                  <p>
                    {token.service_type} • 
                    Position: {index + 1} • 
                    Waiting since: {new Date(token.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="token-number">{token.token_number}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isConnected && (
        <div className="card" style={{ backgroundColor: '#f8d7da', borderColor: '#f5c6cb' }}>
          <h3 style={{ color: '#721c24' }}>⚠️ Connection Lost</h3>
          <p style={{ color: '#721c24' }}>
            The connection to the server has been lost. Please wait for reconnection or refresh the page.
          </p>
        </div>
      )}
    </div>
  )
}

export default Admin