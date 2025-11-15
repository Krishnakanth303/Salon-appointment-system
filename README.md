# 💇‍♂️ Salon Appointment Management System

A full-stack web application for booking, managing, and tracking salon appointments with enhanced security features.

## 🌟 Features

### 👥 User Side
- 📅 Book appointments with name, email, phone, date, time, and service
- ✅ Real-time validation for all form inputs
- 🚫 Slot availability checking (max 3 appointments per time slot)
- 📧 Receive confirmation or rejection emails
- 🔒 Rate limiting to prevent spam bookings

### 🧑‍💼 Admin Side
- 🔐 Secure JWT-based authentication
- 📊 View dashboard with all appointments: pending, confirmed, rejected
- ✅ One-click approval/rejection
- 🗑️ Delete appointments
- 📈 Statistics panel showing totals
- 🔄 Auto-refresh every 30 seconds

## 🧰 Tech Stack

| Layer | Technology |
|--|--|
| Backend | Node.js, Express |
| Database | SQLite with indexes |
| Frontend | HTML, CSS, JavaScript |
| Email | Nodemailer + Gmail App Password |
| Security | JWT, express-validator, rate-limiting |
| Logging | Winston |

## 🔐 Security Features

- **JWT Authentication**: Secure token-based admin authentication
- **Input Validation**: Server-side validation with express-validator
- **Rate Limiting**: Protection against spam and brute-force attacks
- **SQL Injection Prevention**: Prepared statements with better-sqlite3
- **Structured Logging**: Winston logger for security monitoring

## 📸 Screenshots

📌 All screenshots are stored in the `assets/images/` folder.

### 🏠 Home Page
### 💈 Services Section
### 📅 Booking Form
### 🔐 Admin Login
### 📊 Admin Dashboard
### 📧 Email - Booking Message
### ✅ Email - Confirmation Message

## 🛠️ Getting Started

### 🔧 Prerequisites

- Node.js (v18+)
- Gmail account with App Password enabled

### 📦 Installation

```bash
git clone https://github.com/Krishnakanth303/Salon-appointment-system.git
cd salon-appointment-system
npm install
```

### 🔐 Environment Setup

Create a `.env` file in the root directory (use `.env.example` as template):

```env
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=yourapppassword
ADMIN_USER=youradminusername
ADMIN_PASS=youradminpassword
JWT_SECRET=your-secure-jwt-secret-key
PORT=8000
```

⚠️ **Important**: 
- Generate a strong JWT_SECRET (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")`
- Don't commit your `.env` file. It's listed in `.gitignore`
- Generate Gmail App Password: 👉 https://myaccount.google.com/apppasswords

### ▶️ Run the Application

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Then open: http://localhost:8000

## 📂 Folder Structure

```
salon-appointment-system/
├── client/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── admin.html
├── admin.js
├── server.js
├── salon.db (generated, not tracked)
├── logs/ (generated, not tracked)
├── .env (not tracked)
├── .env.example
├── .gitignore
├── README.md
└── assets/
    └── images/
        ├── home-page.png
        ├── services-section.png
        ├── booking-form.png
        ├── admin-login.png
        ├── admin-dashboard.png
        ├── email-bookingmessage.png
        └── email-confirmed.png
```

## 📡 API Endpoints

### Public Endpoints
- `POST /api/book` - Book an appointment (rate-limited)
- `POST /admin-login` - Admin login (rate-limited)

### Protected Endpoints (Requires JWT)
- `GET /api/appointments` - Get all appointments
- `POST /api/confirm` - Confirm an appointment
- `POST /api/reject` - Reject an appointment
- `DELETE /api/appointments/:id` - Delete an appointment

## ✉️ Email Configuration Notes

- Gmail must have **2-Factor Authentication** enabled
- Generate a Gmail **App Password**: 👉 https://myaccount.google.com/apppasswords
- Use the App Password in your `.env` file, not your regular Gmail password

## 🚀 Recent Improvements

### Security
- ✅ JWT-based authentication instead of sessionStorage
- ✅ Server-side input validation
- ✅ Rate limiting on booking and login endpoints
- ✅ Database file excluded from version control

### Features
- ✅ Slot availability checking (prevents overbooking)
- ✅ Delete appointment functionality
- ✅ Database indexes for better performance
- ✅ Structured logging with Winston
- ✅ Better error handling and messages

### Code Quality
- ✅ Centralized error handling middleware
- ✅ Input sanitization and validation
- ✅ Improved code organization

## 💡 Future Enhancements

- 🔐 Password hashing with bcrypt
- 📱 SMS notifications via Twilio
- 🧾 Appointment summary emails
- 🎨 UI enhancement using TailwindCSS
- 🌐 Cloud database (MongoDB, PostgreSQL)
- 📊 Analytics dashboard
- 🔄 Appointment rescheduling
- 👤 Customer account system

## 🤝 Contributing

This is a personal project, but contributions are welcome. Feel free to submit issues or pull requests for improvements!

## 📄 License

This project is licensed under the MIT License

## 👨‍💻 Author

Krishna Kanth Urs K M
