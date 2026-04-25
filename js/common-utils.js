// Add to common-utils.js - Heartbeat and activity helpers

// Send activity heartbeat to server (called by session manager)
async function sendActivityHeartbeat() {
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const isGuest = localStorage.getItem('isGuest') === 'true';
    
    if (!username || !sessionId || isGuest) return;
    
    try {
        const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
        
        const formData = new FormData();
        formData.append('action', 'logActivity');
        formData.append('username', username);
        formData.append('actor', username);
        formData.append('action', 'User Activity');
        
        await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        console.log("Heartbeat: Activity logged");
    } catch (error) {
        // Silently fail - non-critical
    }
}

// Get user activity status
async function getUserOnlineStatus(username) {
    try {
        const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
        
        const formData = new FormData();
        formData.append('action', 'checkSessionStatus');
        formData.append('username', username);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.isLoggedIn === true;
    } catch (error) {
        console.error("Failed to check user status:", error);
        return false;
    }
}

// Make available globally
window.sendActivityHeartbeat = sendActivityHeartbeat;
window.getUserOnlineStatus = getUserOnlineStatus;