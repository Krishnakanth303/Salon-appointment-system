const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'queue.db'));
    this.init();
  }

  init() {
    // Create tables if they don't exist
    this.db.serialize(() => {
      // Queue table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS queue (
          id TEXT PRIMARY KEY,
          token_number INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          service_type TEXT DEFAULT 'General',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'waiting',
          served_at DATETIME,
          completed_at DATETIME,
          counter_id INTEGER
        )
      `);

      // Counters table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS counters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          current_token_id TEXT,
          FOREIGN KEY (current_token_id) REFERENCES queue (id)
        )
      `);

      // Settings table for current number tracking
      this.db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Initialize default counters
      this.db.get("SELECT COUNT(*) as count FROM counters", (err, row) => {
        if (!err && row.count === 0) {
          const stmt = this.db.prepare("INSERT INTO counters (name, is_active) VALUES (?, ?)");
          stmt.run("Counter 1", 1);
          stmt.run("Counter 2", 1);
          stmt.run("Counter 3", 0);
          stmt.finalize();
        }
      });

      // Initialize current number
      this.db.get("SELECT value FROM settings WHERE key = 'current_number'", (err, row) => {
        if (!err && !row) {
          this.db.run("INSERT INTO settings (key, value) VALUES ('current_number', '1')");
        }
      });
    });
  }

  // Get current queue
  getQueue(callback) {
    this.db.all(`
      SELECT * FROM queue 
      WHERE status = 'waiting' 
      ORDER BY token_number ASC
    `, callback);
  }

  // Get all counters
  getCounters(callback) {
    this.db.all(`
      SELECT c.*, q.token_number, q.customer_name, q.service_type
      FROM counters c
      LEFT JOIN queue q ON c.current_token_id = q.id
      ORDER BY c.id ASC
    `, callback);
  }

  // Get queue statistics
  getStats(callback) {
    this.db.serialize(() => {
      let stats = {};
      
      this.db.get("SELECT COUNT(*) as total FROM queue WHERE status = 'waiting'", (err, row) => {
        stats.totalInQueue = row ? row.total : 0;
        
        this.db.get("SELECT COUNT(*) as total FROM queue WHERE status = 'completed'", (err, row) => {
          stats.totalServed = row ? row.total : 0;
          
          this.db.get("SELECT value FROM settings WHERE key = 'current_number'", (err, row) => {
            stats.currentNumber = row ? parseInt(row.value) : 1;
            callback(null, stats);
          });
        });
      });
    });
  }

  // Add new token
  addToken(customerName, serviceType, callback) {
    this.db.get("SELECT value FROM settings WHERE key = 'current_number'", (err, row) => {
      if (err) return callback(err);
      
      const currentNumber = parseInt(row.value);
      const { v4: uuidv4 } = require('uuid');
      const tokenId = uuidv4();
      
      this.db.run(`
        INSERT INTO queue (id, token_number, customer_name, service_type, status)
        VALUES (?, ?, ?, ?, 'waiting')
      `, [tokenId, currentNumber, customerName, serviceType], (err) => {
        if (err) return callback(err);
        
        // Update current number
        this.db.run("UPDATE settings SET value = ? WHERE key = 'current_number'", 
          [currentNumber + 1], (err) => {
            if (err) return callback(err);
            
            callback(null, {
              id: tokenId,
              tokenNumber: currentNumber,
              customerName,
              serviceType,
              status: 'waiting'
            });
          });
      });
    });
  }

  // Call next person
  callNext(counterId, callback) {
    this.db.get(`
      SELECT * FROM queue 
      WHERE status = 'waiting' 
      ORDER BY token_number ASC 
      LIMIT 1
    `, (err, token) => {
      if (err) return callback(err);
      if (!token) return callback(null, null);

      this.db.serialize(() => {
        // Update token status
        this.db.run(`
          UPDATE queue 
          SET status = 'serving', served_at = CURRENT_TIMESTAMP, counter_id = ?
          WHERE id = ?
        `, [counterId, token.id]);

        // Update counter
        this.db.run(`
          UPDATE counters 
          SET current_token_id = ?
          WHERE id = ?
        `, [token.id, counterId], (err) => {
          if (err) return callback(err);
          
          callback(null, {
            ...token,
            status: 'serving',
            counterId
          });
        });
      });
    });
  }

  // Complete service
  completeService(counterId, callback) {
    this.db.get(`
      SELECT current_token_id FROM counters WHERE id = ?
    `, [counterId], (err, row) => {
      if (err) return callback(err);
      if (!row || !row.current_token_id) return callback(null, null);

      this.db.serialize(() => {
        // Update token status
        this.db.run(`
          UPDATE queue 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [row.current_token_id]);

        // Clear counter
        this.db.run(`
          UPDATE counters 
          SET current_token_id = NULL
          WHERE id = ?
        `, [counterId], (err) => {
          if (err) return callback(err);
          callback(null, { success: true });
        });
      });
    });
  }

  // Reset queue
  resetQueue(callback) {
    this.db.serialize(() => {
      this.db.run("DELETE FROM queue");
      this.db.run("UPDATE counters SET current_token_id = NULL");
      this.db.run("UPDATE settings SET value = '1' WHERE key = 'current_number'", callback);
    });
  }

  // Toggle counter status
  toggleCounter(counterId, callback) {
    this.db.get("SELECT is_active FROM counters WHERE id = ?", [counterId], (err, row) => {
      if (err) return callback(err);
      if (!row) return callback(new Error('Counter not found'));

      const newStatus = row.is_active ? 0 : 1;
      this.db.run(`
        UPDATE counters 
        SET is_active = ?, current_token_id = CASE WHEN ? = 0 THEN NULL ELSE current_token_id END
        WHERE id = ?
      `, [newStatus, newStatus, counterId], callback);
    });
  }

  // Get token by ID
  getTokenById(tokenId, callback) {
    this.db.get("SELECT * FROM queue WHERE id = ?", [tokenId], callback);
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;