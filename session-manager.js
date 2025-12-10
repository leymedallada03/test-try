// session-manager.js - Session Manager for All Pages
// Remove this line: const API_URL = "YOUR_URL";
// Use the existing API_URL from index.js

class SessionManager {
    constructor() {
        this.checkInterval = null;
        this.SESSION_CHECK_INTERVAL = 30000; // 30 seconds
        this.initialized = false;
        this.activityEvents = ['click', 'keydown', 'mousemove', 'scroll'];
        this.idleCheckInterval = null;
    }

    // Initialize on page load (except index.html)
    async initialize() {
        // Don't run on login page
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.includes('index')) {
            return;
        }
        
        // Prevent double initialization
        if (this.initialized) {
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
        this.initialized = true;
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
                body: formData,
                mode: 'no-cors' // Add this for Google Apps Script
            });
            
            // For no-cors mode, we can't read the response
            // Just assume success if we get a response
            if (response.ok || response.type === 'opaque') {
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
                    
                    console.log("Session Manager: User info updated", {
                        name: user.FullName,
                        role: user.Role,
                        barangay: user.AssignedBarangay
                    });
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
        
        console.log("Session Manager: Started session monitoring");
        
        // Monitor user activity
        this.setupActivityMonitoring();
    }

    // Monitor user activity for idle timeout
    setupActivityMonitoring() {
        // Clear existing activity listeners
        this.cleanupActivityMonitoring();
        
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        
        // Update on user interactions
        this.activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Check idle timeout every minute
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
        }
        
        this.idleCheckInterval = setInterval(() => {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const idleTime = Date.now() - parseInt(lastActivity);
                if (idleTime > 30 * 60 * 1000) { // 30 minutes
                    console.log("Session Manager: User idle for 30+ minutes");
                    this.showSessionExpiredMessage();
                }
            }
        }, 60000);
        
        console.log("Session Manager: Started activity monitoring");
    }

    // Clean up activity monitoring
    cleanupActivityMonitoring() {
        // Remove event listeners
        const updateActivity = () => {};
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, updateActivity);
        });
        
        // Clear idle check interval
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
            this.idleCheckInterval = null;
        }
    }

    // Update UI with user info
    updateUI() {
        const fullName = localStorage.getItem('staffName');
        const role = localStorage.getItem('userRole');
        const barangay = localStorage.getItem('assignedBarangay');
        const username = localStorage.getItem('username');
        
        console.log("Session Manager: Updating UI with", { fullName, role, barangay, username });
        
        // Update username display
        const usernameElements = document.querySelectorAll('#userName, .username-display, [data-username]');
        usernameElements.forEach(el => {
            if (el) {
                el.textContent = fullName || username || 'User';
                el.style.display = 'inline';
            }
        });
        
        // Update additional elements if they exist
        const userFullNameElement = document.getElementById('userFullName');
        if (userFullNameElement) {
            userFullNameElement.textContent = fullName || username || 'User';
        }
        
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = role || 'Staff';
            userRoleElement.style.display = 'inline';
        }
        
        const userBarangayElement = document.getElementById('userBarangay');
        if (userBarangayElement && barangay) {
            userBarangayElement.textContent = `• ${barangay}`;
            userBarangayElement.style.display = 'inline';
        }
        
        // Hide admin-only elements for non-admin users
        if (role !== 'Admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
            
            // Hide users.html tab/link
            const usersLinks = document.querySelectorAll('[href*="users.html"]');
            usersLinks.forEach(link => {
                if (link.parentElement) {
                    link.parentElement.style.display = 'none';
                }
            });
            
            // Redirect from users.html if accessed directly
            if (window.location.pathname.includes('users.html')) {
                console.log("Session Manager: Non-admin accessing users page, redirecting");
                window.location.href = 'dashboard.html';
            }
        } else {
            // Show admin elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
        }
    }

    // Show session expired message
    showSessionExpiredMessage() {
        // Prevent multiple modals
        if (document.getElementById('sessionExpiredModal')) {
            return;
        }
        
        console.log("Session Manager: Showing session expired message");
        
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
                    <button id="reLoginBtn" style="background: #0f7a4a; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.3s;">
                        Return to Login
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add hover effect
        const loginBtn = document.getElementById('reLoginBtn');
        loginBtn.addEventListener('mouseenter', () => {
            loginBtn.style.background = '#0a5c38';
        });
        loginBtn.addEventListener('mouseleave', () => {
            loginBtn.style.background = '#0f7a4a';
        });
        
        loginBtn.addEventListener('click', () => {
            console.log("Session Manager: User clicked return to login");
            this.clearSession();
            window.location.href = 'index.html';
        });
        
        // Auto-redirect after 10 seconds
        setTimeout(() => {
            if (document.getElementById('sessionExpiredModal')) {
                console.log("Session Manager: Auto-redirecting to login");
                this.clearSession();
                window.location.href = 'index.html';
            }
        }, 10000);
    }

    // Clear session data
    clearSession() {
        console.log("SessionManager: Clearing session and stopping monitoring");
        
        // Stop all intervals
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        // Clear flags
        this.initialized = false;
        
        // Clean up activity monitoring
        this.cleanupActivityMonitoring();
        
        // Note: Don't clear localStorage here - common-session.js does it
        // This just stops the monitoring intervals
        
        console.log("SessionManager: Session monitoring stopped");
    }

    // Force logout (for logout button)
    logout() {
        console.log("SessionManager: Manual logout initiated");
        this.clearSession();
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login
        window.location.href = 'index.html?logout=true';
    }

    // Get current session info
    getSessionInfo() {
        return {
            username: localStorage.getItem('username'),
            fullName: localStorage.getItem('staffName'),
            role: localStorage.getItem('userRole'),
            barangay: localStorage.getItem('assignedBarangay'),
            sessionId: sessionStorage.getItem('sessionId'),
            loginTime: localStorage.getItem('loginTime'),
            lastActivity: localStorage.getItem('lastActivity')
        };
    }

    // Check if user is admin
    isAdmin() {
        return localStorage.getItem('userRole') === 'Admin';
    }

    // Get current user's barangay
    getAssignedBarangay() {
        return localStorage.getItem('assignedBarangay');
    }
}

// Create global instance
window.sessionManager = new SessionManager();

// Auto-initialize on protected pages
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sessionManager.initialize();
    });
} else {
    // DOM already loaded
    window.sessionManager.initialize();
}

// Make it available globally
console.log("Session Manager: Loaded and ready");
