// session-manager.js - Unified Session Manager for All Pages
const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

class SessionManager {
    constructor() {
        this.currentUser = null;
        this.sessionId = null;
        this.checkInterval = null;
        this.ACTIVITY_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.VALIDATION_INTERVAL = 30 * 1000; // 30 seconds
        this.TIMEOUT = 30 * 60 * 1000; // 30 minutes
    }

    // Initialize session manager on page load
    async initialize() {
        console.log("Initializing Session Manager...");
        
        // Check if user is logged in
        const isLoggedIn = this.checkLocalSession();
        
        if (isLoggedIn) {
            await this.validateAndUpdateSession();
            this.startSessionMonitoring();
            this.setupActivityTracking();
            this.updateUI();
            
            // Log page view
            this.logActivity(`Viewed ${document.title}`);
            
            return true;
        } else {
            // Redirect to login if not on index page
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html?session=expired';
            }
            return false;
        }
    }

    // Check local session storage
    checkLocalSession() {
        const loggedIn = localStorage.getItem('loggedIn');
        const sessionId = sessionStorage.getItem('sessionId');
        const loginTime = localStorage.getItem('loginTime');
        
        if (loggedIn === 'true' && sessionId && loginTime) {
            // Check if session expired locally
            const sessionAge = Date.now() - parseInt(loginTime);
            if (sessionAge < this.TIMEOUT) {
                this.currentUser = {
                    Username: localStorage.getItem('username'),
                    FullName: localStorage.getItem('staffName'),
                    Role: localStorage.getItem('userRole'),
                    AssignedBarangay: localStorage.getItem('assignedBarangay')
                };
                this.sessionId = sessionId;
                return true;
            } else {
                this.clearSession();
                return false;
            }
        }
        return false;
    }

    // Validate session with server
    async validateAndUpdateSession() {
        try {
            const response = await this.fetchJSON(API_URL, {
                action: 'validateSession',
                username: this.currentUser.Username,
                sessionId: this.sessionId
            });

            if (response.success && response.isLoggedIn) {
                // Update last activity
                localStorage.setItem('lastActivity', Date.now().toString());
                
                // Update user data from server
                const userResponse = await this.fetchJSON(API_URL, {
                    action: 'users'
                });
                
                if (userResponse.success) {
                    const currentUserFromServer = userResponse.users.find(
                        user => user.Username === this.currentUser.Username
                    );
                    
                    if (currentUserFromServer) {
                        this.currentUser = currentUserFromServer;
                        localStorage.setItem('staffName', currentUserFromServer.FullName);
                        localStorage.setItem('userRole', currentUserFromServer.Role);
                        localStorage.setItem('assignedBarangay', currentUserFromServer.AssignedBarangay);
                    }
                }
                
                return true;
            } else {
                this.clearSession();
                window.location.href = 'index.html?session=invalid';
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

        // Check session validity periodically
        this.checkInterval = setInterval(async () => {
            const isValid = await this.validateAndUpdateSession();
            if (!isValid) {
                this.showSessionExpiredMessage();
            }
        }, this.VALIDATION_INTERVAL);
    }

    // Setup activity tracking
    setupActivityTracking() {
        // Update last activity on user interactions
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };

        const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check idle timeout
        setInterval(() => {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const idleTime = Date.now() - parseInt(lastActivity);
                if (idleTime > this.TIMEOUT) {
                    this.showSessionExpiredMessage();
                }
            }
        }, 60000); // Check every minute
    }

    // Update UI based on user role
    updateUI() {
        if (!this.currentUser) return;

        const { Role, FullName } = this.currentUser;

        // Update username display with Full Name
        const usernameElements = document.querySelectorAll('.username-display, #usernameDisplay, .user-fullname');
        usernameElements.forEach(el => {
            if (el) el.textContent = FullName || 'User';
        });

        // Hide admin-only elements for non-admin users
        if (Role !== 'Admin') {
            // Hide users.html tab/link
            const usersTab = document.querySelector('[href*="users.html"], [data-page="users"], #usersTab');
            if (usersTab) {
                usersTab.style.display = 'none';
                usersTab.parentElement.style.display = 'none';
            }

            // Hide admin-only sections
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Show/hide elements based on role
        document.querySelectorAll(`[data-role="${Role}"]`).forEach(el => {
            el.style.display = '';
        });
        
        document.querySelectorAll(`[data-role]:not([data-role="${Role}"])`).forEach(el => {
            el.style.display = 'none';
        });
    }

    // Log activity to server using Full Name
    async logActivity(action) {
        try {
            const actor = this.currentUser.FullName || this.currentUser.Username;
            
            await this.fetchJSON(API_URL, {
                action: 'logActivity',
                username: this.currentUser.Username,
                actor: actor,
                action: action
            });
        } catch (error) {
            console.error('Activity logging error:', error);
        }
    }

    // Logout function
    async logout() {
        try {
            // Log logout activity
            await this.logActivity('User Logout');
            
            // Call server logout
            await this.fetchJSON(API_URL, {
                action: 'logout',
                username: this.currentUser.Username,
                sessionId: this.sessionId
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearSession();
            window.location.href = 'index.html?logout=true';
        }
    }

    // Clear session data
    clearSession() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        localStorage.clear();
        sessionStorage.clear();
        
        this.currentUser = null;
        this.sessionId = null;
    }

    // Show session expired message
    showSessionExpiredMessage() {
        // Create modal or notification
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; text-align: center;">
                    <h3 style="color: #d32f2f; margin-top: 0;">
                        <i class="fas fa-exclamation-triangle"></i> Session Expired
                    </h3>
                    <p>Your session has expired due to inactivity.</p>
                    <button id="reLoginBtn" style="background: #0f7a4a; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
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

    // Helper function for fetch with timeout
    async fetchJSON(url, data, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            return JSON.parse(text);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // Get current user info
    getUserInfo() {
        return {
            ...this.currentUser,
            sessionId: this.sessionId
        };
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUser && this.currentUser.Role === role;
    }

    // Check if user can access page based on role
    canAccessPage(allowedRoles = ['Admin', 'Staff']) {
        if (!this.currentUser) return false;
        return allowedRoles.includes(this.currentUser.Role);
    }
}

// Create global session manager instance
window.sessionManager = new SessionManager();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Don't initialize on index.html
    if (!window.location.pathname.includes('index.html')) {
        await window.sessionManager.initialize();
    }
});
