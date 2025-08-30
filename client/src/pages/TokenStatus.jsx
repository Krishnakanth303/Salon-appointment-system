import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'

const TokenStatus = () => {
  const { id } = useParams()
  const { queueData, isConnected } = useSocket()
  const [token, setToken] = useState(null)
  const [position, setPosition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTokenStatus = async () => {
      try {
        const response = await fetch(`/api/token/${id}`)
        const data = await response.json()
        
        if (data.success) {
          setToken(data.token)
          setPosition(data.position)
          setError(null)
        } else {
          setError(data.message || 'Token not found')
        }
      } catch (err) {
        console.error('Error fetching token status:', err)
        setError('Failed to fetch token status')
      } finally {
        setLoading(false)
      }
    }

    fetchTokenStatus()
  }, [id])

  // Update position when queue data changes
  useEffect(() => {
    if (token && token.status === 'waiting' && queueData.queue.length > 0) {
      const newPosition = queueData.queue.findIndex(t => t.id === id) + 1
      setPosition(newPosition > 0 ? newPosition : null)
    }
  }, [queueData.queue, token, id])

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>❌ Error</h2>
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">
            🏠 Go Home
          </Link>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting': return '⏳'
      case 'serving': return '🔄'
      case 'completed': return '✅'
      default: return '❓'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'status-waiting'
      case 'serving': return 'status-serving'
      case 'completed': return 'status-completed'
      default: return ''
    }
  }

  const getStatusMessage = () => {
    switch (token.status) {
      case 'waiting':
        return position 
          ? `You are #${position} in line. Please wait for your turn.`
          : 'You are in the queue. Please wait for your turn.'
      case 'serving':
        return `You are currently being served at Counter ${token.counter_id}.`
      case 'completed':
        return 'Your service has been completed. Thank you!'
      default:
        return 'Status unknown.'
    }
  }

  const getCurrentlyServing = () => {
    const servingCounters = queueData.counters.filter(c => c.current_token_id)
    if (servingCounters.length === 0) return null
    
    return servingCounters.map(counter => ({
      counter: counter.name,
      tokenNumber: counter.token_number,
      customerName: counter.customer_name
    }))
  }

  const currentlyServing = getCurrentlyServing()

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="token-display">
          <h2>🎫 Token Status</h2>
          <div className="token-number">{token.token_number}</div>
          
          <div className="token-info">
            <h3>Token Details</h3>
            <p><strong>Name:</strong> {token.customer_name}</p>
            <p><strong>Service:</strong> {token.service_type}</p>
            <p><strong>Status:</strong> 
              <span className={getStatusColor(token.status)}>
                {getStatusIcon(token.status)} {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
              </span>
            </p>
            {position && (
              <p><strong>Position in Queue:</strong> #{position}</p>
            )}
            <p><strong>Generated:</strong> {new Date(token.timestamp).toLocaleString()}</p>
            {token.served_at && (
              <p><strong>Service Started:</strong> {new Date(token.served_at).toLocaleString()}</p>
            )}
            {token.completed_at && (
              <p><strong>Service Completed:</strong> {new Date(token.completed_at).toLocaleString()}</p>
            )}
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: token.status === 'waiting' ? '#fff3cd' : token.status === 'serving' ? '#d1ecf1' : '#d4edda',
            borderRadius: '10px',
            border: `2px solid ${token.status === 'waiting' ? '#ffc107' : token.status === 'serving' ? '#17a2b8' : '#28a745'}`
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              {getStatusMessage()}
            </p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <Link to="/" className="btn btn-primary">
              🏠 Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>📊 Queue Information</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{queueData.stats.totalInQueue}</span>
            <span className="stat-label">People in Queue</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{queueData.stats.totalServed}</span>
            <span className="stat-label">Served Today</span>
          </div>
        </div>

        {currentlyServing && currentlyServing.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>🔄 Currently Being Served</h3>
            {currentlyServing.map((serving, index) => (
              <div key={index} className="current-serving">
                <p><strong>{serving.counter}:</strong></p>
                <p>Token #{serving.tokenNumber} - {serving.customerName}</p>
              </div>
            ))}
          </div>
        )}

        {token.status === 'waiting' && queueData.queue.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>📋 Queue Ahead of You</h3>
            <ul className="queue-list">
              {queueData.queue.slice(0, position - 1).map((queueToken, index) => (
                <li key={queueToken.id} className="queue-item">
                  <div className="queue-item-info">
                    <h4>Position {index + 1}</h4>
                    <p>{queueToken.service_type}</p>
                  </div>
                  <div className="token-number">{queueToken.token_number}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isConnected && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '5px' 
          }}>
            ⚠️ Connection lost. Status updates may be delayed.
          </div>
        )}
      </div>
    </div>
  )
}

export default TokenStatus