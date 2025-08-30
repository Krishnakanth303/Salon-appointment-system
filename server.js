require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 8000;

app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SQLite DB setup using better-sqlite3
const db = new Database('./salon.db');
console.log('Connected to SQLite DB');

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
        console.error('Nodemailer error:', error);
    } else {
        console.log('Nodemailer is ready');
    }
});

// Admin login route
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUsername && password === adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Login failed. Please try again.' });
    }
});

// Get all appointments
app.get('/api/appointments', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Book appointment
app.post('/api/book', (req, res) => {
    const { name, email, phone, service, date, time } = req.body;

    try {
        const stmt = db.prepare(`INSERT INTO appointments (name, email, phone, service, date, time) VALUES (?, ?, ?, ?, ?, ?)`);
        const result = stmt.run(name, email, phone, service, date, time);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Salon Appointment is Booked',
            html: `
                <h2>Hello ${name},</h2>
                <p>Your appointment for <strong>${service}</strong> is scheduled on <strong>${date}</strong> at <strong>${time}</strong>.</p>
                <p>Status: <strong>Pending</strong></p>
                <p>We’ll confirm shortly. Thank you!</p>
                <br>
                <p>– Krishna Salon</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('Email Error:', error);
            else console.log('Booking email sent:', info.response);
        });

        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Confirm appointment
app.post('/api/confirm', (req, res) => {
    const { id } = req.body;

    try {
        const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id);
        if (!row) return res.status(404).json({ success: false });

        db.prepare(`UPDATE appointments SET status = 'confirmed' WHERE id = ?`).run(id);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: row.email,
            subject: 'Your Appointment is Confirmed',
            html: `
                <h2>Hi ${row.name},</h2>
                <p>Your appointment for <strong>${row.service}</strong> on <strong>${row.date}</strong> at <strong>${row.time}</strong> has been <strong>confirmed</strong>.</p>
                <p>We look forward to seeing you!</p>
                <br><p>– Krishna Salon</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('Email Error:', error);
            else console.log('Confirmation email sent:', info.response);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Reject appointment
app.post('/api/reject', (req, res) => {
    const { id } = req.body;

    try {
        const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id);
        if (!row) return res.status(404).json({ success: false });

        db.prepare(`UPDATE appointments SET status = 'rejected' WHERE id = ?`).run(id);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: row.email,
            subject: 'Your Appointment Was Rejected',
            html: `
                <h2>Hi ${row.name},</h2>
                <p>We regret to inform you that your appointment for <strong>${row.service}</strong> on <strong>${row.date}</strong> at <strong>${row.time}</strong> was <strong>rejected</strong>.</p>
                <p>Please try booking another time or contact us directly.</p>
                <br><p>– Krishna Salon</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('Email Error:', error);
            else console.log('Rejection email sent:', info.response);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Fallback route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
