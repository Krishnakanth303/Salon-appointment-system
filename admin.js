document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('refreshBtn').addEventListener('click', loadAppointments);
});

function checkAuthStatus() {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated');

    if (isAuthenticated === 'true') {
        showAdminPanel();
        loadAppointments();
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.login-btn');

    try {
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;

        const response = await fetch('/admin-login', { // Corrected endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            showAdminPanel();
            loadAppointments();
            showMessage('Login successful!', 'success');
        } else {
            showMessage('Invalid username or password!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'error');
    } finally {
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminAuthenticated');
    showLoginForm();
    document.getElementById('loginForm').reset();
    showMessage('Logged out successfully!', 'success');
}

async function loadAppointments() {
    try {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.textContent = 'Loading...';
        refreshBtn.disabled = true;

        const response = await fetch('/api/appointments');
        const appointments = await response.json();

        displayAppointments(appointments);
        updateStats(appointments);

        refreshBtn.textContent = 'Refresh';
        refreshBtn.disabled = false;
    } catch (error) {
        console.error('Error loading appointments:', error);
        showMessage('Failed to load appointments. Please try again.', 'error');

        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.disabled = false;
    }
}

function displayAppointments(appointments) {
    const appointmentsList = document.getElementById('appointmentsList');

    if (appointments.length === 0) {
        appointmentsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No appointments found.</p>';
        return;
    }

    appointmentsList.innerHTML = appointments.map(appointment => `
        <div class="appointment-card">
            <div class="appointment-header">
                <span class="appointment-name">${appointment.name}</span>
                <span class="status-badge status-${appointment.status}">${appointment.status}</span>
            </div>
            <div class="appointment-details">
                <div><strong>Email:</strong> ${appointment.email}</div>
                <div><strong>Phone:</strong> ${appointment.phone}</div>
                <div><strong>Service:</strong> ${appointment.service}</div>
                <div><strong>Date:</strong> ${formatDate(appointment.date)}</div>
                <div><strong>Time:</strong> ${formatTime(appointment.time)}</div>
                <div><strong>Booked:</strong> ${formatDateTime(appointment.created_at)}</div>
            </div>
            ${appointment.status === 'pending' ? `
                <div class="appointment-actions">
                    <button class="confirm-btn" onclick="confirmAppointment(${appointment.id})">Confirm</button>
                    <button class="reject-btn" onclick="rejectAppointment(${appointment.id})">Reject</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function updateStats(appointments) {
    const total = appointments.length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;
    const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;

    document.getElementById('totalAppointments').textContent = total;
    document.getElementById('pendingAppointments').textContent = pending;
    document.getElementById('confirmedAppointments').textContent = confirmed;
}

async function confirmAppointment(id) {
    if (!confirm('Are you sure you want to confirm this appointment?')) return;

    try {
        const response = await fetch('/api/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Appointment confirmed successfully!', 'success');
            loadAppointments();
        } else {
            showMessage('Failed to confirm appointment. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error confirming appointment:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

async function rejectAppointment(id) {
    if (!confirm('Are you sure you want to reject this appointment?')) return;

    try {
        const response = await fetch('/api/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Appointment rejected successfully!', 'success');
            loadAppointments();
        } else {
            showMessage('Failed to reject appointment. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error rejecting appointment:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

function showMessage(message, type) {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    const activeContainer = document.getElementById('loginContainer').style.display !== 'none'
        ? document.getElementById('loginContainer')
        : document.querySelector('.container');

    activeContainer.insertBefore(messageDiv, activeContainer.firstChild);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

setInterval(() => {
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        loadAppointments();
    }
}, 30000);
