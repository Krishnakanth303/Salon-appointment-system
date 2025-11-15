document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('refreshBtn').addEventListener('click', loadAppointments);
});

function checkAuthStatus() {
    const token = localStorage.getItem('adminToken');

    if (token) {
        // Verify token is still valid by making a test request
        fetch('/api/appointments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                showAdminPanel();
                loadAppointments();
            } else {
                // Token invalid or expired
                localStorage.removeItem('adminToken');
                showLoginForm();
            }
        })
        .catch(() => {
            localStorage.removeItem('adminToken');
            showLoginForm();
        });
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

        const response = await fetch('/admin-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            localStorage.setItem('adminToken', result.token);
            showAdminPanel();
            loadAppointments();
            showMessage('Login successful!', 'success');
        } else {
            showMessage(result.message || 'Invalid username or password!', 'error');
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
    localStorage.removeItem('adminToken');
    showLoginForm();
    document.getElementById('loginForm').reset();
    showMessage('Logged out successfully!', 'success');
}

async function loadAppointments() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        showLoginForm();
        return;
    }

    try {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.textContent = 'Loading...';
        refreshBtn.disabled = true;

        const response = await fetch('/api/appointments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminToken');
                showLoginForm();
                showMessage('Session expired. Please login again.', 'error');
                return;
            }
            throw new Error('Failed to load appointments');
        }

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
                    <button class="delete-btn" onclick="deleteAppointment(${appointment.id})">Delete</button>
                </div>
            ` : `
                <div class="appointment-actions">
                    <button class="delete-btn" onclick="deleteAppointment(${appointment.id})">Delete</button>
                </div>
            `}
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

    const token = localStorage.getItem('adminToken');
    if (!token) {
        showLoginForm();
        return;
    }

    try {
        const response = await fetch('/api/confirm', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showMessage('Appointment confirmed successfully!', 'success');
            loadAppointments();
        } else {
            showMessage(result.message || 'Failed to confirm appointment.', 'error');
        }
    } catch (error) {
        console.error('Error confirming appointment:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

async function rejectAppointment(id) {
    if (!confirm('Are you sure you want to reject this appointment?')) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
        showLoginForm();
        return;
    }

    try {
        const response = await fetch('/api/reject', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showMessage('Appointment rejected successfully!', 'success');
            loadAppointments();
        } else {
            showMessage(result.message || 'Failed to reject appointment.', 'error');
        }
    } catch (error) {
        console.error('Error rejecting appointment:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
        showLoginForm();
        return;
    }

    try {
        const response = await fetch(`/api/appointments/${id}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showMessage('Appointment deleted successfully!', 'success');
            loadAppointments();
        } else {
            showMessage(result.message || 'Failed to delete appointment.', 'error');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
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

// Auto-refresh appointments every 30 seconds if logged in
setInterval(() => {
    if (localStorage.getItem('adminToken')) {
        loadAppointments();
    }
}, 30000);
