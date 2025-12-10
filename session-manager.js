// session-manager.js - Session Manager for All Pages
const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

class SessionManager {
    constructor() {
        this.sessionId = null;
        this.username = null;
        this.checkInterval = null;
        this.SESSION_CHECK_INTERVAL = 30000; // 30 seconds
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    }

    // Initialize on all pages
    async initialize() {
        console.log("Session Manager initializing...");
        
        // Don't validate on login page
        if (window.location.pathname.includes('index.html')) {
            return;
        }
        
        const isValid = await this.validateSession();
        
        if (!isValid) {
            window.location.href = 'index.html?session=expired';
            return;
        }
        
        this.startSessionMonitoring();
        this.updateUI();
    }

    // Validate session with server
    async validateSession() {
        const loggedIn = localStorage.getItem('loggedIn');
        const username = localStorage.getItem('username');
        const sessionId = sessionStorage.getItem('sessionId');
        const loginTime = localStorage.getItem('loginTime');
        
        if (loggedIn !== 'true' || !username || !sessionId || !loginTime) {
            this.clearSession();
            return false;
        }
        
        // Check local timeout first
        const sessionAge = Date.now() - parseInt(loginTime);
        if (sessionAge > this.SESSION_TIMEOUT) {
            this.clearSession();
            return false;
        }
        
        try {
            const formData = new FormData();
            formData.append('action', 'validateSessionWithFullName');
            formData.append('username', username);
            formData.append('sessionId', sessionId);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.isLoggedIn) {
                this.sessionId = sessionId;
                this.username = username;
                
                // Store user data
                if (data.user) {
                    localStorage.setItem('staffName', data.user.FullName);
                    localStorage.setItem('userRole', data.user.Role);
                    localStorage.setItem('assignedBarangay', data.user.AssignedBarangay);
                }
                
                // Update last activity
                localStorage.setItem('lastActivity', Date.now().toString());
                
                return true;
            } else {
                this.clearSession();
                return false;
            }
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }

    // Start session monitoring
    startSessionMonitoring() {
        // Clear existing interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Check session every 30 seconds
        this.checkInterval = setInterval(async () => {
            const isValid = await this.validateSession();
            if (!isValid) {
                this.showSessionExpiredMessage();
            }
        }, this.SESSION_CHECK_INTERVAL);
        
        // Monitor user activity
        this.setupActivityMonitoring();
    }

    // Setup activity monitoring
    setupActivityMonitoring() {
        // Update activity on user interactions
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        
        const events = ['click', 'keydown', 'mousemove', 'scroll'];
        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Check idle timeout every minute
        setInterval(() => {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const idleTime = Date.now() - parseInt(lastActivity);
                if (idleTime > this.SESSION_TIMEOUT) {
                    this.showSessionExpiredMessage();
                }
            }
        }, 60000);
    }

    // Update UI with user info
    updateUI() {
        const fullName = localStorage.getItem('staffName');
        const role = localStorage.getItem('userRole');
        const barangay = localStorage.getItem('assignedBarangay');
        
        // Update username display
        const usernameElements = document.querySelectorAll('#userName, .user-fullname');
        usernameElements.forEach(el => {
            if (el) el.textContent = fullName || 'User';
        });
        
        // Hide admin-only elements
        if (role !== 'Admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
            
            // Hide users.html tab/link
            const usersLinks = document.querySelectorAll('[href*="users.html"]');
            usersLinks.forEach(link => {
                link.style.display = 'none';
                link.parentElement.style.display = 'none';
            });
        }
        
        // Add user info to header if elements exist
        const userFullNameElement = document.getElementById('userFullName');
        if (userFullNameElement) {
            userFullNameElement.textContent = fullName || 'User';
        }
        
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = role || 'Staff';
        }
        
        const userBarangayElement = document.getElementById('userBarangay');
        if (userBarangayElement && barangay) {
            userBarangayElement.textContent = `• ${barangay}`;
        }
    }

    // Show session expired message
    showSessionExpiredMessage() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center;">
                    <h3 style="color: #d32f2f; margin-top: 0;">
                        <i class="fas fa-exclamation-triangle"></i> Session Expired
                    </h3>
                    <p>Your session has expired due to inactivity.</p>
                    <button id="reLoginBtn" style="background: #0f7a4a; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600;">
                        Return to Login
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('reLoginBtn').addEventListener('click', () => {
            this.clearSession();
            window.location.href = 'index.html';
        });
    }

    // Clear session
    clearSession() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        localStorage.clear();
        sessionStorage.clear();
    }

    // Get user info
    getUserInfo() {
        return {
            username: localStorage.getItem('username'),
            fullName: localStorage.getItem('staffName'),
            role: localStorage.getItem('userRole'),
            barangay: localStorage.getItem('assignedBarangay'),
            sessionId: sessionStorage.getItem('sessionId')
        };
    }
}

// Create global instance
window.sessionManager = new SessionManager();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager.initialize();
});
