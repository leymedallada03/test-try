// common-session.js - Instant Logout Handler
const COMMON_API_URL = window.SCRIPT_URL || "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Remove any existing listeners to prevent duplicates
        logoutBtn.removeEventListener('click', handleInstantLogout);
        
        // Add new listener
        logoutBtn.addEventListener('click', handleInstantLogout);
        
        // Update button text/icon for immediate feedback
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.disabled = false;
    }
}

// Instant logout handler - doesn't wait for server response
async function handleInstantLogout(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🚪 Instant logout triggered");
    
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const actor = localStorage.getItem('staffName') || username;
    
    // 1. IMMEDIATELY clear all local data
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Stop session monitoring if sessionManager exists
    if (window.sessionManager && typeof window.sessionManager.clearSession === 'function') {
        window.sessionManager.clearSession();
    }
    
    // 3. Show immediate visual feedback
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Logged out!';
        logoutBtn.disabled = true;
        logoutBtn.style.background = '#10b981'; // Green color
    }
    
    // 4. Notify server IN BACKGROUND (fire and forget)
    if (username && sessionId) {
        try {
            // Log logout activity (fire and forget)
            const activityFormData = new FormData();
            activityFormData.append('action', 'logActivity');
            activityFormData.append('username', username);
            activityFormData.append('actor', actor);
            activityFormData.append('action', 'User Logout');
            
            fetch(COMMON_API_URL, {
                method: 'POST',
                body: activityFormData
            }).catch(() => {
                // Ignore errors - not critical
            });
            
            // Call server logout (fire and forget)
            const logoutFormData = new FormData();
            logoutFormData.append('action', 'logout');
            logoutFormData.append('username', username);
            logoutFormData.append('sessionId', sessionId);
            
            fetch(COMMON_API_URL, {
                method: 'POST',
                body: logoutFormData
            }).catch(() => {
                // Ignore errors - not critical
            });
            
        } catch (error) {
            // Ignore all errors - logout happens regardless
            console.log("Background logout notification failed (non-critical)");
        }
    }
    
    // 5. INSTANT redirect with cache busting
    setTimeout(() => {
        window.location.replace('index.html?logout=success&t=' + Date.now());
    }, 300); // Small delay for visual feedback only
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only run on protected pages (not index.html)
    if (!window.location.pathname.includes('index.html')) {
        setupLogoutButton();
    }
});

// Make function available globally
window.handleLogout = handleInstantLogout;

// Also handle browser back button to prevent going back to logged out state
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // If page loaded from cache, check if we should be logged out
        if (!localStorage.getItem('username') && !window.location.pathname.includes('index.html')) {
            window.location.replace('index.html?session=expired');
        }
    }
});
