// common-session.js - Common session utilities
const COMMON_API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Initialize common session functions
function initializeCommonSession() {
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check if user is on a protected page without session
    const protectedPages = ['dashboard.html', 'dataForm.html', 'records.html', 'charts.html', 'users.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        const loggedIn = localStorage.getItem('loggedIn');
        if (loggedIn !== 'true') {
            window.location.href = 'index.html?session=required';
        }
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const actor = localStorage.getItem('staffName') || username;
    
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
        });
        
        // Call server logout
        const logoutFormData = new FormData();
        logoutFormData.append('action', 'logout');
        logoutFormData.append('username', username);
        logoutFormData.append('sessionId', sessionId);
        
        await fetch(COMMON_API_URL, {
            method: 'POST',
            body: logoutFormData
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
document.addEventListener('DOMContentLoaded', initializeCommonSession);
