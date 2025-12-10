// common-session.js - Handles common session tasks
const COMMON_API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const actor = localStorage.getItem('staffName') || username;
    
    if (!username) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html?logout=true';
        return;
    }
    
    try {
        // Log logout activity
        const formData = new FormData();
        formData.append('action', 'logActivity');
        formData.append('username', username);
        formData.append('actor', actor);
        formData.append('action', 'User Logout');
        
        await fetch(COMMON_API_URL, {
            method: 'POST',
            body: formData
        }).catch(() => {
            // Silently fail if server unreachable
        });
        
        // Call server logout
        const logoutFormData = new FormData();
        logoutFormData.append('action', 'logout');
        logoutFormData.append('username', username);
        logoutFormData.append('sessionId', sessionId);
        
        await fetch(COMMON_API_URL, {
            method: 'POST',
            body: logoutFormData
        }).catch(() => {
            // Silently fail if server unreachable
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html?logout=true';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only run on protected pages (not index.html)
    if (!window.location.pathname.includes('index.html')) {
        setupLogoutButton();
    }
});
