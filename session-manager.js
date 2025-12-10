// session-manager.js - Session Manager for All Pages
// Remove this line: const API_URL = "YOUR_URL";
// Use the existing API_URL from index.js

class SessionManager {
    constructor() {
        this.checkInterval = null;
        this.SESSION_CHECK_INTERVAL = 30000; // 30 seconds
    }

    // Initialize on page load (except index.html)
    async initialize() {
        // Don't run on login page
        if (window.location.pathname.includes('index.html')) {
            return;
        }
        
        console.log("Session Manager: Checking session...");
        
        const isValid = await this.validateSession();
        
        if (!isValid) {
            console.log("Session Manager: Invalid session, redirecting to login");
            window.location.href = 'index.html?session=expired';
            return;
        }
        
        this.startSessionMonitoring();
        this.updateUI();
        console.log("Session Manager: Session valid, user logged in");
    }

    // Validate session with server
    async validateSession() {
        const loggedIn = localStorage.getItem('loggedIn');
        const username = localStorage.getItem('username');
        const sessionId = sessionStorage.getItem('sessionId');
        const loginTime = localStorage.getItem('loginTime');
        
        // Basic checks
        if (loggedIn !== 'true' || !username || !sessionId || !loginTime) {
            console.log("Session Manager: Missing session data");
            this.clearSession();
            return false;
        }
        
        // Check local timeout (30 minutes)
        const sessionAge = Date.now() - parseInt(loginTime);
        if (sessionAge > 30 * 60 * 1000) {
            console.log("Session Manager: Session expired locally");
            this.clearSession();
            return false;
        }
        
        try {
            // Use the global API_URL from index.js or define it locally
            const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";
            
            // Validate with server
            const formData = new FormData();
            formData.append('action', 'validateSession');
            formData.append('username', username);
            formData.append('sessionId', sessionId);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.isLoggedIn) {
                // Update last activity
                localStorage.setItem('lastActivity', Date.now().toString());
                
                // Try to get updated user info
                await this.updateUserInfo(username);
                
                return true;
            } else {
                console.log("Session Manager: Server validation failed");
                this.clearSession();
                return false;
            }
        } catch (error) {
            console.error("Session Manager: Validation error, continuing with local session", error);
            // If server unreachable, continue with local session
            localStorage.setItem('lastActivity', Date.now().toString());
            return true;
        }
    }

    // Update user info from server
    async updateUserInfo(username) {
        try {
            const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";
            
            const response = await fetch(`${API_URL}?action=users&t=${Date.now()}`);
            const data = await response.json();
            
            if (data.success && data.users) {
                const user = data.users.find(u => u.Username === username);
                if (user) {
                    localStorage.setItem('staffName', user.FullName);
                    localStorage.setItem('userRole', user.Role);
                    localStorage.setItem('assignedBarangay', user.AssignedBarangay);
                }
            }
        } catch (error) {
            console.error("Session Manager: Failed to update user info", error);
        }
    }

    // Start session monitoring
    startSessionMonitoring() {
        // Clear existing interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Check session periodically
        this.checkInterval = setInterval(async () => {
            const isValid = await this.validateSession();
            if (!isValid) {
                this.showSessionExpiredMessage();
            }
        }, this.SESSION_CHECK_INTERVAL);
        
        // Monitor user activity
        this.setupActivityMonitoring();
    }

    // Monitor user activity for idle timeout
    setupActivityMonitoring() {
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        
        // Update on user interactions
        const events = ['click', 'keydown', 'mousemove', 'scroll'];
        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Check idle timeout every minute
        setInterval(() => {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const idleTime = Date.now() - parseInt(lastActivity);
                if (idleTime > 30 * 60 * 1000) { // 30 minutes
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
        const usernameElements = document.querySelectorAll('#userName, .username-display');
        usernameElements.forEach(el => {
            if (el) el.textContent = fullName || localStorage.getItem('username') || 'User';
        });
        
        // Update additional elements if they exist
        const userFullNameElement = document.getElementById('userFullName');
        if (userFullNameElement) {
            userFullNameElement.textContent = fullName || localStorage.getItem('username') || 'User';
        }
        
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = role || 'Staff';
        }
        
        const userBarangayElement = document.getElementById('userBarangay');
        if (userBarangayElement && barangay) {
            userBarangayElement.textContent = `• ${barangay}`;
        }
        
        // Hide admin-only elements for non-admin users
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
            
            // Redirect from users.html if accessed directly
            if (window.location.pathname.includes('users.html')) {
                window.location.href = 'dashboard.html';
            }
        }
    }

    // Show session expired message
    showSessionExpiredMessage() {
        // Prevent multiple modals
        if (document.getElementById('sessionExpiredModal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'sessionExpiredModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div style="font-size: 48px; color: #ff9800; margin-bottom: 20px;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <h3 style="margin: 0 0 10px 0; color: #333;">Session Expired</h3>
                    <p style="color: #666; margin-bottom: 25px; line-height: 1.5;">
                        Your session has expired due to inactivity.<br>
                        Please login again to continue.
                    </p>
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

    // Clear session data
    clearSession() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        localStorage.clear();
        sessionStorage.clear();
    }

    // Get current session info
    getSessionInfo() {
        return {
            username: localStorage.getItem('username'),
            fullName: localStorage.getItem('staffName'),
            role: localStorage.getItem('userRole'),
            barangay: localStorage.getItem('assignedBarangay'),
            sessionId: sessionStorage.getItem('sessionId'),
            loginTime: localStorage.getItem('loginTime')
        };
    }
}
clearSession() {
    console.log("SessionManager: Clearing session and stopping monitoring");
    
    // Stop all intervals
    if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
    }
    
    // Clear flags
    this.initialized = false;
    
    // Note: Don't clear localStorage here - common-session.js does it
    // This just stops the monitoring intervals
}

// Create global instance
window.sessionManager = new SessionManager();

// Auto-initialize on protected pages
document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager.initialize();
});
