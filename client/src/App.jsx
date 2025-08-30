import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SocketProvider } from './contexts/SocketContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Admin from './pages/Admin'
import TokenStatus from './pages/TokenStatus'

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <div className="container">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/token/:id" element={<TokenStatus />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </SocketProvider>
  )
}

export default App