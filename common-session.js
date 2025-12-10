// common-session.js - Common session functions for all pages
const COMMON_API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Initialize session check on all pages
function initializeCommonSession() {
    // Check if we're on a page that requires authentication
    const authPages = ['dashboard.html', 'dataForm.html', 'records.html', 'charts.html', 'users.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (authPages.includes(currentPage)) {
        checkSessionValidity();
        
        // Add logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Update UI with user info
        updateUserInfoUI();
    }
}

// Check session validity
async function checkSessionValidity() {
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const loginTime = localStorage.getItem('loginTime');
    
    if (!username || !sessionId || !loginTime) {
        redirectToLogin();
        return;
    }
    
    // Check local timeout first
    const sessionAge = Date.now() - parseInt(loginTime);
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    if (sessionAge > SESSION_TIMEOUT) {
        clearSessionData();
        redirectToLogin();
        return;
    }
    
    // Check with server
    try {
        const response = await fetch(COMMON_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=validateSession&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`
        });
        
        const data = await response.json();
        
        if (!data.success || !data.isLoggedIn) {
            clearSessionData();
            redirectToLogin();
        } else {
            // Update last activity
            localStorage.setItem('lastActivity', Date.now().toString());
            
            // Update user data
            await updateUserData(username);
        }
    } catch (error) {
        console.error('Session check failed:', error);
        // Continue with local session if server unreachable
    }
}

// Update user data from server
async function updateUserData(username) {
    try {
        const response = await fetch(`${COMMON_API_URL}?action=users&t=${Date.now()}`);
        const data = await response.json();
        
        if (data.success && data.users) {
            const user = data.users.find(u => u.Username === username);
            if (user) {
                localStorage.setItem('staffName', user.FullName);
                localStorage.setItem('userRole', user.Role);
                localStorage.setItem('assignedBarangay', user.AssignedBarangay);
                
                updateUserInfoUI();
            }
        }
    } catch (error) {
        console.error('Failed to update user data:', error);
    }
}

// Update UI with user information
function updateUserInfoUI() {
    const fullName = localStorage.getItem('staffName');
    const role = localStorage.getItem('userRole');
    
    // Update user display elements
    const fullNameElements = document.querySelectorAll('.user-fullname, .username-display');
    fullNameElements.forEach(el => {
        if (el) el.textContent = fullName || 'User';
    });
    
    const roleElements = document.querySelectorAll('.user-role');
    roleElements.forEach(el => {
        if (el) el.textContent = role || 'Staff';
    });
    
    // Handle role-based access
    handleRoleBasedAccess(role);
}

// Handle role-based access control
function handleRoleBasedAccess(role) {
    // Hide users.html for non-admin users
    if (role !== 'Admin') {
        const usersTab = document.querySelector('[href*="users.html"], [data-page="users"]');
        if (usersTab) {
            usersTab.style.display = 'none';
            usersTab.parentElement.style.display = 'none';
        }
        
        // Hide admin-only content
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // Redirect from users.html if not admin
        if (window.location.pathname.includes('users.html')) {
            window.location.href = 'dashboard.html';
        }
    }
}

// Logout handler
async function handleLogout() {
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    
    try {
        // Log logout activity with Full Name
        const actor = localStorage.getItem('staffName') || username;
        await fetch(COMMON_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=logActivity&username=${encodeURIComponent(username)}&actor=${encodeURIComponent(actor)}&action=User Logout`
        });
        
        // Call server logout
        await fetch(COMMON_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=logout&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearSessionData();
        window.location.href = 'index.html?logout=true';
    }
}

// Clear session data
function clearSessionData() {
    localStorage.clear();
    sessionStorage.clear();
}

// Redirect to login
function redirectToLogin() {
    window.location.href = 'index.html?session=expired';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeCommonSession);

// Activity monitoring
document.addEventListener('click', () => {
    localStorage.setItem('lastActivity', Date.now().toString());
});

// Check idle timeout every minute
setInterval(() => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
        const idleTime = Date.now() - parseInt(lastActivity);
        if (idleTime > 30 * 60 * 1000) { // 30 minutes
            clearSessionData();
            window.location.href = 'index.html?session=inactive';
        }
    }
}, 60000);
