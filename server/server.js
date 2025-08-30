const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Database = require('./database');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());

// Emit queue updates to all connected clients
const emitQueueUpdate = () => {
  db.getQueue((err, queue) => {
    if (err) return console.error('Error getting queue:', err);
    
    db.getCounters((err, counters) => {
      if (err) return console.error('Error getting counters:', err);
      
      db.getStats((err, stats) => {
        if (err) return console.error('Error getting stats:', err);
        
        io.emit('queueUpdate', {
          queue: queue || [],
          counters: counters || [],
          stats
        });
      });
    });
  });
};

// Routes

// Get current queue status
app.get('/api/queue', (req, res) => {
  db.getQueue((err, queue) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.getCounters((err, counters) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.getStats((err, stats) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          queue: queue || [],
          counters: counters || [],
          stats
        });
      });
    });
  });
});

// Add new token to queue
app.post('/api/queue/add', (req, res) => {
  const { customerName, serviceType = 'General' } = req.body;
  
  if (!customerName) {
    return res.status(400).json({
      success: false,
      message: 'Customer name is required'
    });
  }

  db.addToken(customerName, serviceType, (err, token) => {
    if (err) return res.status(500).json({ error: err.message });
    
    emitQueueUpdate();
    
    res.json({
      success: true,
      token
    });
  });
});

// Call next person in queue
app.post('/api/queue/next', (req, res) => {
  const { counterId } = req.body;
  
  if (!counterId) {
    return res.status(400).json({
      success: false,
      message: 'Counter ID is required'
    });
  }

  db.callNext(counterId, (err, token) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!token) {
      return res.json({
        success: false,
        message: 'Queue is empty'
      });
    }

    emitQueueUpdate();
    
    res.json({
      success: true,
      token
    });
  });
});

// Complete service for a token
app.post('/api/queue/complete', (req, res) => {
  const { counterId } = req.body;
  
  if (!counterId) {
    return res.status(400).json({
      success: false,
      message: 'Counter ID is required'
    });
  }

  db.completeService(counterId, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!result) {
      return res.json({
        success: false,
        message: 'No active token for this counter'
      });
    }

    emitQueueUpdate();
    
    res.json({
      success: true,
      message: 'Service completed successfully'
    });
  });
});

// Reset entire queue
app.post('/api/queue/reset', (req, res) => {
  db.resetQueue((err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    emitQueueUpdate();
    
    res.json({
      success: true,
      message: 'Queue reset successfully'
    });
  });
});

// Get token status by ID
app.get('/api/token/:id', (req, res) => {
  const { id } = req.params;
  
  db.getTokenById(id, (err, token) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    // Get position in queue if still waiting
    if (token.status === 'waiting') {
      db.getQueue((err, queue) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const position = queue.findIndex(t => t.id === id) + 1;
        
        res.json({
          success: true,
          token,
          position
        });
      });
    } else {
      res.json({
        success: true,
        token,
        position: null
      });
    }
  });
});

// Toggle counter status
app.post('/api/counters/:id/toggle', (req, res) => {
  const { id } = req.params;
  
  db.toggleCounter(parseInt(id), (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    emitQueueUpdate();
    
    res.json({
      success: true,
      message: 'Counter status updated'
    });
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current queue status to newly connected client
  emitQueueUpdate();

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  process.exit(0);
});