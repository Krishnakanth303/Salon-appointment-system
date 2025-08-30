import React, { useState } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { Link } from 'react-router-dom'

const Home = () => {
  const { queueData, isConnected } = useSocket()
  const [customerName, setCustomerName] = useState('')
  const [serviceType, setServiceType] = useState('General')
  const [isLoading, setIsLoading] = useState(false)
  const [newToken, setNewToken] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!customerName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/queue/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          serviceType
        }),
      })

      const data = await response.json()
      if (data.success) {
        setNewToken(data.token)
        setCustomerName('')
        setServiceType('General')
      } else {
        alert(data.message || 'Failed to generate token')
      }
    } catch (error) {
      console.error('Error generating token:', error)
      alert('Failed to generate token. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (newToken) {
    return (
      <div className="grid grid-2">
        <div className="card">
          <div className="token-display">
            <h2>🎫 Your Token</h2>
            <div className="token-number">{newToken.tokenNumber}</div>
            <div className="token-info">
              <h3>Token Details</h3>
              <p><strong>Name:</strong> {newToken.customerName}</p>
              <p><strong>Service:</strong> {newToken.serviceType}</p>
              <p><strong>Status:</strong> <span className="status-waiting">Waiting</span></p>
              <p><strong>Position in Queue:</strong> {queueData.queue.length}</p>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to={`/token/${newToken.id}`} className="btn btn-primary">
                Track Status
              </Link>
              <button 
                onClick={() => setNewToken(null)} 
                className="btn btn-secondary"
              >
                Generate Another
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>📊 Current Queue Status</h2>
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
          
          {queueData.queue.length > 0 && (
            <div>
              <h3>Current Queue</h3>
              <ul className="queue-list">
                {queueData.queue.slice(0, 5).map((token, index) => (
                  <li key={token.id} className="queue-item">
                    <div className="queue-item-info">
                      <h4>{token.customer_name}</h4>
                      <p>{token.service_type}</p>
                    </div>
                    <div className="token-number">{token.token_number}</div>
                  </li>
                ))}
                {queueData.queue.length > 5 && (
                  <li className="queue-item" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                    ... and {queueData.queue.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>🎫 Generate Queue Token</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="customerName">Your Name *</label>
            <input
              type="text"
              id="customerName"
              className="form-control"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="serviceType">Service Type</label>
            <select
              id="serviceType"
              className="form-control"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="General">General Service</option>
              <option value="Premium">Premium Service</option>
              <option value="Support">Customer Support</option>
              <option value="Billing">Billing Inquiry</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading || !isConnected}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Generating...' : '🎫 Generate Token'}
          </button>
        </form>
        
        {!isConnected && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
            ⚠️ Connection lost. Please wait for reconnection.
          </div>
        )}
      </div>

      <div className="card">
        <h2>📊 Queue Statistics</h2>
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
            <span className="stat-number">{queueData.stats.currentNumber - 1}</span>
            <span className="stat-label">Total Tokens Issued</span>
          </div>
        </div>

        <h3>🏢 Service Counters</h3>
        <div className="counter-grid">
          {queueData.counters.map(counter => (
            <div key={counter.id} className={`counter-card ${counter.is_active ? 'active' : 'inactive'}`}>
              <div className="counter-header">
                <h4>{counter.name}</h4>
                <span className={`counter-status ${counter.is_active ? 'active' : 'inactive'}`}>
                  {counter.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {counter.current_token_id && counter.token_number ? (
                <div className="current-serving">
                  <p><strong>Now Serving:</strong></p>
                  <p>Token #{counter.token_number}</p>
                  <p>{counter.customer_name}</p>
                </div>
              ) : counter.is_active ? (
                <div className="current-serving">
                  <p><em>Ready for next customer</em></p>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {queueData.queue.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>📋 Current Queue (Next 5)</h3>
            <ul className="queue-list">
              {queueData.queue.slice(0, 5).map((token, index) => (
                <li key={token.id} className="queue-item">
                  <div className="queue-item-info">
                    <h4>{token.customer_name}</h4>
                    <p>{token.service_type} • Position: {index + 1}</p>
                  </div>
                  <div className="token-number">{token.token_number}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home