require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

const app = express();
const port = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many booking requests, please try again later.'
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later.'
});

// SQLite DB setup
const db = new Database('./salon.db');
logger.info('Connected to SQLite DB');

// Initialize database
db.prepare(`
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// Create indexes for performance
db.prepare('CREATE INDEX IF NOT EXISTS idx_email ON appointments(email)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_status ON appointments(status)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_date_time ON appointments(date, time)').run();

logger.info('Database initialized with indexes');

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        logger.error('Nodemailer error:', error);
    } else {
        logger.info('Nodemailer is ready');
    }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ success: false, message: 'No token provided' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        req.adminId = decoded.id;
        next();
    });
};

// Validation middleware
const validateBooking = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().matches(/^[\d\s\-\+\(\)]{10,15}$/).withMessage('Valid phone number is required'),
    body('service').trim().notEmpty().withMessage('Service is required'),
    body('date').isDate().withMessage('Valid date is required'),
    body('time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid time is required')
];

// Admin login route
app.post('/admin-login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUsername && password === adminPassword) {
        const token = jwt.sign({ id: username }, JWT_SECRET, { expiresIn: '8h' });
        logger.info('Admin login successful', { username });
        res.json({ success: true, token });
    } else {
        logger.warn('Failed admin login attempt', { username });
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Get all appointments (protected)
app.get('/api/appointments', verifyToken, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all();
        res.json(rows);
    } catch (err) {
        logger.error('Error fetching appointments:', err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Book appointment with validation and slot checking
app.post('/api/book', bookingLimiter, validateBooking, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, service, date, time } = req.body;

    try {
        // Check if slot is available (max 3 appointments per time slot)
        const APPOINTMENTS_PER_SLOT = 3;
        const slotsBooked = db.prepare(
            `SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ? AND status != 'rejected'`
        ).get(date, time);

        if (slotsBooked.count >= APPOINTMENTS_PER_SLOT) {
            return res.status(400).json({ 
                success: false, 
                message: 'This time slot is fully booked. Please choose another time.' 
            });
        }

        const stmt = db.prepare(
            `INSERT INTO appointments (name, email, phone, service, date, time) VALUES (?, ?, ?, ?, ?, ?)`
        );
        const result = stmt.run(name, email, phone, service, date, time);

        logger.info('Appointment booked', { id: result.lastInsertRowid, email, service, date, time });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Salon Appointment is Booked',
            html: `
                <h2>Hello ${name},</h2>
                <p>Your appointment for <strong>${service}</strong> is scheduled on <strong>${date}</strong> at <strong>${time}</strong>.</p>
                <p>Status: <strong>Pending</strong></p>
                <p>Booking ID: <strong>${result.lastInsertRowid}</strong></p>
                <p>We'll confirm shortly. Thank you!</p>
                <br>
                <p>– Krishna Salon</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error('Email sending failed:', error);
            } else {
                logger.info('Booking email sent:', { email, messageId: info.messageId });
            }
        });

        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        logger.error('Booking failed:', { error: err.message, data: { email, service, date, time } });
        res.status(500).json({ success: false, error: 'Booking failed. Please try again.' });
    }
});

// Confirm appointment (protected)
app.post('/api/confirm', verifyToken, (req, res) => {
    const { id } = req.body;

    try {
        const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id);
        if (!row) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        db.prepare(`UPDATE appointments SET status = 'confirmed' WHERE id = ?`).run(id);
        logger.info('Appointment confirmed', { id, email: row.email });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: row.email,
            subject: 'Your Appointment is Confirmed',
            html: `
                <h2>Hi ${row.name},</h2>
                <p>Your appointment for <strong>${row.service}</strong> on <strong>${row.date}</strong> at <strong>${row.time}</strong> has been <strong>confirmed</strong>.</p>
                <p>Booking ID: <strong>${id}</strong></p>
                <p>We look forward to seeing you!</p>
                <br><p>– Krishna Salon</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error('Confirmation email failed:', error);
            } else {
                logger.info('Confirmation email sent:', { email: row.email, messageId: info.messageId });
            }
        });

        res.json({ success: true });
    } catch (err) {
        logger.error('Confirmation failed:', { error: err.message, id });
        res.status(500).json({ success: false, message: 'Confirmation failed' });
    }
});

// Reject appointment (protected)
app.post('/api/reject', verifyToken, (req, res) => {
    const { id } = req.body;

    try {
        const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id);
        if (!row) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        db.prepare(`UPDATE appointments SET status = 'rejected' WHERE id = ?`).run(id);
        logger.info('Appointment rejected', { id, email: row.email });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: row.email,
            subject: 'Your Appointment Update',
            html: `
                <h2>Hi ${row.name},</h2>
                <p>We regret to inform you that your appointment for <strong>${row.service}</strong> on <strong>${row.date}</strong> at <strong>${row.time}</strong> could not be confirmed.</p>
                <p>Booking ID: <strong>${id}</strong></p>
                <p>Please try booking another time or contact us directly.</p>
                <br><p>– Krishna Salon</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error('Rejection email failed:', error);
            } else {
                logger.info('Rejection email sent:', { email: row.email, messageId: info.messageId });
            }
        });

        res.json({ success: true });
    } catch (err) {
        logger.error('Rejection failed:', { error: err.message, id });
        res.status(500).json({ success: false, message: 'Rejection failed' });
    }
});

// Delete appointment (protected) - NEW
app.delete('/api/appointments/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    try {
        const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id);
        if (!row) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);
        logger.info('Appointment deleted', { id, email: row.email });

        res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (err) {
        logger.error('Deletion failed:', { error: err.message, id });
        res.status(500).json({ success: false, message: 'Deletion failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Fallback route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
});
