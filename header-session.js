// header-session.js - Session management for header/navigation
const SESSION_API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

class HeaderSessionManager {
    constructor() {
        this.currentUser = null;
        this.checkInterval = null;
    }

    // Initialize on page load
    async initialize() {
        console.log("Header Session Manager initializing...");
        
        // Check if we're on a protected page
        if (this.isProtectedPage() && !this.isLoggedInLocally()) {
            window.location.href = 'index.html?session=expired';
            return;
        }
        
        if (this.isLoggedInLocally()) {
            await this.updateUserDisplay();
            this.setupLogoutHandler();
            this.setupSessionMonitoring();
            this.updateNavigation();
        }
    }

    // Check if page requires authentication
    isProtectedPage() {
        const protectedPages = ['dashboard.html', 'dataForm.html', 'records.html', 'charts.html', 'users.html'];
        const currentPage = window.location.pathname.split('/').pop();
        return protectedPages.includes(currentPage);
    }

    // Check local session
    isLoggedInLocally() {
        const loggedIn = localStorage.getItem('loggedIn');
        const username = localStorage.getItem('username');
        const sessionId = sessionStorage.getItem('sessionId');
        const loginTime = localStorage.getItem('loginTime');
        
        if (loggedIn === 'true' && username && sessionId && loginTime) {
            // Check session timeout (30 minutes)
            const sessionAge = Date.now() - parseInt(loginTime);
            if (sessionAge < 30 * 60 * 1000) {
                return true;
            } else {
                this.clearSession();
                return false;
            }
        }
        return false;
    }

    // Get user initials from full name
    getUserInitials(fullName) {
        if (!fullName) return 'U';
        
        const names = fullName.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } else if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }
        return 'U';
    }

    // Update user display in header
    updateUserDisplay() {
        const fullName = localStorage.getItem('staffName') || localStorage.getItem('username');
        const role = localStorage.getItem('userRole') || 'Staff';
        const barangay = localStorage.getItem('assignedBarangay') || '';
        
        // Update Full Name
        const fullNameElement = document.getElementById('userFullName');
        if (fullNameElement) {
            fullNameElement.textContent = fullName;
        }
        
        // Update old username element if exists
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = fullName;
        }
        
        // Update Role
        const roleElement = document.getElementById('userRole');
        if (roleElement) {
            roleElement.textContent = role;
            
            // Add color coding for roles
            if (role === 'Admin') {
                roleElement.style.background = '#e8f5e9';
                roleElement.style.color = '#0f7a4a';
            } else {
                roleElement.style.background = '#e3f2fd';
                roleElement.style.color = '#1976d2';
            }
        }
        
        // Update Barangay
        const barangayElement = document.getElementById('userBarangay');
        if (barangayElement) {
            if (barangay) {
                barangayElement.textContent = `• ${barangay}`;
                barangayElement.style.display = 'inline';
            } else {
                barangayElement.style.display = 'none';
            }
        }
        
        // Update Avatar Initials
        const initialsElement = document.getElementById('userInitials');
        if (initialsElement) {
            initialsElement.textContent = this.getUserInitials(fullName);
        }
    }

    // Setup logout handler
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }

    // Handle logout
    async handleLogout() {
        const username = localStorage.getItem('username');
        const sessionId = sessionStorage.getItem('sessionId');
        const actor = localStorage.getItem('staffName') || username;
        
        try {
            // Log logout activity
            await fetch(SESSION_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=logActivity&username=${encodeURIComponent(username)}&actor=${encodeURIComponent(actor)}&action=User Logout`
            });
            
            // Call server logout
            await fetch(SESSION_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=logout&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearSession();
            window.location.href = 'index.html?logout=true';
        }
    }

    // Update navigation based on role
    updateNavigation() {
        const role = localStorage.getItem('userRole');
        
        // Show/hide admin menu items
        if (role !== 'Admin') {
            // Hide admin-only menu items
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
            
            // Redirect from users.html if accessed directly
            if (window.location.pathname.includes('users.html')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            // Show admin menu items
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }
    }

    // Setup session monitoring
    setupSessionMonitoring() {
        // Clear existing interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Check session every 30 seconds
        this.checkInterval = setInterval(async () => {
            await this.validateSession();
        }, 30000);
        
        // Update activity on user interactions
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        
        ['click', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Check idle timeout every minute
        setInterval(() => {
            this.checkIdleTimeout();
        }, 60000);
    }

    // Validate session with server
    async validateSession() {
        const username = localStorage.getItem('username');
        const sessionId = sessionStorage.getItem('sessionId');
        
        if (!username || !sessionId) return false;
        
        try {
            const response = await fetch(SESSION_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=validateSession&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`
            });
            
            const data = await response.json();
            
            if (!data.success || !data.isLoggedIn) {
                this.showSessionExpiredMessage();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Session validation error:', error);
            return true; // Continue if server unreachable
        }
    }

    // Check idle timeout
    checkIdleTimeout() {
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
            const idleTime = Date.now() - parseInt(lastActivity);
            if (idleTime > 30 * 60 * 1000) { // 30 minutes
                this.showSessionExpiredMessage();
            }
        }
    }

    // Show session expired message
    showSessionExpiredMessage() {
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
                    <button id="returnToLoginBtn" style="background: #0f7a4a; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600;">
                        Return to Login
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('returnToLoginBtn').addEventListener('click', () => {
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
}

// Create and initialize the session manager
document.addEventListener('DOMContentLoaded', () => {
    window.headerSessionManager = new HeaderSessionManager();
    window.headerSessionManager.initialize();
});
