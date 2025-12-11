// header-session.js - ONLY for displaying user info in header
class HeaderDisplayManager {
    constructor() {
        console.log("Header Display Manager initialized");
    }

    // Initialize on page load
    initialize() {
        console.log("Header Display Manager: Updating user display...");
        this.updateUserDisplay();
        this.setupLogoutHandler();
        this.updateNavigation();
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
        const fullName = localStorage.getItem('staffName') || localStorage.getItem('username') || 'User';
        const role = localStorage.getItem('userRole') || 'Staff';
        const barangay = localStorage.getItem('assignedBarangay') || '';
        
        console.log(`Header Display: ${fullName} (${role}) - ${barangay}`);
        
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

    // Setup logout handler (just calls the main logout function)
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Remove any existing handlers
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            // Add new handler that calls the main logout function
            newLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Check if enhancedLogout exists (from dashboard)
                if (typeof enhancedLogout === 'function') {
                    enhancedLogout();
                } 
                // Fallback to window logout if exists
                else if (typeof window.performLogout === 'function') {
                    window.performLogout();
                }
                // Last resort - clear and redirect
                else {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
            });
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.headerDisplayManager = new HeaderDisplayManager();
    window.headerDisplayManager.initialize();
});
